# Revisão Total Creches.app — Junho 2026

> 3 auditorias paralelas (UX/UI, técnica, copy/fluxos) cruzadas e priorizadas para acção.
> Foco do dono: **simples e prático na ótica do utilizador**.

> ## ✅ STATUS DE EXECUÇÃO (20 Jun 2026)
>
> **Concluído nesta sessão:**
> - ✅ #1 **Ficha de creche redesenhada** (PRIORIDADE Nº1) — 2578 fichas regeneradas com hero card, 3 CTAs grandes, banner qualidade, grelha 2 colunas, mini-cards próximas com pills coloridos
> - ✅ #2 Pills de tipo coloridos (IPSS turquesa, Pública verde, Privada coral, Desconhecido cinza)
> - ✅ #3 Esconder lixo nas listas (Inactivo, Datacool, ≤3 chars)
> - ✅ #4 Capitalize concelhos (LISBOA → Lisboa) com Title Case PT-aware
> - ✅ #5 Form /para-creches: 11 → 4 campos obrigatórios + "Mais detalhes" colapsável
> - ✅ #6 Email template pré-preenchido nas fichas
> - ✅ #7 viewport `maximum-scale=5` removido (WCAG 1.4.4 fix)
> - ✅ #8 focus-visible global no /app + fichas (acessibilidade teclado)
> - ✅ #9 lang="pt-PT" em 284 ficheiros
> - ✅ #10 console.warn protegido por __DEV__
> - ✅ #11 Filtro Escolas Básicas — 13 EBs removidas das fichas + filtro client-side no app.html
> - ✅ #12 Header consistente nas páginas /creches/:distrito/:concelho (regeneradas)
> - ✅ #13 "A A Casa Amarela" FAQ duplicação corrigida
>
> **Onda 3:**
> - ✅ #14 **Header unificado em TODAS as top-level** — index, sobre, imprensa, roadmap, privacidade, cookies, termos, para-creches têm agora a mesma nav (Guias · Distritos · Sobre · Roadmap · [Abrir mapa]) na mesma ordem
> - ✅ #15 **Schema WebApplication no /app** — JSON-LD com `applicationCategory`, `offers: free`, `sameAs: Wikidata Q140290655`
> - ✅ #16 **Contagens desactualizadas corrigidas** — `/imprensa`: 3 → 4 Guias gratuitos
> - ✅ #17 **Title do /app** dessaturado de número (era "2591 creches", agora genérico)
> - ✅ #18 **Headline emocional da home** — "Encontra creche sem perder a cabeça"
>
> **Onda 4:**
> - ✅ #19 **TL;DR no /guias/creche-feliz** — box rosa "Em 3 frases" (pais ansiosos não leem 2000 palavras)
> - ✅ #20 **CTAs variados nos 4 guias** (era todos "Abrir o mapa", agora cada um com angle próprio)
> - ✅ #21 **Mid-page CTA no /sobre** — "Abrir o mapa que fiz para mim e para ti" após "Foi assim que nasceu"
> - ✅ #22 **Onboarding skip-by-default no /app** — mãe vê mapa imediatamente
>
> **Onda 5:**
> - ✅ #23 **Exemplo Braga/Coimbra no /quanto-custa** — fatura típica fora de Lisboa (503€ vs 788€), referência a IPSS rural < 100€
> - ✅ #24 **Modal login /app simplificado** — tag emocional, 2 bullets (era 3), footer 1 linha (era 2)
> - ✅ #25 **Avatar /sobre melhorado** — "J" grande com gradient coral-peach + email visível
>
> **Onda 6:**
> - ✅ #26 **TOC sticky lateral nos 4 guias longos** — 35 h2s com IDs slugified, scroll-margin para fixed header, sticky no desktop (>1100px), oculto mobile
> - ✅ #27 **Footers padronizados** — Imprensa + Roadmap adicionados nas legais (privacidade, cookies, termos), para-creches e index
>
> **Onda 7:**
> - ✅ #28 **Mockup home com pill "Exemplo"** — clarifica que é ilustração (não clicável)
> - ✅ #29 **Press Kit no /imprensa expandido** — 6 cards (era 4), com PNG directo, link "Capturar ao vivo" para screenshots, cartões Vídeo/B-roll e Press Release. Mailtos pré-preenchidos com template
> - ✅ Filtros /app — auditoria desactualizada: filtros JÁ estão colapsados por defeito (só morada/GPS no hero, resto sob "Mais filtros ▼")
>
> **Onda 8:**
> - ✅ #30 **"2591" → "mais de 2.500"** em todos os textos visíveis (8 ficheiros: index, app, sobre, imprensa, roadmap, para-creches, 4 guias). Schemas mantêm número onde apropriado. Constraint dos números vagos cumprido em todo o site.
>
> **Onda 9:**
> - ✅ #31 **Pills coloridos + sanitize nas 20 páginas distrito + 104 páginas categoria/concelho** (124 ficheiros). Inline JS de enhancement: pills por tipo (IPSS turquesa / Pública verde / Privada coral / Desconhecido cinza) + esconder Escolas Básicas + Inactivo + Datacool + ≤3 chars.
>
> **Onda 10:**
> - ✅ #32 **Cache headers vercel.json** — JS/CSS 1 dia + SWR 1 semana, fichas creche 1h + SWR, manifest 1 dia, robots/sitemap 1h. Sitemap também com `Content-Type: application/xml`.
> - ✅ #33 **HSTS Strict-Transport-Security** — header de segurança 1 ano com includeSubDomains.
>
> **Onda 11 (pós-deploy):**
> - ✅ #34 **VERIFICAÇÃO PRODUÇÃO** — tudo deployed (HSTS active, ficha redesenhada, schema WebApp, headline emocional, TOC guias) ✓
> - ✅ #35 **REFACTOR /app: CSS extraído** — 887 linhas / 43KB movidas de inline para `/app.css` separado. app.html: 423KB → 380KB (-10%). CSS agora cacheable 1 dia + SWR (vercel.json).
>
> **Onda 12:**
> - ✅ #36 **REDESIGN RADICAL ficha de creche** (2578 fichas): hero GIGANTE com gradient colorido por tipo (IPSS turquesa-verde / Privada coral-peach / Pública mint-amarelo / Outro púrpura), avatar emoji 96px (👶/🎨/🎒/🧸/🍼 escolhido pelo tipo), 3 CTAs gigantes brancos sobre gradient, stats cards visuais (📍🎂🏠🏢), mapa 380px destacado, creches próximas em grid 2 colunas com border-left coloured.
>
> **Onda 13:**
> - ✅ #37 **"vos"/"vossos" → "te"/"tua"** no /sobre (uniformizar `tu` em todo o site)
> - ✅ #38 **Data /privacidade** corrigida (21 maio → 20 junho 2026)
> - ✅ #39 **Cards /guias com 4 cores distintas por categoria** — cat-gratuita verde mint (Creche Feliz), cat-escolher coral (Como escolher), cat-custos amarelo (Quanto custa), cat-comparacao turquesa (Creche vs ama). Border-top + emoji bg + ttl color por categoria.
>
> **Onda 14:**
> - ✅ #40 **Popup detail do /app redesenhado** — quando carregas numa creche no mapa, abre agora um popup com HERO GRADIENT COLORIDO por tipo + AVATAR EMOJI grande (👶/🎨/🎒/🧸/🍼) + chips com backdrop-blur + título branco sobre gradient. Match visual com as fichas estáticas /creche/. Em mobile fica como bottom-sheet com mesmo design.
>
> **Onda 15:**
> - ✅ #41 **Destaque CONTACTOS no popup /app** — 4 CTAs GIGANTES coloridos no TOPO do body (📞 Ligar com nº visível / ✉ Email com template / 🌐 Site / 🗺 Direcções Google Maps). Disabled cinzentos quando faltam dados. Foco principal: contactar, não tracking. Tracking colapsado sob `<details>📋 Acompanhar a minha inscrição (opcional)`.
>
> **Onda 16:**
> - ✅ #42 **Filtros + morada todos escondidos por defeito** — `_relocateHeroForMobile()` agora move sempre o hero (morada+GPS) para dentro do collapse, desktop e mobile. Botão único "🔍 Procurar / Filtros" mais óbvio (era "⚙ Mais filtros"). Foco no mapa.
>
> **Onda 17 (REVERTIDA):**
> - ❌ Toggle "Ver lista" + viewport sync — implementação não convenceu o user, revertida.
>
> **Onda 19:**
> - ✅ #44 **FIX filtros sempre escondidos** — bug: `setFiltersOpen(!isMobile())` abria por defeito em desktop. Corrigido para `setFiltersOpen(false)` sempre.
>
> **Onda 20:**
> - ✅ #45 **Wave 4 imprensa REGENERADA com emails REAIS** — 21 drafts verificados em páginas oficiais (era 12 com padrões inventados). Padrão Expresso correcto: `inicialApelido@expresso.impresa.pt`. Tabela de padrões reais vs inventados.
>
> **Onda 21:**
> - ✅ #46 **Preconnect + dns-prefetch no /app** — unpkg, gstatic, firestore, identitytoolkit (acelera primeira ligação)
> - ✅ #47 **Roadmap "Em curso" com progress bars visuais** — gradient coral-peach + % + label texto (Vagas 40%, Tipos 75%, Imprensa 60%, Carta Social 55%, EN 10%)
> - ✅ #48 **Página /404 personalizada** — branded com emoji 🍼, CTAs grandes, 6 atalhos para páginas principais (vs página 404 default do Vercel)
>
> **Onda 22 GRANDE — Calculadora + Polimentos:**
> - ✅ #49 **NOVA PÁGINA /calculadora** — 3 perguntas, calcula mensalidade IPSS (por escalão), Privada (por zona) ou Creche Feliz (gratuita). Schema WebApp. Foco SEO "calculadora creche portugal".
> - ✅ #50 **Card destacado /guias** com gradient coral apontando para /calculadora
> - ✅ #51 **CTA "Quanto custa"** redireccionado para /calculadora (mais útil que abrir mapa)
> - ✅ #52 **Sitemap-main.xml** + nav top-level (7 páginas) com link Calculadora
> - ✅ #53 **Metodologia** actualizada: Pública 998 → 985 após filtro EB, nota explícita "Escolas Básicas excluídas"
> - ✅ #54 **llms.txt** descreve /calculadora (AI visibility)
> - ✅ #55 **FAQPage JSON-LD nas 2578 fichas** — 3 Q&A personalizadas (gratuita? / idades / contacto) → rich snippets Google
>
> **Próximos (não nesta sessão):**
> - ⏳ Foto real do Joaquim (precisa upload do user)
> - ⏳ Extrair JS do /app (CSS já feito; JS é mais arriscado, precisa testes)

