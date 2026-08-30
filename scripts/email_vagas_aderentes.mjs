/**
 * Gera (e opcionalmente envia) o email "Têm vaga esta semana?" às creches aderentes.
 *
 * Porque existe: das 9 creches que gerem a própria página, 6 não tocavam nas
 * vagas há 12 a 45 dias. O selo no mapa fica velho e os pais leem-no como se
 * fosse de hoje — é pior do que não ter selo nenhum. O caminho actual para
 * corrigir isso são 6 passos (abrir email → painel → login → separador → clicar
 * → guardar). Este email são dois botões.
 *
 * Uso:
 *   CRON_SECRET=… node scripts/email_vagas_aderentes.mjs --preview
 *       escreve organizacao/preview-email-vagas.html e imprime a lista
 *   CRON_SECRET=… RESEND_API_KEY=… node scripts/email_vagas_aderentes.mjs --enviar
 *       envia mesmo, via Resend, a partir de geral@creches.app
 *   … --so=email@exemplo.pt   limita a um destinatário (teste real)
 *
 * O CRON_SECRET nunca é escrito em ficheiro nenhum: entra por variável de
 * ambiente e é usado só para derivar os HMAC dos links.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FIREBASE_KEY = "AIzaSyCOGTFg5_gzSwjGWs8_B0QvUKLudcTvZXI";  // chave pública do cliente
const FS_BASE = "https://firestore.googleapis.com/v1/projects/crechespt/databases/(default)/documents";
const FROM = process.env.EMAIL_FROM || "Joaquim Cabral <geral@creches.app>";

const args = process.argv.slice(2);
const MODO_ENVIO = args.includes("--enviar");
const SO = (args.find((a) => a.startsWith("--so=")) || "").slice(5);

const SEGREDO = (process.env.CRON_SECRET || "").trim();
if (!SEGREDO) {
  console.error("✗ Falta CRON_SECRET. Os links precisam dele para serem assinados.");
  process.exit(1);
}

// Tem de ser byte a byte igual ao vagaToken() do api/_lib/vaga-confirmar.js —
// se divergir, todos os links dão 403 e ninguém percebe porquê.
const vagaToken = (crecheId, resposta) =>
  crypto.createHmac("sha256", SEGREDO).update(`${crecheId}:${resposta}`).digest("hex").slice(0, 12);

/** Tira o artigo inicial do nome, para não o repetir depois da contracção. */
const semArtigo = (nome) => String(nome || "").trim().replace(/^(?:[Oo]s|[Aa]s|[Oo]|[Aa])\s+/, "");

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ESC[c]);

const SALAS = { b0: "berçário", m12: "1-2 anos", m24: "2-3 anos", ji36: "3-6 anos" };

// Mesma lista do com_artigo() do scripts/gerar_fichas.py. A heurística anterior
// era "começa por vogal → feminino", que dava "a página da Externato Anita" e
// "da Ouriços do Saber". O género vem do substantivo, não da primeira letra.
const MASC = new Set(["jardim","centro","externato","infantario","infantário","colegio",
  "colégio","atl","lar","patronato","complexo","espaco","espaço","instituto","nucleo",
  "núcleo","berçario","berçário","bercario"]);
/**
 * Devolve a contracção certa para "a página __ <nome>": da / do / das / dos.
 * O gerar_fichas.py só decide entre "A" e "O" e não trata plurais — por isso
 * escrevia "a Ouriços do Saber". Aqui trata, porque estes 8 emails vão para
 * pessoas que conhecem o nome da própria instituição e reparam.
 * (A mesma correcção faz falta no com_artigo() do Python.)
 */
