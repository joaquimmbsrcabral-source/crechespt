/**
 * POST /api/ops — triagem diária das pendências de administração.
 * Permite a um agente automatizado (ou a um admin) listar e tratar as filas
 * que o fundador trata à mão no /admin: correções, reports de idade, fotos,
 * claims e pedidos de remoção.
 *
 * Auth (igual a send-invites): Authorization: Bearer <Firebase ID token de admin>
 * OU Bearer <CRON_SECRET> (agente agendado).
 *
 * Body JSON: { action, ...params }
 *   {"action":"list"}                                  → snapshot de todas as pendências
 *   {"action":"aplicar_correcao","id":"<creche_id>"}   → aplica ao creche_overrides e apaga a correção
 *   {"action":"rejeitar_correcao","id":"<creche_id>"}  → apaga a correção (como o botão rejeitar)
 *   {"action":"aplicar_report","id":"<report_id>"}     → réplica de applyReport do admin
 *   {"action":"rejeitar_report","id":"<report_id>"}    → réplica de rejectReport do admin
 *   {"action":"moderar_foto","id":"<foto_id>","decisao":"aprovar"|"rejeitar","motivo"?:"..."}
 *   {"action":"analisar_claim","id":"<claim_id>"}      → só analisa, não escreve nada
 *   {"action":"aprovar_claim","id":"<claim_id>"}       → aprova SÓ se os sinais forem fortes
 *                                                        (email/domínio coincide); replica o
 *                                                        botão "Aprovar acesso" do /admin
 *   {"action":"rejeitar_claim","id":"<claim_id>"}      → marca o claim como rejeitado
 *
 * Cada escrita fica registada em ops_log para auditoria.
 * Env vars: FIREBASE_SERVICE_ACCOUNT (base64 ou JSON), CRON_SECRET.
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

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

// Mesmo mapeamento que o admin usa (AGE_RANGES em admin.html)
const AGE_RANGES = {
  bercario:   { tipo: "Berçário",   idade_min_meses: 4,  idade_max_meses: 12 },
  creche:     { tipo: "Creche",     idade_min_meses: 4,  idade_max_meses: 36 },
  ji:         { tipo: "JI",         idade_min_meses: 36, idade_max_meses: 72 },
  infantario: { tipo: "Infantário", idade_min_meses: 4,  idade_max_meses: 72 },
  atl:        { tipo: "ATL",        idade_min_meses: 72, idade_max_meses: 144 },
};

// Firestore Timestamp → ISO (tolerante a strings/ausência)
function tsIso(t) {
  if (!t) return null;
  if (typeof t.toDate === "function") return t.toDate().toISOString();
  if (typeof t === "string") return t;
  return null;
}

// Normalização de nomes para comparação (sem acentos, minúsculas, só alfanumérico)
function normNome(s) {
  return String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function emailDomain(email) {
  const m = String(email || "").trim().toLowerCase().match(/@([^@\s]+)$/);
  return m ? m[1].replace(/^www\./, "") : "";
}

function websiteDomain(url) {
  let u = String(url || "").trim().toLowerCase();
  if (!u) return "";
  if (!/^https?:\/\//.test(u)) u = "https://" + u;
  try { return new URL(u).hostname.replace(/^www\./, ""); }
  catch (e) { return ""; }
}

// Auditoria: cada ação de escrita fica em ops_log
async function logOp(db, quem, action, targetId, crecheId, detalhe) {
  await db.collection("ops_log").add({
    action,
    target_id: targetId || null,
    creche_id: crecheId || null,
    executado_por: quem,
    executado_em: FieldValue.serverTimestamp(),
    detalhe: detalhe || null,
  });
}

// ── action: list — snapshot de todas as pendências (máx. 50 por categoria) ──
async function actionList(db) {
  const LIM = 50;
  const [corSnap, repSnap, fotoSnap, claimSnap, remSnap] = await Promise.all([
    db.collection("creche_correcoes").get().catch(() => null),
    db.collection("creche_reports").orderBy("ts", "desc").limit(200).get().catch(() => null),
    db.collection("creche_fotos").where("status", "==", "pending").limit(LIM).get().catch(() => null),
    db.collection("creche_claims").where("status", "==", "pending").get().catch(() => null),
    db.collection("creche_removals").orderBy("ts", "desc").limit(200).get().catch(() => null),
  ]);
  const docsOf = (snap) => (snap ? snap.docs.map((d) => ({ id: d.id, ...d.data() })) : []);

  // Correções (doc id = creche_id; tudo o que existe está pendente — como no admin)
  const correcoes = docsOf(corSnap).slice(0, LIM).map((c) => ({
    id: c.id,
    creche_id: c.id,
    creche_nome_atual: c.creche_nome_atual || null,
    nome: c.nome || null,
    morada: c.morada || null,
    nota: c.nota || null,
    proposto_por: c.email || c.uid || null,
    criado_em: tsIso(c.ts),
  }));

  // Reports de idade (pendente = status ≠ applied/rejected — como renderReports)
  const reports = docsOf(repSnap)
    .filter((r) => r.status !== "applied" && r.status !== "rejected")
    .slice(0, LIM)
    .map((r) => ({
      id: r.id,
      creche_id: r.creche_id || null,
      creche_nome: r.creche_name || null,
      tipo: r.claimed_age || null,
      valor_proposto: AGE_RANGES[r.claimed_age] || null,
      atual: { tipo: r.current_tipo ?? null, min: r.current_min ?? null, max: r.current_max ?? null },
      nota: r.note || null,
      proposto_por: r.email || r.uid || null,
      criado_em: tsIso(r.ts),
    }));

  // Fotos por moderar (status == "pending" — como cpLoadFotos)
  const fotos = docsOf(fotoSnap).slice(0, LIM).map((f) => ({
    id: f.id,
    creche_id: f.creche_id || null,
    url: f.url || null,
    criado_em: tsIso(f.ts),
  }));

  // Claims (status == "pending" — como cpLoadClaims)
  const claims = docsOf(claimSnap)
    .sort((a, b) => (b.ts && b.ts.toMillis ? b.ts.toMillis() : 0) - (a.ts && a.ts.toMillis ? a.ts.toMillis() : 0))
    .slice(0, LIM)
    .map((c) => ({
      id: c.id,
      creche_id: c.creche_id || null,
      nome_creche: c.creche_nome || null,
      email: c.email || null,
      nome: c.nome_responsavel || null,
      cargo: c.cargo || null,
      telefone: c.telefone || null,
      mensagem: c.mensagem || null,
      criado_em: tsIso(c.ts),
    }));

  // Pedidos de remoção (pendente = estado ≠ removida/ignorado — como o dashboard)
  const removals = docsOf(remSnap)
    .filter((r) => r.estado !== "removida" && r.estado !== "ignorado")
    .slice(0, LIM)
    .map((r) => ({
      id: r.id,
      creche_id: r.creche_id || null,
      nome: r.creche_name || null,
      motivo: r.reason || null,
      relationship: r.relationship || null,
      email: r.requester_email || null,
      criado_em: tsIso(r.ts),
    }));

  return {
    correcoes, reports, fotos, claims, removals,
    totals: {
      correcoes: correcoes.length,
      reports: reports.length,
      fotos: fotos.length,
      claims: claims.length,
      removals: removals.length,
    },
  };
}

// ── Correções (creche_correcoes → creche_overrides), como os botões cor-aplicar/cor-rejeitar ──
async function actionAplicarCorrecao(db, quem, id) {
  const ref = db.doc(`creche_correcoes/${id}`);
  const doc = await ref.get();
  if (!doc.exists) return { status: 409, body: { error: "Correção não encontrada ou já tratada", id } };
  const c = doc.data() || {};
  const ovr = { updated_at: FieldValue.serverTimestamp(), fonte_correcao: "painel" };
  if (c.nome) ovr.nome = c.nome;
  if (c.morada) ovr.morada = c.morada;
  await db.collection("creche_overrides").doc(String(id)).set(ovr, { merge: true });
  await ref.delete();
  await logOp(db, quem, "aplicar_correcao", id, id, { nome: c.nome || null, morada: c.morada || null });
  return { status: 200, body: { ok: true, action: "aplicar_correcao", id, aplicado: { nome: c.nome || null, morada: c.morada || null } } };
}

async function actionRejeitarCorrecao(db, quem, id) {
  const ref = db.doc(`creche_correcoes/${id}`);
  const doc = await ref.get();
  if (!doc.exists) return { status: 409, body: { error: "Correção não encontrada ou já tratada", id } };
  await ref.delete();
  await logOp(db, quem, "rejeitar_correcao", id, id, null);
  return { status: 200, body: { ok: true, action: "rejeitar_correcao", id } };
}

// ── Reports de idade (creche_reports), réplica de applyReport/rejectReport ──
function reportPendente(r) { return r.status !== "applied" && r.status !== "rejected"; }

async function markReportResolved(db, quem, id, status) {
  await db.collection("creche_reports").doc(id).update({
    status,
    resolved_at: FieldValue.serverTimestamp(),
    resolved_by: quem,
  });
}

async function actionAplicarReport(db, quem, id) {
  const doc = await db.collection("creche_reports").doc(id).get();
  if (!doc.exists) return { status: 409, body: { error: "Report não encontrado", id } };
  const r = doc.data() || {};
  if (!reportPendente(r)) return { status: 409, body: { error: `Report já tratado (status: ${r.status})`, id } };
  const crecheId = r.creche_id;
  if (!crecheId) return { status: 409, body: { error: "Report sem creche_id — não dá para aplicar override automático", id } };
  const claim = r.claimed_age;

  if (claim === "outra") {
    return { status: 422, body: { error: "Report do tipo 'outra' requer aplicação manual no /admin (ver nota)", id, nota: r.note || null } };
  }

  if (claim === "naoecreche") {
    await db.collection("creche_overrides").doc(String(crecheId)).set({
      hidden: true,
      applied_at: FieldValue.serverTimestamp(),
      applied_by: quem,
      reason: "naoecreche (via report)",
    }, { merge: true });
    await markReportResolved(db, quem, id, "applied");
    await logOp(db, quem, "aplicar_report", id, String(crecheId), { claimed_age: claim, hidden: true });
    return { status: 200, body: { ok: true, action: "aplicar_report", id, creche_id: crecheId, aplicado: { hidden: true } } };
  }

  const range = AGE_RANGES[claim];
  if (!range) return { status: 422, body: { error: `Idade reportada desconhecida: ${claim}`, id } };
  await db.collection("creche_overrides").doc(String(crecheId)).set({
    tipo: range.tipo,
    idade_min_meses: range.idade_min_meses,
    idade_max_meses: range.idade_max_meses,
    applied_at: FieldValue.serverTimestamp(),
    applied_by: quem,
    report_id: id,
  }, { merge: true });
  await markReportResolved(db, quem, id, "applied");
  await logOp(db, quem, "aplicar_report", id, String(crecheId), { claimed_age: claim, ...range });
  return { status: 200, body: { ok: true, action: "aplicar_report", id, creche_id: crecheId, aplicado: range } };
}

async function actionRejeitarReport(db, quem, id) {
  const doc = await db.collection("creche_reports").doc(id).get();
  if (!doc.exists) return { status: 409, body: { error: "Report não encontrado", id } };
  const r = doc.data() || {};
  if (!reportPendente(r)) return { status: 409, body: { error: `Report já tratado (status: ${r.status})`, id } };
  await markReportResolved(db, quem, id, "rejected");
  await logOp(db, quem, "rejeitar_report", id, r.creche_id || null, null);
  return { status: 200, body: { ok: true, action: "rejeitar_report", id } };
}

// ── Fotos (creche_fotos), mesma escrita que cpLoadFotos (aprovar/rejeitar) ──
async function actionModerarFoto(db, quem, id, decisao, motivo) {
  if (decisao !== "aprovar" && decisao !== "rejeitar") {
    return { status: 400, body: { error: 'Parâmetro "decisao" tem de ser "aprovar" ou "rejeitar"' } };
  }
  const ref = db.doc(`creche_fotos/${id}`);
  const doc = await ref.get();
  if (!doc.exists) return { status: 409, body: { error: "Foto não encontrada", id } };
  const f = doc.data() || {};
  if (f.status !== "pending") return { status: 409, body: { error: `Foto já moderada (status: ${f.status})`, id } };

  if (decisao === "aprovar") {
    if (!f.creche_id || !f.url) return { status: 409, body: { error: "Foto sem creche_id/url — não dá para publicar", id } };
    const batch = db.batch();
    batch.update(ref, { status: "approved" });
    batch.set(db.doc(`creche_profiles/${f.creche_id}`), { fotos: FieldValue.arrayUnion(f.url) }, { merge: true });
    await batch.commit();
    await logOp(db, quem, "moderar_foto", id, f.creche_id, { decisao: "aprovar", url: f.url });
    return { status: 200, body: { ok: true, action: "moderar_foto", id, decisao: "aprovar", creche_id: f.creche_id } };
  }

  await ref.update({ status: "rejected", motivo: String(motivo || "").slice(0, 140) });
  await logOp(db, quem, "moderar_foto", id, f.creche_id || null, { decisao: "rejeitar", motivo: String(motivo || "").slice(0, 140) });
  return { status: 200, body: { ok: true, action: "moderar_foto", id, decisao: "rejeitar" } };
}

// ── Claims: análise de legitimidade (NÃO aprova — a aprovação fica no /admin) ──
async function actionAnalisarClaim(db, id) {
  const doc = await db.doc(`creche_claims/${id}`).get();
  if (!doc.exists) return { status: 409, body: { error: "Claim não encontrado", id } };
  const c = doc.data() || {};
  if (c.status !== "pending") return { status: 409, body: { error: `Claim já tratado (status: ${c.status})`, id } };

  // Dataset público das creches (mesma fonte que send-invites/daily-stats)
  let ds = [];
  try { ds = await fetch("https://creches.app/creches_pt.json").then((r) => r.json()); }
  catch (e) { return { status: 502, body: { error: "Falha a ler o dataset creches_pt.json: " + (e.message || e) } }; }

  // Claims antigos podem não ter o prefixo "extra_" (o admin normaliza ao aprovar)
  const cid = String(c.creche_id || "");
  const creche = ds.find((x) => String(x.id) === cid) || ds.find((x) => String(x.id) === "extra_" + cid) || null;

  const emailClaim = String(c.email || "").trim().toLowerCase();
  const domClaim = emailDomain(emailClaim);
  const domSite = creche ? websiteDomain(creche.website) : "";
  const emailCreche = creche ? String(creche.email || "").trim().toLowerCase() : "";

  const sinais = {
    creche_no_dataset: !!creche,
    dominio_coincide: !!(domClaim && domSite && domClaim === domSite),
    email_coincide: !!(emailClaim && emailCreche && emailClaim === emailCreche),
    nome_bate: !!(creche && normNome(c.creche_nome) && normNome(c.creche_nome) === normNome(creche.nome)),
  };
  const recomendacao = (sinais.email_coincide || sinais.dominio_coincide) ? "aprovar" : "rever";

  return {
    status: 200,
    body: {
      id,
      creche_id: c.creche_id || null,
      nome_creche: c.creche_nome || null,
      email: c.email || null,
      nome: c.nome_responsavel || null,
      sinais,
      recomendacao,
      contexto: creche ? { nome_dataset: creche.nome || null, website: creche.website || null, email_dataset: creche.email || null } : null,
    },
  };
}

// ── Claims: aprovação automática com salvaguardas (réplica do botão do /admin) ──
// Só aprova se a análise de legitimidade recomendar "aprovar" (email/domínio
// coincide com o dataset). Qualquer situação ambígua devolve 409 para o agente
// escalar ao Joaquim em vez de escrever.
async function actionAprovarClaim(db, quem, id) {
  const ref = db.doc(`creche_claims/${id}`);
  const doc = await ref.get();
  if (!doc.exists) return { status: 409, body: { error: "Claim não encontrado", id } };
  const c = doc.data() || {};
  if (c.status !== "pending") return { status: 409, body: { error: `Claim já tratado (status: ${c.status})`, id } };
  if (!c.uid) return { status: 409, body: { error: "Claim sem uid — aprovação manual no /admin", id } };

  // Reutiliza a análise de sinais; só avança com recomendação "aprovar"
  const analise = await actionAnalisarClaim(db, id);
  if (analise.status !== 200) return analise;
  if (analise.body.recomendacao !== "aprovar") {
    return { status: 409, body: { error: "Sinais insuficientes (recomendação: rever) — escalar ao admin", id, sinais: analise.body.sinais } };
  }

  // Guardas do /admin: uid já gere outra creche? A creche já tem gestor?
  const jaGere = await db.doc(`creche_managers/${c.uid}`).get();
  if (jaGere.exists && jaGere.data().creche_id !== c.creche_id) {
    return { status: 409, body: { error: `Este utilizador já é gestor de outra creche (${jaGere.data().creche_nome || jaGere.data().creche_id}) — decisão manual no /admin`, id } };
  }
  const outroGestor = await db.collection("creche_managers").where("creche_id", "==", c.creche_id).get();
  if (!outroGestor.empty && outroGestor.docs[0].id !== c.uid) {
    return { status: 409, body: { error: `A creche já tem um gestor aprovado (${outroGestor.docs[0].data().email || outroGestor.docs[0].id}) — decisão manual no /admin`, id } };
  }

  // Normalizar ID: creches extra têm de levar o prefixo "extra_" (claims antigos podem não ter)
  let cidNorm = String(c.creche_id || "");
  if (!/^(osm-|extra_)/.test(cidNorm)) cidNorm = "extra_" + cidNorm;

  const batch = db.batch();
  batch.set(db.doc(`creche_managers/${c.uid}`), {
    creche_id: cidNorm,
    creche_nome: c.creche_nome || "",
    email: c.email || "",
    aprovado_em: FieldValue.serverTimestamp(),
  });
  batch.update(ref, { status: "approved", aprovado_por: quem });
  await batch.commit();
  await logOp(db, quem, "aprovar_claim", id, cidNorm, { uid: c.uid, email: c.email || null, sinais: analise.body.sinais });

  return {
    status: 200,
    body: {
      ok: true, action: "aprovar_claim", id,
      creche_id: cidNorm,
      nome_creche: c.creche_nome || null,
      email: c.email || null,
      nome: c.nome_responsavel || null,
      sinais: analise.body.sinais,
    },
  };
}

async function actionRejeitarClaim(db, quem, id) {
  const ref = db.doc(`creche_claims/${id}`);
  const doc = await ref.get();
  if (!doc.exists) return { status: 409, body: { error: "Claim não encontrado", id } };
  const c = doc.data() || {};
  if (c.status !== "pending") return { status: 409, body: { error: `Claim já tratado (status: ${c.status})`, id } };
  await ref.update({ status: "rejected", rejeitado_por: quem });
  await logOp(db, quem, "rejeitar_claim", id, c.creche_id || null, { email: c.email || null });
  return { status: 200, body: { ok: true, action: "rejeitar_claim", id, email: c.email || null, nome: c.nome_responsavel || null, nome_creche: c.creche_nome || null } };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) return res.status(503).json({ error: "FIREBASE_SERVICE_ACCOUNT missing" });
    initFirebase();

    const db = getFirestore();
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Missing auth token" });

    // Dois modos de autenticação: (a) token de admin (UI), (b) CRON_SECRET (agente agendado)
    let quem = null;
    const cronSecret = (process.env.CRON_SECRET || "").trim();
    if (cronSecret && token === cronSecret) {
      quem = "ops-agent";
    } else {
      let decoded;
      try { decoded = await getAuth().verifyIdToken(token); }
      catch (e) { return res.status(401).json({ error: "Invalid token" }); }
      const adminDoc = await db.doc(`admins/${decoded.uid}`).get();
      if (!adminDoc.exists) return res.status(403).json({ error: "Not an admin" });
      quem = decoded.email || decoded.uid;
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const action = String(body.action || "");
    const id = body.id != null ? String(body.id) : "";

    if (!action) return res.status(400).json({ error: 'Falta o campo "action"' });
    const precisaId = ["aplicar_correcao", "rejeitar_correcao", "aplicar_report", "rejeitar_report", "moderar_foto", "analisar_claim", "aprovar_claim", "rejeitar_claim"];
    if (precisaId.includes(action) && !id) return res.status(400).json({ error: 'Falta o campo "id"' });

    let out;
    switch (action) {
      case "list":
        return res.status(200).json(await actionList(db));
      case "aplicar_correcao":
        out = await actionAplicarCorrecao(db, quem, id); break;
      case "rejeitar_correcao":
        out = await actionRejeitarCorrecao(db, quem, id); break;
      case "aplicar_report":
        out = await actionAplicarReport(db, quem, id); break;
      case "rejeitar_report":
        out = await actionRejeitarReport(db, quem, id); break;
      case "moderar_foto":
        out = await actionModerarFoto(db, quem, id, String(body.decisao || ""), body.motivo); break;
      case "analisar_claim":
        out = await actionAnalisarClaim(db, id); break;
      case "aprovar_claim":
        out = await actionAprovarClaim(db, quem, id); break;
      case "rejeitar_claim":
        out = await actionRejeitarClaim(db, quem, id); break;
      default:
        return res.status(400).json({ error: `Ação desconhecida: ${action}` });
    }
    return res.status(out.status).json(out.body);
  } catch (e) {
    console.error("ops error:", e);
    return res.status(500).json({ error: e.message || "internal" });
  }
}