---

## TL;DR — Veredicto em 5 linhas

**O melhor:** conteúdo (guias, /sobre, /imprensa, /metodologia), tom genuíno do fundador, transparência, prova social (NiT + Público), arquitectura SEO sólida (sitemaps, schemas, llms.txt).

**O pior:** execução visual fragmentada — parece feita por pessoas diferentes. **Headers diferentes em cada página, ficha individual de creche é pobre, /app sobrecarregada com 12+ filtros e 3 ecrãs de onboarding antes do mapa.**

**O mais importante a mudar (1 dia de trabalho):** redesenhar a ficha individual de creche `/creche/...` — é a página de aterragem mais rica em SEO e onde a decisão acontece, e hoje é fraca.

---

## 🔥 Top 5 problemas CRÍTICOS

| # | Problema | Onde | Status |
|---|---|---|---|
| 1 | **Ficha individual de creche é pobre** | `/creche/...` (2.578 páginas) | ✅ **REDESENHADA** |
| 2 | **Header inconsistente** | Todas | ✅ **UNIFICADO** (todas as páginas) |
| 3 | **/app monolítico 422 KB** | `/app` | ✅ **CSS EXTRAÍDO** (-43KB → /app.css cacheable) |
| 4 | **Onboarding 3 ecrãs** | `/app` mobile | ✅ **SKIP-BY-DEFAULT** |
| 5 | **`maximum-scale=5`** bloqueia zoom (WCAG fail) | `/app` | ✅ **CORRIGIDO** |