function artigo(nome) {
  const low = String(nome || "").trim().toLowerCase();
  // Nomes que já trazem artigo — "As Formiguinhas", "O Rezingão" — contraem com
  // ele. Sem isto sai "a página da As Formiguinhas". Nenhum dos 8 destinatários
  // de hoje é assim, mas há dezenas no dataset e este script vai ser reutilizado.
  const m = low.match(/^(os|as|o|a)\s/);
  if (m) return { o: "do", a: "da", os: "dos", as: "das" }[m[1]];
  const primeira = (low.split(/[\s\-]/)[0] || "").replace(/^["«'']+/, "");
  if (MASC.has(primeira) || primeira.startsWith("jardim")) return "do";
  if (primeira.length > 3 && primeira.endsWith("s")) {
    // Plural: o género lê-se na vogal antes do "s". "Ouriços" → dos,
    // "Formiguinhas" → das. Terminações ambíguas (-es, -ns) ficam no masculino,
    // que é o género por defeito do português para grupos.
    return primeira.endsWith("as") ? "das" : "dos";
  }
  return primeira.endsWith("o") ? "do" : "da";
}

// ── Recolha ─────────────────────────────────────────────────────────────────
const val = (f) => (f == null ? null : Object.values(f)[0]);

/**
 * A lista boa vem do /api/ops?action=aderentes: tem as 14 creches aprovadas e o
 * email de quem faz login. O creche_profiles é público mas só tem as 9 que
 * preencheram o perfil — usá-lo sozinho deixa 5 aderentes de fora sem aviso.
 * Se o ops não responder (ainda não deployado, ou sem segredo), avisamos alto.
 */
async function lerAderentesOps() {
  try {
    const r = await fetch("https://creches.app/api/ops", {
      method: "POST",
      headers: { Authorization: `Bearer ${SEGREDO}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "aderentes" }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (!Array.isArray(j.aderentes)) return null;
    return j.aderentes.map((a) => ({
      id: a.creche_id,
      nome: a.nome || "",
      // Preferimos o email do gestor: é quem faz login e quem vai clicar. O
      // contacto do perfil é o que se mostra aos pais e pode ser uma caixa
      // geral que ninguém abre.
      email: (a.email_gestor || a.email_perfil || "").trim(),
      salas: a.salas_com_vaga || [],
      dias: a.dias_sem_atualizar,
    }));
  } catch { return null; }
}

async function lerPerfis() {
  const r = await fetch(`${FS_BASE}/creche_profiles?key=${FIREBASE_KEY}&pageSize=300`);
  const j = await r.json();
  return (j.documents || []).map((d) => {
    const f = d.fields || {};
    const vagasF = (f.vagas && f.vagas.mapValue && f.vagas.mapValue.fields) || {};
    return {
      id: d.name.split("/").pop(),
      email: (val(f.contacto_email) || "").trim(),
      salas: Object.keys(SALAS).filter((k) => val(vagasF[k]) === true),
      atualizado: val(vagasF.atualizado) || val(f.updated_at) || null,
    };
  });
}

async function lerNomesExtras() {
  const r = await fetch(`${FS_BASE}/creche_extras?key=${FIREBASE_KEY}&pageSize=300`);
  const j = await r.json();
  const m = new Map();
  for (const d of j.documents || []) {
    m.set("extra_" + d.name.split("/").pop(), val((d.fields || {}).nome) || "");
  }
  return m;
}

// ── Email ───────────────────────────────────────────────────────────────────
function botao(href, cor, corTexto, texto) {
  // Tabela em vez de div: o Outlook ignora border-radius em divs mas respeita-o
  // em células, e estes dois botões são a única coisa que o email precisa que
  // funcione. Sem eles, o email não tem razão de existir.
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-block;margin:0 5px 10px">
    <tr><td align="center" bgcolor="${cor}" style="border-radius:99px">
      <a href="${href}" style="display:inline-block;padding:17px 34px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;color:${corTexto};text-decoration:none;border-radius:99px">${texto}</a>
    </td></tr></table>`;
}

function emailHTML({ nome, dias, salas, linkSim, linkNao }) {
  const salasTxt = salas.length
    ? `Da última vez disseram-nos que tinham vaga em <b>${esc(salas.map((k) => SALAS[k]).join(", "))}</b>.`
    : `Neste momento a vossa página não mostra nenhuma vaga.`;
  const frase = dias == null
    ? `Ainda não sabemos se têm vaga.`
    : `A última vez que atualizaram as vagas foi <b>há ${dias} dia${dias === 1 ? "" : "s"}</b>. ${salasTxt}`;

  return `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FFF6EE">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF6EE;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(60,40,90,.1)">

  <tr><td style="background:linear-gradient(135deg,#FF6B9D,#FF9F68);padding:30px 32px 26px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle"><img src="https://creches.app/icon-192.png" width="46" height="46" style="border-radius:12px;display:block" alt="Creches.app"></td>
      <td style="vertical-align:middle;padding-left:12px"><span style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:20px;font-weight:bold;color:#fff">Creches.app</span></td>
    </tr></table>
    <div style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:22px;font-weight:bold;color:#fff;line-height:1.35;margin-top:18px">Têm vaga esta semana?<br>Respondam num clique.</div>
  </td></tr>

  <tr><td style="padding:28px 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#2C2356;line-height:1.6">
    <p style="margin:0 0 16px">Olá,</p>
    <p style="margin:0 0 16px">Todos os dias há famílias a abrir a página ${artigo(nome)} <b>${esc(semArtigo(nome))}</b> no creches.app à procura de lugar para o filho.</p>
    <p style="margin:0 0 20px">${frase}</p>
    <div style="background:#FFF6EE;border-radius:14px;padding:16px 20px;margin:0 0 24px;font-size:14.5px;color:#4A4060;line-height:1.6">
      Se a informação estiver velha, os pais telefonam para uma vaga que já não existe — ou, pior, <b>passam à frente</b> quando na verdade têm lugar.
    </div>
  </td></tr>

  <tr><td align="center" style="padding:0 24px 6px">
    ${botao(linkSim, "#1F7A3D", "#ffffff", "🟢&nbsp; Temos vaga")}
    ${botao(linkNao, "#FFFFFF", "#C2185B", "🔴&nbsp; Sem vaga")}
  </td></tr>

  <tr><td style="padding:6px 32px 26px;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;color:#6E6989;line-height:1.6;text-align:center">
    Um clique chega — <b>não precisam de fazer login</b>.<br>
    A resposta aparece no mapa em segundos e vale 31 dias.
  </td></tr>

  <tr><td style="padding:0 32px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2C2356;line-height:1.6">
    <p style="margin:0 0 14px">Se quiserem dizer <b>que salas</b> têm vaga, ou mudar mais alguma coisa, está tudo no <a href="https://creches.app/painel" style="color:#C2185B;font-weight:bold">vosso painel</a>.</p>
    <p style="margin:0 0 4px">${dias != null && dias <= 14
      ? "Obrigado por manterem isto atualizado — são das poucas que o fazem, e nota-se."
      : "São 14 creches em 4.037 a gerir a própria página. Vale mesmo a pena que a vossa esteja certa."}</p>
    <p style="margin:16px 0 0"><b>Joaquim Cabral</b> · Fundador, creches.app<br>
    <span style="font-size:13px;color:#6E6989">915 873 799 · geral@creches.app</span></p>
  </td></tr>

  <tr><td style="padding:16px 32px 26px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9B97B5;border-top:1px solid #F0ECF6">
    Recebem este email porque gerem a página ${artigo(nome)} ${esc(semArtigo(nome))} no creches.app.
    Se não quiserem receber estes lembretes, respondam «parar» e não voltamos a enviar.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function emailTexto({ nome, dias, linkSim, linkNao }) {
  return `Olá,

Todos os dias há famílias a abrir a página ${artigo(nome)} ${semArtigo(nome)} no creches.app à procura de lugar para o filho.
${dias == null ? "Ainda não sabemos se têm vaga." : `A última vez que atualizaram as vagas foi há ${dias} dias.`}

Se a informação estiver velha, os pais telefonam para uma vaga que já não existe — ou passam à frente quando na verdade têm lugar.

Respondam num clique (não precisam de fazer login):

  TEMOS VAGA →  ${linkSim}
  SEM VAGA   →  ${linkNao}

A resposta aparece no mapa em segundos e vale 31 dias.
Para dizer que salas têm vaga, ou mudar mais alguma coisa: https://creches.app/painel

${dias != null && dias <= 14
  ? "Obrigado por manterem isto atualizado — são das poucas que o fazem, e nota-se."
  : "São 14 creches em 4.037 a gerir a própria página. Vale mesmo a pena que a vossa esteja certa."}

Joaquim Cabral · Fundador, creches.app
915 873 799 · geral@creches.app

—
Recebem este email porque gerem a página ${artigo(nome)} ${semArtigo(nome)} no creches.app.
Se não quiserem receber estes lembretes, respondam «parar».`;
}

// ── Principal ───────────────────────────────────────────────────────────────
const dataset = JSON.parse(fs.readFileSync(path.join(BASE, "creches_pt.json"), "utf-8"));
const nomes = new Map(dataset.map((c) => [String(c.id), c.nome]));
const viaOps = await lerAderentesOps();
const [perfis, nomesExtras] = await Promise.all([lerPerfis(), lerNomesExtras()]);
if (!viaOps) {
  console.warn("\n⚠ /api/ops?action=aderentes indisponível (falta deploy?).");
  console.warn("  A usar só o creche_profiles público — pode faltar quem não preencheu o perfil.\n");
}

const agora = Date.now();
const destinatarios = [];
const excluidos = [];

const fonte = viaOps || perfis;
for (const p of fonte) {
  const nome = p.nome || nomes.get(p.id) || nomesExtras.get(p.id) || "";
  // Um email tem de ter um @ e um domínio a sério. O perfil de teste tem
  // "geral@" e enviar para lá só queima reputação do domínio.
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email);
  if (!nome || !emailOk) {
    excluidos.push({ id: p.id, nome: nome || "(sem nome)", email: p.email || "(sem email)",
      motivo: !nome ? "sem nome no dataset" : "email inválido" });
    continue;
  }
  if (SO && p.email.toLowerCase() !== SO.toLowerCase()) continue;
  const dias = p.dias !== undefined ? p.dias
             : (p.atualizado ? Math.floor((agora - Date.parse(p.atualizado)) / 86400000) : null);
  destinatarios.push({
    id: p.id, nome, email: p.email, dias, salas: p.salas,
    linkSim: `https://creches.app/api/vaga-confirmar?c=${encodeURIComponent(p.id)}&r=sim&t=${vagaToken(p.id, "sim")}`,
    linkNao: `https://creches.app/api/vaga-confirmar?c=${encodeURIComponent(p.id)}&r=nao&t=${vagaToken(p.id, "nao")}`,
  });
}
destinatarios.sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1));

console.log(`\n${destinatarios.length} destinatários:\n`);
for (const d of destinatarios) {
  console.log(`  ${String(d.dias ?? "?").padStart(3)} dias  ${d.nome.slice(0, 40).padEnd(41)} ${d.email}`);
}
if (excluidos.length) {
  console.log(`\n${excluidos.length} excluídos:`);
  for (const x of excluidos) console.log(`         ${x.nome.slice(0, 40).padEnd(41)} ${x.email} — ${x.motivo}`);
}

if (!MODO_ENVIO) {
  // Pré-visualização: um ficheiro com todos os emails renderizados, um a seguir
  // ao outro, para se ver exactamente o que cada creche vai receber.
  const blocos = destinatarios.map((d) => `
    <div style="max-width:560px;margin:0 auto 10px;font-family:-apple-system,sans-serif">
      <div style="background:#2C2356;color:#fff;padding:10px 16px;border-radius:10px 10px 0 0;font-size:13px">
        <b>Para:</b> ${esc(d.email)} &nbsp;·&nbsp; <b>Assunto:</b> ${esc(assunto(d))}
      </div>
    </div>
    <div style="max-width:560px;margin:0 auto 40px;border:1px solid #E7DDD4;border-radius:0 0 10px 10px;overflow:hidden">
      ${emailHTML(d).split("<body")[1].replace(/^[^>]*>/, "").replace("</body></html>", "")}
    </div>`).join("\n");
  const out = path.join(BASE, "organizacao", "preview-email-vagas.html");
  fs.writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>Pré-visualização — email de vagas</title>
<body style="margin:0;background:#EFE8E0;padding:30px 12px">
<h1 style="font-family:-apple-system,sans-serif;text-align:center;color:#2C2356;font-size:20px">
  Pré-visualização — ${destinatarios.length} emails (nada foi enviado)</h1>
${blocos}</body>`);
  console.log(`\n✓ Pré-visualização: ${out}`);
  console.log("  Nada foi enviado. Para enviar: --enviar (precisa de RESEND_API_KEY).\n");
  process.exit(0);
}

// ── Envio ───────────────────────────────────────────────────────────────────
function assunto(d) {
  return d.salas.length
    ? `${d.nome} — continuam com vaga?`
    : `${d.nome} — já têm vaga?`;
}

if (!process.env.RESEND_API_KEY) {
  console.error("\n✗ Falta RESEND_API_KEY. Nada foi enviado.");
  process.exit(1);
}

// O erro mais caro possível seria enviar o email antes de o endpoint estar em
// produção: os dois botões — a única coisa que o email faz — dariam 404, e não
// há segunda oportunidade de causar a primeira impressão a 14 creches.
// Batemos à porta com um token propositadamente inválido: 403 significa que o
// endpoint existe e valida; 404 significa que ainda não foi deployado.
{
  const r = await fetch("https://creches.app/api/vaga-confirmar?c=teste&r=sim&t=000000000000");
  if (r.status !== 403) {
    console.error(`\n✗ /api/vaga-confirmar respondeu ${r.status}, esperava 403.`);
    console.error("  O endpoint ainda não está em produção — corre ./deploy.sh primeiro.");
    console.error("  NADA foi enviado.\n");
    process.exit(1);
  }
  console.log("\n✓ /api/vaga-confirmar está vivo em produção (403 ao token inválido).");
}
let ok = 0, falhou = 0;
for (const d of destinatarios) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM, to: [d.email], reply_to: "geral@creches.app",
      subject: assunto(d), html: emailHTML(d), text: emailTexto(d),
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (r.ok) { ok++; console.log(`  ✓ ${d.email}`); }
  else { falhou++; console.log(`  ✗ ${d.email} — ${j.message || r.status}`); }
  await new Promise((s) => setTimeout(s, 400));  // protege a reputação do domínio
}
console.log(`\n✓ ${ok} enviados${falhou ? `, ${falhou} falharam` : ""}.\n`);
