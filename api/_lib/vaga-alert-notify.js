/**
 * Vercel Serverless — avisa pais subscritos quando alguém reporta vaga numa creche.
 * Chamado pelo cliente (vagas.js) logo após criar o report — fire and forget.
 *
 * Segurança (endpoint público, chamado por pais anónimos):
 *  - só envia se a vaga existir, pertencer à creche indicada, tiver <10 min e não for "sem_vaga"
 *  - os destinatários vêm SEMPRE de vaga_alerts (lookup server-side) — nunca do request
 *  - anti-spam: cada subscritor recebe no máximo 1 email por creche por 7 dias
 *    (notificado_em atualizado após cada envio)
 *  - máx. 100 emails por invocação, 300ms entre envios (reputação do domínio)
 *
 * Env vars: RESEND_API_KEY, FIREBASE_SERVICE_ACCOUNT, CRON_SECRET (token de unsub), EMAIL_FROM (opcional).
 */

import crypto from "node:crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const FROM_EMAIL = process.env.EMAIL_FROM || "Creches.app <onboarding@resend.dev>";
const MAX_EMAILS = 100;
const RENOTIFY_DAYS = 7;

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
}

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

// Token de remoção: primeiros 12 chars do HMAC-SHA256 do docId (chave = CRON_SECRET)
function unsubToken(docId) {
  const key = (process.env.CRON_SECRET || "").trim();
  return crypto.createHmac("sha256", key).update(String(docId)).digest("hex").slice(0, 12);
}

function quandoReportada(ms) {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "agora mesmo";
  if (mins < 60) return `há ${mins} minutos`;
  return `há ${Math.floor(mins / 60)}h`;
}

