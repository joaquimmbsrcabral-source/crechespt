/**
 * /api/lead-resposta — wrapper que junta dois endpoints numa só função
 * (limite de 12 Serverless Functions no plano Hobby da Vercel).
 *
 * Os URLs públicos antigos continuam a funcionar via rewrites no vercel.json:
 *   /api/lead-feedback  → /api/lead-resposta?fn=feedback   (botões Sim/Não dos emails)
 *   /api/lead-resultado → /api/lead-resposta?fn=resultado  (botões "conseguiram vaga?")
 * Os handlers originais vivem em api/_lib/ (o prefixo "_" impede a Vercel de
 * os transformar em funções próprias).
 */

import feedback from "./_lib/lead-feedback.js";
import resultado from "./_lib/lead-resultado.js";

export default async function handler(req, res) {
  const fn = String((req.query && req.query.fn) || "");
  if (fn === "resultado") return resultado(req, res);
  if (fn === "feedback") return feedback(req, res);
  return res.status(404).json({ error: "fn inválido (feedback|resultado)" });
}
