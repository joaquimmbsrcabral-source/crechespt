/**
 * Vercel Serverless — regista o DESFECHO de uma candidatura.
 * GET /api/lead-resultado?id={leadId}&r=entrei|espera|sem_vaga|desisti&t={token}
 *
 * Porque existe: o /api/lead-feedback responde a "a creche respondeu?" — mede o
 * comportamento da creche. Este endpoint responde à pergunta que interessa às
 * famílias: "conseguiste vaga?". São coisas diferentes; uma creche pode responder
 * depressa e na mesma não ter lugar.
 *
 * DECISÃO DELIBERADA — o desfecho NÃO é agregado por creche, só por concelho.
 * Conseguir vaga depende sobretudo da lotação, não da educação da instituição.
 * Publicar "só 2 em 10 entram nesta creche" puniria quem tem procura a mais, e
 * não ajudaria ninguém. Agregado ao concelho, é a medida da pressão real —
 * exatamente o indicador que falta às câmaras e à imprensa.
 *
 * Efeitos (idempotentes — só a primeira resposta conta):
 *  - creche_leads/{id}: resultado + resultado_em
 *  - concelho_stats/{concelho_slug}: contadores por desfecho (sem dados pessoais)
 *
 * Env vars: FIREBASE_SERVICE_ACCOUNT, CRON_SECRET.
 */

import crypto from "node:crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const RESULTADOS = {
  entrei:   { emoji: "🎉", label: "entrou na creche" },
  espera:   { emoji: "⏳", label: "ficou em lista de espera" },
  sem_vaga: { emoji: "😔", label: "não havia vaga" },
  desisti:  { emoji: "🔄", label: "desistiu ou escolheu outra" }
};

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

// Mesma derivação de api/lead-reminders.js — o resultado entra no HMAC de
// propósito: quem tem o link do "entrei" não consegue adivinhar o do "sem_vaga".
export function resultadoToken(leadId, r) {
  const key = (process.env.CRON_SECRET || "").trim();
  return crypto.createHmac("sha256", key).update(`res:${leadId}:${r}`).digest("hex").slice(0, 12);
}

// Concelho da creche a partir do dataset público (não há dados pessoais nisto)
async function concelhoDaCreche(creche_id) {
  try {
    const ds = await fetch("https://creches.app/creches_pt.json").then(r => r.json());
    const c = Array.isArray(ds) ? ds.find(x => String(x.id) === String(creche_id)) : null;
    if (!c) return null;
    const slug = String(c.concelho_slug || "").trim();
    return /^[a-z0-9-]{2,60}$/.test(slug) ? { slug, nome: String(c.concelho || "") } : null;
  } catch (e) {
    console.error("concelhoDaCreche:", e);
    return null;
  }
}

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

const PAGINAS = {
  entrei: () => page({
    emoji: "🎉",
    titulo: "Que notícia excelente!",
    mensagem: "Ficamos mesmo contentes. Saber quantas famílias conseguem lugar — e em que concelhos — é o que nos permite mostrar a quem decide onde faltam creches a sério.",
    ctaLabel: "Voltar ao creches.app",
    ctaHref: "https://creches.app",
    nota: "Boa entrada! 🍀"
  }),
  espera: () => page({
    emoji: "⏳",
    titulo: "Obrigado por nos dizeres.",
    mensagem: "A lista de espera é a realidade de muitas famílias e quase nunca aparece nas estatísticas oficiais. A tua resposta ajuda a torná-la visível. Entretanto, podes ativar alertas para saber assim que abrir vaga perto de ti.",
    ctaLabel: "Ver creches com vaga perto de ti →",
    ctaHref: "https://creches.app/app",
    nota: "No mapa podes ativar o filtro «só com vaga»."
  }),
  sem_vaga: () => page({
    emoji: "😔",
    titulo: "Lamentamos.",
    mensagem: "Não devia ser assim difícil. Guardámos a tua resposta: é com estes sinais que conseguimos mostrar, concelho a concelho, quantas famílias ficam sem lugar. Não desistas — abrem vagas ao longo do ano.",
    ctaLabel: "Ver creches com vaga perto de ti →",
    ctaHref: "https://creches.app/app",
    nota: "Podes pedir para te avisarmos assim que abrir vaga numa creche que te interesse."
  }),
  desisti: () => page({
    emoji: "🔄",
    titulo: "Obrigado por nos dizeres.",
    mensagem: "Saber que desististe ou escolheste outra solução é tão útil como saber que entraste — ajuda-nos a perceber o percurso real das famílias.",
    ctaLabel: "Voltar ao creches.app",
    ctaHref: "https://creches.app",
    nota: ""
  })
};

const paginaErro = (titulo, mensagem) => page({
  emoji: "🙃", titulo, mensagem,
  ctaLabel: "Voltar ao creches.app", ctaHref: "https://creches.app",
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
    const rOk = Object.prototype.hasOwnProperty.call(RESULTADOS, r);
    const tOk = /^[a-f0-9]{12}$/.test(t);
    if (!idOk || !rOk || !tOk || !process.env.CRON_SECRET
        || !crypto.timingSafeEqual(Buffer.from(t), Buffer.from(resultadoToken(id, r)))) {
      return res.status(403).send(paginaErro(
        "Link inválido",
        "Este link já não é válido. Se quiseres contar-nos como correu, responde ao email que te enviámos ou escreve-nos."
      ));
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return res.status(503).send(paginaErro("Indisponível", "O serviço está temporariamente indisponível. Tenta novamente daqui a uns minutos."));
    }
    initFirebase();
    const db = getFirestore();

    const leadRef = db.doc(`creche_leads/${id}`);
    let existe = true, jaRespondeu = false, resultado = r, creche_id = "";

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(leadRef);
      if (!snap.exists) { existe = false; return; }
      const lead = snap.data() || {};
      creche_id = String(lead.creche_id || "");
      if (RESULTADOS[lead.resultado]) {
        jaRespondeu = true;
        resultado = lead.resultado;   // não sobrescreve a primeira resposta
        return;
      }
      tx.update(leadRef, { resultado: r, resultado_em: new Date() });
    });

    if (!existe) {
      return res.status(404).send(paginaErro(
        "Não encontrámos este pedido",
        "O pedido pode ter sido removido entretanto. Obrigado na mesma por teres tentado responder-nos!"
      ));
    }

    // Agregado POR CONCELHO (nunca por creche) — só na 1ª resposta
    if (!jaRespondeu && creche_id) {
      try {
        const cc = await concelhoDaCreche(creche_id);
        if (cc) {
          await db.collection("concelho_stats").doc(cc.slug).set({
            concelho_slug: cc.slug,
            concelho: cc.nome,
            [`res_${r}`]: FieldValue.increment(1),
            res_total: FieldValue.increment(1),
            atualizado_em: new Date()
          }, { merge: true });
        }
      } catch (e) {
        // O registo no lead é o que conta — o agregado é reconstituível.
        console.error("lead-resultado concelho_stats:", e);
      }
    }

    return res.status(200).send((PAGINAS[resultado] || PAGINAS.desisti)());
  } catch (e) {
    console.error("lead-resultado:", e);
    return res.status(500).send(paginaErro("Algo correu mal", "Não conseguimos registar a tua resposta. Tenta novamente daqui a pouco ou escreve-nos."));
  }
}
