/**
 * Vercel Serverless — regista a resposta do pai ao follow-up "A creche respondeu?".
 * GET /api/lead-feedback?id={leadId}&r=sim|nao&t={token}
 *
 * O token são os primeiros 12 chars do HMAC-SHA256 de "{leadId}:{resposta}" com
 * CRON_SECRET como chave — mesma derivação de api/lead-reminders.js. A resposta
 * entra no HMAC de propósito: quem tem o link do "sim" não consegue adivinhar o
 * do "nao". Sem token válido, 403.
 *
 * Efeitos (idempotentes — o pai pode clicar duas vezes):
 *  - creche_leads/{id}: resposta_creche ("sim"|"nao") + resposta_creche_em
 *  - creche_stats/{creche_id}: respostas_sim / respostas_nao / respostas_total (increment)
 *
 * Devolve uma página HTML em PT (não JSON — é aberto no browser).
 * Env vars: FIREBASE_SERVICE_ACCOUNT, CRON_SECRET.
 */

import crypto from "node:crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

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

function feedbackToken(leadId, resposta) {
  const key = (process.env.CRON_SECRET || "").trim();
  return crypto.createHmac("sha256", key).update(`${leadId}:${resposta}`).digest("hex").slice(0, 12);
}

// ── Página HTML (estilo da marca: creme, cartão branco, header coral→pêssego) ──
function page({ emoji, titulo, mensagem, ctaLabel, ctaHref, nota }) {
  return `<!doctype html><html lang="pt-PT"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${titulo} — Creches.app</title>
</head><body style="margin:0;background:#FFF6EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2C2356">
<div style="max-width:480px;margin:0 auto;padding:40px 16px 60px">
  <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(60,40,90,.1)">
    <div style="background:linear-gradient(135deg,#FF6B9D,#FF9F68);padding:26px 28px;display:flex;align-items:center;gap:12px">
      <img src="https://creches.app/icon-192.png" width="42" height="42" style="border-radius:11px;display:block" alt="Creches.app">
      <span style="font-size:19px;font-weight:700;color:#fff">Creches.app</span>
    </div>
    <div style="padding:34px 30px 32px;text-align:center">
      <div style="font-size:48px;line-height:1;margin-bottom:14px">${emoji}</div>
      <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px">${titulo}</h1>
      <p style="font-size:15px;line-height:1.65;color:#4A4060;margin:0 0 26px">${mensagem}</p>
      <a href="${ctaHref}" style="display:inline-block;background:linear-gradient(135deg,#FF6B9D,#FF9F68);color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:99px">${ctaLabel}</a>
      ${nota ? `<p style="font-size:13px;line-height:1.6;color:#9B97B5;margin:22px 0 0">${nota}</p>` : ""}
    </div>
  </div>
  <p style="text-align:center;font-size:12px;color:#9B97B5;margin:22px 0 0">Obrigado por ajudares a mapear as creches de Portugal 💛</p>
</div>
</body></html>`;
}

const paginaSim = () => page({
  emoji: "🎉",
  titulo: "Que bom! Obrigado por nos dizeres.",
  mensagem: "Ficamos mesmo contentes por a creche te ter respondido. Guardámos a tua resposta — é assim que conseguimos mostrar a outras famílias com que creches podem contar.",
  ctaLabel: "Voltar ao creches.app",
  ctaHref: "https://creches.app",
  nota: "Boa sorte com a inscrição! 🍀"
});

const paginaNao = () => page({
  emoji: "😔",
  titulo: "Lamentamos. Obrigado por nos dizeres.",
  mensagem: "Não devia ser assim — uma semana à espera é muito tempo quando se procura creche. Guardámos a tua resposta: é com estes sinais que percebemos que creches costumam responder às famílias e quais é que não respondem.",
  ctaLabel: "Ver creches com vaga perto de ti →",
  ctaHref: "https://creches.app/app",
  nota: "No mapa podes ativar o filtro «só com vaga» e ver logo quem tem lugar agora."
});

const paginaErro = (titulo, mensagem) => page({
  emoji: "🙃",
  titulo,
  mensagem,
  ctaLabel: "Voltar ao creches.app",
  ctaHref: "https://creches.app",
  nota: "Se precisares de ajuda, escreve-nos para <a href=\"mailto:geral@creches.app\" style=\"color:#B4255C\">geral@creches.app</a>."
});

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    return res.status(405).send(paginaErro("Pedido inválido", "Este link só funciona aberto no browser."));
  }

  try {
    const id = String(req.query.id || "");
    const r = String(req.query.r || "");
    const t = String(req.query.t || "");

    const idOk = !!id && id.length <= 40 && /^[A-Za-z0-9_-]+$/.test(id);
    const rOk = r === "sim" || r === "nao";
    const tOk = /^[a-f0-9]{12}$/.test(t);
    if (!idOk || !rOk || !tOk || !process.env.CRON_SECRET
        || !crypto.timingSafeEqual(Buffer.from(t), Buffer.from(feedbackToken(id, r)))) {
      return res.status(403).send(paginaErro(
        "Link inválido",
        "Este link já não é válido. Se quiseres contar-nos como correu com a creche, responde ao email que te enviámos ou escreve-nos."
      ));
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return res.status(503).send(paginaErro("Indisponível", "O serviço está temporariamente indisponível. Tenta novamente daqui a uns minutos."));
    }
    initFirebase();
    const db = getFirestore();

    const leadRef = db.doc(`creche_leads/${id}`);
    let existe = true, jaRespondeu = false, resposta = r, creche_id = "", creche_nome = "";

    // Transação: só grava se ainda não houver resposta (idempotente, à prova de duplo clique)
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(leadRef);
      if (!snap.exists) { existe = false; return; }
      const lead = snap.data() || {};
      creche_id = String(lead.creche_id || "");
      creche_nome = String(lead.creche_nome || "");
      if (lead.resposta_creche === "sim" || lead.resposta_creche === "nao") {
        jaRespondeu = true;
        resposta = lead.resposta_creche;  // não sobrescreve a primeira resposta
        return;
      }
      tx.update(leadRef, { resposta_creche: r, resposta_creche_em: new Date() });
    });

    if (!existe) {
      return res.status(404).send(paginaErro("Não encontrámos este pedido", "O pedido pode ter sido removido entretanto. Obrigado na mesma por teres tentado responder-nos!"));
    }

    // Agregado por creche (informação pública, sem dados pessoais) — só na 1ª resposta
    if (!jaRespondeu && creche_id && !creche_id.includes("/")) {
      try {
        await db.collection("creche_stats").doc(creche_id).set({
          creche_id,
          creche_nome,
          [r === "sim" ? "respostas_sim" : "respostas_nao"]: FieldValue.increment(1),
          respostas_total: FieldValue.increment(1),
          atualizado_em: new Date()
        }, { merge: true });
      } catch (e) {
        // O importante é o registo no lead — o agregado é reconstituível.
        console.error("lead-feedback creche_stats:", e);
      }
    }

    return res.status(200).send(resposta === "sim" ? paginaSim() : paginaNao());
  } catch (e) {
    console.error("lead-feedback:", e);
    return res.status(500).send(paginaErro("Algo correu mal", "Não conseguimos registar a tua resposta. Tenta novamente daqui a pouco ou escreve-nos."));
  }
}