// A origem da vaga muda o que o pai deve fazer a seguir, por isso tem de estar
// no email. Um report de outra família é um palpite útil; uma confirmação da
// creche é outra coisa. Dizer "foi reportada uma vaga" nos dois casos fazia o
// pai ligar com uma certeza que não tinha — e, na primeira vez que isto foi
// para pessoas a sério (3 set 2026), o pai escreveu-nos a pedir o contacto de
// uma creche que nem contacto tem.
function emailHTML({ nomeCreche, crecheId, quando, unsubUrl, verificada }) {
  const nome = escapeHtml(nomeCreche);
  const mapaUrl = `https://creches.app/app?creche=${encodeURIComponent(crecheId)}`;
  return `<!doctype html><html lang="pt-PT"><body style="margin:0;padding:0;background:#FFF6EE">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF6EE;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(60,40,90,.1)">
  <tr><td style="background:linear-gradient(135deg,#FF6B9D,#FF9F68);padding:30px 32px 26px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><img src="https://creches.app/icon-192.png" width="46" height="46" style="border-radius:12px;display:block" alt="Creches.app"></td>
      <td style="vertical-align:middle;padding-left:12px"><span style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:20px;font-weight:bold;color:#fff">Creches.app</span></td>
    </tr></table>
    <div style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:22px;font-weight:bold;color:#fff;line-height:1.3;margin-top:18px">🟢 Abriu vaga na<br>${nome}!</div>
  </td></tr>
  <tr><td style="padding:28px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2C2356;line-height:1.6">
    <p style="margin:0 0 16px">Pediste para te avisarmos quando abrisse vaga na <b>${nome}</b> — e ${verificada
      ? `a própria creche <b>acabou de confirmar</b> que tem lugar (${escapeHtml(quando)}).`
      : `<b>outra família</b> sinalizou que há lugar (${escapeHtml(quando)}).`}</p>
    ${verificada ? "" : `<div style="background:#FFF3D6;border-radius:12px;padding:13px 16px;margin:0 0 16px;font-size:13.5px;color:#856404;line-height:1.55">
      Esta vaga <b>não foi confirmada pela creche</b> — foi um pai ou mãe que nos disse.
      Vale a pena ligar, mas conta com a possibilidade de já não existir.
    </div>`}
    <div style="background:#DEF5E1;border-left:4px solid #7DD389;border-radius:14px;padding:14px 18px;margin:0 0 22px;font-size:14px;color:#2C2356">
      💡 <b>Liga já</b> — as vagas preenchem-se rápido. Confirma diretamente com a creche antes de contares com ela.
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
      <a href="${mapaUrl}" style="display:inline-block;background:linear-gradient(135deg,#7DD389,#5BC077);color:#fff;font-weight:bold;font-size:16px;text-decoration:none;padding:15px 38px;border-radius:99px">Ver no mapa →</a>
    </td></tr></table>
    <p style="margin:20px 0 0;font-size:13.5px;color:#6E6989;text-align:center">Aí encontras os contactos, horários e tudo o que precisas.</p>
  </td></tr>
  <tr><td style="padding:16px 32px 26px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9B97B5;border-top:1px solid #F0ECF6">
    Recebes este email porque ativaste um alerta de vaga para a ${nome} no creches.app.<br>
    Não queres mais alertas desta creche? <a href="${unsubUrl}" style="color:#9B97B5">Remover alerta</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function emailText({ nomeCreche, crecheId, quando, unsubUrl, verificada }) {
  return `Boas notícias!

Pediste para te avisarmos quando abrisse vaga na ${nomeCreche} — e ${verificada
  ? `a própria creche acabou de confirmar que tem lugar (${quando}).`
  : `outra família sinalizou que há lugar (${quando}).\n\nATENÇÃO: esta vaga não foi confirmada pela creche — foi um pai ou mãe que nos disse. Vale a pena ligar, mas conta com a possibilidade de já não existir.`}

Liga já — as vagas preenchem-se rápido. Confirma diretamente com a creche.

Ver no mapa: https://creches.app/app?creche=${encodeURIComponent(crecheId)}

— Creches.app

(Não queres mais alertas desta creche? Remove aqui: ${unsubUrl})`;
}

// ── Limite por IP ───────────────────────────────────────────────────────────
// Este endpoint envia email para endereços que não foram confirmados por
// ninguém: qualquer pessoa pode subscrever qualquer email a qualquer creche, e
// depois reportar uma vaga para disparar o envio. Sem tecto, isso é um relay de
// spam com o nosso domínio — queima a reputação e a conta do Resend.
// O mesmo limite existe no /api/lead-notify, pelas mesmas razões.
const LIMITE_HORA = 6;

function ipDoPedido(req) {
  const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || req.socket?.remoteAddress || "desconhecido";
}

async function dentroDoLimite(db, ip) {
  const janela = new Date().toISOString().slice(0, 13);          // AAAA-MM-DDTHH
  const ref = db.doc(`ratelimit/vaga-alert_${janela}_${Buffer.from(ip).toString("base64url")}`);
  try {
    const n = await db.runTransaction(async (t) => {
      const d = await t.get(ref);
      const atual = (d.exists && d.data().n) || 0;
      if (atual >= LIMITE_HORA) return atual + 1;
      t.set(ref, { n: atual + 1, ip, janela, expires_at: new Date(Date.now() + 2 * 3600e3) });
      return atual + 1;
    });
    return n <= LIMITE_HORA;
  } catch (e) {
    return true;   // se o contador falhar, não bloqueamos pais legítimos
  }
}

// O nome vai no assunto do email. Vindo do documento `vagas`, que qualquer
// pessoa pode criar com 200 caracteres à escolha, era texto livre num assunto
// enviado do nosso domínio. Passa a vir do dataset público, pelo creche_id.
// O dataset tem 3,3 MB. O processo do Vercel é reaproveitado entre invocações
// quentes, por isso guarda-se em memória por uma hora — senão era um download
// por cada notificação, dentro de um limite de 10 segundos que já é apertado.
let _nomes = null, _nomesEm = 0;

async function nomeOficialDaCreche(crecheId) {
  try {
    if (!_nomes || Date.now() - _nomesEm > 3600e3) {
      const r = await fetch("https://creches.app/creches_pt.json");
      if (!r.ok) return null;
      const ds = await r.json();
      const lista = Array.isArray(ds) ? ds : ds.creches;
      _nomes = new Map(lista.map(c => [String(c.id), String(c.nome || "")]));
      _nomesEm = Date.now();
    }
    const n = _nomes.get(String(crecheId));
    return n ? n.slice(0, 80) : null;
  } catch (e) {
    return null;
  }
}

// Rede de segurança para quando a creche não está no dataset (criada via
// creche_extras) ou o fetch falha: limpa o nome que veio do cliente em vez de
// o usar cru numa linha de assunto enviada do nosso domínio.
function nomeSeguro(bruto) {
  const n = String(bruto || "").replace(/[\r\n]+/g, " ").replace(/[<>]/g, "").trim();
  return n ? n.slice(0, 60) : null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://creches.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    if (!process.env.RESEND_API_KEY || !process.env.FIREBASE_SERVICE_ACCOUNT) {
      return res.status(503).json({ error: "Email not configured yet" });
    }
    initFirebase();
    const db = getFirestore();

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { creche_id, vaga_id } = body;
    if (!creche_id || typeof creche_id !== "string" || creche_id.length > 60) {
      return res.status(400).json({ error: "creche_id inválido" });
    }
    if (!vaga_id || typeof vaga_id !== "string" || vaga_id.length > 40) {
      return res.status(400).json({ error: "vaga_id inválido" });
    }

    // Salvaguardas: a vaga tem de existir, ser desta creche, ser recente e não ser "sem_vaga"
    if (!(await dentroDoLimite(db, ipDoPedido(req)))) {
      return res.status(429).json({ error: "Demasiados pedidos. Tenta daqui a pouco." });
    }

    const snap = await db.doc(`vagas/${vaga_id}`).get();
    if (!snap.exists) return res.status(404).json({ error: "Vaga não existe" });
    const vaga = snap.data();
    if (vaga.creche_id !== creche_id) return res.status(400).json({ error: "Vaga não pertence a esta creche" });
    if (vaga.tipo === "sem_vaga") return res.status(400).json({ error: "Report 'sem vaga' não gera alertas" });
    const ts = vaga.reportado_em && vaga.reportado_em.toMillis ? vaga.reportado_em.toMillis() : 0;
    if (!ts || Date.now() - ts > 10 * 60 * 1000) {
      return res.status(400).json({ error: "Vaga demasiado antiga" });
    }

    // Subscritores desta creche (lookup server-side, nunca do request)
    const subsSnap = await db.collection("vaga_alerts").where("creche_id", "==", creche_id).get();
    if (subsSnap.empty) return res.status(200).json({ ok: true, notificados: 0 });

    // Idempotência + anti-spam: nunca notificado OU última notificação há >7 dias
    const cutoff = Date.now() - RENOTIFY_DAYS * 86400000;
    const elegiveis = [];
    subsSnap.forEach(d => {
      const s = d.data();
      if (!s.email) return;
      const notifMs = s.notificado_em && s.notificado_em.toMillis ? s.notificado_em.toMillis() : 0;
      if (!notifMs || notifMs < cutoff) elegiveis.push({ id: d.id, ref: d.ref, email: s.email });
    });

    // Só depois de sabermos que há mesmo quem notificar — o dataset é caro.
    if (!elegiveis.length) return res.status(200).json({ ok: true, notificados: 0 });

    // Nunca o nome cru do documento criado pelo cliente. Se o dataset não o
    // tiver, usa-se a versão limpa; e se nem isso, uma frase que não fica
    // partida em português ("Abriu vaga na esta creche!").
    const nomeCreche = (await nomeOficialDaCreche(creche_id)) || nomeSeguro(vaga.nome_creche) || "";
    // "verificado" é escrito pelo painel e pelo botão do email — ou seja, pela
    // própria creche. Os reports de famílias vêm com source:"pai" e sem ele.
    const verificada = vaga.verificado === true;
    const quando = quandoReportada(ts);
    let notificados = 0;

    for (const sub of elegiveis.slice(0, MAX_EMAILS)) {
      const unsubUrl = `https://creches.app/api/vaga-alert-unsub?id=${encodeURIComponent(sub.id)}&t=${unsubToken(sub.id)}`;
      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [sub.email],
            subject: nomeCreche ? `🟢 Abriu vaga na ${nomeCreche}!` : "🟢 Abriu vaga numa creche que estás a seguir!",
            html: emailHTML({ nomeCreche, crecheId: creche_id, quando, unsubUrl, verificada }),
            text: emailText({ nomeCreche, crecheId: creche_id, quando, unsubUrl, verificada })
          })
        });
        if (resp.ok) {
          notificados++;
          await sub.ref.update({ notificado_em: FieldValue.serverTimestamp() });
        } else {
          console.error("Resend vaga-alert:", sub.id, await resp.text());
        }
      } catch (e) {
        console.error("vaga-alert-notify envio:", sub.id, e.message);
      }
      // Pequeno intervalo entre envios (protege a reputação)
      await new Promise(r => setTimeout(r, 300));
    }

    return res.status(200).json({ ok: true, notificados });
  } catch (e) {
    console.error("vaga-alert-notify:", e);
    return res.status(500).json({ error: e.message });
  }
}
