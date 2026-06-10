# Plano SEO pós-NiT — Junho 2026

## Diagnóstico (estado atual)

- ✅ SEO técnico está sólido (robots, sitemap, meta tags, schema)
- ❌ **Google ainda não indexou nenhuma página** de `creches.app`
- ❌ **Bing também não indexou**
- ⚠️ Backlink NiT existe mas precisa ser confirmado como dofollow + ainda não está visível nas pesquisas
- ⚠️ Domínio tem ~1 mês — zero autoridade ainda

**Não é problema técnico. É falta de indexação e tempo.**

## Competidores principais

| Site | Tipo | DA estimado | Notas |
|---|---|---|---|
| seg-social.pt | Gov | 80+ | Creche Feliz — favorito do Google |
| mapasocial.pt | Gov | 70+ | Mapa Social oficial |
| cartasocial.pt | Gov | 65+ | Carta Social oficial |
| coverflex.com | Empresa | 55+ | Tem 2.600 creches mapeadas (competidor direto!) |
| crechenaminharua.pt | Site dedicado | 35+ | Mesmo conceito — concorrente principal |
| coverflex.com/blog | Conteúdo | 55+ | Vai sempre rankear primeiro em educacional |

**Conclusão:** rankear para "creches em Portugal" leva 6-12 meses, talvez nunca #1. Foco em long-tail.

---

## Lista de ações por prioridade

### Hoje (30 minutos, fazer tudo)

