/**
 * POST /api/send-invites — convida creches a gerir a sua página no painel.
 * Só admin (Firebase ID token + admins/{uid}). Envia via Resend a partir de EMAIL_FROM.
 *
 * Body: { recipients: [{ id, nome, email, ficha? }], dryRun?: bool }
 * - Máx. 60 destinatários por chamada (protege a reputação do domínio).
 * - Idempotente: quem já tem creche_invites/{id} com estado "enviado" é ignorado.
 * - Regista cada envio em creche_invites/{id}.
 *
 * Env vars: RESEND_API_KEY, FIREBASE_SERVICE_ACCOUNT (base64 ou JSON), EMAIL_FROM (opcional).
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

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
  return JSON.parse(raw.slice(start, end + 1));
}

function initFirebase() {
  if (getApps().length) return;
  initializeApp({ credential: cert(parseServiceAccount()) });
}

const FROM_EMAIL = process.env.EMAIL_FROM || "Creches.app <onboarding@resend.dev>";
const MAX_BATCH = 60;

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function emailHTML(nome, ficha) {
  const verFicha = ficha
    ? `<tr><td style="padding:0 0 8px"><a href="${esc(ficha)}" style="color:#FF6B9D;font-weight:bold;text-decoration:none">👀 Ver a vossa página pública →</a></td></tr>`
    : "";
  return `<!doctype html><html lang="pt-PT"><body style="margin:0;padding:0;background:#FFF6EE">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF6EE;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(60,40,90,.1)">
  <tr><td style="background:linear-gradient(135deg,#FF6B9D,#FF9F68);padding:30px 32px 26px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><img src="https://creches.app/icon-192.png" width="46" height="46" style="border-radius:12px;display:block" alt="Creches.app"></td>
      <td style="vertical-align:middle;padding-left:12px"><span style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:20px;font-weight:bold;color:#fff">Creches.app</span></td>
    </tr></table>
    <div style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:22px;font-weight:bold;color:#fff;line-height:1.3;margin-top:18px">A página da ${esc(nome)}<br>já está no mapa — e agora podem geri-la.</div>
  </td></tr>
  <tr><td style="padding:28px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2C2356;line-height:1.6">
    <p style="margin:0 0 16px">Bom dia,</p>
    <p style="margin:0 0 16px">Sou o Joaquim Cabral, fundador do <b>creches.app</b> — o mapa nacional de creches, com mais de 2.800 creches e destacado na NiT e no Público. Criei-o quando esperava o meu primeiro filho.</p>
    <p style="margin:0 0 8px">A <b>${esc(nome)}</b> já tem uma página pública no creches.app, que famílias consultam todos os dias.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px">${verFicha}</table>
    <div style="background:#FFF6EE;border-radius:14px;padding:18px 20px;margin:0 0 22px">
      <div style="font-weight:bold;margin-bottom:10px;color:#2C2356">A novidade: podem geri-la gratuitamente</div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14.5px;color:#4A4060;line-height:1.7">
        <tr><td>✏️ &nbsp;Atualizar contactos, horários e mensalidades</td></tr>
        <tr><td>📷 &nbsp;Adicionar fotografias dos vossos espaços</td></tr>
        <tr><td>🟢 &nbsp;Indicar vagas em tempo real — aparecem logo no mapa</td></tr>
        <tr><td>💌 &nbsp;Receber contactos diretos de famílias interessadas</td></tr>
      </table>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
      <a href="https://creches.app/painel" style="display:inline-block;background:linear-gradient(135deg,#FF6B9D,#FF9F68);color:#fff;font-weight:bold;font-size:16px;text-decoration:none;padding:15px 38px;border-radius:99px">Pedir acesso ao painel →</a>
    </td></tr></table>
    <p style="margin:20px 0 0;font-size:13.5px;color:#6E6989;text-align:center">Demora 2 minutos e sou eu que aprovo pessoalmente.<br>É <b>gratuito</b>, sem anúncios e sem venda de dados.</p>
    <p style="margin:22px 0 0;font-size:14px">Se preferirem, explico tudo por telefone: <b>915 873 799</b>.</p>
    <p style="margin:16px 0 0;font-size:14px">Com os melhores cumprimentos,<br><b>Joaquim Cabral</b> · Fundador, creches.app</p>
  </td></tr>
  <tr><td style="padding:16px 32px 26px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9B97B5;border-top:1px solid #F0ECF6">
    Recebem este email porque a ${esc(nome)} consta no mapa público do creches.app.
    Se não quiserem gerir a página nem receber estes emails, respondam «remover» e retiramos-vos da lista.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function emailText(nome, ficha) {
  return `Bom dia,

Sou o Joaquim Cabral, fundador do creches.app — o mapa nacional de creches (2.800+ creches, destacado na NiT e no Público). Criei-o quando esperava o meu primeiro filho.

A ${nome} já tem uma página pública no creches.app, que famílias consultam todos os dias.${ficha ? `\nVer a vossa página: ${ficha}` : ""}

A novidade: podem geri-la gratuitamente —
- Atualizar contactos, horários e mensalidades
- Adicionar fotografias
- Indicar vagas em tempo real (aparecem logo no mapa)
- Receber contactos diretos de famílias interessadas

Pedir acesso ao painel: https://creches.app/painel — 2 minutos, e sou eu que aprovo pessoalmente. É gratuito, sem anúncios e sem venda de dados.

Se preferirem, explico por telefone: 915 873 799.

Com os melhores cumprimentos,
Joaquim Cabral · Fundador, creches.app

(Se não quiserem receber estes emails, respondam "remover".)`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: "RESEND_API_KEY missing" });
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) return res.status(503).json({ error: "FIREBASE_SERVICE_ACCOUNT missing" });
    initFirebase();

    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Missing auth token" });
    let decoded;
    try { decoded = await getAuth().verifyIdToken(token); }
    catch (e) { return res.status(401).json({ error: "Invalid token" }); }
    const adminDoc = await getFirestore().doc(`admins/${decoded.uid}`).get();
    if (!adminDoc.exists) return res.status(403).json({ error: "Not an admin" });

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const recipients = Array.isArray(body.recipients) ? body.recipients : [];
    const dryRun = !!body.dryRun;
    if (!recipients.length) return res.status(400).json({ error: "No recipients" });
    if (recipients.length > MAX_BATCH) return res.status(400).json({ error: `Batch limit ${MAX_BATCH}` });

    const db = getFirestore();
    const results = [];
    for (const r of recipients) {
      const id = String(r.id || r.email || "");
      const email = String(r.email || "").trim();
      const nome = String(r.nome || "a vossa creche").slice(0, 200);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { results.push({ id, email, status: "email_invalido" }); continue; }

      // Idempotência: já enviado?
      const inviteRef = db.doc(`creche_invites/${id}`);
      const prev = await inviteRef.get();
      if (prev.exists && prev.data().estado === "enviado") { results.push({ id, email, status: "ja_enviado" }); continue; }

      if (dryRun) { results.push({ id, email, status: "dry_run" }); continue; }

      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [email],
            reply_to: "geral@creches.app",
            subject: `A página da ${nome} no creches.app — já a podem gerir (grátis)`,
            html: emailHTML(nome, r.ficha),
            text: emailText(nome, r.ficha),
          }),
        });
        const ok = resp.ok;
        const jr = await resp.json().catch(() => ({}));
        await inviteRef.set({
          creche_id: id, email, nome,
          estado: ok ? "enviado" : "falhou",
          resend_id: jr.id || null,
          erro: ok ? null : (jr.message || `HTTP ${resp.status}`),
          enviado_em: new Date().toISOString(),
          enviado_por: decoded.email || decoded.uid,
        }, { merge: true });
        results.push({ id, email, status: ok ? "enviado" : "falhou", erro: ok ? undefined : (jr.message || resp.status) });
      } catch (e) {
        results.push({ id, email, status: "erro", erro: e.message });
      }
      // Pequeno intervalo entre envios (protege a reputação)
      await new Promise((r) => setTimeout(r, 350));
    }

    const enviados = results.filter((r) => r.status === "enviado").length;
    return res.status(200).json({ total: recipients.length, enviados, results });
  } catch (e) {
    console.error("send-invites error:", e);
    return res.status(500).json({ error: e.message || "internal" });
  }
}
