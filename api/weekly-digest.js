/**
 * Vercel Cron — resumo semanal por email a cada creche aderente.
 * Agendado no vercel.json (segundas 08:00 UTC). É O gatilho de retenção:
 * "esta semana: N visualizações, M famílias interessadas — entra no painel".
 *
 * Segurança: só corre com Authorization: Bearer <CRON_SECRET> (o Vercel envia-o
 * automaticamente nos cron jobs quando a env var CRON_SECRET está definida).
 *
 * Env vars: RESEND_API_KEY, FIREBASE_SERVICE_ACCOUNT, CRON_SECRET.
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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
  const sa = parseServiceAccount();
  initializeApp({ credential: cert(sa) });
}

export default async function handler(req, res) {
  try {
    if (!process.env.CRON_SECRET || (req.headers.authorization || "") !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!process.env.RESEND_API_KEY || !process.env.FIREBASE_SERVICE_ACCOUNT) {
      return res.status(503).json({ error: "Email not configured" });
    }
    initFirebase();
    const db = getFirestore();

    // Dias (UTC) da última semana — mesmas chaves que os contadores usam
    const dias = [];
    for (let i = 7; i >= 1; i--) {
      const d = new Date(Date.now() - i * 86400000);
      dias.push(d.toISOString().slice(0, 10));
    }
    const seteDiasMs = Date.now() - 7 * 86400000;

    const mgrs = await db.collection("creche_managers").limit(100).get();
    let enviados = 0;

    for (const m of mgrs.docs) {
      const { creche_id, creche_nome, email } = m.data();
      if (!email || !creche_id) continue;

      // Visualizações da semana
      const viewSnaps = await Promise.all(
        dias.map(day => db.doc(`creche_views/${creche_id}/days/${day}`).get().catch(() => null))
      );
      const views = viewSnaps.reduce((a, s) => a + ((s && s.exists) ? (s.data().count || 0) : 0), 0);

      // Leads novos da semana
      const leadsSnap = await db.collection("creche_leads").where("creche_id", "==", creche_id).get();
      let leadsSemana = 0, leadsPorResponder = 0;
      leadsSnap.forEach(d => {
        const x = d.data();
        const ts = x.ts && x.ts.toMillis ? x.ts.toMillis() : 0;
        if (ts > seteDiasMs) leadsSemana++;
        if ((x.status || "novo") === "novo") leadsPorResponder++;
      });

      // Sem atividade nenhuma → não enviar (evitar spam a creches paradas)
      if (views === 0 && leadsSemana === 0 && leadsPorResponder === 0) continue;

      const nome = creche_nome || "a vossa creche";
      const urgencia = leadsPorResponder > 0
        ? `<p style="background:#FFE2EC;border-radius:10px;padding:12px 16px"><b>⚠️ ${leadsPorResponder} família${leadsPorResponder === 1 ? "" : "s"} por responder</b> — responder depressa é meia inscrição feita.</p>`
        : "";

      const payload = {
        from: "Creches.app <onboarding@resend.dev>",
        to: [email],
        reply_to: "geral@creches.app",
        subject: `📊 A vossa semana no creches.app: ${views} visualizaç${views === 1 ? "ão" : "ões"}${leadsSemana ? ` · ${leadsSemana} família${leadsSemana === 1 ? "" : "s"} interessada${leadsSemana === 1 ? "" : "s"}` : ""}`,
        text: `Resumo semanal — ${nome}\n\n👀 ${views} visualizações da vossa página\n💌 ${leadsSemana} novas famílias interessadas\n${leadsPorResponder ? `⚠️ ${leadsPorResponder} por responder\n` : ""}\nPainel: https://creches.app/painel\n\nPara deixar de receber este resumo, respondam a este email.`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;color:#2C2356;line-height:1.55">
  <p>Resumo semanal de <b>${nome}</b> no creches.app:</p>
  <div style="background:#FFF6EE;border-radius:10px;padding:14px 16px;margin:12px 0;font-size:15px">
    👀 <b>${views}</b> visualizações da vossa página<br>
    💌 <b>${leadsSemana}</b> nova${leadsSemana === 1 ? "" : "s"} família${leadsSemana === 1 ? "" : "s"} interessada${leadsSemana === 1 ? "" : "s"}
  </div>
  ${urgencia}
  <p><a href="https://creches.app/painel" style="display:inline-block;background:#FF6B9D;color:#fff;padding:11px 22px;border-radius:20px;text-decoration:none;font-weight:600">Abrir o painel</a></p>
  <p style="font-size:12px;color:#6E6989">Recebem este resumo por gerirem a página da creche no creches.app. Para deixar de o receber, respondam a este email.</p>
</div>`
      };

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (resp.ok) enviados++;
      else console.error("digest falhou p/", creche_id, await resp.text());
    }

    return res.status(200).json({ ok: true, enviados });
  } catch (e) {
    console.error("weekly-digest:", e);
    return res.status(500).json({ error: e.message });
  }
}
