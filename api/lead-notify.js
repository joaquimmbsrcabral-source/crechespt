/**
 * Vercel Serverless — avisa a creche por email quando entra um lead novo.
 * Chamado pelo cliente (perfil-creche.js) logo após criar o lead — fire and forget.
 *
 * Segurança (endpoint público, chamado por pais anónimos):
 *  - só envia se o lead existir, tiver <10 min e ainda não tiver sido notificado
 *  - o destinatário vem SEMPRE do creche_managers (lookup server-side) — nunca do request
 *  - marca notificado:true (idempotente: cada lead notifica no máximo 1 vez)
 *  - limite por IP: 12 pedidos/hora (o CORS não protege nada — curl ignora-o)
 *  - App Check: verificado quando o token vem no corpo; obrigatório se
 *    APPCHECK_ENFORCE=1 estiver definido no Vercel (ligar depois de confirmar
 *    nos logs que os tokens estão mesmo a chegar)
 *
 * Env vars: RESEND_API_KEY, FIREBASE_SERVICE_ACCOUNT (as mesmas do notify.js).
 * Sem elas responde 503 e o lead continua a aparecer no painel normalmente.
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Remetente configurável: usa EMAIL_FROM (ex.: "Creches.app <geral@creches.app>")
// assim que o domínio creches.app estiver verificado no Resend.
// Até lá, cai no domínio de teste do Resend (funciona sempre, mas vai a spam com mais facilidade).
const FROM_EMAIL = process.env.EMAIL_FROM || "Creches.app <onboarding@resend.dev>";

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
}

// "2025-03-14" → "14/03/2025" (o lead guarda a data ISO para ser agregável)
function dataPt(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
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

// Um pedido que ficou por entregar (a creche não tinha email conhecido) pode
// chegar semanas depois. A creche tem de saber disso — senão liga a uma família
// a falar de um pedido de ontem que afinal é de há um mês, e fica a parecer que
// esteve todo esse tempo sem responder.
function notaAtraso(lead) {
  const ts = lead.ts && lead.ts.toMillis ? lead.ts.toMillis() : 0;
  if (!ts) return "";
  const dias = Math.floor((Date.now() - ts) / 86400000);
  if (dias < 3) return "";
  const d = new Date(ts);
  const quando = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  return `Este pedido foi feito a ${quando}. Só agora conseguimos fazê-lo chegar: `
       + `não tínhamos o vosso email e passámos a tê-lo. Pedimos desculpa pelo atraso — `
       + `a família pode entretanto já ter encontrado lugar, mas achámos que devia na mesma chegar-vos.`;
}

// ── Email de confirmação ao pai (template da marca) ──────────────────────────
function ackPaiHTML(lead, linkAcomp) {
  const nome = escapeHtml((lead.nome || "").split(" ")[0] || "");
  const creche = escapeHtml(lead.creche_nome || "creche");
  const cta = linkAcomp
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
      <a href="${escapeHtml(linkAcomp)}" style="display:inline-block;background:linear-gradient(135deg,#FF6B9D,#FF9F68);color:#fff;font-weight:bold;font-size:16px;text-decoration:none;padding:15px 38px;border-radius:99px">Acompanhar a minha candidatura →</a>
    </td></tr></table>
    <p style="margin:14px 0 0;font-size:13px;color:#6E6989;text-align:center">Este link é privado — guarda-o para veres o estado do teu pedido a qualquer momento.</p>`
    : "";
  return `<!doctype html><html lang="pt-PT"><body style="margin:0;padding:0;background:#FFF6EE">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF6EE;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(60,40,90,.1)">
  <tr><td style="background:linear-gradient(135deg,#FF6B9D,#FF9F68);padding:30px 32px 26px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><img src="https://creches.app/icon-192.png" width="46" height="46" style="border-radius:12px;display:block" alt="Creches.app"></td>
      <td style="vertical-align:middle;padding-left:12px"><span style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:20px;font-weight:bold;color:#fff">Creches.app</span></td>
    </tr></table>
    <div style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:22px;font-weight:bold;color:#fff;line-height:1.3;margin-top:18px">✓ O teu pedido seguiu<br>para a ${creche}.</div>
  </td></tr>
  <tr><td style="padding:28px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2C2356;line-height:1.6">
    <p style="margin:0 0 16px">Olá${nome ? " " + nome : ""} 👋</p>
    <p style="margin:0 0 16px">O teu pedido de contacto foi enviado com sucesso à <b>${creche}</b>. Boa sorte! 🍀</p>
    <div style="background:#FFF6EE;border-radius:14px;padding:18px 20px;margin:0 0 22px">
      <div style="font-weight:bold;margin-bottom:8px;color:#2C2356">O que acontece a seguir?</div>
      <div style="font-size:14.5px;color:#4A4060">A creche recebe o teu contacto e costuma responder em poucos dias — normalmente por email ou telefone, diretamente para ti.</div>
    </div>
    ${cta}
    <p style="margin:22px 0 0;font-size:14px;color:#4A4060">Se não tiveres resposta em alguns dias, nós avisamos-te e sugerimos alternativas.</p>
    <p style="margin:16px 0 0;font-size:14px">— A equipa do creches.app</p>
  </td></tr>
  <tr><td style="padding:16px 32px 26px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9B97B5;border-top:1px solid #F0ECF6">
    Recebes este email porque pediste contacto a uma creche no creches.app. Os teus dados só são partilhados com essa creche — nunca são vendidos nem usados para publicidade.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function ackPaiText(lead, linkAcomp) {
  const creche = lead.creche_nome || "creche";
  return `Olá ${lead.nome || ""},

O teu pedido de contacto foi enviado com sucesso à ${creche}. Boa sorte!

O que acontece a seguir? A creche recebe o teu contacto e costuma responder em poucos dias — normalmente por email ou telefone, diretamente para ti.
${linkAcomp ? `\nAcompanha a tua candidatura (link privado): ${linkAcomp}\n` : ""}
Se não tiveres resposta em alguns dias, nós avisamos-te e sugerimos alternativas.

— A equipa do creches.app`;
}

// ── Email de aviso à creche (template da marca) ──────────────────────────────
function avisoCrecheHTML(lead, temPainel) {
  const creche = escapeHtml(lead.creche_nome || "a vossa creche");
  const atraso = notaAtraso(lead);
  const linha = (ico, txt) => `<tr><td style="padding:5px 0;font-size:15px;color:#2C2356">${ico}&nbsp;&nbsp;${txt}</td></tr>`;
  const tel = lead.telefone ? String(lead.telefone).replace(/\s+/g, "") : "";
  const detalhes = [
    linha("👤", `<b>${escapeHtml(lead.nome || "")}</b>`),
    linha("✉️", `<a href="mailto:${escapeHtml(lead.email)}" style="color:#B4255C">${escapeHtml(lead.email)}</a>`),
    tel ? linha("📞", `<a href="tel:${escapeHtml(tel)}" style="color:#B4255C">${escapeHtml(lead.telefone)}</a>`) : "",
    lead.idade_crianca
      ? linha("👶", `Criança: <b>${escapeHtml(lead.idade_crianca)}</b>${
          lead.nascimento ? ` <span style="color:#6E6989">(nasc. ${escapeHtml(dataPt(lead.nascimento))})</span>` : ""}`)
      : "",
    lead.mes_entrada ? linha("📅", `Entrada pretendida: <b>${escapeHtml(lead.mes_entrada)}</b>`) : ""
  ].filter(Boolean).join("");

  const msg = lead.mensagem
    ? `<div style="background:#fff;border-left:3px solid #FF9F68;border-radius:8px;padding:14px 16px;margin:0 0 22px;font-size:14.5px;color:#4A4060;font-style:italic">«${escapeHtml(lead.mensagem)}»</div>`
    : "";

  const rodapePainel = temPainel
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
        <a href="https://creches.app/painel" style="display:inline-block;background:linear-gradient(135deg,#FF6B9D,#FF9F68);color:#fff;font-weight:bold;font-size:16px;text-decoration:none;padding:15px 38px;border-radius:99px">Gerir no painel →</a>
      </td></tr></table>
      <p style="margin:14px 0 0;font-size:13px;color:#6E6989;text-align:center">Podem também responder diretamente a este email — vai direto para a família.</p>`
    : `<div style="background:#FFF6EE;border-radius:14px;padding:18px 20px;margin:0 0 18px">
        <div style="font-weight:bold;margin-bottom:6px;color:#2C2356">Sabiam que a vossa página no creches.app é gratuita?</div>
        <div style="font-size:14.5px;color:#4A4060">Podem gerir vagas, receber estes pedidos organizados e ver quantas famílias vos procuram. Sem custos, sem publicidade.</div>
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
        <a href="https://creches.app/para-creches" style="display:inline-block;background:linear-gradient(135deg,#FF6B9D,#FF9F68);color:#fff;font-weight:bold;font-size:16px;text-decoration:none;padding:15px 38px;border-radius:99px">Pedir acesso ao painel →</a>
      </td></tr></table>
      <p style="margin:14px 0 0;font-size:13px;color:#6E6989;text-align:center">Podem responder diretamente a este email — a vossa resposta chega à família.</p>`;

  return `<!doctype html><html lang="pt-PT"><body style="margin:0;padding:0;background:#FFF6EE">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF6EE;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(60,40,90,.1)">
  <tr><td style="background:linear-gradient(135deg,#FF6B9D,#FF9F68);padding:30px 32px 26px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><img src="https://creches.app/icon-192.png" width="46" height="46" style="border-radius:12px;display:block" alt="Creches.app"></td>
      <td style="vertical-align:middle;padding-left:12px"><span style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:20px;font-weight:bold;color:#fff">Creches.app</span></td>
    </tr></table>
    <div style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:22px;font-weight:bold;color:#fff;line-height:1.3;margin-top:18px">💌 Uma família quer<br>contactar-vos.</div>
  </td></tr>
  <tr><td style="padding:28px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2C2356;line-height:1.6">
    ${atraso ? `<div style="background:#FFF4D6;border-left:4px solid #E0A800;border-radius:10px;padding:13px 16px;margin:0 0 18px;font-size:14px;color:#6B4E00;line-height:1.55">⏳ ${escapeHtml(atraso)}</div>` : ""}
    <p style="margin:0 0 18px">Uma família procurou creche no creches.app e deixou contacto para <b>${creche}</b>:</p>
    <div style="background:#FFF6EE;border-radius:14px;padding:16px 20px;margin:0 0 18px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${detalhes}</table>
    </div>
    ${msg}
    <div style="background:#DEF5E1;border-radius:14px;padding:14px 18px;margin:0 0 22px;font-size:14.5px;color:#1E7B34">
      ⏱️ <b>Responder no próprio dia é meia inscrição feita.</b> As famílias contactam várias creches ao mesmo tempo.
    </div>
    ${rodapePainel}
    <p style="margin:22px 0 0;font-size:14px">— A equipa do creches.app</p>
  </td></tr>
  <tr><td style="padding:16px 32px 26px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9B97B5;border-top:1px solid #F0ECF6">
    Recebem este email porque uma família pediu contacto convosco através do creches.app — um mapa gratuito de creches em Portugal. Não vendemos dados nem fazemos publicidade. Se não quiserem receber estes pedidos, respondam a dizer.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function avisoCrecheText(lead, temPainel) {
  const atraso = notaAtraso(lead);
  return `${atraso ? atraso + "\n\n" : ""}Uma família procurou creche no creches.app e deixou contacto para ${lead.creche_nome || "a vossa creche"}:

Nome: ${lead.nome || "—"}
Email: ${lead.email || "—"}
Telefone: ${lead.telefone || "—"}
Criança: ${lead.idade_crianca || "—"}${lead.nascimento ? ` (nasc. ${dataPt(lead.nascimento)})` : ""}
Entrada pretendida: ${lead.mes_entrada || "—"}
${lead.mensagem ? `Mensagem: «${lead.mensagem}»\n` : ""}
Responder no próprio dia é meia inscrição feita — as famílias contactam várias creches ao mesmo tempo.

${temPainel ? "Gerir no painel: https://creches.app/painel" : "A vossa página no creches.app é gratuita — podem gerir vagas e receber estes pedidos organizados: https://creches.app/para-creches"}

Podem responder diretamente a este email — a vossa resposta chega à família.

— A equipa do creches.app`;
}

// Emails da creche no dataset público (para creches ainda sem painel).
//
// Devolve ATÉ DOIS endereços, e a razão é concreta: 368 creches tinham no
// OpenStreetMap um email diferente do que consta na Carta Social, e em 284
// desses casos o nosso era a caixa do agrupamento (@escolas.min-edu.pt) — que
// a creche raramente lê. Escolher um seria adivinhar qual está a ser lido.
// Mandar para os dois custa o mesmo e chega a quem estiver do outro lado.
async function emailsDoDataset(creche_id) {
  const valido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  try {
    const ds = await fetch("https://creches.app/creches_pt.json").then(r => r.json());
    const lista = Array.isArray(ds) ? ds : (ds && ds.creches) || [];
    const c = lista.find(x => String(x.id) === String(creche_id));
    if (!c) return [];
    // Creche fechada ao público (só filhos de colaboradores, por exemplo): não
    // faz sentido entregar-lhe o pedido de uma família que nunca poderá entrar.
    // A creche o Gonzo de Braga escreveu-nos exactamente isto — que estar
    // listada como disponível "cria uma ilusão de possibilidade". Tem razão.
    // O `nao_contactar` NÃO entra aqui de propósito: é um opt-out dos convites,
    // que são marketing nosso. O pedido de uma família é outra coisa.
    if (c.fechada_ao_publico) return [];
    const candidatos = [c.email, c.email_oficial]
      .map(e => String(e || "").split(";")[0].trim().toLowerCase())
      .filter(valido);
    return [...new Set(candidatos)];          // sem repetidos
  } catch (e) {
    console.error("emailsDoDataset:", e);
    return [];
  }
}

// ── Limite por IP ───────────────────────────────────────────────────────────
// Sem isto, quem descobrir o endpoint cria leads em massa e faz-nos enviar
// milhares de emails com o nosso domínio — queima a quota do Resend, arrisca a
// suspensão da conta e permite email-bombing de qualquer creche em nosso nome.
const LIMITE_HORA = 12;

function ipDoPedido(req) {
  const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return fwd || req.socket?.remoteAddress || "desconhecido";
}

async function dentroDoLimite(db, ip) {
  const janela = new Date().toISOString().slice(0, 13);          // AAAA-MM-DDTHH
  const ref = db.doc(`ratelimit/lead-notify_${janela}_${Buffer.from(ip).toString("base64url")}`);
  try {
    const n = await db.runTransaction(async (t) => {
      const d = await t.get(ref);
      const atual = (d.exists && d.data().n) || 0;
      if (atual >= LIMITE_HORA) return atual + 1;
      t.set(ref, { n: atual + 1, ip, janela, expires_at: new Date(Date.now() + 2 * 3600e3) });
      return atual + 1;
    });
    return n <= LIMITE_HORA;
  } catch (e) {
    return true;   // se o contador falhar, não bloqueamos famílias legítimas
  }
}

// ── App Check ───────────────────────────────────────────────────────────────
// O token vem no corpo (e não num cabeçalho) porque o cliente usa sendBeacon,
// que não permite cabeçalhos personalizados.
async function appCheckValido(token) {
  if (!token || typeof token !== "string") return false;
  try {
    const { getAppCheck } = await import("firebase-admin/app-check");
    await getAppCheck().verifyToken(token);
    return true;
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://creches.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    if (!process.env.RESEND_API_KEY || !process.env.FIREBASE_SERVICE_ACCOUNT) {
      return res.status(503).json({ error: "Email not configured yet" });
    }
    initFirebase();
    const db = getFirestore();

    const { lead_id } = req.body || {};
    if (!lead_id || typeof lead_id !== "string" || lead_id.length > 40) {
      return res.status(400).json({ error: "lead_id inválido" });
    }

    // Limite por IP antes de qualquer leitura pesada ou envio de email.
    const ip = ipDoPedido(req);
    if (!(await dentroDoLimite(db, ip))) {
      console.warn("[lead-notify] limite por IP atingido:", ip);
      return res.status(429).json({ error: "Demasiados pedidos. Tenta daqui a pouco." });
    }

    // App Check: enquanto APPCHECK_ENFORCE não estiver ligado, só regista.
    const okAppCheck = await appCheckValido((req.body || {}).appcheck);
    if (!okAppCheck) {
      if (process.env.APPCHECK_ENFORCE === "1") {
        return res.status(401).json({ error: "App Check inválido" });
      }
      console.warn("[lead-notify] sem App Check válido (modo observação) ip=", ip);
    }

    const snap = await db.doc(`creche_leads/${lead_id}`).get();
    if (!snap.exists) return res.status(404).json({ error: "Lead não existe" });
    const lead = snap.data();

    // Reenvio manual (admin): salta a idempotência e a janela dos 10 min.
    // Exige Bearer com ID token de um admin — senão qualquer um podia gerar spam.
    let forcado = false;
    if (req.body && req.body.force === true) {
      const authz = req.headers.authorization || "";
      if (!authz.startsWith("Bearer ")) return res.status(401).json({ error: "Reenvio requer admin" });
      const bearer = authz.slice(7).trim();
      const cronSecret = (process.env.CRON_SECRET || "").trim();
      if (cronSecret && bearer === cronSecret) {
        forcado = true;                       // varrimento automático (lead-reminders)
      } else {
        try {                                 // botão do admin no /admin
          const { getAuth } = await import("firebase-admin/auth");
          const dec = await getAuth().verifyIdToken(bearer);
          const adm = await db.doc(`admins/${dec.uid}`).get();
          if (!adm.exists) return res.status(403).json({ error: "Não és admin" });
          forcado = true;
        } catch (e) {
          return res.status(401).json({ error: "Token inválido" });
        }
      }
    }
    if (lead.notificado && !forcado) return res.status(200).json({ ok: true, skipped: "já notificado" });
    const ts = lead.ts && lead.ts.toMillis ? lead.ts.toMillis() : 0;
    if (!forcado && (!ts || Date.now() - ts > 10 * 60 * 1000)) {
      return res.status(400).json({ error: "Lead demasiado antigo" });
    }

    // Destinatários: gestores desta creche (lookup server-side, nunca do request).
    // Se a creche ainda não tem painel, cai no email público do dataset — assim
    // NENHUM pedido de família fica sem chegar à creche.
    const mgrs = await db.collection("creche_managers").where("creche_id", "==", lead.creche_id).get();
    const emails = [];
    mgrs.forEach(d => { const e = d.data().email; if (e) emails.push(e); });
    const temPainel = emails.length > 0;
    if (!temPainel) {
      const doDataset = await emailsDoDataset(lead.creche_id);
      if (!doDataset.length) {
        // Devolvia ok:true e o ecrã dizia "Enviado!" — a uma família cujo pedido
        // morreu aqui e que nunca foi avisada. Aconteceu duas vezes à mesma mãe,
        // a 23 e a 31 de agosto, para "A Escolinha" no Porto: ficou 12 dias à
        // espera de uma resposta que nunca ia chegar. São 466 das 4.037 creches
        // sem contacto nenhum, portanto isto não era um caso isolado.
        //
        // Continua a devolver 200 (o pedido FICA registado — se um dia
        // encontrarmos o contacto, o leads_por_entregar entrega-o), mas passa a
        // dizer a verdade ao cliente, que tem de a mostrar.
        await snap.ref.update({ notificado: false, sem_contacto: true }).catch(() => {});
        return res.status(200).json({
          ok: true,
          entregue: false,
          motivo: "sem_contacto",
          aviso: "Ainda não temos contacto desta creche, por isso o pedido não pôde ser entregue. Guardámo-lo: se conseguirmos o contacto, enviamos e avisamos-te.",
        });
      }
      emails.push(...doDataset);
    }

    // Endereço de resposta próprio deste lead. Se a creche carregar em
    // "Responder", a mensagem passa por /api/resposta-inbound, que a reencaminha
    // ao pai e regista que houve resposta — sem isto somos cegos: a resposta ia
    // direta para a caixa do pai e nunca saberíamos que existiu.
    // Sem RESPOSTA_DOMINIO configurado, cai no comportamento antigo (email do pai).
    const dominioResposta = (process.env.RESPOSTA_DOMINIO || "").trim().toLowerCase();
    const tokenLead = (typeof lead.token === "string" && /^[a-f0-9]{20,64}$/.test(lead.token)) ? lead.token : "";
    const replyTo = (dominioResposta && tokenLead)
      ? `lead-${tokenLead}@${dominioResposta}`
      : lead.email;

    const payload = {
      from: FROM_EMAIL,
      to: emails.slice(0, 3),
      reply_to: replyTo,
      subject: `💌 Uma família quer contactar a ${lead.creche_nome || "vossa creche"}`,
      text: avisoCrecheText(lead, temPainel),
      html: avisoCrecheHTML(lead, temPainel)
    };

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      console.error("Resend lead-notify:", await resp.text());
      return res.status(502).json({ error: "Envio falhou" });
    }

    await snap.ref.update({ notificado: true, notificado_em: new Date(), sem_painel: !temPainel });

    // ── Acknowledgment ao pai (best-effort: o email à creche é o crítico) ──
    // Se falhar, regista e segue — o pedido continua a contar como sucesso.
    let ackPai = false;
    if (lead.email && (!lead.ack_pai_enviado || forcado)) {
      try {
        const tok = (typeof lead.token === "string" && /^[a-zA-Z0-9]{20,64}$/.test(lead.token)) ? lead.token : "";
        const linkAcomp = tok ? `https://creches.app/candidatura?c=${tok}` : "";
        const ackResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [lead.email],
            reply_to: "geral@creches.app",
            subject: `✓ O teu pedido foi enviado à ${lead.creche_nome || "creche"}`,
            html: ackPaiHTML(lead, linkAcomp),
            text: ackPaiText(lead, linkAcomp)
          })
        });
        if (ackResp.ok) {
          await snap.ref.update({ ack_pai_enviado: true });
          ackPai = true;
        } else {
          console.error("lead-notify ack pai falhou:", await ackResp.text());
        }
      } catch (e) {
        console.error("lead-notify ack pai:", e);
      }
    }

    return res.status(200).json({ ok: true, entregue: true, ack_pai: ackPai });
  } catch (e) {
    console.error("lead-notify:", e);
    return res.status(500).json({ error: e.message });
  }
}
