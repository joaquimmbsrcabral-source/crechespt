/**
 * Vercel Serverless — a creche confirma se tem vaga, com UM clique a partir do email.
 * GET /api/vaga-confirmar?c={creche_id}&r=sim|nao&t={token}
 *
 * Porque existe: até hoje, para dizer "temos vaga" a creche tinha de abrir o
 * painel, fazer login, encontrar o separador certo e gravar. Das 9 creches
 * aderentes, 6 não tocavam nas vagas há 12 a 45 dias — o selo no mapa estava
 * velho e os pais viam-no como se fosse de hoje. Dois botões num email resolvem
 * isso sem conta nenhuma.
 *
 * Segurança: o token são os primeiros 12 chars do HMAC-SHA256 de
 * "{creche_id}:{resposta}" com CRON_SECRET como chave — mesma derivação do
 * api/_lib/lead-feedback.js. A resposta entra no HMAC de propósito: quem tem o
 * link do "sim" não consegue construir o do "nao" (nem o de outra creche). Sem
 * token válido, 403. O creche_id nunca é usado num caminho sem validação prévia.
 *
 * Efeitos (idempotentes — podem clicar as vezes que quiserem):
 *  - r=sim → escreve vagas/painel_{creche_id} com source:"email", verificado:true
 *            e expires_at a 31 dias. As salas (idades) são as que a creche já
 *            tinha no perfil; se não houver nenhuma, fica genérico e o email de
 *            confirmação convida a afinar no painel.
 *  - r=nao → apaga vagas/painel_{creche_id} (o badge desaparece do mapa).
 *  - Em ambos: creche_profiles/{creche_id}.vagas.atualizado = agora, para o
 *    painel e o nudge de frescura verem que houve confirmação.
 *
 * ⚠️ NUNCA acrescentar campos novos a creche_profiles a partir daqui.
 * A regra do Firestore desse documento usa `hasOnly([...])`, e o `hasOnly`
 * avalia o documento COMPLETO depois do merge — não só os campos que estão a
 * ser escritos. O Admin SDK ignora as regras, por isso um campo novo entra sem
 * erro nenhum; mas a partir desse momento QUALQUER escrita de cliente naquele
 * documento passa a falhar com "Missing or insufficient permissions".
 *
 * Aconteceu a 1 de setembro: esta função escrevia `vaga_confirmada_em` e
 * `vaga_confirmada_via`, e as 10 creches que carregaram no botão ficaram sem
 * conseguir editar o próprio perfil no painel — e o admin sem conseguir
 * aprovar-lhes fotos. O rasto de auditoria que esses campos guardavam já existe
 * no próprio vagas/painel_<id> (source:"email" + reportado_em), portanto eram
 * redundantes além de perigosos.
 *
 * Devolve HTML (é aberto no browser a partir do cliente de email), não JSON.
 * Env vars: FIREBASE_SERVICE_ACCOUNT, CRON_SECRET.
 */

import crypto from "node:crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

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

/** Exportado para o gerador do email construir os mesmos links. */
export function vagaToken(crecheId, resposta) {
  const key = (process.env.CRON_SECRET || "").trim();
  return crypto.createHmac("sha256", key)
    .update(`${String(crecheId)}:${String(resposta)}`)
    .digest("hex").slice(0, 12);
}

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ESC[c]);

const SALAS = {
  b0: "Berçário (0-12 m)",
  m12: "1-2 anos",
  m24: "2-3 anos",
  ji36: "3-6 anos (JI)",
};

