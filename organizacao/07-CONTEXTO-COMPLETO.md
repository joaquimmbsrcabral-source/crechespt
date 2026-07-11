# 🧠 CONTEXTO COMPLETO — Creches.app
*Documento de handover integral · 11 Jul 2026 · Escrito para que uma nova conversa com IA (ou um novo membro da equipa) retome o trabalho SEM perder nada do que foi feito e decidido.*

> **Como usar**: cola este documento no início de uma nova conversa. Ele contém: quem é o utilizador, o que é o projeto, toda a arquitetura e convenções, tudo o que foi construído (por ordem), todas as decisões e porquês, o estado atual, as pendências, e as preferências de trabalho.

---

## 1. QUEM É O UTILIZADOR

**Joaquim Cabral**, 28 anos, fundador do creches.app. Email pessoal: joaquimmbsrcabral@gmail.com · Email do projeto: geral@creches.app · Telefone: 915 873 799. Criou o projeto quando esperava o primeiro filho. Não é programador de carreira — trabalha com IA para construir. Vai contratar uma COO (amiga dele) e um dev sénior.

**Preferências de trabalho** (respeitar sempre):
- Respostas concisas e diretas, sem verbosidade
- Português de Portugal (pós-AO90) em tudo
- Gosta de fazer ele próprio os passos manuais (deploys, consolas) — dar-lhe comandos exatos
- Emails de outreach: SEMPRE rascunhos no Gmail, nunca enviar; "só quero mails verdadeiros" (endereços verificados/reais)
- O nome da Fundação Jerónimo Martins (FJM) é SEGREDO em materiais públicos
- Ficheiros internos nunca podem ir para o site (ver .vercelignore)

## 2. O PROJETO

**creches.app** — o mapa nacional de creches de Portugal. 2.591 creches no dataset (2.578 fichas estáticas geradas; 13 escolas básicas excluídas). Missão: acabar com a procura de creche "às cegas" em Portugal. Saiu na NiT e no Público; 1º lugar nas respostas do Gemini para pesquisas de creches (GEO).

**Princípios (estatuto, reformulados em Jul 2026)**:
1. Gratuito para famílias, para sempre — sem anúncios, sem venda de dados pessoais
2. Base gratuita robusta para creches (Pro nunca esconde o essencial)
3. **O mapa não se compra** — ordenação e selo ✓ nunca são pagos
4. Dados agregados só anónimos (k≥5)
(⚠️ Materiais antigos diziam "nunca freemium" — foi substituído por estes princípios quando se decidiu o modelo Pro. Alguns docx/pptx antigos podem ainda ter a frase velha.)

**Produto (2 lados)**:
- **Famílias** (/app): mapa Leaflet + lista, filtros (distrito/concelho/idade/tipo/vaga/aderentes/Creche Feliz), fichas com detalhe, comparador (/comparar), calculadora, pipeline pessoal de candidaturas (estados: contactada→lista de espera→inscrita→aceite), botão "💌 Tenho interesse" (leads), onboarding 1ª visita
- **Creches** (/painel): claim com verificação manual, perfil editável (descrição/horário/preços/capacidade/valências/línguas/contactos), fotos moderadas, vagas por sala (aparecem no mapa como 🟢), Creche Feliz, estatísticas 30 dias com tendência, gestão de leads com estados, aviso "sem vagas", barra de alterações por guardar
- **Admin** (/admin): dashboard de rede (7 métricas), aprovação de claims (com normalização extra_), moderação de fotos (com motivo de recusa), editor de creches, reports, contador de utilizadores (REST aggregation + App Check header), botão de manutenção "corrigir IDs sem prefixo extra_"

## 3. ARQUITETURA E STACK

