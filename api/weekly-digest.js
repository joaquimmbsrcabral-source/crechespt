/**
 * Vercel Cron — resumo semanal por email a cada creche aderente.
 * Agendado no vercel.json (segundas 08:00 UTC). É O gatilho de retenção:
 * "esta semana: N visualizações, M famílias interessadas — entra no painel".
 *
 * Segurança: só corre com Authorization: Bearer <CRON_SECRET> (o Vercel envia-o
 * automaticamente nos cron jobs quando a env var CRON_SECRET está definida).
 *
 * Env vars: RESEND_API_KEY, FIREBASE_SERVICE_ACCOUNT, CRON_SECRET.
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Remetente configurável: usa EMAIL_FROM (ex.: "Creches.app <geral@creches.app>")
// assim que o domínio creches.app estiver verificado no Resend.
// Até lá, cai no domínio de teste do Resend (funciona sempre, mas vai a spam com mais facilidade).
const FROM_EMAIL = process.env.EMAIL_FROM || "Creches.app <onboarding@resend.dev>";

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

    // Dias (UTC) da última semana — mesmas chaves que os contadores usam
    const dias = [];
    for (let i = 7; i >= 1; i--) {
      const d = new Date(Date.now() - i * 86400000);
      dias.push(d.toISOString().slice(0, 10));
    }
    const seteDiasMs = Date.now() - 7 * 86400000;

    // Vagas ativas globais — UMA leitura por execução (cuidado com custos Firestore).
    // Mapa creche_id → vagas ativas, com a mesma semântica de vagas.js:
    // um report "sem vaga" (não expirado) cancela reports de pais anteriores,
    // mas nunca vagas verificadas pela creche (a creche é a autoridade).
    const vagasAtivasPorCreche = new Map();
    try {
      const vagasSnap = await db.collection("vagas").where("expires_at", ">", Timestamp.now()).get();
      const porCreche = new Map();
      vagasSnap.forEach(d => {
        const v = d.data();
        if (!v.creche_id) return;
        if (!porCreche.has(v.creche_id)) porCreche.set(v.creche_id, []);
        porCreche.get(v.creche_id).push(v);
      });
      for (const [cid, lista] of porCreche) {
        let semVagaTs = 0;
        for (const v of lista) {
          if (v.tipo !== "sem_vaga") continue;
          const ts = v.reportado_em && v.reportado_em.toMillis ? v.reportado_em.toMillis() : 0;
          if (ts > semVagaTs) semVagaTs = ts;
        }
        const ativas = lista.filter(v => {
          if (v.tipo === "sem_vaga") return false;
          if (!v.verificado && semVagaTs) {
            const ts = v.reportado_em && v.reportado_em.toMillis ? v.reportado_em.toMillis() : 0;
            if (ts <= semVagaTs) return false;   // cancelada por "sem vaga" mais recente
          }
          return true;
        });
        if (ativas.length) vagasAtivasPorCreche.set(cid, ativas);
      }
    } catch (e) {
      console.error("weekly-digest: leitura de vagas falhou (insights de vagas desativados):", e.message);
    }

    const mgrs = await db.collection("creche_managers").limit(100).get();
    let enviados = 0;

    for (const m of mgrs.docs) {
      const { creche_id, creche_nome, email } = m.data();
      if (!email || !creche_id) continue;

      // Visualizações da semana
      const viewSnaps = await Promise.all(
        dias.map(day => db.doc(`creche_views/${creche_id}/days/${day}`).get().catch(() => null))
      );
      const views = viewSnaps.reduce((a, s) => a + ((s && s.exists) ? (s.data().count || 0) : 0), 0);

      // Leads novos da semana
      const leadsSnap = await db.collection("creche_leads").where("creche_id", "==", creche_id).get();
      let leadsSemana = 0, leadsPorResponder = 0;
      leadsSnap.forEach(d => {
        const x = d.data();
        const ts = x.ts && x.ts.toMillis ? x.ts.toMillis() : 0;
        if (ts > seteDiasMs) leadsSemana++;
        if ((x.status || "novo") === "novo") leadsPorResponder++;
      });

      // Insight 1 — frescura da vaga: vaga da própria creche (painel/creche)
      // publicada há mais de 21 dias → pedir confirmação
      const minhasVagas = vagasAtivasPorCreche.get(creche_id) || [];
      let diasVagaVelha = 0;
      for (const v of minhasVagas) {
        if (v.source !== "painel" && v.source !== "creche") continue;
        const ts = v.reportado_em && v.reportado_em.toMillis ? v.reportado_em.toMillis() : 0;
        if (!ts) continue;
        const dias = Math.floor((Date.now() - ts) / 86400000);
        if (dias > 21 && dias > diasVagaVelha) diasVagaVelha = dias;
      }

      // Sem atividade nenhuma → não enviar (evitar spam a creches paradas)…
      // exceto se houver vaga velha por confirmar (aviso importante).
      if (views === 0 && leadsSemana === 0 && leadsPorResponder === 0 && !diasVagaVelha) continue;

      // Insight 2 — contexto competitivo suave: outras creches com vaga ativa
      // (contagem feita a partir do mapa global — zero leituras extra aqui)
      const outrasComVaga = [...vagasAtivasPorCreche.keys()].filter(id => id !== creche_id).length;
      const temVagaAtiva = minhasVagas.length > 0;

      // Insight 3 — perfil incompleto (mesmos critérios do painel: descrição ≥ 40
      // carateres, mensalidade_min/max, horario, fotos). 1 leitura, só para quem recebe email.
      let perfilPct = 100, perfilFalta = [];
      try {
        const pSnap = await db.doc(`creche_profiles/${creche_id}`).get();
        const p = pSnap.exists ? pSnap.data() : {};
        const itens = [
          ["fotografias", !!(p.fotos && p.fotos.length)],
          ["mensalidade", p.mensalidade_min != null || p.mensalidade_max != null],
          ["horário", !!p.horario],
          ["descrição", !!(p.descricao && p.descricao.length >= 40)]
        ];
        const feitos = itens.filter(i => i[1]).length;
        perfilPct = Math.round(feitos / itens.length * 100);
        perfilFalta = itens.filter(i => !i[1]).map(i => i[0]);
      } catch (e) {
        console.error("weekly-digest: leitura de perfil falhou p/", creche_id, e.message);
      }

      const nome = creche_nome || "a vossa creche";
      const urgencia = leadsPorResponder > 0
        ? `<p style="background:#FFE2EC;border-radius:10px;padding:12px 16px"><b>⚠️ ${leadsPorResponder} família${leadsPorResponder === 1 ? "" : "s"} por responder</b> — responder depressa é meia inscrição feita.</p>`
        : "";

      // Blocos de insights — cada um só aparece se for relevante
      const blocoVagaVelha = diasVagaVelha > 0
        ? `<p style="background:#FFF3D6;border-radius:10px;padding:12px 16px">🟡 <b>A vossa vaga está publicada há ${diasVagaVelha} dias.</b> Ainda está aberta? Confirmem ou atualizem no <a href="https://creches.app/painel" style="color:#2C2356;font-weight:600">painel</a> para manter a informação fiável.</p>`
        : "";
      const blocoConcorrencia = (!temVagaAtiva && outrasComVaga > 0)
        ? `<p style="background:#DEF5E1;border-radius:10px;padding:12px 16px">🟢 Há neste momento <b>${outrasComVaga} creche${outrasComVaga === 1 ? "" : "s"}</b> com vaga aberta no creches.app. Se também têm vagas, publiquem-nas no painel — as famílias filtram por «só com vaga».</p>`
        : "";
      const blocoPerfil = perfilFalta.length > 0
        ? `<p style="background:#F1EFFA;border-radius:10px;padding:12px 16px">📋 O vosso perfil está a <b>${perfilPct}%</b> — falta: ${perfilFalta.join(", ")}. Perfis completos recebem mais contactos — completem-no no <a href="https://creches.app/painel" style="color:#2C2356;font-weight:600">painel</a>.</p>`
        : "";

      // Versão texto dos insights
      const insightsTexto =
        (diasVagaVelha > 0 ? `🟡 A vossa vaga está publicada há ${diasVagaVelha} dias — confirmem ou atualizem no painel.\n` : "") +
        ((!temVagaAtiva && outrasComVaga > 0) ? `🟢 Há ${outrasComVaga} creche${outrasComVaga === 1 ? "" : "s"} com vaga aberta no creches.app — se também têm vagas, publiquem-nas no painel.\n` : "") +
        (perfilFalta.length > 0 ? `📋 O vosso perfil está a ${perfilPct}% — falta: ${perfilFalta.join(", ")}.\n` : "");

      // Só há email sem atividade quando existe vaga velha por confirmar —
      // nesse caso o assunto reflete o aviso, não as (zero) visualizações.
      const soAviso = views === 0 && leadsSemana === 0 && leadsPorResponder === 0;

      const payload = {
        from: FROM_EMAIL,
        to: [email],
        reply_to: "geral@creches.app",
        subject: soAviso
          ? `🟡 A vossa vaga no creches.app está publicada há ${diasVagaVelha} dias — ainda está aberta?`
          : `📊 A vossa semana no creches.app: ${views} visualizaç${views === 1 ? "ão" : "ões"}${leadsSemana ? ` · ${leadsSemana} família${leadsSemana === 1 ? "" : "s"} interessada${leadsSemana === 1 ? "" : "s"}` : ""}`,
        text: `Resumo semanal — ${nome}\n\n👀 ${views} visualizações da vossa página\n💌 ${leadsSemana} novas famílias interessadas\n${leadsPorResponder ? `⚠️ ${leadsPorResponder} por responder\n` : ""}${insightsTexto ? `\n${insightsTexto}` : ""}\nPainel: https://creches.app/painel\n\nPara deixar de receber este resumo, respondam a este email.`,
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;color:#2C2356;line-height:1.55">
  <p>Resumo semanal de <b>${nome}</b> no creches.app:</p>
  <div style="background:#FFF6EE;border-radius:10px;padding:14px 16px;margin:12px 0;font-size:15px">
    👀 <b>${views}</b> visualizações da vossa página<br>
    💌 <b>${leadsSemana}</b> nova${leadsSemana === 1 ? "" : "s"} família${leadsSemana === 1 ? "" : "s"} interessada${leadsSemana === 1 ? "" : "s"}
  </div>
  ${urgencia}
  ${blocoVagaVelha}
  ${blocoConcorrencia}
  ${blocoPerfil}
  <p><a href="https://creches.app/painel" style="display:inline-block;background:#FF6B9D;color:#fff;padding:11px 22px;border-radius:20px;text-decoration:none;font-weight:600">Abrir o painel</a></p>
  <p style="font-size:12px;color:#6E6989">Recebem este resumo por gerirem a página da creche no creches.app. Para deixar de o receber, respondam a este email.</p>
</div>`
      };

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (resp.ok) enviados++;
      else console.error("digest falhou p/", creche_id, await resp.text());
    }

    return res.status(200).json({ ok: true, enviados });
  } catch (e) {
    console.error("weekly-digest:", e);
    return res.status(500).json({ error: e.message });
  }
}