---

## ⚡ Top 10 Quick Wins (alto impacto, < 1 dia cada)

### 1. **Header unificado** — 2h  ✅ FEITO em todas (8 top-level + 156 concelhos + 2578 fichas = 100% coverage)
Hoje: cada página (`/`, `/sobre`, `/app`, `/imprensa`, `/para-creches`, `/privacidade`, `/creches/lisboa/lisboa`) tem um header diferente. Algumas só têm "← Início", outras nada.
**Fix:** componente HTML único, sempre o mesmo: logo · 4 links (Mapa · Guias · Sobre · Para creches) · CTA "Abrir mapa →"

### 2. **Pills de tipo coloridos** — 2h  ✅ FEITO
Aplicado em `/creches/:distrito/:concelho` (regeneradas) e nas mini-cards "Creches próximas" da ficha individual. IPSS turquesa, Pública verde mint, Privada coral, Desconhecido cinza.

### 3. **Reduzir filtros do /app** — 3h  ⏳ pendente (refactor maior)

### 4. **Esconder lixo nos distritos** — 1h  ✅ FEITO
Filtros aplicados em `generate-concelhos.py` com `is_lixo()` (nomes ≤3 chars, "Inactivo", "Datacool", "test"). 156 páginas concelho regeneradas.

### 5. **Foto real do Joaquim** — 30 min  ⏳ pendente (precisa upload do user)

