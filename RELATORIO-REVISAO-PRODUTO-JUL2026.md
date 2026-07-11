# Revisão completa de produto — creches.app
*11 Jul 2026 · 4 revisões paralelas: UX pai · UX creche · conteúdo/SEO · mobile/PWA/a11y/perf. Achados críticos verificados por grep no código.*

---

> ## ✅ ATUALIZAÇÃO — 11 Jul 2026, fim do dia
> **Tudo implementado**, exceto (com razão documentada):
> - Envio real de emails (lead + digest semanal): **código pronto e deployável** (`api/lead-notify.js`, `api/weekly-digest.js` + cron às 2ªs 08:00) — ativa-se sozinho quando configurares RESEND_API_KEY/FIREBASE_SERVICE_ACCOUNT/CRON_SECRET no Vercel
> - Dark mode completo: adiado (adicionado `color-scheme: light` como sinal intencional); tokens CSS já permitem fazê-lo depois
> - Self-hosting de Leaflet/Firebase e dataset .gz como recurso separado: mudanças arquiteturais adiadas; SRI adicionado a todos os CDN em falta (mitiga o risco de integridade)
> - noindex de fichas "thin": decisão editorial tua — pode desindexar centenas de páginas; falamos antes
> - Focus-trap completo nos 8 sistemas de modais: feito o essencial (foco no X ao abrir, Esc fecha todos, scroll do fundo bloqueado); trap com inert fica para uma iteração dedicada

---

## Sumário executivo

**O que está bem:** a fundação é sólida e acima da média — arranque sem login, proveniência dos dados sempre declarada, tom caloroso e consistente ("tu") no lado dos pais, pipeline pessoal genuinamente útil, painel da creche com erros humanizados e listener realtime, metadados/schema exemplares (5 blocos JSON-LD na home), robots.txt preparado para bots de IA, dataset embutido comprimido (ideia forte), inputs todos com label, foco visível, pt-PT consistente em datas/números.

**Os 3 problemas que envergonham em escala** (todos verificados):
1. **~1.610 fichas dizem "A Jardim Escola…"** — concordância de género errada, visível em H2 e no schema FAQ indexado pelo Google.
2. **563 fichas dizem "A X é desconhecido"** — frase agramatical E factualmente errada (trata tipo desconhecido como privada).
3. **O sitemap índice aponta para o sitemap ERRADO** — `sitemap-creches-1.xml` (velho, com 12 URLs de escolas que dão 404); o `sitemap-creches.xml` atual (2.578 fichas) não está no índice. As fichas novas estão órfãs para o Google.

**O furo de produto nº 1:** a creche não recebe **email quando entra um lead** — o valor central ("recebe famílias") fica trancado num painel que uma diretora pouco tecnológica não abre por hábito. (Depende do Resend — já sabíamos, mas esta revisão confirma que é O bloqueador de retenção.)

---

## P0 — Corrigir já (impacto alto, esforço baixo)

| # | Problema | Onde | Fix |
|---|----------|------|-----|
| 1 | Sitemap índice aponta para sitemap velho com 12 404s; o novo não está lá | `sitemap.xml` | Trocar `sitemap-creches-1.xml`→`sitemap-creches.xml`; apagar o velho |
| 2 | "A Jardim Escola…" em ~1.610 fichas (H2 + FAQ schema) | `scripts/gerar_fichas.py:291,534` | Artigo por 1ª palavra (Jardim/Centro/Externato/Infantário/Colégio→"O"; nomes começados por O/A→sem artigo) + regenerar |
| 3 | "A X é desconhecido" em 563 fichas | `gerar_fichas.py:296,432` | Ramo próprio para tipo Desconhecido |
| 4 | Estado vazio sem "Limpar filtros" com toggles vaga/aderentes/CF ativos | `app.html:1486` | Incluir onlyVaga/onlyGeridas/onlyCrecheFeliz no hasFilters |
| 5 | para-creches.html diz "Em breve" sobre features JÁ lançadas; CTA primário vai para waitlist em vez de /painel | `para-creches.html:246-309` | Reescrever em torno de "o painel está aberto"; hero CTA → /painel |
| 6 | Desligar todos os toggles de vaga publica "🔴 Sem vagas" sem avisar a creche | `painel.html` + `perfil-creche.js:130` | Aviso antes de guardar |
| 7 | "Ver a nossa página pública" no painel abre o deep-link do mapa, não a ficha rica | `painel.html:473` | Ligar à ficha estática /creche/… |
| 8 | Fallback ausente de DecompressionStream — app morta em iOS <16.4 | `app.html:2906` | Fallback fetch creches_pt.json |
| 9 | Contraste --ink-faint 2,4:1 (falha AA) em placeholders/labels | `app.css` + `painel.html` | Escurecer para ~#6E6790 |

