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

// ── Email de aviso à creche (template da marca) ──────────────────────────────
function avisoCrecheHTML(lead, temPainel) {
  const creche = escapeHtml(lead.creche_nome || "a vossa creche");
  const linha = (ico, txt) => `<tr><td style="padding:5px 0;font-size:15px;color:#2C2356">${ico}&nbsp;&nbsp;${txt}</td></tr>`;
  const tel = lead.telefone ? String(lead.telefone).replace(/\s+/g, "") : "";
  const detalhes = [
    linha("👤", `<b>${escapeHtml(lead.nome || "")}</b>`),
    linha("✉️", `<a href="mailto:${escapeHtml(lead.email)}" style="color:#B4255C">${escapeHtml(lead.email)}</a>`),
    tel ? linha("📞", `<a href="tel:${escapeHtml(tel)}" style="color:#B4255C">${escapeHtml(lead.telefone)}</a>`) : "",
    lead.idade_crianca ? linha("👶", `Idade da criança: <b>${escapeHtml(lead.idade_crianca)}</b>`) : "",
    lead.mes_entrada ? linha("📅", `Entrada pretendida: <b>${escapeHtml(lead.mes_entrada)}</b>`) : ""
  ].filter(Boolean).join("");

  const msg = lead.mensagem
    ? `<div style="background:#fff;border-left:3px solid #FF9F68;border-radius:8px;padding:14px 16px;margin:0 0 22px;font-size:14.5px;color:#4A4060;font-style:italic">«${escapeHtml(lead.mensagem)}»</div>`
    : "";

  const rodapePainel = temPainel
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
        <a href="https://creches.app/painel" style="display:inline-block;background:linear-gradient(135deg,#FF6B9D,#FF9F68);color:#fff;font-weight:bold;font-size:16px;text-decoration:none;padding:15px 38px;border-radius:99px">Gerir no painel →</a>
      </td></tr></table>
      <p style="margin:14px 0 0;font-size:13px;color:#6E6989;text-align:center">Podem também responder diretamente a este email — vai direto para a família.</p>`
    : `<div style="background:#FFF6EE;border-radius:14px;padding:18px 20px;margin:0 0 18px">
        <div style="font-weight:bold;margin-bottom:6px;color:#2C2356">Sabiam que a vossa página no creches.app é gratuita?</div>
        <div style="font-size:14.5px;color:#4A4060">Podem gerir vagas, receber estes pedidos organizados e ver quantas famílias vos procuram. Sem custos, sem publicidade.</div>
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
        <a href="https://creches.app/para-creches" style="display:inline-block;background:linear-gradient(135deg,#FF6B9D,#FF9F68);color:#fff;font-weight:bold;font-size:16px;text-decoration:none;padding:15px 38px;border-radius:99px">Pedir acesso ao painel →</a>
      </td></tr></table>
      <p style="margin:14px 0 0;font-size:13px;color:#6E6989;text-align:center">Podem responder diretamente a este email — vai direto para a família.</p>`;

  return `<!doctype html><html lang="pt-PT"><body style="margin:0;padding:0;background:#FFF6EE">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF6EE;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(60,40,90,.1)">
  <tr><td style="background:linear-gradient(135deg,#FF6B9D,#FF9F68);padding:30px 32px 26px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><img src="https://creches.app/icon-192.png" width="46" height="46" style="border-radius:12px;display:block" alt="Creches.app"></td>
      <td style="vertical-align:middle;padding-left:12px"><span style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:20px;font-weight:bold;color:#fff">Creches.app</span></td>
    </tr></table>
    <div style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:22px;font-weight:bold;color:#fff;line-height:1.3;margin-top:18px">💌 Uma família quer<br>contactar-vos.</div>
  </td></tr>
  <tr><td style="padding:28px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2C2356;line-height:1.6">
    <p style="margin:0 0 18px">Uma família procurou creche no creches.app e deixou contacto para <b>${creche}</b>:</p>
    <div style="background:#FFF6EE;border-radius:14px;padding:16px 20px;margin:0 0 18px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${detalhes}</table>
    </div>
    ${msg}
    <div style="background:#DEF5E1;border-radius:14px;padding:14px 18px;margin:0 0 22px;font-size:14.5px;color:#1E7B34">
      ⏱️ <b>Responder no próprio dia é meia inscrição feita.</b> As famílias contactam várias creches ao mesmo tempo.
    </div>
    ${rodapePainel}
    <p style="margin:22px 0 0;font-size:14px">— A equipa do creches.app</p>
  </td></tr>
  <tr><td style="padding:16px 32px 26px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9B97B5;border-top:1px solid #F0ECF6">
    Recebem este email porque uma família pediu contacto convosco através do creches.app — um mapa gratuito de creches em Portugal. Não vendemos dados nem fazemos publicidade. Se não quiserem receber estes pedidos, respondam a dizer.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function avisoCrecheText(lead, temPainel) {
  return `Uma família procurou creche no creches.app e deixou contacto para ${lead.creche_nome || "a vossa creche"}:

Nome: ${lead.nome || "—"}
Email: ${lead.email || "—"}
Telefone: ${lead.telefone || "—"}
Idade da criança: ${lead.idade_crianca || "—"}
Entrada pretendida: ${lead.mes_entrada || "—"}
${lead.mensagem ? `Mensagem: «${lead.mensagem}»\n` : ""}
Responder no próprio dia é meia inscrição feita — as famílias contactam várias creches ao mesmo tempo.

${temPainel ? "Gerir no painel: https://creches.app/painel" : "A vossa página no creches.app é gratuita — podem gerir vagas e receber estes pedidos organizados: https://creches.app/para-creches"}

Podem responder diretamente a este email — vai direto para a família.

— A equipa do creches.app`;
}

// Fallback: email da creche no dataset público (para creches ainda sem painel)
async function emailDoDataset(creche_id) {
  try {
    const ds = await fetch("https://creches.app/creches_pt.json").then(r => r.json());
    const c = Array.isArray(ds) ? ds.find(x => String(x.id) === String(creche_id)) : null;
    const em = c && c.email ? String(c.email).trim() : "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) ? em : "";
  } catch (e) {
    console.error("emailDoDataset:", e);
    return "";
  }
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

    // Reenvio manual (admin): salta a idempotência e a janela dos 10 min.
    // Exige Bearer com ID token de um admin — senão qualquer um podia gerar spam.
    let forcado = false;
    if (req.body && req.body.force === true) {
      const authz = req.headers.authorization || "";
      if (!authz.startsWith("Bearer ")) return res.status(401).json({ error: "Reenvio requer admin" });
      const bearer = authz.slice(7).trim();
      const cronSecret = (process.env.CRON_SECRET || "").trim();
      if (cronSecret && bearer === cronSecret) {
        forcado = true;                       // varrimento automático (lead-reminders)
      } else {
        try {                                 // botão do admin no /admin
          const { getAuth } = await import("firebase-admin/auth");
          const dec = await getAuth().verifyIdToken(bearer);
          const adm = await db.doc(`admins/${dec.uid}`).get();
          if (!adm.exists) return res.status(403).json({ error: "Não és admin" });
          forcado = true;
        } catch (e) {
          return res.status(401).json({ error: "Token inválido" });
        }
      }
    }
    if (lead.notificado && !forcado) return res.status(200).json({ ok: true, skipped: "já notificado" });
    const ts = lead.ts && lead.ts.toMillis ? lead.ts.toMillis() : 0;
    if (!forcado && (!ts || Date.now() - ts > 10 * 60 * 1000)) {
      return res.status(400).json({ error: "Lead demasiado antigo" });
    }

    // Destinatários: gestores desta creche (lookup server-side, nunca do request).
    // Se a creche ainda não tem painel, cai no email público do dataset — assim
    // NENHUM pedido de família fica sem chegar à creche.
    const mgrs = await db.collection("creche_managers").where("creche_id", "==", lead.creche_id).get();
    const emails = [];
    mgrs.forEach(d => { const e = d.data().email; if (e) emails.push(e); });
    const temPainel = emails.length > 0;
    if (!temPainel) {
      const fallback = await emailDoDataset(lead.creche_id);
      if (!fallback) return res.status(200).json({ ok: true, skipped: "creche sem email conhecido" });
      emails.push(fallback);
    }

    const payload = {
      from: FROM_EMAIL,
      to: emails.slice(0, 3),
      reply_to: lead.email,
      subject: `💌 Uma família quer contactar a ${lead.creche_nome || "vossa creche"}`,
      text: avisoCrecheText(lead, temPainel),
      html: avisoCrecheHTML(lead, temPainel)
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

    await snap.ref.update({ notificado: true, notificado_em: new Date(), sem_painel: !temPainel });

    // ── Acknowledgment ao pai (best-effort: o email à creche é o crítico) ──
    // Se falhar, regista e segue — o pedido continua a contar como sucesso.
    let ackPai = false;
    if (lead.email && (!lead.ack_pai_enviado || forcado)) {
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
