# Verificação de emails das creches com leads — 6 ago 2026

**Contexto:** quando uma creche sem painel recebe um lead, a notificação vai para o email público do dataset. Cruzei os envios do Resend (últimas ~2 semanas) com o dataset: 11 creches receberam leads de famílias. O problema não são bounces — é que 8 creches **privadas** tinham emails `@escolas.min-edu.pt` (aliases antigos do Ministério, provavelmente caixas mortas que "entregam" mas ninguém lê).

## ✅ Corrigidos no dataset (fichas regeneradas — falta `./deploy.sh`)

| Creche | Email antigo | Email novo | Fonte |
|---|---|---|---|
| Centro Infantil "Curiosa Idade" (Oeiras) | ci.curiosaidade@escolas.min-edu.pt | informacoes@curiosaidade.pt | curiosaidade.pt (oficial) |
| JI da Assoc. Proteção à Infância da Ajuda (Lisboa) | ass.pinfanciaajuda@escolas.min-edu.pt | geral@apiaajuda.com | apiaajuda.com (oficial) |
| Centro Social e Cultural da Paróquia de Valbom (Gondomar) | cs.valbom@escolas.min-edu.pt | geral@centrosocialvalbom.org | centrosocialvalbom.org (oficial) |
| Centro Infantil da Lixa (Felgueiras) | ci.lixa@escolas.min-edu.pt | centroinfantildalixa@gmail.com | directorioescolas.eu |

## ⚠️ Com leads mas sem email melhor encontrado (validar por telefone)

- **Externato Senhora do Alívio** (Lixa, Felgueiras) — sem email público; tem Facebook. Tel: 255 494 758
- **Centro Infantil de Valbom** (Gondomar) — possível ci.valbom@net.vodafone.pt (Coverflex, não confirmado). Tel: 224 664 410
- **Infantário "O Caracol"** (Estoi, Faro) — operador tem site centroparoquial-estoi.pt mas sem email visível. Tel: 289 991 133 / 289 998 402
- **Creche Jardim Infantil de Santo Amaro** (Lisboa) — todos os diretórios ecoam o cre.lisboa@escolas.min-edu.pt. Tel: 213 644 674

## ✔️ Verificados e OK

- **Bogalha** (Braga) — geral@bogalha.pt confirmado no site oficial. (Nota: o email da mãe deste lead é que faz bounce.)
- **JI de Barrocal** (Pombal) e **JI Alexandre Rodrigues Ferreira** (Lisboa) — públicas; os emails min-edu são o canal certo.

## Próximos passos sugeridos

1. `./deploy.sh` para publicar as fichas com os emails novos.
2. No /admin, reenviar as notificações dos leads das 4 creches corrigidas (botão de reenvio → lead-notify força novo envio, agora para o email certo).
3. Ligar às 4 creches da lista ⚠️ (leads à espera desde 28/07–06/08).
4. Bounces de convites a corrigir noutro dia: infantarioferrel@sapo.pt, j.infanciaguia@sapo.pt, contab.misericordia@mail.telepac.pt, direccao@ccparoquial-famoes.com, ji.valedavila@gmail.com, csp.costadecaparica@sapo.pt.