### 6. **Capitalize concelhos** — 30 min  ✅ FEITO
Helper `title_case_pt()` aplicado: "LISBOA" → "Lisboa", "VILA NOVA DE GAIA" → "Vila Nova de Gaia" (mantém preposições em minúscula).

### 7. **Form /para-creches: 11 → 5 campos** — 1h  ✅ FEITO
Reduzido para 4 obrigatórios (Nome, Tipo, Distrito, Email, Telefone) com `<details>` collapse "Mais detalhes (opcional)" para website, horário, nº crianças, mensagem.

### 8. **Press Kit ZIP num clique** — 1h  ⏳ pendente

### 9. **Onboarding skip-by-default** — 2h  ✅ FEITO
Removida a chamada automática de `maybeShowOnboarding()` no boot da app. Mãe em pânico vê o mapa imediatamente sem 3 ecrãs de fricção. Onboarding fica disponível como fallback se chamado explicitamente.

### 10. **Email template pré-preenchido** — 30 min  ✅ FEITO
Botão "✉ Email" na ficha agora abre mailto com `subject="Pedido de informação — {nome}"` + body template pronto a editar.

---

## 🩹 Quick Wins TÉCNICOS (< 1h cada)

- ✅ Fix 1: WCAG 1.4.4 viewport — `maximum-scale=5` removido do /app
- ✅ Fix 2: Focus visível global — `*:focus-visible{outline:2px solid #FF9F68}` aplicado em /app + fichas
- ✅ Fix 3: `lang="pt-PT"` em 284 ficheiros (era `lang="pt"`)
- ✅ Fix 4: ARIA labels nos CTAs das fichas (Ligar / Email / Direcções / Sem telefone / Sem email)
- ✅ Fix 5: console.warn protegido (usa helper `_w()` com flag `__DEV__`)
- ✅ Fix 6: cache headers `.js/.css/.png/.svg/...` no vercel.json
- ✅ Fix 7: HSTS strict-transport-security adicionado (segurança)

---

## 📄 Por página — o que está bem, mal, e como melhorar

### `/` (Home — Landing pais) ★★★★☆ (era ★★★☆☆)

**✅ Bom:** copy genuíno ("Sabemos como é. Estás grávida..."), FAQ útil, números grandes (2591/20/0€/3min), lista distritos no fundo (SEO+utilidade).

**✅ Headline emocional aplicada:** `"Encontra creche sem perder a cabeça"` (com `<span class="accent">` no "sem perder a cabeça"). Substitui o catálogo neutro anterior.
**✅ Stat "3 min"** agora diz "para teres as creches da tua zona" (emocional).
**✅ Kicker:** "🇵🇹 Gratuito · todo o país · sem anúncios" (mais propriedades, sem repetir "2591").

