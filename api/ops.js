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
 *   {"action":"aderentes"}                             → creches que gerem a própria página,
 *                                                        com email e frescura das vagas
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
 *   {"action":"leads_por_entregar"}                    → lista os pedidos que nunca chegaram
 *   {"action":"leads_reenviar","limite":10}            → entrega-os agora
 *   {"action":"leads_verificar_emails"}                → os endereços existem? (DNS ao vivo)
 *   {"action":"leads_endereco_suspeito"}               → entregues no endereço errado
 *   {"action":"leads_reenviar_suspeitos","limite":10}  → reenvia-os ao endereço certo
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
// ── Pedidos que nunca chegaram à creche ─────────────────────────────────────
// Quando uma família pedia contacto a uma creche de que não sabíamos o email, o
// /api/lead-notify saía com "creche sem email conhecido" e não marcava o lead
// como notificado. O ecrã dizia "Enviado!" mas ninguém recebia nada — nem a
// creche, nem sequer a confirmação ao pai, que só sai depois da creche receber.
//
// Com a Carta Social passámos a ter email de mais de cem creches que já estavam
// no mapa. Estes pedidos são recuperáveis, e é isto que os recupera.
//
// Corre aqui, no servidor, e não num script local, por uma razão prática: as
// variáveis de ambiente do Vercel estão marcadas como "Sensitive" e não podem
// ser lidas depois de criadas — nem pelo dono do projecto. Aqui já as temos.
const DIAS_MAX_LEAD = 120;

async function lerLeadsPorEntregar(db, diasMax) {
  const dataset = await fetch("https://creches.app/creches_pt.json").then(r => r.json());
  const porId = new Map((Array.isArray(dataset) ? dataset : dataset.creches)
    .map(c => [String(c.id), c]));

  const snap = await db.collection("creche_leads").orderBy("ts", "desc").limit(3000).get();
  const agora = Date.now();
  const cont = { lidos: snap.size, entregues: 0, antigos: 0, creche_sem_email: 0 };
  const prontos = [];

  snap.forEach(d => {
    const l = d.data();
    if (l.notificado === true) { cont.entregues++; return; }
    const ts = l.ts && l.ts.toMillis ? l.ts.toMillis() : 0;
    const dias = ts ? Math.floor((agora - ts) / 86400000) : 9999;
    if (dias > diasMax) { cont.antigos++; return; }
    const creche = porId.get(String(l.creche_id));
    if (!creche || !creche.email) { cont.creche_sem_email++; return; }
    prontos.push({ id: d.id, dias, creche: creche.nome, concelho: creche.concelho || "" });
  });

  prontos.sort((a, b) => a.dias - b.dias);
  return { cont, prontos };
}