- [ ] **Google Search Console** ([search.google.com/search-console](https://search.google.com/search-console))
  - [ ] Para cada URL principal (ver lista abaixo): "Inspeção de URL" → "Pedir indexação"
  - [ ] Confirmar que sitemap está submetido em `Sitemaps`
  - [ ] Resolver eventuais erros em "Cobertura"
  
- [ ] **Bing Webmaster Tools** ([bing.com/webmasters](https://www.bing.com/webmasters))
  - [ ] Adicionar site (importa direto do GSC, 1 clique)
  - [ ] Submeter sitemap

- [ ] **IndexNow** (força crawl Bing/Yandex instantâneo)
  - [ ] Correr `node indexnow.js` (script criado abaixo)

- [ ] **Verificar backlink NiT**
  - [ ] Abrir o artigo da NiT
  - [ ] Clicar direito no link "creches.app" → "Inspecionar" → confirmar que NÃO tem `rel="nofollow"` ou `rel="ugc"`
  - [ ] Confirmar que aponta para `https://creches.app` (não para URL encurtada)

### URLs a forçar indexação no GSC (cola uma a uma)

```
https://creches.app/
https://creches.app/app
https://creches.app/sobre
https://creches.app/imprensa
https://creches.app/para-creches
https://creches.app/guias/como-escolher-creche
https://creches.app/guias/quanto-custa-creche-portugal
https://creches.app/guias/creche-ama-avos-qual-escolher
https://creches.app/creches/lisboa
https://creches.app/creches/porto
https://creches.app/creches/braga
https://creches.app/creches/setubal
https://creches.app/creches/aveiro
```

### Esta semana

- [ ] **Reforçar backlinks** — enviar os outros 13 emails à imprensa (já em drafts no Gmail). Cada artigo = 1 link de qualidade.

- [ ] **Reddit r/portugal** com follow-up — partilhar o artigo da NiT como prova social, com link `creches.app` na descrição

- [ ] **Diretórios PT de qualidade**:
  - [ ] Portugal Hub: [portugalhub.pt](https://portugalhub.pt)
  - [ ] LinkedIn: perfil pessoal "Joaquim Cabral · Fundador @ Creches.app" + posts com link
  - [ ] Crunchbase: criar perfil da startup
  - [ ] Product Hunt: agendar lançamento (best day = Tuesday/Wednesday)
  - [ ] BetaList: submeter para inclusão (gratuito)
  - [ ] Indie Hackers: perfil + post sobre o build

- [ ] **Atualizar sitemap.xml** — colocar `<lastmod>` de hoje em todas as URLs (sinaliza freshness ao Google). Faz `./deploy.sh` depois.

- [ ] **Confirmar que está no GSC + Analytics**
  - GSC: vê quantas impressões/clicks tens
  - Liga GA4 ou Vercel Analytics se ainda não tens

### Próximas 2-4 semanas

- [ ] **Páginas por freguesia** (Lisboa centro, Cascais, Sintra centro, etc.) — long-tail wins
  - Foco nas 10 freguesias com mais procura: Lisboa-Estrela, Lisboa-Areeiro, Cascais-centro, Sintra-Massamá, Oeiras-Algés, Porto-Cedofeita, Porto-Boavista, Braga-centro, Coimbra-Sé, Faro-centro
  - Cada página: 10-30 creches da freguesia + 200-400 palavras de contexto (transportes, preço médio, IPSS principais)

- [ ] **Artigo "Creches grátis em Portugal — Creche Feliz 2026"**
  - É a query MASSIVAMENTE procurada agora
  - Apanha o tráfego do programa governamental
  - Internal links para a tua app

- [ ] **Schema LocalBusiness para cada creche** (ficha individual da creche)
  - Permite aparecer em "Rich results" do Google
  - Pode ser a tua vantagem versus competidores

- [ ] **Internal linking forte**
  - De cada distrito → para freguesias dentro do distrito
  - De cada guia → para distritos e app
  - Da home → para 3-5 artigos mais lidos
  - Footer com links para os top 5 distritos

- [ ] **Featured snippets** — formatar respostas em formato Q&A nas páginas dos guias

### Mês 2-3

- [ ] **Local SEO**:
  - Criar perfil Google Business para Creches.app (se aplicável)
  - Schema FAQ em cada guia

- [ ] **Mais conteúdo evergreen**:
  - "Como funciona a lista de espera nas creches IPSS"
  - "Comparar creche privada vs IPSS — tabela 2026"
  - "Documentos para matricular o teu filho — checklist"
  - "Período de adaptação — guia para pais"

- [ ] **Linkbuilding ativo**:
  - Outreach a bloggers de maternidade (Bumba na Fofinha, etc.)
  - Submeter para "Sites que ajudam pais" em fóruns
  - Convidar pais a partilhar testemunhos (gera UGC + links)

---

## Expectativas realistas

| Keyword | Quando esperas top 10 | Quando esperas top 3 |
|---|---|---|
| "creches em Portugal" | 6-12 meses | 12-18+ meses (talvez nunca, gov domina) |
| "creches em Lisboa" | 3-4 meses | 6-8 meses |
| "creches em Lisboa Estrela" | 4-6 semanas | 2-3 meses |
| "como escolher creche em Portugal" | 6-8 semanas | 3-4 meses |
| "quanto custa creche IPSS" | 4-6 semanas | 2-3 meses |
| "creches grátis Portugal" | 3-5 meses | 6+ meses (gov domina) |

## Métricas para vigiar (todas as semanas)

1. **Search Console — Impressões totais** (vê se Google está a mostrar páginas suas)
2. **Search Console — Cliques** (CTR é mais importante que impressões)
3. **Search Console — Páginas indexadas** (alvo: 30+ páginas em 2 semanas)
4. **GA4 / Vercel Analytics — Tráfego orgânico** (deveria estar a crescer 20%+ semana após semana)
5. **Páginas com 1+ link** vindo de fora (objetivo: 5 nos próximos 30 dias)

---

## Ferramentas grátis para monitorar

- **Google Search Console** (essencial)
- **Bing Webmaster Tools** (essencial)
- **Ahrefs Webmaster Tools** (grátis para dono do site — vê backlinks)
- **Ubersuggest** (3 pesquisas grátis/dia — vê posições)
- **Sitebulb (trial 14 dias)** — audit técnico
- **Google Trends** — vê quando o termo "creches" tem picos (Set, Jan)
