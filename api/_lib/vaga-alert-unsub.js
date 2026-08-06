/**
 * Vercel Serverless — remove um alerta de vaga (link "Remover alerta" no email).
 * GET /api/vaga-alert-unsub?id={docId}&t={token}
 *
 * O token são os primeiros 12 chars do HMAC-SHA256 do docId com CRON_SECRET como
 * chave — mesma derivação do vaga-alert-notify.js. Sem token válido, 403.
 * Devolve uma página HTML mínima em PT (não JSON — é aberto no browser).
 *
 * Env vars: FIREBASE_SERVICE_ACCOUNT, CRON_SECRET.
 */

import crypto from "node:crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

function unsubToken(docId) {
  const key = (process.env.CRON_SECRET || "").trim();
  return crypto.createHmac("sha256", key).update(String(docId)).digest("hex").slice(0, 12);
}

function page(titulo, mensagem) {
  return `<!doctype html><html lang="pt-PT"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${titulo} — Creches.app</title>
</head><body style="margin:0;background:#FFF6EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#2C2356">
<div style="max-width:440px;margin:60px auto;padding:0 20px;text-align:center">
  <img src="https://creches.app/icon-192.png" width="56" height="56" style="border-radius:14px" alt="Creches.app">
  <h1 style="font-size:22px;margin:22px 0 10px">${titulo}</h1>
  <p style="font-size:15px;line-height:1.6;color:#4A4060;margin:0 0 26px">${mensagem}</p>
  <a href="https://creches.app" style="display:inline-block;background:linear-gradient(135deg,#FF6B9D,#FF9F68);color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:13px 32px;border-radius:99px">Voltar ao creches.app</a>
</div>
</body></html>`;
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (req.method !== "GET") {
    return res.status(405).send(page("Pedido inválido", "Este link só funciona aberto no browser."));
  }

  try {
    const id = String(req.query.id || "");
    const t = String(req.query.t || "");

    if (!id || id.length > 40 || !/^[A-Za-z0-9_-]+$/.test(id)
        || !/^[a-f0-9]{12}$/.test(t)
        || !process.env.CRON_SECRET
        || !crypto.timingSafeEqual(Buffer.from(t), Buffer.from(unsubToken(id)))) {
      return res.status(403).send(page("Link inválido", "Este link de remoção não é válido ou já expirou. Se continuares a receber alertas que não queres, escreve-nos para geral@creches.app."));
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return res.status(503).send(page("Indisponível", "O serviço está temporariamente indisponível. Tenta novamente daqui a uns minutos."));
    }
    initFirebase();
    const db = getFirestore();
    await db.doc(`vaga_alerts/${id}`).delete();

    return res.status(200).send(page("Alerta removido ✓", "Já não vais receber avisos desta creche. Se mudares de ideias, podes ativar o alerta outra vez no mapa."));
  } catch (e) {
    console.error("vaga-alert-unsub:", e);
    return res.status(500).send(page("Algo correu mal", "Não conseguimos remover o alerta. Tenta novamente ou escreve-nos para geral@creches.app."));
  }
}