- **Hosting**: Vercel, site estático SEM build step (HTML/CSS/JS puros). Deploy: `./deploy.sh "msg"` → git push → auto-deploy. Rewrites e headers no `vercel.json`.
- **Firebase** (projeto `crechespt`): Auth (Google + Email/Password), Firestore (compat SDK **10.13.2** via gstatic; fichas/admin ainda tinham 10.7.0 — unificação parcial), Storage (fotos, bucket crechespt.firebasestorage.app), App Check (reCAPTCHA v3, site key `6Lf4LU4tAAAAAN8u_d-RRf86qpEqu2pKJIJ17Yxi`, ativado em TODAS as superfícies; enforcement AINDA NÃO ligado — ligar quando métricas ~100%). Regras: `firebase deploy --only firestore:rules`.
- **Serverless** `/api` (Node ESM): `notify.js` (emails admin-auth com templates: report_applied, more_info_needed, creche_approved, claim_approved), `lead-notify.js` (avisa creche de lead novo; idempotente via flag `notificado`; destinatário SEMPRE do lookup server-side), `weekly-digest.js` (cron 2ª 08:00 UTC no vercel.json; protegido por CRON_SECRET). **Env vars NECESSÁRIAS e AINDA NÃO CONFIGURADAS no Vercel**: `RESEND_API_KEY`, `FIREBASE_SERVICE_ACCOUNT` (JSON base64), `CRON_SECRET`. Sem elas, /api/notify falha (o admin usa fallback Gmail compose) e lead-notify devolve 503 (inofensivo). Resend: verificar domínio creches.app (hoje enviaria de onboarding@resend.dev).
- **Dataset**: `creches_pt.json` (2.591). Na /app vai INLINE gzip+base64 num `<script id="dataset">`, descomprimido com DecompressionStream (fallback: fetch do JSON para Safari <16.4).
- **Fichas**: 2.578 páginas geradas por `scripts/gerar_fichas.py` (correr da raiz: `python3 scripts/gerar_fichas.py`). MUDANÇAS ÀS FICHAS FAZEM-SE NO TEMPLATE E REGENERA-SE. Gera também `sitemap-creches.xml`.
- **Firestore collections**: users (+subcoleções privadas), admins, newsletter_subscribers, creche_interest, feedback, creche_reports, creche_overrides (read público), creche_extras (read público), daily_stats, creche_removals, vagas, creche_views/{id}/days/{yyyy-mm-dd}, creche_feliz_reports, creche_claims, creche_managers/{uid} (write só admin), creche_profiles/{creche_id} (read público), creche_fotos, creche_leads.
- **Segurança**: CSP completo no vercel.json (allowlist; script-src mantém 'unsafe-inline'); regras Firestore com hasOnly fechado + validação de tipos/tamanhos em tudo; XSS fechado (escapeHtml/esc + safeUrl em todos os sinks); SRI nos CDN; HSTS, X-Frame-Options em admin/painel.

## 4. CONVENÇÕES CRÍTICAS (partem coisas se ignoradas)

1. **Creches "extra"** (adicionadas via para-creches, não no dataset OSM) usam IDs com prefixo **`extra_`** em creche_profiles/vagas/views. O painel e o admin normalizam; nunca escrever sem prefixo. IDs do dataset: `osm-node-*`/`osm-way-*`.
2. **Vagas unificadas**: o painel escreve doc determinístico `vagas/painel_<creche_id>` com `source:"painel", verificado:true`, expira 31d; badges 🟢 do mapa/fichas e filtro "Com vaga" leem a coleção `vagas` (pais + painel). Desligar todos os toggles apaga o doc e a ficha mostra "🔴 Sem vagas".
3. **innerHTML só via escapeHtml/esc(); URLs via safeUrl()**.
4. **`.vercelignore`** exclui: *.md, *.docx, *.pptx, *.xlsx, CONFIDENCIAL-*, Fundacao-*, *.py, *.csv, scripts/, *.rules, deploy.sh, organizacao/, gmail-drafts-*, instagram-*, vídeos, outputs/. Ficheiro interno novo → confirmar padrão.
5. **CSP é allowlist** — recurso externo novo exige diretiva; senão parte em silêncio (ex.: fotos Google de perfil partiram até se adicionar lh3.googleusercontent.com ao img-src).
6. **tu/vós**: pais tratam-se por "tu"; creches (painel, emails, para-creches) por "vocês/vosso".
7. Slug das fichas: `slugify(nome)-<dígitos do id>`; função `fichaPublicaURL()` no painel replica-o.
8. Artigo dos nomes: função `com_artigo()` no gerador ("O Jardim…", "A Creche…"; jardim-* → O).

## 5. O QUE FOI CONSTRUÍDO (cronologia da colaboração)

