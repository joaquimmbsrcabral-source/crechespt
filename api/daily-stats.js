/**
 * GET /api/daily-stats — estatísticas completas para o briefing diário do fundador.
 * Protegido por Authorization: Bearer <CRON_SECRET>.
 *
 * Env vars necessárias: FIREBASE_SERVICE_ACCOUNT (base64), CRON_SECRET.
 * (Não precisa de RESEND_API_KEY — só lê dados, não envia emails.)
 *
 * Devolve JSON: utilizadores, leads, vagas, rede (aderentes/pendências), views.
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

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

// Data YYYY-MM-DD no fuso de Lisboa
function lisbonDate(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(d);
}

export default async function handler(req, res) {
  try {
    const secret = (process.env.CRON_SECRET || "").trim();
    if (!secret || (req.headers.authorization || "").trim() !== `Bearer ${secret}`) {
      return res.status(401).json({ error: secret ? "Unauthorized" : "CRON_SECRET not configured" });
    }
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return res.status(503).json({ error: "FIREBASE_SERVICE_ACCOUNT not configured" });
    }
    initFirebase();
    const db = getFirestore();
    const auth = getAuth();
    const now = Date.now();
    const h24 = now - 24 * 3600 * 1000;
    const toMs = (t) => (t && t.toMillis ? t.toMillis() : 0);

    // ── Utilizadores (Firebase Auth) ──
    let usersTotal = 0, usersNew24h = 0;
    let pageToken = undefined;
    do {
      const page = await auth.listUsers(1000, pageToken);
      usersTotal += page.users.length;
      for (const u of page.users) {
        const created = Date.parse(u.metadata.creationTime || 0);
        if (created >= h24) usersNew24h++;
      }
      pageToken = page.pageToken;
    } while (pageToken);

    // ── Firestore: tudo em paralelo ──
    const [vagasSnap, leadsSnap, profilesSnap, mgrsSnap, claimsSnap, fotosSnap, daysSnap] = await Promise.all([
      db.collection("vagas").get(),
      db.collection("creche_leads").get(),
      db.collection("creche_profiles").get(),
      db.collection("creche_managers").get(),
      db.collection("creche_claims").get(),
      db.collection("creche_fotos").where("status", "==", "pending").get().catch(() => ({ size: 0 })),
      db.collectionGroup("days").get(),
    ]);

    // ── Vagas (com regra "sem_vaga" cancela reports de pais anteriores) ──
    const semVagaMax = new Map();
    vagasSnap.forEach((d) => {
      const v = d.data();
      if (v.tipo !== "sem_vaga" || !v.creche_id) return;
      if (toMs(v.expires_at) <= now) return;
      const ts = toMs(v.reportado_em);
      if (ts > (semVagaMax.get(v.creche_id) || 0)) semVagaMax.set(v.creche_id, ts);
    });
    let ativas = 0, ativasVerif = 0, novasPais = 0, novasCreches = 0, semVaga24h = 0;
    vagasSnap.forEach((d) => {
      const v = d.data();
      const rep = toMs(v.reportado_em);
      if (v.tipo === "sem_vaga") {
        if (rep >= h24) semVaga24h++;
        return;
      }
      const activa = toMs(v.expires_at) > now &&
        !(!v.verificado && semVagaMax.has(v.creche_id) && rep <= semVagaMax.get(v.creche_id));
      if (activa) { ativas++; if (v.verificado) ativasVerif++; }
      if (rep >= h24) { if (v.source === "painel" || v.source === "creche") novasCreches++; else novasPais++; }
    });

    // ── Leads ──
    let leadsTotal = 0, leadsNovos24h = 0;
    const leadsPorEstado = {};
    leadsSnap.forEach((d) => {
      const l = d.data();
      leadsTotal++;
      leadsPorEstado[l.status || "novo"] = (leadsPorEstado[l.status || "novo"] || 0) + 1;
      if (toMs(l.ts) >= h24) leadsNovos24h++;
    });

    // ── Rede ──
    const aderentes = new Set();
    mgrsSnap.forEach((d) => { const c = d.data().creche_id; if (c) aderentes.add(c); });
    let claimsPendentes = 0, claimsNovos24h = 0;
    claimsSnap.forEach((d) => {
      const c = d.data();
      if (c.status === "pending") claimsPendentes++;
      if (toMs(c.ts) >= h24) claimsNovos24h++;
    });

    // ── Views (ontem + hoje, fuso de Lisboa) ──
    const ontem = lisbonDate(-1), hoje = lisbonDate(0);
    let viewsOntem = 0, viewsHoje = 0;
    const porCrecheOntem = new Map();
    daysSnap.forEach((d) => {
      if (d.ref.parent.id !== "days") return;
      const day = d.id, count = d.data().count || 0;
      const cid = d.ref.parent.parent ? d.ref.parent.parent.id : null;
      if (day === ontem) { viewsOntem += count; if (cid) porCrecheOntem.set(cid, (porCrecheOntem.get(cid) || 0) + count); }
      else if (day === hoje) viewsHoje += count;
    });
    // Top 5 de ontem, com nomes resolvidos via dataset público (tolerante a falha)
    let top5 = [...porCrecheOntem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([creche_id, views]) => ({ creche_id, views }));
    try {
      const ds = await fetch("https://creches.app/creches_pt.json").then((r) => r.json());
      const nomes = new Map(ds.map((c) => [String(c.id), c.nome]));
      top5 = top5.map((t) => ({ ...t, nome: nomes.get(t.creche_id) || t.creche_id }));
    } catch (e) { /* nomes ficam como ids */ }

    return res.status(200).json({
      gerado_em: new Date().toISOString(),
      utilizadores: { total: usersTotal, novos_24h: usersNew24h },
      leads: { total: leadsTotal, novos_24h: leadsNovos24h, por_estado: leadsPorEstado },
      vagas: {
        ativas, ativas_verificadas: ativasVerif,
        novas_24h_pais: novasPais, novas_24h_creches: novasCreches, sem_vaga_24h: semVaga24h,
      },
      rede: {
        creches_aderentes: aderentes.size,
        perfis_criados: profilesSnap.size,
        claims_pendentes: claimsPendentes,
        claims_novos_24h: claimsNovos24h,
        fotos_por_moderar: fotosSnap.size || 0,
      },
      views: { ontem: viewsOntem, hoje_parcial: viewsHoje, top5_ontem: top5 },
    });
  } catch (e) {
    console.error("daily-stats error:", e);
    return res.status(500).json({ error: e.message || "internal" });
  }
}
