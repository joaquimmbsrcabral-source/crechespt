#!/usr/bin/env node
/**
 * Reenvia os pedidos de contacto que nunca chegaram à creche.
 *
 * O que aconteceu: quando uma família carregava em "Tenho interesse" numa creche
 * de que não conhecíamos o email, o /api/lead-notify devolvia
 * `skipped: "creche sem email conhecido"` e não marcava o lead como notificado.
 * O ecrã dizia "Enviado!" à família, mas ninguém recebia nada — nem a creche,
 * nem sequer o email de confirmação ao pai, que só é enviado depois de a creche
 * receber o dele.
 *
 * Com a recolha da Carta Social passámos a ter email de 102 creches que já
 * estavam no mapa e não o tinham. Estes pedidos são recuperáveis.
 *
 * Como funciona: não duplica a lógica de envio. Encontra os leads por entregar e
 * chama o mesmo /api/lead-notify com `force: true`, que já sabe resolver o
 * destinatário, montar o email, marcar o lead e avisar a família. Se um dia essa
 * lógica mudar, este script acompanha-a sem alterações.
 *
 * O email à creche leva uma nota a dizer quando o pedido foi feito e porque só
 * chega agora — sem isso, a creche telefonaria a uma família a falar de um
 * pedido "de ontem" que afinal é de há um mês.
 *
 * ATENÇÃO: o caminho normal é agora o botão em /admin → Leads →
 * "Pedidos que nunca chegaram à creche". As variáveis do Vercel estão marcadas
 * "Sensitive" e não podem ser lidas depois de criadas, portanto este script só
 * funciona para quem tiver a chave de serviço do Firebase por outra via.
 *
 * Uso (só se tiveres mesmo as credenciais à mão):
 *
 *   vercel env pull .env.local
 *   set -a && source .env.local && set +a
 *   node scripts/reenviar_leads_por_entregar.js            # diagnóstico
 *   node scripts/reenviar_leads_por_entregar.js --enviar   # envia mesmo
 *
 * Opções:
 *   --enviar        envia (sem isto, só mostra o que faria)
 *   --dias N        ignora pedidos com mais de N dias (por defeito 120)
 *   --limite N      no máximo N envios nesta execução (por defeito 50)
 *
 * Corre primeiro sem --enviar. O que sai é exactamente o que seria enviado.
 */
// firebase-admin está no package.json mas pode não estar instalado localmente
// (no Vercel vem sempre). Falhar aqui com a mensagem certa poupa dez minutos.
let initializeApp, getApps, cert, getFirestore;
try {
  ({ initializeApp, getApps, cert } = await import("firebase-admin/app"));
  ({ getFirestore } = await import("firebase-admin/firestore"));
} catch (e) {
  console.error("Falta o firebase-admin. Instala com:  npm install");
  process.exit(1);
}

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ENDPOINT = "https://creches.app/api/lead-notify";

const args = process.argv.slice(2);
const ENVIAR = args.includes("--enviar");
const opcao = (nome, defeito) => {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] ? parseInt(args[i + 1], 10) : defeito;
};
const DIAS_MAX = opcao("--dias", 120);
const LIMITE = opcao("--limite", 50);

function ajuda(problema) {
  console.error(`\n${problema}\n`);
  console.error("As duas variáveis são as mesmas que o site usa no Vercel.");
  console.error("Para as trazer para o terminal:\n");
  console.error("   vercel env pull .env.local");
  console.error("   set -a && source .env.local && set +a");
  console.error("   node scripts/reenviar_leads_por_entregar.js\n");
  console.error("Ou copia-as à mão do painel do Vercel:");
  console.error("   Settings → Environment Variables → FIREBASE_SERVICE_ACCOUNT e CRON_SECRET\n");
  process.exit(1);
}

