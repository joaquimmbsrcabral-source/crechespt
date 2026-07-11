# Plano do Dev — Creches.app
*organizacao/ v3 · Jul 2026 · Regime: freelancer 3 meses → CLT (€5.000 bruto) · "Fiabilidade primeiro, valor para famílias a seguir, receita depois"*

## Enquadramento do contrato

**Fase de teste (M1-3)**: freelancer, ~30h/semana. Objetivo da fase: dominar o território, ativar os emails, fechar a dívida residual e **entregar o MVP do Creches.app Pro**. Correu bem → **CLT full-time no M4** (é o plano orçamentado; a decisão é por entregas, não simpatia).

## Missão

Manter a plataforma rápida, segura e no ar — e construir a frente que alimenta tudo no Ano 1: **candidaturas e mensagens** (mais valor para famílias → mais leads → mais creches ativas). O Pro constrói-se DEPOIS (M7-9), sobre uma rede viva — ver 01-PLANO-MESTRE (sequência rede→receita).

## O território (lê isto primeiro)

**Stack**: site estático no Vercel (sem build — HTML/CSS/JS puros), Firebase (Auth, Firestore compat 10.13.2, Storage), serverless em `/api` (Node ESM), Resend. Deploy: `./deploy.sh "msg"`; regras: `firebase deploy --only firestore:rules`.

**Ordem de leitura**: 1) `RELATORIO-REVISAO-CODIGO-JUL2026.md` · 2) `RELATORIO-REVISAO-PRODUTO-JUL2026.md` · 3) `PLANO-PAINEL-CRECHES.md` · 4) `firestore.rules` (as regras SÃO a documentação do modelo de dados) + `SETUP-PAINEL-CRECHES.md`.

**Superfícies**: `app.html` (~4k linhas, dataset gzip+base64 inline), `painel.html`, `admin.html`, `comparar/vagas/calculadora`, 2.578 fichas geradas por `scripts/gerar_fichas.py`, `perfil-creche.js` (cartão público + CrecheLeads), `vagas.js`, `sw.js`, `/api/*`.

## Convenções que partem coisas se ignorares

- **IDs de creches extra levam prefixo `extra_`** (profiles/vagas/views). O admin normaliza na aprovação; nunca escrevas sem prefixo
- **innerHTML só via escapeHtml/esc(); URLs via safeUrl()** — houve XSS, foi fechado, mantém-no fechado
- **Regras Firestore: hasOnly fechado + tipos/tamanhos** — campo novo = regra atualizada; pensa sempre no abuso anónimo
- **`.vercelignore` protege docs internos** (`*.md`, `Fundacao-*`, `CONFIDENCIAL-*`…) — ficheiro interno novo = confirmar padrão
- **CSP é allowlist** no vercel.json — recurso externo novo = diretiva nova OU parte em silêncio; testa com a consola aberta
- **Fichas mudam-se no TEMPLATE** (`gerar_fichas.py`) e regeneram-se, nunca nos ficheiros
- **tu/vós**: pais "tu"; creches "vocês/vosso"
- **O mapa não se compra**: nenhuma feature Pro pode alterar ordenação por proximidade/filtros — é estatuto, não preferência

## Responsabilidades

1. **Fiabilidade** — consolas Firebase/Vercel limpas; erros CSP/JS no dia; backup mensal do Firestore; 0 incidentes >1h
2. **Pipeline de dados** — refresh trimestral OSM/Carta Social → `creches_pt.json` → regenerar fichas → validar diffs
3. **Produto Pro** — MVP no T3 (ver abaixo), billing, entitlements
4. **Fase 3 do painel** — candidaturas, mensagens, benchmark
5. **Segurança contínua** — checklist de feature (abaixo) em tudo; App Check enforcement; RGPD técnico (com a COO no processual)

## Backlog priorizado