## P1 — Próxima semana (impacto alto, esforço médio)

- **Email à creche no novo lead + digest semanal** (depende do Resend — é O gatilho de retenção; sem isto a promessa "recebe famílias" não se cumpre)
- **Dois controlos de idade concorrentes** confundem ("Tem X anos" vs chips "Resposta: Berçário/Creche/JI") — fundir ou rotular "Idade do meu filho" (`app.html:311,338`)
- **Reports de vaga/Creche Feliz demasiado salientes no modal do pai** — dois botões verdes ANTES dos detalhes; rebaixar para link discreto (`app.html:490-497`)
- **Onboarding morto**: 200 linhas de overlay desativado por defeito e sem gatilho; reativar 1ª visita (só morada) ou apagar (`app.html:2718`)
- **Botão 💌 enterrado** no fim do cartão verde — para aderentes devia ser CTA primário (é o único canal rastreável); sub-label "a creche responde-te" 
- **Guardar do painel**: toggles parecem instantâneos mas exigem "Guardar alterações"; auto-save nas vagas ou barra fixa "alterações por guardar"
- **Ordem do dashboard**: leads (ação) devem vir antes de estatísticas (passivo)
- **Focus-trap nos modais** + Esc a fechar todos + bloquear scroll do body (a11y)
- **Claim sem saída** quando a creche não está no dataset — permitir "adicionar agora" inline em vez de mandar para outra página e esperar 24-48h
- **Uniformizar tu/vós no painel** (mistura "a tua creche" com "o vosso perfil" no mesmo ecrã) — recomendação: "vocês/vosso" no painel (institucional), "tu" no lado dos pais
- **Homepage não liga a /comparar nem /vagas** (nenhum link rastreável) — acrescentar ao footer global
- **lastmod dos sitemaps preso em 2026-06-18** — gerar dinâmico

## P2 — Quando houver tempo

- Manifest: `start_url:"/app"`, `id`, `shortcuts`, ícone maskable com safe-zone
- Chips com ~30px de altura em mobile (mínimo 44px) — subir padding
- Fotos no painel: sem motivo de recusa, sem botão apagar
- Campos de contacto do painel sem aviso "isto fica público"
- Nome/morada da creche não editáveis nem com caminho de correção
- Números de creches inconsistentes (2.585 vs 2.591 vs "2.500+") — fonte única
- "20 distritos" → "18 distritos + Açores e Madeira"
- Guias em falta: lista de espera; adaptação à creche
- Fichas sem contacto = thin content — enriquecer com dados do painel ou noindex seletivo
- desc cortada a meio de palavra nas fichas (158 chars) 
- SRI em falta nos CSS/JS de markercluster/draw (unpkg)
- Self-host de Leaflet/Firebase (~20 requests de terceiros no arranque)
- Dataset inline re-descarregado a cada 5 min com o HTML (cache 300s) — servir .json.gz próprio com hash
- Dark mode inexistente (tokens CSS já permitem; barato) + `color-scheme` meta
- prefers-reduced-motion só cobre 1 de 4 animações
- Rodapé das fichas sem a promessa "sem anúncios · sem venda de dados"
- Incoerência "Berçário (0-12m)" vs "(4-12m)" entre painel/para-creches/modal lead
- alt="" no thumb da creche (devia ter o nome)
- Mistura AO90/AO45 ("interativo" vs "interactivo", "Direcções")
- foto-gemini.png (6,2 MB) e outros assets de marketing no deploy — mover/ignorar
- Import do pipeline usa confirm() nativo (inconsistente com os modais custom)
- "Obrigado." no template de email assume género — "Obrigado(a)"

## O que está BEM (não mexer — é o que nos distingue)

- Zero fricção de entrada (guest mode) + privacidade explícita "os teus dados só ficam neste browser"
- Proveniência sempre declarada (OpenStreetMap) + badge "⚠️ a verificar" honesto em idades inferidas
- Selo ✓ explicado onde aparece + nudge honesto para não-aderentes
- Pipeline "Em processo" com "⏰ A fazer já" e lead→Contactada automático
- Formulário de lead calibrado (não pede demais) + RGPD explícito + rate limit
- Painel: erros humanizados, realtime na aprovação, moderação de fotos bem comunicada, copy motivadora nos leads
- Fichas: schema ChildCare+Breadcrumb+FAQ válido, titles únicos, canonicals, og:image
- Guia Creche Feliz com legislação citada — provavelmente o melhor recurso online sobre o tema
- robots.txt com allow-list de bots IA (GEO) — visão à frente da curva
- Mobile: lista por defeito, bottom-sheets com drag, safe-areas, font-size 16 anti-zoom iOS
- sw.js conservador e correto; offline.html digno
- pt-PT em tudo (datas, números, Accept-Language no Nominatim)
