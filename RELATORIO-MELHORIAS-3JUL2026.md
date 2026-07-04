# Relatório de melhorias — 3 Julho 2026 (Onda 33)

Auditoria profunda ao repo + site live, com correções aplicadas.

## 🔴 CRÍTICO — Exposição pública de ficheiros internos (CORRIGIDO)

**Problema:** o repo não tinha `.vercelignore`, por isso **todos** os
ficheiros eram publicados. Confirmado live (HTTP 200):
- `creches.app/wave5-emails-prontos.md` — drafts de emails
- `creches.app/press-contacts-junho2026.md` — contactos de jornalistas
- `creches.app/ESTADO-22JUN2026.md`, `MEMORIA-creche-feliz-2026.md`,
  `briefing-entrevista-publico.md`, `analyze-tipo.py`,
  `Creches-Demo-App.mp4`, `test-stats.html`, `gmail-drafts-*.html`,
  `instagram-dms-wave1.html`, etc.
- ⚠️ `CONFIDENCIAL-estrategia-proposta-fundacao.md` ainda dava 404
  (não commitado), mas seria publicado no próximo deploy.

**Fix:** criado `.vercelignore` que exclui `*.md`, `*.py`, `*.csv`,
`*.mp4`, scripts, vídeos, imagens de trabalho, drafts de email/DM e
`test-stats.html`. **No próximo deploy estes URLs passam a 404.**

**Ação manual recomendada:** verificar no Google (`site:creches.app filetype:md`)
se algum foi indexado e pedir remoção no GSC se necessário.

## 🟠 Higiene do repo

- Removidos **903 ficheiros duplicados** `"* 2.html"` em `/creche/`
  (cópias antigas de 20 Jun; as canónicas de 27 Jun ficaram).
  Fichas: 3.481 → **2.578** (número correto).

## 🟢 PWA completa (novo)

- **`sw.js`** — service worker conservador: network-first para páginas
  (conteúdo sempre fresco), stale-while-revalidate para assets,
  nunca intercepta `/admin`, `/api` nem cross-origin (Firebase, tiles).
- **`offline.html`** — página branded de fallback sem ligação.
- Registo adicionado a `index.html` e `app.html`.
- Com manifest + SW, o site passa a ser **instalável** (Add to Home
  Screen com prompt) e abre caminho a push notifications futuras.

## 🔵 Pequenos fixes

- `404.html`: adicionados `og:image` / `twitter:card` (partilhas com preview).
- `manifest.webmanifest`: "2591 creches" → "mais de 2.500" (evita ficar datado).
- `vercel.json`: header no-cache para `/sw.js` (updates rápidos do SW),
  cache 1h para `/creches_pt.json`, content-type para security.txt.
- `.well-known/security.txt` criado (norma RFC 9116, sinal de confiança).

## 📌 Notas para futuro (não aplicado — decisão tua)

1. `creches_pt.json` (usado por /comparar e /vagas) tem 2.591 registos,
   mas o ESTADO fala em 2.855 pós-Carta Social — confirmar se o pipeline
   de dados regenera este JSON e o dataset embebido no app.html.
2. Push notifications ("vaga aberta em X") — o SW agora existe; falta
   backend de subscrições.
3. Página /en/ para expats (~50k só em Lisboa).
4. Considerar mover drafts de imprensa/marketing para pasta fora do repo
   (ex: `~/CrechesPT-interno/`) para eliminar o risco de exposição de vez.
