#!/usr/bin/env node
/**
 * Apaga os emails que ficaram guardados em documentos de leitura pública.
 *
 * Porquê: as coleções /vagas e /creche_feliz_reports têm `allow read: if true`,
 * e o campo `reportado_por.email` guardava o email de login dos gestores de
 * creche e o primeiro nome de pais. Qualquer pessoa podia listar a coleção no
 * browser e extrair a lista completa. O código já não escreve o campo — este
 * script trata do que ficou para trás.
 *
 * Preserva `reportado_por.nome` (primeiro nome de quem reportou, sem contacto).
 *
 * Uso:
 *   FIREBASE_SERVICE_ACCOUNT='<json ou base64>' node scripts/limpar_emails_vagas.js --simular
 *   FIREBASE_SERVICE_ACCOUNT='<json ou base64>' node scripts/limpar_emails_vagas.js
 *
 * Corre primeiro com --simular. Só escreve sem essa flag.
 */
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const SIMULAR = process.argv.includes("--simular");
const COLECOES = ["vagas", "creche_feliz_reports"];

function contaDeServico() {
  let raw = (process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
  if (!raw) {
    console.error("Falta FIREBASE_SERVICE_ACCOUNT no ambiente.");
    process.exit(1);
  }
  if (!raw.startsWith("{")) raw = Buffer.from(raw, "base64").toString("utf-8").trim();
  return JSON.parse(raw);
}

async function main() {
  if (!getApps().length) initializeApp({ credential: cert(contaDeServico()) });
  const db = getFirestore();

  console.log(SIMULAR ? "MODO SIMULAÇÃO — não escreve nada\n" : "MODO REAL — vai escrever\n");
  let totalComEmail = 0;

  for (const nome of COLECOES) {
    const snap = await db.collection(nome).get();
    const afectados = snap.docs.filter((d) => {
      const rp = d.data().reportado_por;
      return rp && typeof rp === "object" && rp.email;
    });

    console.log(`${nome}: ${snap.size} documentos · ${afectados.length} com email guardado`);
    totalComEmail += afectados.length;
    if (!afectados.length) continue;

    for (const d of afectados.slice(0, 3)) {
      const e = String(d.data().reportado_por.email || "");
      console.log(`   ex: ${d.id} → ${e.slice(0, 3)}***@${e.split("@")[1] || "?"}`);
    }
    if (SIMULAR) continue;

    // Lotes de 400 para ficar abaixo do limite de 500 escritas por batch.
    for (let i = 0; i < afectados.length; i += 400) {
      const lote = db.batch();
      for (const d of afectados.slice(i, i + 400)) {
        const nomeQuem = d.data().reportado_por?.nome ?? null;
        lote.update(d.ref, {
          reportado_por: { nome: nomeQuem },
          email_removido_em: FieldValue.serverTimestamp(),
        });
      }
      await lote.commit();
      console.log(`   ✓ ${Math.min(i + 400, afectados.length)}/${afectados.length}`);
    }
  }

  console.log(
    SIMULAR
      ? `\n${totalComEmail} documentos seriam limpos. Corre sem --simular para o fazer.`
      : `\n✓ ${totalComEmail} documentos limpos.`
  );
}

main().catch((e) => {
  console.error("Erro:", e.message);
  process.exit(1);
});