// ── Os endereços das creches com pedidos existem mesmo? ─────────────────────
// Verificação técnica, ao vivo: para cada creche que recebeu um pedido de uma
// família, pergunta-se ao DNS se o domínio do email tem servidor de correio.
//
// Um domínio sem MX não recebe correio nenhum — o email rebenta sempre, e
// rebenta em silêncio do lado de cá. É a única forma de saber que um endereço
// está morto sem lhe enviar nada.
//
// O que isto NÃO prova: que a caixa existe dentro do domínio, nem que alguém a
// lê. Prova apenas o contrário — que não pode funcionar de todo. Por isso o
// veredicto "ok" aqui significa "tecnicamente entregável", e nada mais.
async function actionLeadsVerificarEmails(db, diasMax) {
  const dns = await import("node:dns/promises");
  const dataset = await fetch("https://creches.app/creches_pt.json").then(r => r.json());
  const porId = new Map((Array.isArray(dataset) ? dataset : dataset.creches)
    .map(c => [String(c.id), c]));

  const snap = await db.collection("creche_leads").orderBy("ts", "desc").limit(3000).get();
  const agora = Date.now();
  const porCreche = new Map();
  // A pergunta que o DNS não responde: a caixa é lida? A única prova que temos
  // vem das famílias — ao 7.º dia perguntamos-lhes "a creche respondeu-te?".
  // Comparar essa taxa entre as creches com caixa do Ministério e as restantes
  // diz-nos se o endereço do agrupamento é um canal vivo ou um buraco.
  const lido = { minedu: { sim: 0, nao: 0 }, proprio: { sim: 0, nao: 0 } };
  snap.forEach(d => {
    const l = d.data();
    const ts = l.ts && l.ts.toMillis ? l.ts.toMillis() : 0;
    const dias = ts ? Math.floor((agora - ts) / 86400000) : 9999;
    if (dias > diasMax) return;
    const cid = String(l.creche_id || "");
    if (!cid) return;
    const j = porCreche.get(cid);
    if (j) { j.pedidos++; j.dias = Math.min(j.dias, dias); }
    else porCreche.set(cid, { pedidos: 1, dias });
    if (l.resposta_creche === "sim" || l.resposta_creche === "nao") {
      const c = porId.get(cid);
      const grupo = String((c && c.email) || "").includes("min-edu") ? "minedu" : "proprio";
      lido[grupo][l.resposta_creche]++;
    }
  });

  const taxa = g => {
    const t = lido[g].sim + lido[g].nao;
    return { respostas_das_familias: t, creche_respondeu: lido[g].sim,
             taxa: t ? Math.round((lido[g].sim / t) * 100) : null };
  };

  // Bounces já registados pelo webhook do Resend: prova directa, vale mais que o DNS.
  const invalidos = new Set();
  try {
    const inv = await db.collection("emails_invalidos").limit(1000).get();
    inv.forEach(d => { const e = (d.data().email || d.id || "").toLowerCase(); if (e) invalidos.add(e); });
  } catch (e) { /* colecção pode não existir ainda */ }

  // Uma consulta DNS por domínio, não por creche: dezenas de creches partilham
  // gmail.com, e o Vercel tem dez segundos para responder.
  const dominios = new Map();
  const linhas = [];
  for (const [cid, info] of porCreche) {
    const c = porId.get(cid);
    if (!c) { linhas.push({ creche: `(fora do dataset: ${cid})`, ...info, veredicto: "sem_registo" }); continue; }
    const email = String(c.email || "").split(";")[0].trim().toLowerCase();
    const linha = { creche: c.nome, concelho: c.concelho || "", email, ...info };
    if (!email.includes("@")) { linha.veredicto = "sem_email"; linhas.push(linha); continue; }
    linha.dominio = email.split("@").pop();
    if (!dominios.has(linha.dominio)) dominios.set(linha.dominio, null);
    linhas.push(linha);
  }

  await Promise.all([...dominios.keys()].map(async d => {
    try {
      const mx = await dns.resolveMx(d);
      dominios.set(d, mx && mx.length ? "MX" : "SEM_MX");
    } catch (e) {
      dominios.set(d, e.code === "ENOTFOUND" || e.code === "ENODATA" ? "SEM_MX" : "indeterminado");
    }
  }));

  for (const l of linhas) {
    if (l.veredicto) continue;
    if (invalidos.has(l.email)) { l.veredicto = "devolveu_erro"; continue; }
    const mx = dominios.get(l.dominio);
    l.veredicto = mx === "MX" ? "ok" : mx === "SEM_MX" ? "dominio_morto" : "indeterminado";
  }

  const ordem = { dominio_morto: 0, devolveu_erro: 1, sem_email: 2, sem_registo: 3, indeterminado: 4, ok: 5 };
  linhas.sort((a, b) => (ordem[a.veredicto] - ordem[b.veredicto]) || (a.dias - b.dias));
  const resumo = {};
  for (const l of linhas) resumo[l.veredicto] = (resumo[l.veredicto] || 0) + 1;

  return {
    ok: true, creches: linhas.length, dominios_consultados: dominios.size, resumo,
    problemas: linhas.filter(l => l.veredicto !== "ok"),
    lido: { caixa_do_ministerio: taxa("minedu"), email_proprio: taxa("proprio") },
    nota: "MX presente só garante que o domínio recebe correio. Não garante que a caixa exista, nem que alguém a leia.",
  };
}

// ── Pedidos entregues num endereço que hoje sabemos ser o errado ────────────
// Diferente dos "por entregar": estes SAÍRAM, mas foram para a caixa do
// agrupamento do Ministério em vez da creche — ou para um endereço que depois
// devolveu erro. Em ambos os casos é provável que ninguém do outro lado tenha
// lido. Não é certeza: é suspeita fundamentada, e a decisão de reenviar é humana.
async function actionLeadsEnderecoSuspeito(db, diasMax) {
  const dataset = await fetch("https://creches.app/creches_pt.json").then(r => r.json());
  const porId = new Map((Array.isArray(dataset) ? dataset : dataset.creches)
    .map(c => [String(c.id), c]));

  // Endereços que devolveram erro permanente ou queixa de spam.
  const invalidos = new Map();
  try {
    const inv = await db.collection("emails_invalidos").limit(1000).get();
    inv.forEach(d => { const v = d.data(); if (v.email) invalidos.set(String(v.email).toLowerCase(), v.motivo || "bounce"); });
  } catch (e) { /* a coleção pode ainda não existir */ }

  const snap = await db.collection("creche_leads").orderBy("ts", "desc").limit(3000).get();
  const agora = Date.now();
  const suspeitos = [];

  snap.forEach(d => {
    const l = d.data();
    if (l.notificado !== true) return;                 // esses são o outro caso
    const ts = l.ts && l.ts.toMillis ? l.ts.toMillis() : 0;
    const dias = ts ? Math.floor((agora - ts) / 86400000) : 9999;
    if (dias > diasMax) return;
    const c = porId.get(String(l.creche_id));
    if (!c) return;

    // Se a creche gere a página, o lead foi para o gestor — esse está certo.
    if (l.sem_painel === false) return;

    const principal = String(c.email || "").split(";")[0].trim().toLowerCase();
    const secundario = String(c.email_oficial || "").trim().toLowerCase();

    let motivo = null;
    if (invalidos.has(principal)) motivo = `o endereço devolveu erro (${invalidos.get(principal)})`;
    else if (secundario && (secundario.includes("min-edu") || secundario.includes("min-educ"))) {
      // O secundário ser do Ministério significa que o principal foi trocado:
      // na altura o pedido saiu para a caixa do agrupamento.
      motivo = "foi para a caixa do agrupamento do Ministério, não para a creche";
    } else if (secundario) {
      motivo = "a Carta Social indica outro endereço para esta creche";
    }
    if (!motivo) return;

    suspeitos.push({ id: d.id, dias, creche: c.nome, concelho: c.concelho || "",
                     motivo, agora_para: [principal, secundario].filter(Boolean) });
  });

  suspeitos.sort((a, b) => a.dias - b.dias);
  return { status: 200, body: { ok: true, action: "leads_endereco_suspeito",
                                total: suspeitos.length,
                                pedidos: suspeitos.slice(0, 200) } };
}