function page(titulo, mensagem, extra = "") {
  return `<!doctype html><html lang="pt-PT"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(titulo)} — Creches.app</title>
</head><body style="margin:0;background:#FFF6EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#2C2356">
<div style="max-width:460px;margin:56px auto;padding:0 20px;text-align:center">
  <img src="https://creches.app/icon-192.png" width="56" height="56" style="border-radius:14px" alt="Creches.app">
  <h1 style="font-size:23px;margin:22px 0 10px;line-height:1.3">${esc(titulo)}</h1>
  <p style="font-size:15px;line-height:1.65;color:#4A4060;margin:0 0 22px">${mensagem}</p>
  ${extra}
  <a href="https://creches.app/painel" style="display:inline-block;background:linear-gradient(135deg,#FF6B9D,#FF9F68);color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:13px 30px;border-radius:99px">Abrir o painel</a>
  <p style="font-size:12.5px;color:#8A82A0;margin:26px 0 0">Dúvidas? Responde a este email ou escreve para <a href="mailto:geral@creches.app" style="color:#C2185B">geral@creches.app</a>.</p>
</div>
</body></html>`;
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Um clique num email não deve ficar em cache de proxy nenhum.
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).send(page("Pedido inválido", "Este link só funciona aberto no browser."));
  }

  try {
    const c = String((req.query && req.query.c) || "");
    const r = String((req.query && req.query.r) || "");
    const t = String((req.query && req.query.t) || "");

    // Validação antes de tocar em nada. O creche_id vai parar a um caminho de
    // documento, por isso o formato é restrito e o comprimento limitado.
    const idOk = c && c.length <= 60 && /^[A-Za-z0-9_-]+$/.test(c);
    const rOk = r === "sim" || r === "nao";
    const tOk = /^[a-f0-9]{12}$/.test(t);
    if (!idOk || !rOk || !tOk || !process.env.CRON_SECRET) {
      return res.status(403).send(page(
        "Link inválido",
        "Este link não é válido ou já expirou. Podes sempre atualizar as vagas no painel."));
    }
    // timingSafeEqual exige buffers do mesmo tamanho — o teste do formato acima
    // já garante 12 chars, mas confirmamos para não rebentar em runtime.
    const esperado = Buffer.from(vagaToken(c, r));
    const recebido = Buffer.from(t);
    if (esperado.length !== recebido.length || !crypto.timingSafeEqual(esperado, recebido)) {
      return res.status(403).send(page(
        "Link inválido",
        "Este link não é válido ou já expirou. Podes sempre atualizar as vagas no painel."));
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return res.status(503).send(page(
        "Indisponível",
        "O serviço está temporariamente indisponível. Tenta novamente daqui a uns minutos."));
    }
    initFirebase();
    const db = getFirestore();

    const perfilRef = db.doc(`creche_profiles/${c}`);
    const vagaRef = db.doc(`vagas/painel_${c}`);
    const perfil = await perfilRef.get().catch(() => null);
    const dados = perfil && perfil.exists ? perfil.data() : {};
    const nome = dados.nome_creche || dados.nome || "";

    if (r === "nao") {
      await vagaRef.delete().catch(() => {});
      await perfilRef.set({
        vagas: { b0: false, m12: false, m24: false, ji36: false, atualizado: FieldValue.serverTimestamp() },
      }, { merge: true }).catch(() => {});

      return res.status(200).send(page(
        "Obrigado — registámos que não têm vaga",
        "O selo de vaga foi retirado da vossa página, para nenhuma família bater à porta em vão. "
        + "Assim que abrir um lugar, é só voltar a este email e carregar em <b>Temos vaga</b> — "
        + "ou publicar no painel."));
    }

    // r === "sim": mantemos as salas que a creche já tinha no perfil. Inventar
    // salas seria pior do que não ter nenhuma — um pai que vá lá por causa de um
    // berçário que não existe perde a manhã.
    const v = dados.vagas || {};
    const idades = Object.keys(SALAS).filter((k) => v[k] === true).map((k) => SALAS[k]);

    await vagaRef.set({
      creche_id: c,
      nome_creche: nome || null,
      source: "email",
      verificado: true,
      idades,
      notas: "",
      reportado_em: FieldValue.serverTimestamp(),
      expires_at: Timestamp.fromMillis(Date.now() + 31 * 86400000),
      // O email do gestor NÃO entra aqui: /vagas é de leitura pública.
      reportado_por: { nome: null },
    }, { merge: true });

    await perfilRef.set({
      vagas: { ...v, atualizado: FieldValue.serverTimestamp() },
    }, { merge: true }).catch(() => {});

    const listaSalas = idades.length
      ? `<div style="background:#DEF5E1;border-radius:14px;padding:14px 18px;margin:0 0 22px;font-size:14px;color:#2f7d3b">
           <b>Salas com vaga:</b> ${esc(idades.join(" · "))}<br>
           <span style="font-size:12.5px;opacity:.85">Se não estiver certo, corrige no painel — leva 10 segundos.</span>
         </div>`
      : `<div style="background:#FFF3D6;border-radius:14px;padding:14px 18px;margin:0 0 22px;font-size:14px;color:#856404">
           Ainda não sabemos <b>que salas</b> têm vaga, por isso mostramos só "tem vaga".
           Se disseres quais são, os pais com um bebé da idade certa encontram-vos primeiro.
         </div>`;

    return res.status(200).send(page(
      "Obrigado — já está no mapa ✓",
      "A vossa página passa a mostrar o selo de <b>vaga disponível</b>, e as famílias que "
      + "seguem esta creche vão ser avisadas. O selo vale 31 dias; depois disso voltamos a perguntar.",
      listaSalas));
  } catch (e) {
    console.error("vaga-confirmar:", e);
    return res.status(500).send(page(
      "Algo correu mal",
      "Não conseguimos registar a resposta. Tenta outra vez ou escreve-nos para geral@creches.app."));
  }
}
