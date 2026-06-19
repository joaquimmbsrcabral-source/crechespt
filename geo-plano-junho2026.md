# Plano GEO Creches.app — Junho 2026

**O que é GEO?** Generative Engine Optimization. SEO para ChatGPT, Claude, Perplexity, Gemini. Em 2026, **68% das pesquisas são zero-click** (resposta directa do AI), por isso aparecer no AI vale mais que aparecer no Google.

**Onde estamos hoje:** ausentes em Wikipedia/Wikidata, ausentes em Reddit, sem tracking dos crawlers AI. Cobertura ChatGPT depende do Bing (rejeitaste). Forte ponto: cobertura **Público** + **NiT**.

**O que já fizemos hoje (deploy pronto):**
1. ✅ `/llms.txt` — treasure map para LLMs
2. ✅ `/llms-full.txt` — versão expandida com contexto completo
3. ✅ `/sobre/metodologia` — citation magnet com `Dataset` schema (fonte de dados explicada)
4. ✅ Vercel headers correctos (text/plain para llms.txt)
5. ✅ Sitemap actualizado

**O que precisas de fazer tu (manual, ~3h total):**

---

## TAREFA 1 — Wikidata (30 minutos)

**Porquê:** Wikidata alimenta os Knowledge Graphs de Google, Gemini, Claude e (indirectamente) ChatGPT. Sem entidade Wikidata, és invisível como "entidade" — só como "URL aleatório".

### Passo a passo

1. Vai a https://www.wikidata.org/ e clica em **"Criar uma conta"** (basta email + password)
2. Confirma o email
3. Vai a https://www.wikidata.org/wiki/Special:NewItem
4. Preenche:
   - **Label** (PT): `Creches.app`
   - **Description** (PT): `Plataforma gratuita portuguesa de mapa de creches`
   - **Label** (EN): `Creches.app`
   - **Description** (EN): `Free Portuguese childcare mapping web application`
5. Clica **Create**
6. Vais ver uma página com um ID tipo `Q1234567`. **Copia este Q-ID** para mim.

### Adicionar propriedades (statements)

No mesmo item, adiciona:

| Property | Value | Como |
|---|---|---|
| `instance of` (P31) | `web application` (Q193424) | "Add statement" → tipo P31 → escreve "web application" |
| `country` (P17) | `Portugal` (Q45) | Tipo P17 → escreve Portugal |
| `inception` (P571) | `2026-05-01` | Data de criação aproximada |
| `official website` (P856) | `https://creches.app` | URL |
| `founded by` (P112) | `Joaquim Cabral` (texto livre se não existe Q) | |
| `described at URL` (P973) | `https://www.publico.pt/2026/06/12/p3/noticia/joaquim-criou-site-mapeia-creches-portugal-usou-ia-demorou-duas-semanas-2178023` | Link Público |
| `described at URL` (P973) | `https://www.nit.pt/fora-de-casa/este-engenheiro-portugues-criou-uma-plataforma-que-junta-todas-as-creches-de-portugal` | Link NiT |
| `language of work` (P407) | `Portuguese` (Q5146) | |

### Depois

- Manda-me o **Q-ID** que recebeste → adiciono ao `sameAs` do schema Organization da app
- Espera 1-2 semanas para Wikidata propagar para Knowledge Graphs

---

## TAREFA 2 — Cloudflare GEO Tracking (30 minutos)

**Porquê:** Sem saber quantos crawlers AI passam por ti, não sabes se o GEO funciona. Os bots a vigiar:

| Bot | Quem | User-Agent |
|---|---|---|
| **GPTBot** | OpenAI (treina ChatGPT) | `GPTBot` |
| **ClaudeBot** | Anthropic (treina Claude) | `ClaudeBot` |
| **PerplexityBot** | Perplexity (search engine) | `PerplexityBot` |
| **Perplexity-User** | Perplexity (real-time search) | `Perplexity-User` |
| **Google-Extended** | Google (treina Gemini, separado do crawler SEO) | `Google-Extended` |
| **CCBot** | Common Crawl (alimenta modelos) | `CCBot` |
| **Bingbot** | Microsoft (alimenta Bing/Copilot) | `bingbot` |
| **applebot-extended** | Apple Intelligence | `Applebot-Extended` |
| **Meta-ExternalAgent** | Meta AI | `Meta-ExternalAgent` |

