/**
 * POST /api/resend-webhook — recebe eventos do Resend (Svix) e regista emails inválidos.
 *
 * Objetivo: quando um email a uma creche bate no vazio (hard bounce) ou é marcado
 * como spam, guardamos o endereço em `emails_invalidos` para o agente de
 * enriquecimento ir depois procurar o contacto correto dessa creche.
 *
 * Eventos tratados (https://resend.com/docs/webhooks/event-types):
 *  - email.bounced    → motivo "bounce" (só bounces permanentes/hard)
 *  - email.complained → motivo "spam"
 * Tudo o resto responde 200 e é ignorado (se devolvermos erro, o Resend reenvia).
 *
 * Segurança — assinatura Svix (https://docs.svix.com/receiving/verifying-payloads/how-manual):
 *  signed_content = "{svix-id}.{svix-timestamp}.{body-raw}"
 *  HMAC-SHA256(base64decode(secret sem o prefixo "whsec_"), signed_content) → base64
 *  compara-se (timing-safe) com cada assinatura "v1,<base64>" da header svix-signature.
 *  Feito à mão com o módulo `crypto` do Node — sem dependências novas.
 *
 * Env vars: RESEND_WEBHOOK_SECRET (whsec_...), FIREBASE_SERVICE_ACCOUNT (base64 ou JSON).
 */

import crypto from "crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// O body tem de chegar cru: a assinatura é sensível a qualquer reformatação do JSON.
export const config = { api: { bodyParser: false } };

const TOLERANCIA_SEGUNDOS = 5 * 60;  // anti-replay: 5 minutos
const DATASET_URL = "https://creches.app/creches_pt.json";

