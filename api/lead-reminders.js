/**
 * Vercel Cron — fecha o circuito dos leads sem resposta. Seguro para correr diariamente.
 *
 * 1) Leads "novo" com 48h–72h e sem lembrete_creche_enviado:
 *    → relembra a creche ("⏰ Uma família aguarda a vossa resposta") e marca lembrete_creche_enviado.
 * 2) Leads "novo" com >5 dias, com email do pai e sem alternativas_pai_enviado:
 *    → email ao pai a sugerir alternativas (mapa com filtro "só com vaga") e marca alternativas_pai_enviado.
 * 3) Leads "novo" com 7–30 dias, com email do pai e sem followup_enviado:
 *    → email ao pai "A {creche} respondeu-te?" com dois botões (Sim / Não) que apontam
 *      para /api/lead-feedback com token HMAC; marca followup_enviado.
 *      As respostas alimentam o agregado creche_stats (capacidade de resposta por creche).
 *
 * Idempotência: as flags só são gravadas depois de o Resend aceitar o envio;
 * se falhar, fica por marcar e tenta-se de novo na execução seguinte.
 * Cada lead recebe no máximo UM email por execução (os blocos terminam em `continue`).
 * Limites: máx. 50 emails por execução, 300ms entre envios.
 *
 * Segurança: só corre com Authorization: Bearer <CRON_SECRET> (padrão do weekly-digest).
 * Env vars: RESEND_API_KEY, FIREBASE_SERVICE_ACCOUNT, CRON_SECRET.
 */

import crypto from "node:crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const FROM_EMAIL = process.env.EMAIL_FROM || "Creches.app <onboarding@resend.dev>";
const MAX_EMAILS = 50;
const PAUSA_MS = 300;
const H48 = 48 * 3600 * 1000;
const H72 = 72 * 3600 * 1000;
const D5 = 5 * 86400000;
const D7 = 7 * 86400000;
const D30 = 30 * 86400000;

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]);
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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function enviarResend(payload) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) console.error("lead-reminders Resend:", await resp.text());
  return resp.ok;
}

