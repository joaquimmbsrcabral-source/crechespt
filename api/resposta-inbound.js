/**
 * Vercel Serverless — recebe a RESPOSTA da creche e reencaminha-a ao pai.
 *
 * PORQUE EXISTE
 * Até aqui o creches.app era estruturalmente cego: no email enviado à creche o
 * reply-to era o email do pai, por isso a resposta ia direta para a caixa dele e
 * nunca passava por nós. Sabíamos quantos pedidos entregávamos, nunca quantos
 * tinham resposta — a não ser perguntando ao pai e esperando que clicasse.
 *
 * Agora cada lead tem um endereço próprio (lead-{token}@RESPOSTA_DOMINIO). A
 * creche carrega em "Responder" como sempre; a mensagem chega aqui, é registada
 * (só o FACTO e a HORA) e reencaminhada ao pai em segundos.
 *
 * PRIVACIDADE — decisão deliberada
 * NUNCA guardamos o corpo da mensagem, nem assunto, nem anexos em base de dados.
 * O conteúdo só existe em memória o tempo do reencaminhamento. Em Firestore fica
 * apenas: houve resposta, quando, e quantas. É o mínimo para a métrica.
 *
 * Endpoint: POST /api/resposta-inbound  (webhook do Resend, evento email.received)
 * Segurança: assinatura Svix, como em api/resend-webhook.js.
 * Env: RESEND_INBOUND_SECRET, RESEND_API_KEY, FIREBASE_SERVICE_ACCOUNT,
 *      RESPOSTA_DOMINIO (ex.: "resposta.creches.app").
 */

import crypto from "node:crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const config = { api: { bodyParser: false } };

const FROM_EMAIL = process.env.EMAIL_FROM || "Creches.app <onboarding@resend.dev>";
const DOMINIO = (process.env.RESPOSTA_DOMINIO || "resposta.creches.app").trim().toLowerCase();
const TOLERANCIA_SEGUNDOS = 5 * 60;
const MAX_CORPO = 200 * 1024;   // não reencaminhamos monstros