function contaDeServico() {
  const raw0 = (process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
  if (!raw0) ajuda("Falta FIREBASE_SERVICE_ACCOUNT no ambiente.");
  // O erro mais provável: ter corrido o exemplo com '...' em vez do valor real.
  if (raw0.length < 100 || /^[.\s]*$/.test(raw0)) {
    ajuda(`FIREBASE_SERVICE_ACCOUNT tem ${raw0.length} caracteres — é curto demais.\n` +
          "Parece que ficou o exemplo ('...') em vez da chave verdadeira.");
  }
  let raw = raw0;
  if (!raw.startsWith("{")) {
    try { raw = Buffer.from(raw, "base64").toString("utf-8").trim(); } catch (e) { raw = ""; }
  }
  try {
    const sa = JSON.parse(raw);
    if (!sa.project_id || !sa.private_key) {
      ajuda("O FIREBASE_SERVICE_ACCOUNT não tem project_id/private_key — não é a chave de serviço.");
    }
    return sa;
  } catch (e) {
    ajuda("Não consegui ler o FIREBASE_SERVICE_ACCOUNT: não é JSON válido nem base64 de JSON.");
  }
}

const esconde = (e) => {
  const s = String(e || "");
  const [u, d] = s.split("@");
  return d ? `${u.slice(0, 3)}***@${d}` : "***";
};

async function main() {
  const segredo = (process.env.CRON_SECRET || "").trim();
  if (ENVIAR) {
    if (!segredo) ajuda("Falta CRON_SECRET — é ele que autoriza o reenvio no endpoint.");
    if (segredo.length < 12 || /^[.\s]*$/.test(segredo)) {
      ajuda(`CRON_SECRET tem ${segredo.length} caracteres — parece o exemplo, não o valor real.`);
    }
  }

  if (!getApps().length) initializeApp({ credential: cert(contaDeServico()) });
  const db = getFirestore();

  // O dataset local é o que já está publicado (o endpoint lê a versão do site).
  const bruto = JSON.parse(fs.readFileSync(path.join(RAIZ, "creches_pt.json"), "utf-8"));
  const lista = Array.isArray(bruto) ? bruto : bruto.creches;
  const porId = new Map(lista.map((c) => [String(c.id), c]));

  console.log(ENVIAR ? "MODO REAL — vai enviar emails\n" : "DIAGNÓSTICO — não envia nada\n");

  const snap = await db.collection("creche_leads").orderBy("ts", "desc").limit(3000).get();
  const agora = Date.now();
  const cont = { total: snap.size, entregues: 0, antigos: 0, sem_email: 0, prontos: 0 };
  const prontos = [];

  snap.forEach((d) => {
    const l = d.data();
    if (l.notificado === true) { cont.entregues++; return; }

    const ts = l.ts && l.ts.toMillis ? l.ts.toMillis() : 0;
    const dias = ts ? Math.floor((agora - ts) / 86400000) : 9999;
    if (dias > DIAS_MAX) { cont.antigos++; return; }

    const creche = porId.get(String(l.creche_id));
    if (!creche || !creche.email) { cont.sem_email++; return; }

    cont.prontos++;
    prontos.push({ id: d.id, dias, creche: creche.nome, email: creche.email,
                   familia: l.nome || "—", contacto: l.email || "" });
  });

  console.log(`leads lidos          : ${cont.total}`);
  console.log(`  já entregues       : ${cont.entregues}`);
  console.log(`  mais de ${DIAS_MAX} dias   : ${cont.antigos}  (deixados de fora)`);
  console.log(`  creche ainda sem email: ${cont.sem_email}`);
  console.log(`  ✓ por entregar, e agora possível: ${cont.prontos}\n`);

  if (!prontos.length) return;

  prontos.sort((a, b) => a.dias - b.dias);
  const lote = prontos.slice(0, LIMITE);
  console.log(`Mostrando ${lote.length} de ${prontos.length}:\n`);
  for (const p of lote) {
    console.log(`  ${String(p.dias).padStart(3)} dias · ${p.creche.slice(0, 40).padEnd(40)} → ${esconde(p.email)}`);
  }

  if (!ENVIAR) {
    console.log(`\nPara enviar mesmo: acrescenta --enviar`);
    console.log(`Serão ${lote.length} emails a creches reais, e ${lote.length} confirmações a famílias.`);
    return;
  }

  console.log("\nA enviar…");
  let ok = 0, falhou = 0;
  for (const p of lote) {
    try {
      const r = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${segredo}` },
        body: JSON.stringify({ lead_id: p.id, force: true }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { ok++; console.log(`  ✓ ${p.creche.slice(0, 44)}`); }
      else { falhou++; console.log(`  ✗ ${p.creche.slice(0, 44)} — ${j.error || j.skipped || r.status}`); }
    } catch (e) {
      falhou++;
      console.log(`  ✗ ${p.creche.slice(0, 44)} — ${e.message}`);
    }
    // Cortesia com o Resend e com as caixas de correio das creches.
    await new Promise((r) => setTimeout(r, 900));
  }
  console.log(`\n✓ ${ok} entregues · ${falhou} falharam`);
  if (prontos.length > lote.length) {
    console.log(`  Faltam ${prontos.length - lote.length}. Corre outra vez para continuar.`);
  }
}

main().catch((e) => {
  console.error("Erro:", e.message);
  process.exit(1);
});
