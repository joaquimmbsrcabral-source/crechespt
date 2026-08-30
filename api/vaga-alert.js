/**
 * /api/vaga-alert — wrapper que junta dois endpoints numa só função
 * (limite de 12 Serverless Functions no plano Hobby da Vercel).
 *
 * Os URLs públicos antigos continuam a funcionar via rewrites no vercel.json:
 *   /api/vaga-alert-notify → /api/vaga-alert?fn=notify  (disparo de alertas de vaga)
 *   /api/vaga-alert-unsub  → /api/vaga-alert?fn=unsub   (links de unsubscribe nos emails)
 *   /api/vaga-confirmar    → /api/vaga-alert?fn=confirmar (a creche diz se tem vaga, 1 clique)
 * Os handlers originais vivem em api/_lib/ (o prefixo "_" impede a Vercel de
 * os transformar em funções próprias).
 */

import notify from "./_lib/vaga-alert-notify.js";
import unsub from "./_lib/vaga-alert-unsub.js";
import confirmar from "./_lib/vaga-confirmar.js";

export default async function handler(req, res) {
  const fn = String((req.query && req.query.fn) || "");
  if (fn === "notify") return notify(req, res);
  if (fn === "unsub") return unsub(req, res);
  if (fn === "confirmar") return confirmar(req, res);
  return res.status(404).json({ error: "fn inválido (notify|unsub|confirmar)" });
}
