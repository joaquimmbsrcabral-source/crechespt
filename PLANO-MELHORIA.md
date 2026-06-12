# Plano de Melhoria — Creches.app · Junho 2026

Revisão feita ao código local + site live (creches.app, 1000+ visitas, brotli ativo, /app a servir a versão certa).

## Diagnóstico rápido

**Pontos fortes:** SEO técnico sólido (canonical, schema, sitemap, robots), 21 páginas de distrito com listas completas, 3 guias com FAQPage schema, app rica em funcionalidades (mapa, filtros, pipeline, deep links, partilha, export), dataset embebido comprimido (gzip+base64), admin/test com noindex.

**Lacunas encontradas:**

| # | Problema | Impacto |
|---|---|---|
| 1 | **Nenhuma página tem `og:image`** | Partilhas no WhatsApp/Facebook/X aparecem sem imagem — CTR de partilha muito baixo. Pais partilham por WhatsApp! |
| 2 | **Sem analytics no código** | Não sabes de onde vêm as 1000 visitas, que páginas convertem, que distritos procuram |
| 3 | **Falta o artigo "Creche Feliz"** | A query com mais volume do nicho (já estava no teu plano SEO, por executar) |
| 4 | **Sem fichas individuais das creches** | 2591 páginas long-tail por criar ("creche X em Y") com schema ChildCare — a maior alavanca SEO vs. coverflex/crechenaminharua. Era o item "Schema LocalBusiness por creche" do teu plano |
| 5 | Links das listas de distrito apontam para `/app#...` | Perde-se o internal linking distrito→ficha→app |
| 6 | Google ainda não indexou nada (confirmado via site:) | Ação manual tua no GSC continua pendente |
| 7 | Sem service worker (PWA só com manifest) | Menor: sem offline, prompt de instalação fraco |
| 8 | Ficheiros órfãos no repo (`app 2.html`, `test-stats.html`) | Cosmético |

## Plano (por prioridade)

### P0 — Executo já (hoje)
1. **og:image** — criar imagem 1200×630 com a identidade do site e adicionar `og:image` + `twitter:image` a todas as páginas públicas.
2. **Vercel Web Analytics** — adicionar script a todas as páginas (ativa depois "Web Analytics" no dashboard Vercel, 1 clique).
3. **Guia "Creche Feliz 2026 — creches gratuitas"** — artigo completo (elegibilidade nascidos ≥ 1 set 2021, Lei 22/2025, rede aderente, app Creche Feliz, código de 48h, o que está/não está incluído, prioridades da Portaria 198/2022, FAQ com schema) + ligações internas + sitemap.

### P1 — Executo já (a seguir)
4. **2591 fichas individuais** em `/creche/{slug}` — dados completos, mapa embed, 6 creches próximas (interlinking), FAQ, JSON-LD `ChildCare` + `BreadcrumbList`, CTA para a app. Gerador `scripts/gerar_fichas.py` (re-corrível quando o dataset mudar).
5. **Listas de distrito** passam a ligar à ficha de cada creche (e a ficha liga ao mapa).
6. **`sitemap-creches.xml`** novo + referência no robots.txt + lastmod atualizado no sitemap principal.

### P2 — Próxima iteração (não executo agora)
7. Páginas por concelho/localidade (Cascais, Sintra, Oeiras…) — top 30 localidades.
8. Service worker (offline + install prompt).
9. Performance app.html: lazy-load Firebase até interação de login.
10. Limpeza de ficheiros órfãos.

## Ações manuais tuas (15 min, máxima alavancagem)
- [ ] GSC: pedir indexação das URLs principais (lista no `seo-plano-pos-nit.md`) + submeter `sitemap-creches.xml` quando fizeres deploy
- [ ] Vercel dashboard → projeto → Analytics → **Enable Web Analytics**
- [ ] Bing Webmaster: importar do GSC
- [ ] Confirmar dofollow no artigo da NiT

## Métricas de sucesso (4 semanas)
- Páginas indexadas: 0 → 500+ (fichas começam a entrar)
- Impressões GSC: 0 → 1000+/semana
- Partilhas com preview de imagem (verificável em opengraph.xyz)