// ── Email 1: lembrete à creche (tom "vocês", formal-simpático) ───────────────
function lembreteCrecheEmail(lead, emails) {
  const creche = escapeHtml(lead.creche_nome || "a vossa creche");
  const linhas = [
    `👤 <b>${escapeHtml(lead.nome)}</b>`,
    `✉️ <a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>`,
    lead.telefone ? `📞 <a href="tel:${escapeHtml(String(lead.telefone).replace(/\s+/g, ""))}">${escapeHtml(lead.telefone)}</a>` : "",
    lead.idade_crianca ? `👶 Idade: ${escapeHtml(lead.idade_crianca)}` : "",
    lead.mes_entrada ? `📅 Entrada desejada: ${escapeHtml(lead.mes_entrada)}` : "",
    lead.mensagem ? `💬 «${escapeHtml(lead.mensagem)}»` : ""
  ].filter(Boolean).join("<br>");
  return {
    from: FROM_EMAIL,
    to: emails.slice(0, 3),
    reply_to: lead.email,
    subject: "⏰ Uma família aguarda a vossa resposta",
    text: `Há cerca de 2 dias, uma família deixou contacto para a ${lead.creche_nome || "vossa creche"} no creches.app e ainda está à espera de resposta.\n\nNome: ${lead.nome}\nEmail: ${lead.email}\nTelefone: ${lead.telefone || "—"}\nIdade: ${lead.idade_crianca || "—"}\nEntrada: ${lead.mes_entrada || "—"}\nMensagem: ${lead.mensagem || "—"}\n\nGerir no painel: https://creches.app/painel\n\nPodem responder diretamente a este email — vai para a família. Se já responderam por outra via, basta marcar o pedido como "Contactado" no painel.`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:540px;color:#2C2356;line-height:1.55">
  <p>Há cerca de 2 dias, uma família deixou contacto para <b>${creche}</b> no creches.app — e ainda está à espera de resposta:</p>
  <div style="background:#FFF6EE;border-radius:10px;padding:14px 16px;margin:14px 0">${linhas}</div>
  <p><a href="https://creches.app/painel" style="display:inline-block;background:#FF6B9D;color:#fff;padding:11px 22px;border-radius:20px;text-decoration:none;font-weight:600">Responder no painel</a></p>
  <p style="font-size:13px;color:#6E6989">Podem responder diretamente a este email — vai para a família. Se já responderam por outra via, basta marcar o pedido como «Contactado» no painel.</p>
  <p>— Creches.app</p>
</div>`
  };
}

// ── Email 2: alternativas ao pai (tom "tu", template da marca) ───────────────
function alternativasPaiEmail(lead) {
  const creche = escapeHtml(lead.creche_nome || "creche");
  const zona = lead.concelho || lead.zona || "";
  const ctaLabel = zona ? `Ver creches com vaga em ${escapeHtml(zona)} →` : "Ver creches com vaga na tua zona →";
  const nome = escapeHtml((lead.nome || "").split(" ")[0] || "");
  const html = `<!doctype html><html lang="pt-PT"><body style="margin:0;padding:0;background:#FFF6EE">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF6EE;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(60,40,90,.1)">
  <tr><td style="background:linear-gradient(135deg,#FF6B9D,#FF9F68);padding:30px 32px 26px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><img src="https://creches.app/icon-192.png" width="46" height="46" style="border-radius:12px;display:block" alt="Creches.app"></td>
      <td style="vertical-align:middle;padding-left:12px"><span style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:20px;font-weight:bold;color:#fff">Creches.app</span></td>
    </tr></table>
    <div style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:22px;font-weight:bold;color:#fff;line-height:1.3;margin-top:18px">Ainda sem resposta<br>da ${creche}?</div>
  </td></tr>
  <tr><td style="padding:28px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2C2356;line-height:1.6">
    <p style="margin:0 0 16px">Olá${nome ? " " + nome : ""} 👋</p>
    <p style="margin:0 0 16px">Há uns dias enviaste um pedido de contacto à <b>${creche}</b> e, pelo que sabemos, ainda não tiveste resposta. Não desanimes — às vezes as creches demoram, sobretudo em alturas de muita procura, e podem responder-te por telefone ou por outra via.</p>
    <div style="background:#FFF6EE;border-radius:14px;padding:18px 20px;margin:0 0 22px">
      <div style="font-weight:bold;margin-bottom:8px;color:#2C2356">Entretanto, um plano B nunca fez mal a ninguém</div>
      <div style="font-size:14.5px;color:#4A4060">No mapa podes ativar o filtro <b>«só com vaga»</b> e ver logo que creches${zona ? ` em <b>${escapeHtml(zona)}</b>` : " na tua zona"} têm lugar neste momento.</div>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
      <a href="https://creches.app/app" style="display:inline-block;background:linear-gradient(135deg,#FF6B9D,#FF9F68);color:#fff;font-weight:bold;font-size:16px;text-decoration:none;padding:15px 38px;border-radius:99px">${ctaLabel}</a>
    </td></tr></table>
    <p style="margin:22px 0 0;font-size:14px;color:#4A4060">Se entretanto a ${creche} já te respondeu, ótimo — ignora este email e boa sorte! 🍀</p>
    <p style="margin:16px 0 0;font-size:14px">— A equipa do creches.app</p>
  </td></tr>
  <tr><td style="padding:16px 32px 26px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9B97B5;border-top:1px solid #F0ECF6">
    Recebes este email porque pediste contacto a uma creche no creches.app. Os teus dados nunca são vendidos nem usados para publicidade.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
  const text = `Olá ${lead.nome || ""},

Há uns dias enviaste um pedido de contacto à ${lead.creche_nome || "creche"} e, pelo que sabemos, ainda não tiveste resposta. Não desanimes — às vezes as creches demoram, sobretudo em alturas de muita procura, e podem responder-te por telefone ou por outra via.

Entretanto, um plano B nunca fez mal a ninguém: no mapa podes ativar o filtro "só com vaga" e ver logo que creches${zona ? ` em ${zona}` : " na tua zona"} têm lugar neste momento.

${zona ? `Ver creches com vaga em ${zona}` : "Ver creches com vaga na tua zona"}: https://creches.app/app

Se entretanto a creche já te respondeu, ótimo — ignora este email e boa sorte!

— A equipa do creches.app`;
  return {
    from: FROM_EMAIL,
    to: [lead.email],
    reply_to: "geral@creches.app",
    subject: `Ainda sem resposta da ${lead.creche_nome || "creche"}? Não desanimes`,
    html, text
  };
}

// ── Email 3: follow-up "a creche respondeu?" (tom "tu", dois botões) ─────────
// Token = 12 primeiros chars hex do HMAC-SHA256 de "{leadId}:{resposta}" com CRON_SECRET.
// A resposta entra no HMAC de propósito: quem tem o link do "sim" não consegue
// adivinhar o do "nao" (e vice-versa). Mesma derivação em api/lead-feedback.js.
function feedbackToken(leadId, resposta) {
  const key = (process.env.CRON_SECRET || "").trim();
  return crypto.createHmac("sha256", key).update(`${leadId}:${resposta}`).digest("hex").slice(0, 12);
}

function feedbackUrl(leadId, resposta) {
  return `https://creches.app/api/lead-feedback?id=${encodeURIComponent(leadId)}&r=${resposta}&t=${feedbackToken(leadId, resposta)}`;
}

function followupRespostaEmail(lead, leadId) {
  const creche = escapeHtml(lead.creche_nome || "creche");
  const nome = escapeHtml((lead.nome || "").split(" ")[0] || "");
  const urlSim = feedbackUrl(leadId, "sim");
  const urlNao = feedbackUrl(leadId, "nao");
  const hSim = escapeHtml(urlSim);
  const hNao = escapeHtml(urlNao);
  const html = `<!doctype html><html lang="pt-PT"><body style="margin:0;padding:0;background:#FFF6EE">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF6EE;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(60,40,90,.1)">
  <tr><td style="background:linear-gradient(135deg,#FF6B9D,#FF9F68);padding:30px 32px 26px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><img src="https://creches.app/icon-192.png" width="46" height="46" style="border-radius:12px;display:block" alt="Creches.app"></td>
      <td style="vertical-align:middle;padding-left:12px"><span style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:20px;font-weight:bold;color:#fff">Creches.app</span></td>
    </tr></table>
    <div style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:22px;font-weight:bold;color:#fff;line-height:1.3;margin-top:18px">A ${creche}<br>respondeu-te?</div>
  </td></tr>
  <tr><td style="padding:28px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2C2356;line-height:1.6">
    <p style="margin:0 0 16px">Olá${nome ? " " + nome : ""} 👋</p>
    <p style="margin:0 0 16px">Faz hoje uma semana desde que enviaste o teu pedido à <b>${creche}</b>. Como correu?</p>
    <p style="margin:0 0 22px">É só um clique — e a tua resposta ajuda outras famílias a saber com que creches podem contar.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
      <td width="50%" align="center" style="padding:0 5px 0 0">
        <a href="${hSim}" style="display:block;background:#7DD389;color:#fff;font-weight:bold;font-size:15px;text-decoration:none;padding:16px 10px;border-radius:14px;text-align:center">✓ Sim, responderam</a>
      </td>
      <td width="50%" align="center" style="padding:0 0 0 5px">
        <a href="${hNao}" style="display:block;background:#F3ECEE;color:#7A6E77;font-weight:bold;font-size:15px;text-decoration:none;padding:16px 10px;border-radius:14px;text-align:center;border:1px solid #EADDE1">✗ Não, sem resposta</a>
      </td>
    </tr></table>
    <p style="margin:22px 0 0;font-size:13.5px;color:#6E6989">Se ainda não tiveste resposta, não fiques à espera: no mapa podes ver creches com vaga perto de ti em <a href="https://creches.app/app" style="color:#B4255C">creches.app/app</a>.</p>
    <p style="margin:16px 0 0;font-size:14px">— A equipa do creches.app</p>
  </td></tr>
  <tr><td style="padding:16px 32px 26px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9B97B5;border-top:1px solid #F0ECF6">
    Recebes este email porque pediste contacto a uma creche no creches.app. Os teus dados nunca são vendidos nem usados para publicidade.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
  const text = `Olá ${lead.nome || ""},

Faz hoje uma semana desde que enviaste o teu pedido à ${lead.creche_nome || "creche"}. Como correu?

É só um clique — e a tua resposta ajuda outras famílias a saber com que creches podem contar.

Sim, responderam: ${urlSim}
Não, sem resposta: ${urlNao}

Se ainda não tiveste resposta, não fiques à espera: no mapa podes ver creches com vaga perto de ti em https://creches.app/app

— A equipa do creches.app`;
  return {
    from: FROM_EMAIL,
    to: [lead.email],
    reply_to: "geral@creches.app",
    subject: `A ${lead.creche_nome || "creche"} respondeu-te?`,
    html, text
  };
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

    const agora = Date.now();
    // Leads ainda por responder (o painel usa status: novo → contactado → fechado)
    const snap = await db.collection("creche_leads").where("status", "==", "novo").limit(500).get();

    let enviados = 0, lembretesCreche = 0, alternativasPai = 0, followups = 0, recuperados = 0;
    const mgrCache = new Map();  // creche_id → [emails] (evita queries repetidas)
    const jaEmailados = new Set();  // ids que já receberam email nesta execução

    for (const d of snap.docs) {
      if (enviados >= MAX_EMAILS) break;
      const lead = d.data();
      const ts = lead.ts && lead.ts.toMillis ? lead.ts.toMillis() : 0;
      if (!ts) continue;
      const idade = agora - ts;

      // ── 0) REDE DE SEGURANÇA: lead que nunca chegou a ser notificado ──
      // O aviso à creche é disparado pelo browser do pai. Se a rede falhar ou a
      // página fechar antes do pedido sair, o lead ficava esquecido em silêncio.
      // Aqui apanhamos qualquer lead com >15 min e sem `notificado` e reenviamos
      // pela via normal (o /api/lead-notify trata da creche E da confirmação ao pai).
      if (!lead.notificado && idade > 15 * 60 * 1000) {
        try {
          const r = await fetch("https://creches.app/api/lead-notify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${(process.env.CRON_SECRET || "").trim()}`
            },
            body: JSON.stringify({ lead_id: d.id, force: true })
          });
          if (r.ok) { recuperados++; enviados++; jaEmailados.add(d.id); await sleep(PAUSA_MS); }
          else console.error("recuperação lead", d.id, r.status, await r.text());
        } catch (e) {
          console.error("recuperação lead", d.id, e);
        }
        continue;  // dá tempo à creche antes de qualquer lembrete
      }

      // ── 1) Lembrete à creche: 48h–72h, ainda sem lembrete ──
      if (idade >= H48 && idade <= H72 && !lead.lembrete_creche_enviado && lead.creche_id) {
        let emails = mgrCache.get(lead.creche_id);
        if (!emails) {
          const mgrs = await db.collection("creche_managers").where("creche_id", "==", lead.creche_id).get();
          emails = [];
          mgrs.forEach(m => { const e = m.data().email; if (e) emails.push(e); });
          mgrCache.set(lead.creche_id, emails);
        }
        if (emails.length) {
          const ok = await enviarResend(lembreteCrecheEmail(lead, emails));
          if (ok) {
            await d.ref.update({ lembrete_creche_enviado: true });
            lembretesCreche++;
          }
          enviados++;
          jaEmailados.add(d.id);
          await sleep(PAUSA_MS);
        } else {
          // Sem gestor com email — marcar para não voltar a tentar todos os dias
          await d.ref.update({ lembrete_creche_enviado: true });
        }
        continue;  // no mesmo dia não acumula com o email de alternativas
      }

      // ── 2) Alternativas ao pai: >5 dias, com email, ainda sem sugestão ──
      if (idade > D5 && !lead.alternativas_pai_enviado && lead.email) {
        const ok = await enviarResend(alternativasPaiEmail(lead));
        if (ok) {
          await d.ref.update({ alternativas_pai_enviado: true });
          alternativasPai++;
        }
        enviados++;
        jaEmailados.add(d.id);
        await sleep(PAUSA_MS);
        continue;  // no mesmo dia não acumula com o follow-up de resposta
      }
    }

    // ── 3) Follow-up "a creche respondeu?": 7–30 dias, com email, ainda sem follow-up ──
    // CORREÇÃO DE ENVIESAMENTO (Vaga 1 · 1.1): este bloco vivia dentro do ciclo
    // acima, que só percorre leads com status "novo". Consequência: a creche que
    // entrava no painel e marcava "contactado" — precisamente a que se porta bem —
    // nunca chegava a ser avaliada, e a amostra do creche_stats ficava cheia de
    // "não" e vazia de "sim". Agora perguntamos a TODOS os leads da janela, seja
    // qual for o estado, e a resposta do pai passa a ser também a verificação
    // independente do que a creche marcou no painel.
    // Limite superior de 30 dias para não inundar o histórico antigo.
    if (enviados < MAX_EMAILS) {
      // Ordenado por data desc: a janela 7–30 dias está sempre perto do topo.
      const snapTodos = await db.collection("creche_leads")
        .orderBy("ts", "desc").limit(600).get();

      for (const d of snapTodos.docs) {
        if (enviados >= MAX_EMAILS) break;
        if (jaEmailados.has(d.id)) continue;   // não acumula dois emails no mesmo dia
        const lead = d.data();
        const ts = lead.ts && lead.ts.toMillis ? lead.ts.toMillis() : 0;
        if (!ts) continue;
        const idade = agora - ts;
        if (idade <= D7 || idade >= D30) continue;
        if (lead.followup_enviado || !lead.email) continue;

        const ok = await enviarResend(followupRespostaEmail(lead, d.id));
        if (ok) {
          await d.ref.update({ followup_enviado: true });
          followups++;
        }
        enviados++;
        await sleep(PAUSA_MS);
      }
    }

    return res.status(200).json({ ok: true, recuperados, lembretes_creche: lembretesCreche, alternativas_pai: alternativasPai, followups });
  } catch (e) {
    console.error("lead-reminders:", e);
    return res.status(500).json({ error: e.message });
  }
}