**❌ Mal (ainda pendente):**
- Mockup hero ("Casinha dos Sonhos" etc.) parece clicável mas não é
- 2 CTAs competem em força no hero (manter)

**🎯 Fixes restantes:**
- 1 CTA primário forte + 1 link de texto "Ver como funciona"
- Mockup → screenshot real ou nota "exemplo"
- "Procurar por distrito" subir mais alto (é o mental model)

---

### `/app` (Mapa principal) ★★☆☆☆ — PRECISA TRABALHO

**✅ Bom:** mapa Leaflet funciona, geolocalização, filtros existem, login opcional bem-feito.

**❌ Mal (crítico):**
- **422 KB HTML monolítico** (3.762 linhas, CSS+JS+HTML tudo inline)
- **Onboarding 3 ecrãs** força fricção antes da mãe ver o mapa
- **12+ filtros expostos** sempre = cognitive overload
- **`maximum-scale=5`** bloqueia zoom (WCAG fail)
- **9 scripts externos** render-blocking (Leaflet+plugins+Firebase) sem `defer` nem `preconnect`
- **0 schemas JSON-LD** no `/app`
- **Modal de login** com 3 frases de copy + checkbox de privacidade (1 botão Google chega)

**🎯 Fixes:**
- Extrair CSS → `app.css`, JS → `app.js` (cache 1 ano)
- Onboarding: skip-by-default, mostra mapa imediatamente
- Filtros: 3 primários (idade · distância · tipo) + collapse "Mais"
- Remover `maximum-scale=5`
- `defer` em todos os scripts externos + `preconnect`
- Adicionar `WebApplication` schema
- "Em processo" e "Favoritas" → tabs (Mapa · Em processo · Favoritas), não filtros

---

### `/creche/...` (Ficha individual) ★☆☆☆☆ — **PRIORIDADE Nº 1**

**Esta é a página que mais perde valor. É a aterragem SEO mais rica e onde a decisão acontece.**

**❌ Mal:**
- Sem foto da creche (nem placeholder bonito)
- Sem CTAs primários grandes (`📞 Ligar` · `✉ Email` · `🗺 Direcções`)
- Mapa em **iframe OSM raw** — feio, sem branding, sem marker custom
- Lista chave-valor (Morada/Distrito/Idades/Resposta) **duplica info do H2**
- "Creches próximas" é lista pura, sem distância destacada, sem mini-cards
- FAQ gerada por template tem nomes duplicados ("A A Casa Amarela é gratuita?")
- Quando faltam contactos, **não diz nada visualmente** — devia ter banner "Sabes o telefone? Ajuda-nos."

**🎯 REDESENHAR (1 dia):**

```
┌─────────────────────────────────────────────────┐
│  [FOTO ou placeholder colorido com inicial]      │
│  A Casa Amarela          [⭐ Guardar]            │
│  [Privada] [JI] [3-5 anos] [📍 Lisboa]          │
│                                                  │
│  [📞 Ligar]  [✉ Email]  [🗺 Direcções]         │
│  (cinzentos disabled se faltarem dados,         │
│   mas visíveis para sinalizar lacuna)           │
└─────────────────────────────────────────────────┘

⚠ Banner: "Sabes o telefone desta creche? Ajuda-nos
            a completar →"

┌─ Detalhes (grelha 2 colunas) ──┬──────────────┐
│ Morada                          │ Resposta     │
│ Rua General Henriques de Carva… │ Jardim Inf.  │
│                                 │              │
│ Idades                          │ Operador     │
│ 3-5 anos                        │ Particular   │
└─────────────────────────────────┴──────────────┘

┌─ Mapa (Leaflet, 300px alt., marker custom) ────┐
│        🗺                                        │
│  "Ver área no mapa interativo →"                │
└─────────────────────────────────────────────────┘

┌─ Creches próximas (mini-cards) ────────────────┐
│ ● [IPSS]  Centro Social X     350m   📞 ✉      │
│ ● [Priv]  Externato Y         420m   📞        │
│ ● [Pub]   JI Z                580m              │
│ [Comparar selecionadas →]                       │
└─────────────────────────────────────────────────┘

[Sobre os dados] (small print): "Dados de OpenStreetMap
+ Carta Social GEP. Verificados em 12 Jun 2026."
```