### Passo a passo (Cloudflare dashboard)

1. Login em https://dash.cloudflare.com com a tua conta
2. Selecciona o domínio **creches.app**
3. Menu esquerdo → **Analytics & Logs** → **Web Analytics**
4. Procura no painel a métrica **"Bot management"** ou **"Crawler analytics"**

**Atalho mais rápido (com bot management automático):**
- Menu esquerdo → **Security** → **Bots**
- Verifica que está **on** (free tier: "Bot Fight Mode" ON)
- Garante que **NÃO bloqueia** AI training bots — caso contrário não és lida pelos modelos

### Permitir explicitamente os bots AI (importante!)

5. Vai a **Security** → **WAF** → **Custom Rules**
6. Cria nova regra:
   - **Name:** "Allow AI bots"
   - **Expression (Wireshark):** `(http.user_agent contains "GPTBot") or (http.user_agent contains "ClaudeBot") or (http.user_agent contains "PerplexityBot") or (http.user_agent contains "Google-Extended") or (http.user_agent contains "Applebot")`
   - **Action:** Skip → All remaining custom rules + Security Level: Off
7. Deploy

### Ver os hits dos bots

8. Menu → **Analytics & Logs** → **Logs** (ou GraphQL se Pro)
9. Filtra `http.user_agent` por cada bot e conta hits/dia

**Métricas a registar semanalmente:**
- Hits de GPTBot
- Hits de ClaudeBot
- Hits de PerplexityBot
- Hits de Google-Extended

**Meta para Setembro 2026:** crescimento de hits AI em 50%+ comparado com Julho.

### Tracking citações (gratuito, qualitativo)

Verifica manualmente uma vez por mês, escrevendo as queries em cada AI:

| AI | Onde escrever | Queries para testar |
|---|---|---|
| ChatGPT (com search) | chat.openai.com | "Como encontrar creches em Portugal" / "App para procurar creches em Lisboa" |
| Claude | claude.ai | "Where can I find a childcare map for Portugal" |
| Perplexity | perplexity.ai | "Best app to find creches in Portugal" |
| Google AI Overviews | google.pt search | "creches em portugal app" / "mapa creches portugal" |
| Gemini | gemini.google.com | "Como funciona o programa creche feliz" |

**Marca quando és citado:**
- ✅ Citado e linkado
- 🟡 Mencionado sem link
- ❌ Concorrente é citado (Coverflex, Carta Social, etc.)

Faz isto **primeiro hoje** para teres um baseline. Depois, mensalmente.

---

## TAREFA 3 — Reddit Playbook (30 dias)

**Porquê:** Reddit é responsável por **~40% das citações cross-LLM**. Os AIs adoram respostas Reddit porque são "humanas, contextuais, com upvotes".

### Regra dos 30 dias

**Não promovas a Creches.app durante 30 dias.** Apenas:
1. Cria conta `u/creches_app` (ou nome teu)
2. Subscreve a `r/portugal`, `r/PortugalExpats`, `r/Lisboa`, `r/Porto`
3. Comenta com utilidade em threads sobre **creches, parentalidade, custos, expat life em PT** — sem mencionar Creches.app
4. Constrói karma (>500 antes de partilhar)

Depois do dia 30:
5. Quando alguém perguntar "onde posso encontrar creches em Lisboa?" — partilha o link com contexto: *"Construí uma ferramenta gratuita para mapear todas as creches em Portugal — pode ajudar: creches.app"*
6. Respondes a perguntas técnicas: idades, mensalidades, Creche Feliz — sempre linkando o guia correspondente

**Subreddits prioritários:**

| Subreddit | Membros | Foco | Como contribuir |
|---|---|---|---|
| r/portugal | ~700k | Geral PT | Threads "qual creche" |
| r/PortugalExpats | ~50k | Estrangeiros em PT | Guia EN é crucial |
| r/Lisboa | ~80k | Lisboa | Específicos |
| r/Porto | ~40k | Porto | Específicos |
| r/Algarve | ~30k | Algarve | Expat-heavy |

