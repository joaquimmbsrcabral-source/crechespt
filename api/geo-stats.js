/**
 * GET (ou POST) /api/geo-stats — visualizações das fichas agregadas geograficamente,
 * para alimentar o mapa de calor da procura no /admin.
 *
 * Auth (igual ao /api/ops): Authorization: Bearer <Firebase ID token de admin>
 * OU Bearer <CRON_SECRET> (agente agendado).
 *
 * Parâmetros (query string ou body JSON):
 *   dias — janela temporal em dias (default 90, máximo 365). As views vivem em
 *          creche_views/{creche_id}/days/{yyyy-mm-dd}, por isso a janela é real:
 *          contam-se só os dias >= (hoje - dias + 1), no fuso de Lisboa.
 *
 * Devolve três níveis de agregação: pontos (para o heatmap, máx. 3000),
 * concelhos e distritos (ordenados por views descendente).
 *
 * Env vars: FIREBASE_SERVICE_ACCOUNT (base64 ou JSON), CRON_SECRET.
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const DATASET_URL = "https://creches.app/creches_pt.json";
const MAX_PONTOS = 3000;
const DIAS_DEFAULT = 90;
const DIAS_MAX = 365;

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

// Data YYYY-MM-DD no fuso de Lisboa (mesma convenção do daily-stats)
function lisbonDate(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(d);
}

// Texto normalizado para agregação: trim + colapsa espaços; vazio → "Desconhecido"
function limpar(s) {
  const t = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  return t || "Desconhecido";
}

// Um creche_id pode aparecer com ou sem o prefixo "extra_" (claims/managers antigos)
function variantesId(id) {
  const s = String(id || "").trim();
  if (!s) return [];
  return s.startsWith("extra_") ? [s, s.slice(6)] : [s, "extra_" + s];
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return res.status(503).json({ error: "FIREBASE_SERVICE_ACCOUNT missing" });
    }
    initFirebase();
    const db = getFirestore();

    // ── Auth: (a) token de admin (UI do /admin), (b) CRON_SECRET (agente) ──
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return res.status(401).json({ error: "Missing auth token" });
    const cronSecret = (process.env.CRON_SECRET || "").trim();
    if (!(cronSecret && token === cronSecret)) {
      let decoded;
      try { decoded = await getAuth().verifyIdToken(token); }
      catch (e) { return res.status(401).json({ error: "Invalid token" }); }
      const adminDoc = await db.doc(`admins/${decoded.uid}`).get();
      if (!adminDoc.exists) return res.status(403).json({ error: "Not an admin" });
    }

    // ── Parâmetro dias (query string ou body) ──
    const body = typeof req.body === "string" ? (JSON.parse(req.body || "{}") || {}) : (req.body || {});
    const diasRaw = (req.query && req.query.dias != null) ? req.query.dias : body.dias;
    let dias = parseInt(diasRaw, 10);
    if (!Number.isFinite(dias) || dias < 1) dias = DIAS_DEFAULT;
    if (dias > DIAS_MAX) dias = DIAS_MAX;
    const desde = lisbonDate(-(dias - 1));   // inclusive; datas comparam-se como strings ISO
    const ate = lisbonDate(0);

    // ── Dataset público (nome, lat/lon, distrito, localidade=concelho, tipo) ──
    let dataset;
    try {
      const r = await fetch(DATASET_URL);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      dataset = await r.json();
      if (!Array.isArray(dataset)) throw new Error("dataset não é uma lista");
    } catch (e) {
      console.error("geo-stats: falha a ler o dataset:", e);
      return res.status(502).json({ error: "Falha a ler o dataset creches_pt.json: " + (e.message || e) });
    }

    // ── Firestore: uma passagem pelas views, uma pelos managers ──
    const [daysSnap, mgrsSnap] = await Promise.all([
      db.collectionGroup("days").get(),
      db.collection("creche_managers").get(),
    ]);

    // Views por creche dentro da janela (creche_views/{id}/days/{yyyy-mm-dd}.count)
    const viewsPorCreche = new Map();
    let docsJanela = 0, totalViews = 0;
    daysSnap.forEach((d) => {
      if (d.ref.parent.id !== "days") return;                 // só creche_views/*/days
      const dia = d.id;
      if (dia < desde || dia > ate) return;                   // janela temporal
      const parent = d.ref.parent.parent;
      if (!parent) return;
      const count = Number(d.data().count) || 0;
      if (count <= 0) return;
      docsJanela++;
      totalViews += count;
      viewsPorCreche.set(parent.id, (viewsPorCreche.get(parent.id) || 0) + count);
    });

    // Creches com gestor (aderentes), indexadas pelas duas variantes do id
    const aderentesIds = new Set();
    mgrsSnap.forEach((d) => {
      const cid = d.data().creche_id;
      for (const v of variantesId(cid)) aderentesIds.add(v);
    });

    console.log(
      `geo-stats: ${daysSnap.size} docs em creche_views/*/days lidos ` +
      `(${docsJanela} na janela ${desde}..${ate}), ${mgrsSnap.size} managers, ` +
      `${dataset.length} creches no dataset`
    );

    // ── Uma passagem pelo dataset: pontos + agregação por concelho e distrito ──
    const porConcelho = new Map();   // chave: "distrito||concelho"
    const porDistrito = new Map();
    const pontos = [];
    let crechesComViews = 0;

    for (const c of dataset) {
      const id = String(c.id || "");
      if (!id) continue;
      const distrito = limpar(c.distrito || c.distrito_inferido);
      // `concelho` é atribuído por point-in-polygon sobre a CAOP (100% do dataset);
      // `localidade` fica como fallback histórico porque muitas vezes é freguesia.
      const concelho = limpar(c.concelho || c.localidade);
      const concelhoSlug = c.concelho_slug || "";
      const chaveC = distrito + "||" + concelho;

      let views = 0;
      for (const v of variantesId(id)) views += viewsPorCreche.get(v) || 0;
      const temViews = views > 0;
      if (temViews) crechesComViews++;

      const aderente = variantesId(id).some((v) => aderentesIds.has(v));

      let ag = porConcelho.get(chaveC);
      if (!ag) {
        ag = { concelho, concelho_slug: concelhoSlug, distrito, views: 0, creches_no_mapa: 0, creches_com_views: 0, aderentes: 0 };
        porConcelho.set(chaveC, ag);
      }
      ag.creches_no_mapa++;
      ag.views += views;
      if (temViews) ag.creches_com_views++;
      if (aderente) ag.aderentes++;

      let ad = porDistrito.get(distrito);
      if (!ad) {
        ad = { distrito, views: 0, creches_no_mapa: 0, creches_com_views: 0 };
        porDistrito.set(distrito, ad);
      }
      ad.creches_no_mapa++;
      ad.views += views;
      if (temViews) ad.creches_com_views++;

      // Pontos do heatmap: só creches com views e com coordenadas válidas
      const lat = Number(c.lat), lon = Number(c.lon);
      if (temViews && Number.isFinite(lat) && Number.isFinite(lon)) {
        pontos.push({
          id,
          nome: c.nome || id,
          lat,
          lon,
          views,
          distrito,
          concelho,
          tipo: c.tipo || "Desconhecido",
        });
      }
    }

    pontos.sort((a, b) => b.views - a.views);
    const pontosTop = pontos.slice(0, MAX_PONTOS);

    const concelhos = [...porConcelho.values()].sort((a, b) => b.views - a.views);
    const distritos = [...porDistrito.values()].sort((a, b) => b.views - a.views);

    // Views de ids que já não existem no dataset (creches removidas/renomeadas)
    let viewsSemGeo = 0;
    const idsDataset = new Set();
    for (const c of dataset) for (const v of variantesId(c.id)) idsDataset.add(v);
    for (const [cid, n] of viewsPorCreche) if (!idsDataset.has(cid)) viewsSemGeo += n;

    return res.status(200).json({
      gerado_em: new Date().toISOString(),
      janela: "dias",
      janela_dias: dias,
      janela_desde: desde,
      janela_ate: ate,
      total_views: totalViews,
      creches_com_views: crechesComViews,
      views_sem_geo: viewsSemGeo,
      pontos_truncados: pontos.length > MAX_PONTOS,
      pontos: pontosTop,
      concelhos,
      distritos,
    });
  } catch (e) {
    console.error("geo-stats error:", e);
    return res.status(500).json({ error: e.message || "internal" });
  }
}