---

### `/creches/:distrito` (página por distrito) ★★★☆☆

**✅ Bom:** stats por tipo, lista filtrada, link para outros distritos.

**❌ Mal:**
- Tabela "91 públicas · 11 IPSS · 286 privadas" = 388 — **faltam 109 "desconhecido"** mas não mostra
- "Datacool", "ATL", "Inactivo", duplicadas — **dados sujos visíveis**
- "+ Ver as outras 437 no mapa" — sem paginação, lista interminável
- Texto SEO fundo "incluindo 286 privada, 109 desconhecido" — singular/plural errado

**🎯 Fixes:**
- Paginação real (50/página) + filtros laterais
- Sanitização client-side de lixo
- Mostrar 4ª categoria (Desconhecido) ou esconder

---

### `/creches/:distrito/:concelho` (concelho) ★★☆☆☆

**❌ Mal:**
- **7 creches só** para "Lisboa cidade"? — problema de cobertura de dados (mas user lê como bug)
- "LISBOA" em CAPS no breadcrumb e chip = parece grito
- Sem header de branding
- Wall of text de outras zonas separadas por `·`

**🎯 Fixes:**
- Capitalize concelhos (Title Case sempre)
- Header padrão (igual a outras páginas)
- Outras zonas: grid de chips
- Investigar cobertura de dados (talvez seja freguesia vs concelho)

---

### `/sobre` (História pessoal) ★★★★☆

**✅ Bom:** copy autêntico, vulnerável, humano. "Numa noite, com o portátil ao colo enquanto a minha mulher dormia" — ouro. Promessa pública gratuita = confiança alta.

**⚠ Pode melhorar:**
- Sem foto real do Joaquim (só inicial "JC") — crítico para confiança pessoal
- Mid-page CTA ausente (1500+ palavras sem botão até ao fim)

**🎯 Fixes:** foto real + 1 vídeo curto 60s embedded com voz dele + CTA mid-page após "Foi assim que nasceu o Creches.app"

---

### `/sobre/metodologia` ★★★★★

**✅ Excelente:** TL;DR, tabela fontes, tabela inferência, limitações conhecidas. Modelo para AI visibility / jornalistas.

**⚠ Muito densa para pais comuns.** Considerar toggle "Resumo / Detalhe técnico" ou esconder link das navs principais (mover para footer).

---

### `/guias` (índice) ★★☆☆☆

**❌ Mal:**
- 4 cards sem hierarquia visual — todos iguais
- "8 min de leitura" enterrado
- Sem imagens/ilustrações nos cards

**🎯 Fixes:** cards com cores/ícones distintos por categoria (💰 custos / 🍼 escolha / ⚖ comparação), thumbnails visuais.

---

### `/guias/...` (artigos individuais) ★★★★☆

**✅ Excelente:** conteúdo de altíssimo valor, tabelas, checklists, tom prático.

**❌ Mal:**
- Sem TOC sticky lateral (perde-se em 8 min de leitura)
- CTA "Abrir o mapa →" repetido 3× — no fundo aparece DUAS vezes seguidas
- `/creche-feliz` sem TL;DR no topo (pais ansiosos não leem 2000 palavras)
- `/quanto-custa` exemplo só Lisboa — adicionar Braga/Coimbra

**🎯 Fixes:** TOC lateral desktop, TL;DR em todos os guias, CTAs variados (não só "Abrir o mapa").

---

### `/imprensa` ★★★★★

**✅ Excelente:** modelo de press kit. Stats, quotes, ângulos, ficha técnica, SLA de resposta, background reading. Das melhores partes do site.

**❌ Mal:**
- "3 guias gratuitos" desactualizado (já são 4)
- Foto/screenshots/dados pedidos por email = fricção para jornalista com prazo
- Link "Logo SVG" aponta para `/favicon.svg` (favicon não é logo)

