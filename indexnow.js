/**
 * IndexNow — força crawl instantâneo em Bing, Yandex, Seznam, Naver.
 * Não funciona para Google (Google só usa Search Console para indexação manual).
 *
 * Como usar:
 *   1. Faz deploy do ficheiro `8d68d51f83e5a12911ef224aab763ce0.txt` (já criado na raiz)
 *      — está acessível em https://creches.app/8d68d51f83e5a12911ef224aab763ce0.txt
 *   2. Corre: node indexnow.js
 *
 * Resposta esperada: 200 OK (sucesso) ou 202 Accepted (recebido, em fila)
 */

const HOST = "creches.app";
const KEY = "8d68d51f83e5a12911ef224aab763ce0";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const URLS = [
  "https://creches.app/",
  "https://creches.app/app",
  "https://creches.app/sobre",
  "https://creches.app/imprensa",
  "https://creches.app/para-creches",
  "https://creches.app/guias",
  "https://creches.app/guias/como-escolher-creche",
  "https://creches.app/guias/quanto-custa-creche-portugal",
  "https://creches.app/guias/creche-ama-avos-qual-escolher",
  "https://creches.app/creches",
  "https://creches.app/creches/lisboa",
  "https://creches.app/creches/porto",
  "https://creches.app/creches/braga",
  "https://creches.app/creches/setubal",
  "https://creches.app/creches/aveiro",
  "https://creches.app/creches/coimbra",
  "https://creches.app/creches/faro",
  "https://creches.app/creches/leiria",
  "https://creches.app/creches/santarem",
  "https://creches.app/creches/evora",
  "https://creches.app/creches/beja",
  "https://creches.app/creches/portalegre",
  "https://creches.app/creches/viseu",
  "https://creches.app/creches/guarda",
  "https://creches.app/creches/castelo-branco",
  "https://creches.app/creches/braganca",
  "https://creches.app/creches/vila-real",
  "https://creches.app/creches/viana-do-castelo",
  "https://creches.app/creches/madeira",
  "https://creches.app/creches/acores"
];

const body = {
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList: URLS
};

console.log(`Submetendo ${URLS.length} URLs ao IndexNow...`);

fetch("https://api.indexnow.org/IndexNow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body)
})
  .then(r => {
    console.log(`Status: ${r.status} ${r.statusText}`);
    if (r.status === 200 || r.status === 202) {
      console.log("✅ Sucesso! Bing e Yandex vão recrawl em horas (não dias).");
    } else if (r.status === 422) {
      console.log("❌ Verifica se o ficheiro de key existe em " + KEY_LOCATION);
    } else {
      console.log("⚠️ Resposta inesperada. Verifica manualmente.");
    }
    return r.text();
  })
  .then(t => { if (t) console.log("Resposta:", t); })
  .catch(e => console.error("Erro:", e));