async function actionLeadsReenviarSuspeitos(db, quem, limite, diasMax) {
  const { body } = await actionLeadsEnderecoSuspeito(db, diasMax);
  const lote = (body.pedidos || []).slice(0, Math.max(1, Math.min(limite || 10, 100)));
  const feitos = [];
  let ok = 0, falhou = 0;

  for (const p of lote) {
    try {
      const r = await fetch("https://creches.app/api/lead-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json",
                   "Authorization": `Bearer ${(process.env.CRON_SECRET || "").trim()}` },
        body: JSON.stringify({ lead_id: p.id, force: true })
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { ok++; feitos.push({ creche: p.creche, dias: p.dias, estado: "entregue" }); }
      else { falhou++; feitos.push({ creche: p.creche, dias: p.dias, estado: j.error || j.skipped || `HTTP ${r.status}` }); }
    } catch (e) {
      falhou++; feitos.push({ creche: p.creche, dias: p.dias, estado: e.message });
    }
    await new Promise(r => setTimeout(r, 700));
  }

  await logOp(db, quem, "leads_reenviar_suspeitos", null, null, { enviados: ok, falhados: falhou });
  return { status: 200, body: { ok: true, action: "leads_reenviar_suspeitos",
                                enviados: ok, falhados: falhou,
                                restantes: Math.max(0, body.total - lote.length),
                                detalhe: feitos } };
}

async function actionLeadsPorEntregar(db, diasMax) {
  const { cont, prontos } = await lerLeadsPorEntregar(db, diasMax);
  return { status: 200, body: { ok: true, action: "leads_por_entregar",
                                resumo: cont, total: prontos.length,
                                pedidos: prontos.slice(0, 200) } };
}

async function actionLeadsReenviar(db, quem, limite, diasMax) {
  const { prontos } = await lerLeadsPorEntregar(db, diasMax);
  const lote = prontos.slice(0, Math.max(1, Math.min(limite || 10, 100)));
  const feitos = [];
  let ok = 0, falhou = 0;

  for (const p of lote) {
    try {
      // Reutiliza o /api/lead-notify: é ele que sabe resolver o destinatário,
      // montar o email, marcar o lead e avisar a família. Duplicar isso aqui
      // seria criar uma segunda verdade que mais cedo ou mais tarde diverge.
      const r = await fetch("https://creches.app/api/lead-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json",
                   "Authorization": `Bearer ${(process.env.CRON_SECRET || "").trim()}` },
        body: JSON.stringify({ lead_id: p.id, force: true })
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { ok++; feitos.push({ creche: p.creche, dias: p.dias, estado: "entregue" }); }
      else { falhou++; feitos.push({ creche: p.creche, dias: p.dias, estado: j.error || j.skipped || `HTTP ${r.status}` }); }
    } catch (e) {
      falhou++;
      feitos.push({ creche: p.creche, dias: p.dias, estado: e.message });
    }
    await new Promise(r => setTimeout(r, 700));   // cortesia com o Resend
  }

  await logOp(db, quem, "leads_reenviar", null, null, { enviados: ok, falhados: falhou });
  return { status: 200, body: { ok: true, action: "leads_reenviar",
                                enviados: ok, falhados: falhou,
                                restantes: Math.max(0, prontos.length - lote.length),
                                detalhe: feitos } };
}

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