1. **Investigação + melhorias iniciais**; descoberta de ficheiros internos expostos → .vercelignore (crítico)
2. **Suite FJM**: plano 5 anos Word + PPTX, deck simples, deck visão (design do site), BMC, BMC sustentável, plano de sustentabilidade (artigo Medium sobre BMC como ferramenta viva de PM incorporado), deck final lean, **apresentação HTML de 8 slides** (Fundacao-JM-Apresentacao.html — navegação por setas/cliques/pontos, F = fullscreen, imprimível)
3. **Fix contador admin** ("500 preso"): compat SDK não tem count() → REST runAggregationQuery
4. **Outreach media**: assinatura Gmail HTML com logo; ~18 rascunhos (RTP Maria Flor Pedroso tinha RESPONDIDO a encaminhar para a Antena 1 — seguimento feito; TSF, Negócios, RTP2, RR, CM, MAGG×3, Sábado×3, P3, NiT…). Bounced conhecidos: paisefilhos.pt, eco.sapo.pt, redacao@observador.pt, noticiasmagazine.pt
5. **Painel das creches completo** (login→claim→dashboard) + regras + storage.rules + moderação no admin + perfil-creche.js nas fichas
6. **Revisão de código** (~45 achados, 4 frentes): XSS múltiplo fechado, regras endurecidas, merge convidado↔servidor no login, comparar migrado para dados live, batches atómicos… tudo em RELATORIO-REVISAO-CODIGO-JUL2026.md
7. **Campanha creches**: scan de creche_views via REST (views reais baixas — honestidade no copy: "famílias têm consultado" sem números), 15 rascunhos Gmail para creches com views reais e emails próprios (excluídos @escolas.min-edu.pt), carrossel Instagram 3 slides no design do site (instagram-posts/post-painel-creches*.png + legenda com resposta-tipo para DMs)
8. **Fase 0 do painel**: vagas unificadas painel↔app, email automático de aprovação (com fallback Gmail), listener realtime no ecrã pendente
9. **Fase 1**: estatísticas 30 dias + tendência, perfil rico (capacidade/valências/línguas), nudge de frescura
10. **Fase 2**: leads ("💌 Tenho interesse") ponta-a-ponta com RGPD + gestão no painel; selo ✓ em cards/markers/filtro "Aderentes"; dashboard de rede no admin; fotos e vagas nos cards do mapa; popup compacto com "Mais sobre a creche"; nudge nas não-aderentes
11. **Dívida técnica**: cache de markers (perf), highlightTerm seguro, datas admin, lead→pipeline automático
12. **CSP + App Check** em todas as superfícies (incl. fichas regeneradas e comparar migrado p/ SDK com fallback REST)
13. **Revisão de PRODUTO** (4 agentes: UX pai, UX creche, conteúdo/SEO, mobile/PWA/a11y/perf) → RELATORIO-REVISAO-PRODUTO-JUL2026.md → **TUDO implementado** (~45 melhorias): concordância "O Jardim…" (~1.610 fichas), FAQ "desconhecido" honesta (563), sitemap índice corrigido, para-creches reescrito ("painel já aberto"), onboarding reativado, reports discretos, lead CTA primário, dirty-bar no painel, claim inline "adicionar creche", 2 guias novos (lista de espera + adaptação), manifest completo, contraste AA, emails lead/digest prontos, etc.
14. **Fixes visuais**: export/import movidos para o menu do utilizador; foto de perfil Google no CSP + fallback avatar
15. **Planos de equipa e estratégia** (ver secção 7)

## 6. CAMPANHAS E CONTACTOS (estado)

- **15 rascunhos Gmail** prontos para creches (com link da ficha própria + /painel + assinatura). Alvos: CSP Sta Maria da Feira, Carrocel Mágico, Estrela do Mar, Espaço Infantil FAA, Complexo Mafra, Crescer no Infantado, Crevide Moscavide, João de Deus Lisboa 1, CI Feira, 3× Misericórdia da Maia, Feijó/Laranjeiro, Cristo Rei Caparica, Arte de Crescer. Enviar ~5/dia.
- **Carrossel Instagram** (3 imagens + legenda) pronto a publicar; legenda pede DM e inclui resposta-tipo.
- **JOAQUIM FICOU DE**: enviar os emails (1) e publicar o carrossel (2) — ele trata pessoalmente.

## 7. ESTRATÉGIA E EQUIPA (decisões atuais — pasta organizacao/ é canónica)

- **Plano Mestre 2026-2030** (01): Ano 1 = REDE (tudo grátis; 200 creches ativas; candidaturas+mensagens; **Programa Fundador** = compromissos €19/mês vitalício cobrados só no ano 2, meta 100) → Ano 2 = Pro lança €29/mês → 2030 autossustentável. **4 gates de decisão** com critérios escritos: G1 out/26 ativação (verde ≥60 ativas), G2 jan/27 fundadores (verde ≥100), G3 jul/27 conversão, G4 jan/28 municípios. DIVERGÊNCIA deliberada do orçamento v2: Pro adiado do T3/26 para T1/27 (não travar ativação; preço com dados; foco do dev).
- **Pitch FJM**: €200k→175k→125k→75k→25k = €600k/5 anos, tranches com KPIs. Smart money: mentoria + MAZE X/Casa do Impacto/NOVA SBE (NOVA formulada SEMPRE como pergunta — ligação não verificada). FJM fica nos bastidores (sem branding).
- **Equipa**: Joaquim €3.500 bruto; COO (amiga) €2.800 — 6 áreas incl. finanças, reporting FJM, redes, **gestão de freelancers**; Dev sénior freelancer 3 meses (~€48/h, 30h/sem) → CLT €5.000 se cumprir metas (critérios = metas 90 dias do 04-FUNCOES-DEV, com candidaturas/mensagens em produção); freelancer redes €600/mês. RACI completo em 05-RACI.
- **Timing**: FJM + primeiros emails em JULHO (agosto é morto); contratos em agosto; equipa começa 1 SET; grande push de ativação em OUTUBRO (setembro é o pior mês das creches — adaptações); G1 fim de outubro.
- **Prima Francisca** (conselheira informal): não fechar preços cedo, modelos abertos, dados para empresas, smart money — a sua influência está no plano mestre.