function parseServiceAccount() {
  let raw = (process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
  if (!raw.startsWith("{")) raw = Buffer.from(raw, "base64").toString("utf-8").trim();  // base64
  // Extrair o primeiro objeto JSON completo (tolera texto extra/colagem dupla)
  const start = raw.indexOf("{");
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (start < 0 || end < 0) throw new Error("FIREBASE_SERVICE_ACCOUNT: JSON invalido");
  return JSON.parse(raw.slice(start, end + 1));
}

function initFirebase() {
  if (getApps().length) return;
  initializeApp({ credential: cert(parseServiceAccount()) });
}

// ── Body cru ────────────────────────────────────────────────────────────────
// Com bodyParser:false o request chega como stream. Fallbacks defensivos para
// o caso de algum runtime já ter consumido o stream à nossa frente.
async function lerBodyRaw(req) {
  if (typeof req.rawBody === "string") return req.rawBody;
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString("utf-8");
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  if (chunks.length) return Buffer.concat(chunks).toString("utf-8");
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object") return JSON.stringify(req.body);
  return "";
}

// ── Verificação da assinatura Svix ──────────────────────────────────────────
function primeiraHeader(req, ...nomes) {
  for (const n of nomes) {
    const v = req.headers[n];
    if (v) return Array.isArray(v) ? v[0] : String(v);
  }
  return "";
}

function verificarAssinatura(req, bodyRaw, secretEnv) {
  const id = primeiraHeader(req, "svix-id", "webhook-id");
  const timestamp = primeiraHeader(req, "svix-timestamp", "webhook-timestamp");
  const signature = primeiraHeader(req, "svix-signature", "webhook-signature");
  if (!id || !timestamp || !signature) return { ok: false, erro: "Headers Svix em falta" };

  // Anti-replay: o timestamp vem em segundos desde epoch.
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return { ok: false, erro: "svix-timestamp inválido" };
  const agora = Math.floor(Date.now() / 1000);
  if (Math.abs(agora - ts) > TOLERANCIA_SEGUNDOS) return { ok: false, erro: "svix-timestamp fora da janela de 5 min" };

  // Secret: base64 depois do prefixo "whsec_"
  const secretRaw = String(secretEnv || "").trim();
  const base64 = secretRaw.startsWith("whsec_") ? secretRaw.slice("whsec_".length) : secretRaw;
  let chave;
  try { chave = Buffer.from(base64, "base64"); } catch (e) { return { ok: false, erro: "secret inválido" }; }
  if (!chave.length) return { ok: false, erro: "secret inválido" };

  const esperada = crypto.createHmac("sha256", chave)
    .update(`${id}.${timestamp}.${bodyRaw}`)
    .digest();

  // A header pode trazer várias assinaturas separadas por espaço: "v1,<b64> v1,<b64>"
  for (const parte of signature.split(" ")) {
    const virgula = parte.indexOf(",");
    if (virgula < 0) continue;
    if (parte.slice(0, virgula) !== "v1") continue;
    let recebida;
    try { recebida = Buffer.from(parte.slice(virgula + 1), "base64"); } catch (e) { continue; }
    if (recebida.length !== esperada.length) continue;
    if (crypto.timingSafeEqual(recebida, esperada)) return { ok: true };
  }
  return { ok: false, erro: "Assinatura não corresponde" };
}

// ── Dataset público (para descobrir a que creche pertence o email) ──────────
let datasetCache = null;
let datasetCacheEm = 0;
const DATASET_TTL_MS = 10 * 60 * 1000;

async function crecheDoEmail(email) {
  try {
    if (!datasetCache || Date.now() - datasetCacheEm > DATASET_TTL_MS) {
      const ds = await fetch(DATASET_URL).then((r) => r.json());
      datasetCache = Array.isArray(ds) ? ds : [];
      datasetCacheEm = Date.now();
    }
    const alvo = String(email || "").trim().toLowerCase();
    const c = datasetCache.find((x) => String(x.email || "").trim().toLowerCase() === alvo);
    return c ? { creche_id: String(c.id), creche_nome: String(c.nome || "") } : null;
  } catch (e) {
    console.error("resend-webhook crecheDoEmail:", e);
    return null;
  }
}

// ── Helpers de dados ────────────────────────────────────────────────────────
function normalizarEmail(v) {
  const e = String(v || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : "";
}

// Doc id do Firestore: "/" não é permitido (o "." é); nunca pode ser "." nem ".."
function docIdDoEmail(email) {
  return email.replace(/\//g, "_").slice(0, 400);
}

function destinatarios(data) {
  // Payload do Resend: data.to é um array de destinatários afetados.
  const to = data && data.to;
  const lista = Array.isArray(to) ? to : (to ? [to] : []);
  const out = [];
  for (const item of lista) {
    // Tolera "Nome <email@dominio.pt>" além do endereço simples.
    const m = String(item || "").match(/<([^>]+)>/);
    const e = normalizarEmail(m ? m[1] : item);
    if (e && !out.includes(e)) out.push(e);
  }
  return out;
}

function detalheDoEvento(tipo, data) {
  if (tipo === "email.bounced") {
    const b = (data && data.bounce) || {};
    const diag = Array.isArray(b.diagnosticCode) ? b.diagnosticCode.join(" | ") : (b.diagnosticCode || "");
    const txt = [b.type, b.subType, b.message || diag].filter(Boolean).join(" — ");
    return txt || "bounce sem detalhe";
  }
  return "Marcado como spam pelo destinatário";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Sem secret não processamos nada — nunca aceitar eventos não verificados.
    const secret = (process.env.RESEND_WEBHOOK_SECRET || "").trim();
    if (!secret) {
      return res.status(503).json({ error: "RESEND_WEBHOOK_SECRET não configurado — webhook desativado" });
    }
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return res.status(503).json({ error: "FIREBASE_SERVICE_ACCOUNT missing" });
    }

    const bodyRaw = await lerBodyRaw(req);
    if (!bodyRaw) return res.status(400).json({ error: "Body vazio" });

    const verif = verificarAssinatura(req, bodyRaw, secret);
    if (!verif.ok) {
      console.error("resend-webhook assinatura recusada:", verif.erro);
      return res.status(401).json({ error: "Assinatura inválida" });
    }

    let evento;
    try { evento = JSON.parse(bodyRaw); }
    catch (e) { return res.status(400).json({ error: "JSON inválido" }); }

    const tipo = String((evento && evento.type) || "");
    const data = (evento && evento.data) || {};

    // Só nos interessam bounces permanentes e queixas de spam.
    // Nota: o Resend reenvia se devolvermos erro — por isso respondemos sempre 200.
    if (tipo !== "email.bounced" && tipo !== "email.complained") {
      return res.status(200).json({ ok: true, processado: tipo || "desconhecido", ignorado: true });
    }
    if (tipo === "email.bounced") {
      const bt = String((data.bounce && data.bounce.type) || "").toLowerCase();
      if (bt && bt !== "permanent") {
        // Bounce temporário (caixa cheia, servidor em baixo) — o email pode estar bom.
        return res.status(200).json({ ok: true, processado: tipo, ignorado: true, motivo: "bounce temporário" });
      }
    }

    const emails = destinatarios(data);
    if (!emails.length) {
      return res.status(200).json({ ok: true, processado: tipo, ignorado: true, motivo: "sem destinatário" });
    }

    initFirebase();
    const db = getFirestore();

    const motivo = tipo === "email.bounced" ? "bounce" : "spam";
    const detalhe = String(detalheDoEvento(tipo, data)).slice(0, 200);
    const agora = new Date();
    const registados = [];

    for (const email of emails) {
      const ref = db.doc(`emails_invalidos/${docIdDoEmail(email)}`);
      const prev = await ref.get().catch(() => null);

      const doc = {
        email,
        motivo,
        detalhe,
        ocorrencias: FieldValue.increment(1),
        ultima_em: agora,
        ultimo_evento: tipo,
        email_id: data.email_id || null,
        assunto: String(data.subject || "").slice(0, 200) || null,
      };
      if (!prev || !prev.exists) doc.primeira_em = agora;

      // A que creche pertence este email? (para o agente de enriquecimento reprocessar)
      const creche = await crecheDoEmail(email);
      if (creche) {
        doc.creche_id = creche.creche_id;
        doc.creche_nome = creche.creche_nome;
      }

      await ref.set(doc, { merge: true });
      registados.push(email);
    }

    console.log(`resend-webhook: ${motivo} registado para ${registados.join(", ")}`);
    return res.status(200).json({ ok: true, processado: tipo, emails: registados });
  } catch (e) {
    console.error("resend-webhook:", e);
    return res.status(500).json({ error: e.message || "internal" });
  }
}