**🎯 Fixes:** 1 link "Press Kit ZIP" com tudo + actualizar contagens.

---

### `/roadmap` ★★★★☆

**✅ Bom:** secção "Provavelmente nunca" é jogada genial — define identidade. Tom de transparência.

**⚠ Pode melhorar:** lista vertical longa, sem filtros por categoria, sem indicador de progresso visual nos "Em curso".

**🎯 Fixes:** barras de progresso (🟢 Live / 🟡 60% / 🔵 Em estudo) + voto público nas explorações.

---

### `/para-creches` ★★☆☆☆

**❌ Mal:**
- Header reduzido a "← Início" — perde branding completo
- 2/3 do value prop ainda "Em breve" — vendedor fraco
- **Form de 11 campos** para "Quero saber mais" = bounce garantido
- Botão "Quero saber quando lançarem →" não bate com promessa "perfil verificado"
- Sem auto-resposta de email (utilizador sai sem saber se chegou)

**🎯 Fixes:**
- Form 5 campos (nome creche, tipo, distrito, email, telefone)
- Confirmação: "Recebes email em 5-10 dias úteis com link para validares o teu perfil."
- Auto-reply email
- Inverter value props (começar pelo que JÁ funciona)

---

### `/privacidade` ★★★★☆

**✅ Bom:** clara, RGPD-compliant.

**⚠** Header inconsistente. Data hardcoded "21 maio 2026" mas outras dizem "Junho 2026".

---

## 🌐 Padrões transversais (problemas que se repetem)

### 1. **Inconsistência de header / branding**
Cada página tem nav diferente. Algumas só "← Início", outras nada.
**Fix global:** 1 componente header reutilizável.

### 2. **Excesso de emojis a fingir de ícones**
🍼 🗺 📍 👶 🎂 🎒 ⭐ ✏️ em TUDO. Funciona em texto humano, mas como UI de filtros/H2 baralha visualmente.
**Fix:** SVG mono-line discreto em UI, emojis só em copy emocional.

### 3. **Paleta inconsistente**
Theme `#FF9F68` (laranja) mas UI usa amarelo, verde, azul, magenta sem sistema claro.
**Fix:** documentar 4 cores funcionais (primária / sucesso / atenção / info) + tons.

### 4. **Tu vs vós inconsistente**
"tu" na home, "vos" no /sobre, "vocês" no roadmap. **Escolher: tu sempre** (mais íntimo, condiz com pai-para-pai).

### 5. **Footers diferentes**
Alguns têm Roadmap/Imprensa, outros não.

### 6. **Números inconsistentes**
"2591" vs "+2.500" vs "mais de 2500". Standardizar: **"mais de 2.500"** em todo o lado (já pedido nos constraints).

### 7. **Acessibilidade fraca em /app**
Só 2 `:focus-visible`, 12 `aria-label` para 69 botões, viewport bloqueia zoom, contraste `#999` falha AA.

---

## 🚦 Plano de execução sugerido

### **Esta semana — quick wins UX (1 dia total)**
1. Header unificado (2h)
2. Capitalize concelhos (30 min)
3. Esconder lixo nos distritos (1h)
4. Foto real Joaquim (30 min)
5. Form /para-creches 11→5 campos (1h)
6. Remover `maximum-scale=5` + focus-visible global (10 min)
7. ARIA labels nos botões emoji (30 min)
8. Email template pré-preenchido na ficha (30 min)

### **Próxima semana — REDESIGN ficha de creche (1-2 dias)**
A página mais importante para SEO + decisão. Hoje é a mais fraca.

### **Depois (2 semanas) — refactor /app**
1. Extrair CSS/JS para ficheiros separados (cache 1 ano)
2. Onboarding skip-by-default
3. Filtros 12 → 3 + collapse
4. Tabs Mapa/Em processo/Favoritas
5. Schema WebApplication

### **Sempre adiar (para depois de tudo isto)**
- TOC sticky nos guias
- Press Kit ZIP
- Roadmap com voto
- Comparador lado-a-lado

---

## 📊 Avaliação final por dimensão

