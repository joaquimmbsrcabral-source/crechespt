/**
 * Vercel Serverless — avisa a creche por email quando entra um lead novo.
 * Chamado pelo cliente (perfil-creche.js) logo após criar o lead — fire and forget.
 *
 * Segurança (endpoint público, chamado por pais anónimos):
 *  - só envia se o lead existir, tiver <10 min e ainda não tiver sido notificado
 *  - o destinatário vem SEMPRE do creche_managers (lookup server-side) — nunca do request
 *  - marca notificado:true (idempotente: cada lead notifica no máximo 1 vez)
 *
 * Env vars: RESEND_API_KEY, FIREBASE_SERVICE_ACCOUNT (as mesmas do notify.js).
 * Sem elas responde 503 e o lead continua a aparecer no painel normalmente.
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
}

function initFirebase() {
  if (getApps().length) return;
  const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf-8"));
  initializeApp({ credential: cert(sa) });
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

    const { lead_id } = req.body || {};
    if (!lead_id || typeof lead_id !== "string" || lead_id.length > 40) {
      return res.status(400).json({ error: "lead_id inválido" });
    }

    const snap = await db.doc(`creche_leads/${lead_id}`).get();
    if (!snap.exists) return res.status(404).json({ error: "Lead não existe" });
    const lead = snap.data();

    // Idempotência + janela temporal
    if (lead.notificado) return res.status(200).json({ ok: true, skipped: "já notificado" });
    const ts = lead.ts && lead.ts.toMillis ? lead.ts.toMillis() : 0;
    if (!ts || Date.now() - ts > 10 * 60 * 1000) {
      return res.status(400).json({ error: "Lead demasiado antigo" });
    }

    // Destinatários: os gestores desta creche (lookup server-side, nunca do request)
    const mgrs = await db.collection("creche_managers").where("creche_id", "==", lead.creche_id).get();
    const emails = [];
    mgrs.forEach(d => { const e = d.data().email; if (e) emails.push(e); });
    if (!emails.length) return res.status(200).json({ ok: true, skipped: "sem gestor com email" });

    const nome = escapeHtml(lead.nome);
    const creche = escapeHtml(lead.creche_nome || "a vossa creche");
    const linhas = [
      `👤 <b>${nome}</b>`,
      `✉️ <a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>`,
      lead.telefone ? `📞 <a href="tel:${escapeHtml(String(lead.telefone).replace(/\s+/g,""))}">${escapeHtml(lead.telefone)}</a>` : "",
      lead.idade_crianca ? `👶 Idade: ${escapeHtml(lead.idade_crianca)}` : "",
      lead.mes_entrada ? `📅 Entrada desejada: ${escapeHtml(lead.mes_entrada)}` : "",
      lead.mensagem ? `💬 «${escapeHtml(lead.mensagem)}»` : ""
    ].filter(Boolean).join("<br>");

    const payload = {
      from: "Creches.app <onboarding@resend.dev>",
      to: emails.slice(0, 3),
      reply_to: lead.email,
      subject: `💌 Família interessada na ${lead.creche_nome || "vossa creche"} — responder depressa vale ouro`,
      text: `Uma família deixou contacto para a ${lead.creche_nome || "vossa creche"} no creches.app.\n\nNome: ${lead.nome}\nEmail: ${lead.email}\nTelefone: ${lead.telefone || "—"}\nIdade: ${lead.idade_crianca || "—"}\nEntrada: ${lead.mes_entrada || "—"}\nMensagem: ${lead.mensagem || "—"}\n\nGerir no painel: https://creches.app/painel\n\nDica: responder no próprio dia é meia inscrição feita. Podem responder diretamente a este email.`,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:540px;color:#2C2356;line-height:1.55">
  <p>Boas notícias — uma família deixou contacto para <b>${creche}</b> no creches.app:</p>
  <div style="background:#FFF6EE;border-radius:10px;padding:14px 16px;margin:14px 0">${linhas}</div>
  <p><a href="https://creches.app/painel" style="display:inline-block;background:#FF6B9D;color:#fff;padding:11px 22px;border-radius:20px;text-decoration:none;font-weight:600">Gerir no painel</a></p>
  <p style="font-size:13px;color:#6E6989">Dica: responder no próprio dia é meia inscrição feita. Podem responder diretamente a este email — vai para a família.</p>
  <p>— Creches.app</p>
</div>`
    };

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      console.error("Resend lead-notify:", await resp.text());
      return res.status(502).json({ error: "Envio falhou" });
    }

    await snap.ref.update({ notificado: true });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("lead-notify:", e);
    return res.status(500).json({ error: e.message });
  }
}