// ── action: aderentes — as creches que gerem a própria página ───────────────
// Existe porque a lista completa não é obtível de fora: creche_profiles é
// público mas só tem quem preencheu o perfil (9 de 14), e creche_managers —
// que tem toda a gente e o email de quem faz login — é privado por desenho.
// Sem isto, uma campanha às aderentes falha um terço delas em silêncio.
//
// Junta o estado das vagas para se poder segmentar por frescura: uma creche que
// confirmou ontem não precisa de ser incomodada.
async function actionAderentes(db) {
  const [mgrSnap, perfSnap, vagasSnap] = await Promise.all([
    db.collection("creche_managers").get().catch(() => null),
    db.collection("creche_profiles").get().catch(() => null),
    db.collection("vagas").get().catch(() => null),
  ]);

  const perfis = new Map();
  if (perfSnap) for (const d of perfSnap.docs) perfis.set(d.id, d.data());
  // Só conta como "a creche publicou vaga" o que o mapa realmente mostra vindo
  // DELA: dentro da validade e reportado por ela (painel ou email), não por um
  // pai. Sem estes dois filtros a contagem dizia 9 quando eram 4 — juntava 32
  // documentos expirados e 64 reports de famílias. O app.html já filtra por
  // expires_at, portanto o mapa estava certo; era esta métrica que mentia.
  const agoraMs = Date.now();
  const comVaga = new Set();
  if (vagasSnap) for (const d of vagasSnap.docs) {
    const v = d.data();
    if (!v.creche_id) continue;
    if (v.tipo === "sem_vaga") continue;
    if (!(v.source === "painel" || v.source === "email")) continue;
    const exp = v.expires_at && v.expires_at.toMillis ? v.expires_at.toMillis() : 0;
    if (exp <= agoraMs) continue;
    comVaga.add(String(v.creche_id));
  }

  const SALAS = ["b0", "m12", "m24", "ji36"];
  const agora = Date.now();
  const toMs = (t) => (t && t.toMillis ? t.toMillis() : 0);

  const lista = [];
  if (mgrSnap) for (const d of mgrSnap.docs) {
    const m = d.data();
    const cid = String(m.creche_id || "");
    if (!cid) continue;
    const p = perfis.get(cid) || {};
    const vagas = p.vagas || {};
    const atualizadoMs = toMs(vagas.atualizado) || toMs(p.updated_at) || 0;
    lista.push({
      creche_id: cid,
      nome: m.creche_nome || p.nome_creche || "",
      // O email do gestor é quem faz login e quem vai carregar no botão; o
      // contacto público do perfil é para os pais e pode ser uma geral@ que
      // ninguém lê. Damos os dois e quem consome decide.
      email_gestor: m.email || "",
      email_perfil: (p.contacto_email || "").trim(),
      tem_perfil: perfis.has(cid),
      salas_com_vaga: SALAS.filter((k) => vagas[k] === true),
      vaga_publicada: comVaga.has(cid),
      atualizado_em: atualizadoMs ? new Date(atualizadoMs).toISOString() : null,
      dias_sem_atualizar: atualizadoMs ? Math.floor((agora - atualizadoMs) / 86400000) : null,
      aprovado_em: toMs(m.aprovado_em) ? new Date(toMs(m.aprovado_em)).toISOString() : null,
    });
  }
  lista.sort((a, b) => (b.dias_sem_atualizar ?? -1) - (a.dias_sem_atualizar ?? -1));

  return {
    total: lista.length,
    com_perfil: lista.filter((x) => x.tem_perfil).length,
    com_vaga_publicada: lista.filter((x) => x.vaga_publicada).length,
    aderentes: lista,
  };
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
      case "aderentes":
        return res.status(200).json(await actionAderentes(db));
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
      case "leads_por_entregar":
        return res.status(200).json((await actionLeadsPorEntregar(db, Number(body.dias) || DIAS_MAX_LEAD)).body);
      case "leads_reenviar":
        out = await actionLeadsReenviar(db, quem, Number(body.limite) || 10, Number(body.dias) || DIAS_MAX_LEAD); break;
      case "leads_verificar_emails":
        return res.status(200).json(await actionLeadsVerificarEmails(db, Number(body.dias) || DIAS_MAX_LEAD));
      case "leads_endereco_suspeito":
        return res.status(200).json((await actionLeadsEnderecoSuspeito(db, Number(body.dias) || DIAS_MAX_LEAD)).body);
      case "leads_reenviar_suspeitos":
        out = await actionLeadsReenviarSuspeitos(db, quem, Number(body.limite) || 10, Number(body.dias) || DIAS_MAX_LEAD); break;
      default:
        return res.status(400).json({ error: `Ação desconhecida: ${action}` });
    }
    return res.status(out.status).json(out.body);
  } catch (e) {
    console.error("ops error:", e);
    return res.status(500).json({ error: e.message || "internal" });
  }
}