## 8. PENDÊNCIAS (o que falta fazer)

**Do Joaquim (manuais)**:
- [ ] Vercel env vars (RESEND_API_KEY + FIREBASE_SERVICE_ACCOUNT base64 + CRON_SECRET) + verificar domínio no Resend → emails ligam sozinhos
- [ ] App Check enforcement (consola Firebase, após ~100% verificados)
- [ ] Enviar 15 emails + publicar carrossel
- [ ] Reunião FJM (deck HTML + 01-PLANO-MESTRE + 06-ORCAMENTO)
- [ ] Deploy pendente da última vaga se ainda não fez: `firebase deploy --only firestore:rules` (fotos apagáveis pela creche) + `./deploy.sh`
- [ ] TTL policy no expires_at da coleção vagas (consola)

**Técnicas (para o dev, por ordem — detalhe em 04-FUNCOES-DEV)**:
- [ ] Focus-trap inert unificado; dataset .gz como recurso próprio; self-host Leaflet; unificar Firebase 10.7→10.13; decisão noindex fichas thin (COM Joaquim)
- [ ] M2-3: candidaturas + mensagens; M7-9: Pro MVP (Stripe + entitlements + analytics avançado + multi-user + galeria ilimitada)
- [ ] Mudar `from` dos emails para geral@creches.app após domínio verificado

**Materiais**:
- [ ] Atualizar docx/pptx/BMC antigos ao plano mestre (remover "nunca freemium"; €200k) — só se necessário para a reunião

## 9. GOTCHAS CONHECIDOS (não tropeçar duas vezes)

- Compat SDK não tem `Query.count()` → contagens via REST runAggregationQuery com Bearer + header X-Firebase-AppCheck
- Collection group queries em creche_views/*/days são NEGADAS pelas regras (só direct-path) — scan faz-se por creche (ids do dataset)
- Regras: campos opcionais validam "is string" — payloads devem OMITIR campos vazios, nunca enviar null
- daily_stats lê-se só como admin; chaves de datas em UTC de propósito (escritor e leitor alinhados)
- Cache: app.css/js 24h no browser — mudanças visuais demoram; sw.js sem cache; app.html 5 min
- `test-stats.html`, `admin-import-cs.html` existem; fichas têm view-tracking (1/sessão via sessionStorage)
- creche_views tem POUCOS dados (tracking desde Jul) — não prometer números grandes por creche
- Painel pesquisa dataset + creche_extras com prefixo; claim inline cria creche_interest com source "painel-claim"
- Gerador: HOJE hardcoded no topo (atualizar a cada regeneração); sitemap-creches-1.xml foi APAGADO (não recriar)
- O deck HTML chama-se Fundacao-* de propósito (excluído do deploy)

## 10. FICHEIROS-CHAVE (mapa rápido)

`app.html` (~4k linhas, app das famílias) · `painel.html` (portal creches) · `admin.html` · `comparar.html` · `para-creches.html` · `index.html` · `app.css` · `perfil-creche.js` (cartão público + window.CrecheLeads) · `vagas.js` (window.Vagas) · `sw.js`+`offline.html` · `manifest.webmanifest` · `vercel.json` (rewrites+CSP+cron) · `firestore.rules` · `storage.rules` · `scripts/gerar_fichas.py` · `creches_pt.json` · `api/{notify,lead-notify,weekly-digest}.js` · `deploy.sh` · `.vercelignore` · `guias/*` (6 guias) · `creche/*` (2.578 fichas) · `organizacao/*` (esta pasta) · `instagram-posts/post-painel-creches*` · relatórios RELATORIO-*.md · `Fundacao-JM-Apresentacao.html` (deck) · `Assinatura-Gmail-Creches.html`

---
*Fim do handover. Estado do código: tudo commitável/deployável, sintaxe verificada. Última grande entrega: revisão de produto 100% implementada + planos de equipa v3 + plano mestre. O projeto está pronto para o lançamento operacional — falta gente, não falta software.* 🍼