| Dimensão | Nota | Comentário |
|---|---:|---|
| **Conteúdo** | 9/10 | Guias, /sobre, /metodologia, /imprensa são exemplares |
| **Copy** | 7/10 | Tom genuíno, mas hierarquia emocional fraca; CTAs neutros |
| **Design visual** | 5/10 | Inconsistente, fragmentado, sem sistema |
| **UX flows** | 6/10 | Fluxos funcionam mas com fricção evitável |
| **Performance** | 4/10 | /app 422 KB inline mata-te |
| **Acessibilidade** | 5/10 | Viewport bloqueia zoom, focus invisível, ARIA fraco |
| **SEO técnico** | 9/10 | Sitemaps, schemas, llms.txt — modelo |
| **Mobile** | 6/10 | Funciona mas filtros podem wrap mal, onboarding é demais |
| **Confiança** | 8/10 | Transparência genuína, mas falta foto real do fundador |
| **Diferenciação** | 9/10 | "Provavelmente nunca", gratuito, sem ads = identidade forte |

**Média ponderada: 6.8/10** — produto sólido com fundação excelente, mas com execução visual e ficha individual a precisar de carinho urgente.

---

## 💡 Recomendação estratégica

**Não toques na home esta semana.** A home está OK e há coisas mais urgentes:

1. **Redesenha a ficha individual** (`/creche/...`) — é a aterragem mais comum vinda do Google
2. **Unifica o header** — fricção zero, ganho de coerência massivo
3. **Reduz fricção na /app** (onboarding + filtros) — mães em pânico precisam ver o mapa em 3 segundos

Tudo o resto é polimento. Mas estes 3 movimentos viram o produto.

---

## 🌊 Onda 23 — URGENTE: Fix UX mobile (feedback da amiga do Joaquim)

Feedback recebido: "banners enchem o ecrã, mapa confuso ao por código postal, ou então só lista para quem quiser"

### Mudanças

56. ✅ **Esconder banner "Em breve — vagas em tempo real" em mobile** (`@media(max-width:768px){.vagas-banner{display:none}}`)
57. ✅ **Cookie banner mais compacto em mobile** — padding menor, font menor, botões mais pequenos
58. ✅ **Default mobile = LISTA** (não mapa) — feedback "muito mais simples começar pela lista"
59. ✅ **mob-toggle MAIS visível** — bigger, com glow ring + pulse animation 2x no início (atrai olho)
60. ✅ **Pill "📮 A partir de [endereço]"** no topo da lista quando há localização activa — feedback claro de que CP foi aceite + botão ✕ para limpar

### Resultado esperado
- Mobile primeira impressão: lista de creches limpa, sem banners a entupir
- Botão grande coral pulsa "Ver no mapa · 2.585 creches" → impossível não ver
- Ao por CP/morada: o input está dentro dos filtros, pill aparece confirmando ("📮 A partir de 1000-001")
- Sem mais "onde é que ele encontrou o CP?" — feedback visual claro


---

## 🌊 Onda 24 — Filtros fecham após "Procurar" + botão "Ver X creches"

Feedback do user: "quando carrego em Procurar devia desaparecer os filtros e mostrar logo a lista"

### Mudanças

61. ✅ **Após carregar "Procurar" (morada/CP)** → `setFiltersOpen(false)` + `scrollIntoView` para a lista
62. ✅ **Após GPS aceitar localização** → mesmo comportamento (fecha filtros + scroll para lista)
63. ✅ **Botão grande coral "✓ Ver 2.585 creches ↓"** no fundo do painel de filtros — contagem dinâmica via `_updateApplyBtnCount()`, fecha filtros + scroll
64. ✅ Contagem actualizada automaticamente em `applyFilters()` (igual ao mob-toggle label)

### Resultado esperado
- User põe CP → carrega "Procurar" → filtros desaparecem → vê logo lista ordenada por distância + pill 📮
- User abre filtros, marca IPSS + idade 2 anos → vê em tempo real "Ver 423 creches ↓" → carrega → fecha + vê lista
- Sem mais "onde está a lista?" — fluxo natural até resultado

