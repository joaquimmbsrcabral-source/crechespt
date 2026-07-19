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

// Remetente configurável: usa EMAIL_FROM (ex.: "Creches.app <geral@creches.app>")
// assim que o domínio creches.app estiver verificado no Resend.
// Até lá, cai no domínio de teste do Resend (funciona sempre, mas vai a spam com mais facilidade).
const FROM_EMAIL = process.env.EMAIL_FROM || "Creches.app <onboarding@resend.dev>";

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
  const sa = parseServiceAccount();
  initializeApp({ credential: cert(sa) });
}

// ── Email de confirmação ao pai (template da marca) ──────────────────────────
function ackPaiHTML(lead, linkAcomp) {
  const nome = escapeHtml((lead.nome || "").split(" ")[0] || "");
  const creche = escapeHtml(lead.creche_nome || "creche");
  const cta = linkAcomp
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
      <a href="${escapeHtml(linkAcomp)}" style="display:inline-block;background:linear-gradient(135deg,#FF6B9D,#FF9F68);color:#fff;font-weight:bold;font-size:16px;text-decoration:none;padding:15px 38px;border-radius:99px">Acompanhar a minha candidatura →</a>
    </td></tr></table>
    <p style="margin:14px 0 0;font-size:13px;color:#6E6989;text-align:center">Este link é privado — guarda-o para veres o estado do teu pedido a qualquer momento.</p>`
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
    <div style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:22px;font-weight:bold;color:#fff;line-height:1.3;margin-top:18px">✓ O teu pedido seguiu<br>para a ${creche}.</div>
  </td></tr>
  <tr><td style="padding:28px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2C2356;line-height:1.6">
    <p style="margin:0 0 16px">Olá${nome ? " " + nome : ""} 👋</p>
    <p style="margin:0 0 16px">O teu pedido de contacto foi enviado com sucesso à <b>${creche}</b>. Boa sorte! 🍀</p>
    <div style="background:#FFF6EE;border-radius:14px;padding:18px 20px;margin:0 0 22px">
      <div style="font-weight:bold;margin-bottom:8px;color:#2C2356">O que acontece a seguir?</div>
      <div style="font-size:14.5px;color:#4A4060">A creche recebe o teu contacto e costuma responder em poucos dias — normalmente por email ou telefone, diretamente para ti.</div>
    </div>
    ${cta}
    <p style="margin:22px 0 0;font-size:14px;color:#4A4060">Se não tiveres resposta em alguns dias, nós avisamos-te e sugerimos alternativas.</p>
    <p style="margin:16px 0 0;font-size:14px">— A equipa do creches.app</p>
  </td></tr>
  <tr><td style="padding:16px 32px 26px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9B97B5;border-top:1px solid #F0ECF6">
    Recebes este email porque pediste contacto a uma creche no creches.app. Os teus dados só são partilhados com essa creche — nunca são vendidos nem usados para publicidade.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function ackPaiText(lead, linkAcomp) {
  const creche = lead.creche_nome || "creche";
  return `Olá ${lead.nome || ""},

O teu pedido de contacto foi enviado com sucesso à ${creche}. Boa sorte!

O que acontece a seguir? A creche recebe o teu contacto e costuma responder em poucos dias — normalmente por email ou telefone, diretamente para ti.
${linkAcomp ? `\nAcompanha a tua candidatura (link privado): ${linkAcomp}\n` : ""}
Se não tiveres resposta em alguns dias, nós avisamos-te e sugerimos alternativas.

— A equipa do creches.app`;
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
      from: FROM_EMAIL,
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

    // ── Acknowledgment ao pai (best-effort: o email à creche é o crítico) ──
    // Se falhar, regista e segue — o pedido continua a contar como sucesso.
    let ackPai = false;
    if (lead.email && !lead.ack_pai_enviado) {
      try {
        const tok = (typeof lead.token === "string" && /^[a-zA-Z0-9]{20,64}$/.test(lead.token)) ? lead.token : "";
        const linkAcomp = tok ? `https://creches.app/candidatura?c=${tok}` : "";
        const ackResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [lead.email],
            reply_to: "geral@creches.app",
            subject: `✓ O teu pedido foi enviado à ${lead.creche_nome || "creche"}`,
            html: ackPaiHTML(lead, linkAcomp),
            text: ackPaiText(lead, linkAcomp)
          })
        });
        if (ackResp.ok) {
          await snap.ref.update({ ack_pai_enviado: true });
          ackPai = true;
        } else {
          console.error("lead-notify ack pai falhou:", await ackResp.text());
        }
      } catch (e) {
        console.error("lead-notify ack pai:", e);
      }
    }

    return res.status(200).json({ ok: true, ack_pai: ackPai });
  } catch (e) {
    console.error("lead-notify:", e);
    return res.status(500).json({ error: e.message });
  }
}