### Outros canais (alta densidade de "pais a perguntar")

- **Facebook groups** "Mães em Portugal", "Mães em Lisboa", "Pais em Coimbra"
- **Comunidade Mãe a Mãe** (https://demaeparamae.pt/forum)
- **Quora** em PT (poucas mas alta autoridade SEO)

---

## TAREFA 4 — Original Data Study (1 semana)

**Porquê:** Original research é citada **3-5x mais** que blog post derivativo. E vira citação em jornalismo (que vira mais press hits).

### O estudo: "Crise das creches em Portugal — Junho 2026"

**Métricas que tens nos dados:**

1. **Densidade de creches por distrito** — `creches por 1000 nascimentos esperados`
2. **% concelhos com pelo menos uma creche** vs **% com pelo menos 5**
3. **Distribuição IPSS vs Privada vs Pública** por distrito
4. **Cobertura de berçário** vs **cobertura de JI** — onde há mais déficit
5. **Concelhos sem qualquer creche mapeada** (e portanto provavelmente sem oferta real)

**Formato:**

- Publicar como página `/sobre/relatorio-2026` ou `/dados/portugal-creches-2026`
- Incluir `Dataset` schema e `Article` schema
- Incluir tabela + 3-4 gráficos (SVG inline)
- Disponibilizar CSV para download
- GitHub: subir CSV + análise Python — backlinks de quem refazer
- Footer da página: "Citar como: Cabral, J. (2026). Crise das creches em Portugal. creches.app/dados"

**Impacto esperado em 30 dias após publicar:**
- 1-2 jornalistas a citar (Eco, ECO Económico, Observador)
- Wikipedia: passa de "não notável" a "fonte primária"
- Reddit: thread orgânico no r/portugal

---

## Roadmap GEO próximos 90 dias

### Semana 1 (esta semana)
- [x] llms.txt + llms-full.txt
- [x] /sobre/metodologia + Dataset schema
- [ ] Wikidata (tu — 30 min)
- [ ] Cloudflare GEO tracking (tu — 30 min)
- [ ] Baseline manual: testar 10 queries em cada AI, registar

### Semanas 2-3
- [ ] Reddit playbook (modo lurker/helpful)
- [ ] Página EN `/en/childcare-portugal-guide` para expats
- [ ] Atualizar Organization schema do `index.html` com novo `sameAs` (Q-ID Wikidata)

### Semana 4
- [ ] Original data study draft
- [ ] Submeter Bing Webmaster Tools (reconsiderar — desbloqueia ChatGPT)
- [ ] Press outreach #2 ao Observador, ECO, Expresso (com data study como hook)

### Meses 2-3
- [ ] Wikipedia PT — submeter entrada (precisa 3+ fontes secundárias: tens NiT + Público + 1 mais)
- [ ] Upgrade páginas concelho com TL;DR + tabelas + FAQ + author byline
- [ ] Lançar `r/portugal` post com o data study
- [ ] Conseguir 50+ menções em Reddit, fóruns

---

## Métricas a seguir

| Métrica | Frequência | Baseline (Junho 2026) | Meta (Setembro 2026) |
|---|---|---|---|
| Hits crawler GPTBot | Mensal | Anotar agora | +50% |
| Hits crawler ClaudeBot | Mensal | Anotar agora | +50% |
| Hits crawler PerplexityBot | Mensal | Anotar agora | +50% |
| Citações em ChatGPT (queries-alvo) | Mensal | Anotar agora | 30%+ |
| Citações em Perplexity (queries-alvo) | Mensal | Anotar agora | 50%+ |
| Entrada Wikipedia PT | One-off | ❌ | ✅ |
| Q-ID Wikidata | One-off | ❌ | ✅ |
| Backlinks únicos | Mensal | Anotar agora | +10/mês |

---

## Recursos

- Wikidata starter: https://www.wikidata.org/wiki/Wikidata:Tours/Item
- llms.txt spec: https://llmstxt.org/
- Otterly (paid GEO tracking): https://otterly.ai/
- Search Engine Land — best resources GEO: https://searchengineland.com/category/seo/ai-search