### Semana 1 — Ativações (config, não código)
- [ ] Vercel env vars: `RESEND_API_KEY`, `FIREBASE_SERVICE_ACCOUNT` (base64), `CRON_SECRET` → lead-notify, boas-vindas e digest semanal **ligam-se sozinhos** (código já feito)
- [ ] Resend: verificar domínio creches.app → `from` geral@creches.app nos 3 endpoints
- [ ] App Check: enforcement quando métricas estabilizarem (~100% verificados; todas as superfícies já têm token)
- [ ] TTL policy no `expires_at` da coleção `vagas` (consola Firestore)

### M1 — Dívida residual (fechar antes do Pro)
- [ ] Focus-trap (inert) unificado nos modais
- [ ] Dataset como recurso próprio (`creches_pt.json.gz` hash+immutable) — corta ~245KB do HTML
- [ ] Self-host Leaflet/markercluster/draw
- [ ] Unificar Firebase 10.7.0→10.13.2 (fichas/admin)
- [ ] Decisão c/ Joaquim: noindex seletivo de fichas thin vs enriquecer

### M2-3 — ⭐ Candidaturas + Mensagens (a entrega que valida o CLT)
- [ ] **Candidaturas**: leads com estado visível à família (recebida→análise→lista de espera→aceite), notas privadas da creche
- [ ] **Mensagens creche↔família** (thread por lead, moderação, RGPD)
- [ ] Badge "Fundadora" na ficha (para o Programa Fundador da COO — só badge, sem gating)

### M7-9 — Creches.app Pro MVP (lança T1 2027 com as Fundadoras)
Modelo: `creche_profiles.pro = { ativo, desde, plano }` (escrito só por admin/webhook) + entitlements verificados nas regras e na UI.
- [ ] **Billing**: Stripe Checkout + customer portal (subscrição €29/mês, €290/ano; cupão early adopter €19 vitalício) + webhook `/api/stripe-webhook` → ativa/desativa `pro` no perfil
- [ ] **Feature 1 — Analytics avançado**: views dia/semana/mês, origem dos leads, conversão views→leads, comparação anónima de zona (agregados, k≥5), export CSV
- [ ] **Feature 2 — Galeria ilimitada** (grátis: 5 fotos) + ordenação + cover photo
- [ ] **Feature 3 — Multi-utilizador**: `creche_managers` N:1 com papéis (ver/responder/admin) + log de ações
- [ ] Badge "Pro" na ficha (opcional, transparente) — **sem tocar na ordenação do mapa**
- [ ] Página /pro (pricing + FAQ) + upsell suave no painel (nunca bloquear o grátis)

### M4-6 — Consolidação
- [ ] Iterar candidaturas/mensagens com feedback real (via COO)
- [ ] Benchmark anónimo de mensalidades por concelho (k≥5)
- [ ] Preparação Pro: modelo de entitlements + Stripe sandbox (sem lançar)

## Fluxos

**Deploy** — 1) regras mudaram? `firebase deploy --only firestore:rules` PRIMEIRO · 2) `./deploy.sh` · 3) smoke test live com consola aberta: /app (mapa+popup+lead), /painel (login+guardar), /admin, 1 ficha, /comparar · 4) rollback = revert+push; CSP a partir algo = remover a diretiva é o rollback cirúrgico

**Incidente** — consola browser + Vercel Functions logs + Firebase (rules denials) → fix → nota post-mortem sem culpas na weekly

**Feature checklist** — regras hasOnly? XSS sinks escapados? CSP cobre recursos novos? Fichas via template? tu/vós? App Check (SDK, não REST)? `.vercelignore`? entitlements Pro verificados server-side (regras), não só na UI? smoke test?

**Ritmo** — weekly c/ Joaquim (sprint quinzenal); code review dele em mudanças de regras/billing; feedback das creches chega via COO como issues.

## Metas 30 / 60 / 90 dias (= critérios da passagem a CLT)
| | 30 dias | 60 dias | 90 dias |
|---|---|---|---|
| Emails transacionais | ativos, domínio verificado | digest a 100% das ativas | — |
| App Check | enforcement ON | — | — |
| Dívida residual | 60% | 100% | — |
| **Candidaturas/Mensagens** | espec c/ Joaquim | beta c/ 5 creches | **em produção, 20 creches a usar** |
| Incidentes >1h | 0 | 0 | 0 |