function parseServiceAccount() {
  let raw = (process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
  if (!raw.startsWith("{")) raw = Buffer.from(raw, "base64").toString("utf-8").trim();
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

function primeiraHeader(req, ...nomes) {
  for (const n of nomes) {
    const v = req.headers[n];
    if (v) return Array.isArray(v) ? v[0] : String(v);
  }
  return "";
}

// Mesma verificação de api/resend-webhook.js (Svix manual, sem dependências)
function verificarAssinatura(req, bodyRaw, secretEnv) {
  const id = primeiraHeader(req, "svix-id", "webhook-id");
  const timestamp = primeiraHeader(req, "svix-timestamp", "webhook-timestamp");
  const signature = primeiraHeader(req, "svix-signature", "webhook-signature");
  if (!id || !timestamp || !signature) return { ok: false, erro: "Headers Svix em falta" };
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return { ok: false, erro: "svix-timestamp inválido" };
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > TOLERANCIA_SEGUNDOS) {
    return { ok: false, erro: "svix-timestamp fora da janela de 5 min" };
  }
  const secretRaw = String(secretEnv || "").trim();
  const base64 = secretRaw.startsWith("whsec_") ? secretRaw.slice("whsec_".length) : secretRaw;
  let chave;
  try { chave = Buffer.from(base64, "base64"); } catch (e) { return { ok: false, erro: "secret inválido" }; }
  if (!chave.length) return { ok: false, erro: "secret inválido" };
  const esperada = crypto.createHmac("sha256", chave).update(`${id}.${timestamp}.${bodyRaw}`).digest();
  for (const parte of signature.split(" ")) {
    const v = parte.indexOf(",");
    if (v < 0 || parte.slice(0, v) !== "v1") continue;
    let recebida;
    try { recebida = Buffer.from(parte.slice(v + 1), "base64"); } catch (e) { continue; }
    if (recebida.length === esperada.length && crypto.timingSafeEqual(recebida, esperada)) return { ok: true };
  }
  return { ok: false, erro: "Assinatura não corresponde" };
}

/** Extrai o token do lead do endereço lead-{token}@dominio, venha de onde vier. */
export function tokenDoDestino(campos) {
  const re = new RegExp(`lead-([a-f0-9]{20,64})@${DOMINIO.replace(/\./g, "\\.")}`, "i");
  for (const v of campos) {
    if (!v) continue;
    const lista = Array.isArray(v) ? v : [v];
    for (const item of lista) {
      const txt = typeof item === "string" ? item : (item && (item.address || item.email)) || "";
      const m = re.exec(String(txt));
      if (m) return m[1].toLowerCase();
    }
  }
  return "";
}

/** Uma resposta automática não é uma resposta. */
export function eAutomatico(d) {
  const assunto = String(d.subject || "").toLowerCase();
  const h = d.headers || {};
  const get = k => String(h[k] || h[k.toLowerCase()] || "");
  if (get("auto-submitted").toLowerCase().includes("auto-")) return true;
  if (get("x-autoreply") || get("x-autorespond")) return true;
  if (get("precedence").toLowerCase() === "bulk") return true;
  return /^(out of office|automatic reply|resposta autom|ausente do escrit|fora do escrit)/i.test(assunto.trim());
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const bodyRaw = await lerBodyRaw(req);
  if (!process.env.RESEND_INBOUND_SECRET) {
    console.error("resposta-inbound: RESEND_INBOUND_SECRET não configurado");
    return res.status(503).json({ error: "Webhook não configurado" });
  }
  const sig = verificarAssinatura(req, bodyRaw, process.env.RESEND_INBOUND_SECRET);
  if (!sig.ok) {
    console.error("resposta-inbound: assinatura inválida —", sig.erro);
    return res.status(401).json({ error: "Assinatura inválida" });
  }

  let evento;
  try { evento = JSON.parse(bodyRaw); }
  catch (e) { return res.status(400).json({ error: "JSON inválido" }); }

  // Só nos interessa email recebido; qualquer outro evento sai com 200 para o
  // Resend não ficar a repetir entregas.
  const tipo = String(evento.type || "");
  if (!/received|inbound/i.test(tipo)) return res.status(200).json({ ok: true, ignorado: tipo });

  const d = evento.data || {};
  const token = tokenDoDestino([d.to, d.cc, d.envelope_to, d.envelope && d.envelope.to, d.headers && d.headers["delivered-to"]]);
  if (!token) return res.status(200).json({ ok: true, ignorado: "sem token no destinatário" });

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return res.status(503).json({ error: "Firebase não configurado" });
  initFirebase();
  const db = getFirestore();

  // O token do lead é o mesmo que dá acesso à página /candidatura
  const q = await db.collection("creche_leads").where("token", "==", token).limit(1).get();
  if (q.empty) return res.status(200).json({ ok: true, ignorado: "lead não encontrado" });
  const doc = q.docs[0];
  const lead = doc.data() || {};

  const automatico = eAutomatico(d);

  // ── Registo: só o facto e a hora. Nunca o conteúdo. ──
  if (!automatico) {
    const agora = new Date();
    const primeira = !lead.creche_respondeu_em;
    const update = {
      creche_respondeu: true,
      creche_respondeu_via: "email",
      respostas_creche_n: FieldValue.increment(1)
    };
    if (primeira) {
      update.creche_respondeu_em = agora;
      const ts = lead.ts && lead.ts.toMillis ? lead.ts.toMillis() : null;
      if (ts) update.horas_ate_resposta = Math.round((agora.getTime() - ts) / 36e5);
      // Não faz sentido continuar a perguntar ao pai se a creche respondeu.
      update.followup_enviado = true;
    }
    await doc.ref.update(update);

    // Espelho para a página /candidatura (sem dados pessoais)
    if (primeira && typeof lead.token === "string") {
      try {
        await db.doc(`lead_status/${lead.token}`).set(
          { estado: "contactado", atualizado: agora }, { merge: true });
      } catch (e) { console.error("resposta-inbound lead_status:", e); }
    }

    // Agregado público de capacidade de resposta, por creche
    if (primeira && lead.creche_id && !String(lead.creche_id).includes("/")) {
      try {
        await db.collection("creche_stats").doc(String(lead.creche_id)).set({
          creche_id: String(lead.creche_id),
          creche_nome: String(lead.creche_nome || ""),
          respostas_sim: FieldValue.increment(1),
          respostas_total: FieldValue.increment(1),
          respostas_medidas: FieldValue.increment(1),   // medido, não auto-reportado
          atualizado_em: agora
        }, { merge: true });
      } catch (e) { console.error("resposta-inbound creche_stats:", e); }
    }
  }

  // ── Reencaminhar ao pai ──
  if (!lead.email) return res.status(200).json({ ok: true, registado: !automatico, reencaminhado: false });

  const texto = String(d.text || "").slice(0, MAX_CORPO);
  const html = String(d.html || "").slice(0, MAX_CORPO);
  const assunto = String(d.subject || `Resposta da ${lead.creche_nome || "creche"}`).slice(0, 200);
  const deQuem = String((d.from && (d.from.address || d.from)) || "").slice(0, 160);

  const aviso =
    `<div style="background:#FFF6EE;border-left:4px solid #FF6B9D;padding:12px 16px;margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6E6989;line-height:1.5">` +
    `Resposta de <b style="color:#2C2356">${lead.creche_nome ? String(lead.creche_nome).replace(/[<>&]/g, "") : "creche"}</b> ao pedido que fizeste no creches.app. ` +
    `<b>Podes responder diretamente a este email</b> — vai ter à creche.</div>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [lead.email],
        reply_to: deQuem || undefined,   // responder devolve à creche
        subject: assunto,
        html: html ? aviso + html : aviso + `<pre style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2C2356;white-space:pre-wrap;margin:0">${texto.replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]))}</pre>`,
        text: texto || "(mensagem sem texto simples)"
      })
    });
    if (!r.ok) {
      console.error("resposta-inbound reencaminhar:", await r.text());
      return res.status(200).json({ ok: true, registado: !automatico, reencaminhado: false });
    }
  } catch (e) {
    console.error("resposta-inbound reencaminhar:", e);
    return res.status(200).json({ ok: true, registado: !automatico, reencaminhado: false });
  }

  return res.status(200).json({ ok: true, registado: !automatico, automatico, reencaminhado: true });
}
