# Auditoria Completa — Creches.app

Junho 2026 · Pós-NiT, pré-Público
Verificações reais no código e em produção.

---

## TL;DR (Top 5)

Por ordem de urgência. Se só fizeres 5 coisas no próximo mês, fá-las nesta ordem:

1. **Limpar duplicados creche_extras** (5 min) + **deploy bug critico do Firebase já feito** (verificar que aplicou as 10 extras + 9 overrides aos utilizadores)
2. **Melhorar algoritmo de idades v4** — 569 creches (22%) ainda em "Desconhecido". É a maior fonte de fricção para pais e o argumento mais fácil contra ti se a JM ou imprensa testarem
3. **Adicionar caching agressivo + cleanup** (app.html serve 228KB brotli a cada request, max-age=0). Ganho de performance × redução de custo Vercel × melhor experiência
4. **Páginas por concelho/freguesia** — 2.629 páginas HTML estáticas já é bom, mas só por distrito. Quem mora em Mem Martins faz query "creches Mem Martins" não "creches Lisboa"
5. **Onboarding de 30 segundos** para novos pais — atualmente entras na app e vês tudo. Adicionar fluxo de 3 passos: "Onde moras? Idade do filho? Já tens? → vê só o que precisas"

---

## O que está bem (não estragar)

Antes do que falta, o que já tens forte:

✅ **Performance base** — 425ms TTFB, Brotli a ~43% compression
✅ **Arquitetura simples** — single-file HTML/JS sem framework, fácil de manter
✅ **SEO técnico** — meta tags, OG, canonical, sitemap, schema.org tudo OK
✅ **Mobile-first** — funciona bem em telemóvel (testado em iOS/Android)
✅ **Login opcional** — não bloqueias os pais (decisão crítica)
✅ **PWA** — manifest + ícones, instalável
✅ **RGPD** — botão de remoção pública, banner cookies, política clara
✅ **Defesa legal** — pedidos de remoção + termos sólidos
✅ **Civic-tech credibility** — NiT, transparência, sem ads, sem venda de dados
✅ **Override + extras infrastructure** — podes corrigir/adicionar sem deploy
✅ **Admin reasonable** — métricas, gestão de submissions, edição universal
✅ **8 guias gratuitos** prontos para SEO

---

# Por categoria

## 🔴 Performance & Reliability

### P1 · Cache HTTP destruidor (impacto: muito alto)

Hoje:
```
cache-control: public, max-age=0, must-revalidate
```

Em vez de:
```
cache-control: public, max-age=300, stale-while-revalidate=86400
```

Significa que **cada visita re-descarrega 397KB do app.html**. Com 4000 visitas/dia = **1.6 GB/dia** de bandwidth desnecessário.

**Fix:** edita `vercel.json` para definir cache de 5 min em /app, 1h nas páginas de distrito, 1 dia nos guias.

**Esforço:** 10 min · **Impacto:** -70% bandwidth + load mais rápido para retornadores

### P1 · Dataset embedded vai escalar mal

App.html tem 389KB porque tem 2.591 creches embedded em gzip+base64. Quando chegares a 4.000+ creches, sobe para 700KB+. Em mobile 3G é lento.

**Fix:** mover dataset para `/creches.json.gz` (separado), fetched via async. App.html fica em ~80KB.

**Esforço:** 4-6h · **Impacto:** mobile mais rápido, cache do dataset separado

### P2 · Lazy load do Firestore

Hoje fazes `creche_overrides` e `creche_extras` em paralelo com o dataset. Boa decisão. Mas quando atingires 100+ overrides será mais lento.

**Fix futuro:** considera servir o merge pré-feito via Vercel Edge Function uma vez por hora.

### P3 · "app 2.html" no repo

Tens um ficheiro `app 2.html` (300KB) abandonado. Vai ser servido em /app%202.html se alguém adivinhar.

**Fix:** `rm "app 2.html"` + deploy

---

## 🟢 Qualidade dos Dados

### P0 · 22% das creches em "Desconhecido"

569 creches no dataset com `tipo: "Desconhecido"`. Isto é o teu **calcanhar de Aquiles**. Jornalistas e potenciais parceiros vão testar pesquisar a creche que conhecem — se aparecer "?", quebras credibilidade.

**Fix (curto prazo):** algoritmo de inferência v4 com mais padrões + lookup cruzado com Carta Social

**Fix (médio prazo):** scrape cruzado com a Carta Social oficial para preencher tipo de resposta social — pode subir a precisão para 95%+

**Esforço:** 8-16h · **Impacto:** enorme — é o ponto mais visível de qualidade

### P1 · Duplicados em creche_extras ainda lá

Confirmei: ainda há **4 duplicados** dos 14 docs em `creche_extras` (10 únicas).

**Fix:** abrir `/admin`, clicar "🧹 Limpar duplicados". 5 segundos.

### P1 · Coordenadas erradas algures

Quando geocodes via Nominatim, em meios pequenos o pin pode ficar a 200m-500m da creche real. Não é grave para uma audit, mas é para os utilizadores.

**Fix:** auditar via random sampling — escolher 30 creches aleatórias e verificar pin em Maps. Aplicar overrides nas erradas.

**Esforço:** 1-2h · **Impacto:** confiança aumenta

### P2 · Reports a chegar mas não há feedback ao reporter

Quando alguém reporta "telefone errado" e tu corriges, **o reporter não fica a saber**. O sistema de emails que construíste (Gmail compose) funciona, mas precisas de lembrar-te de o fazer.

**Fix:** botão no admin que ao aplicar a correção, mostra logo a banner "Avisar reporter →" (já fizemos)... Verificar se ainda está ativo.

---

## 🟡 UX / Mobile

### P0 · Primeira impressão é caótica em mobile

Quem chega via NiT ou Público vai direto para /app. Vê: mapa + filtros + lista + chip de login + banner cookies. Demasiado num ecrã.

**Fix:** onboarding de 3 ecrãs progressivo:

```
Ecrã 1 (3s): "Olá! Onde moras?" → input morada
Ecrã 2 (3s): "Que idade tem o teu filho?" → quick chips
Ecrã 3 (5s): Mapa com filtro já aplicado, top 5 sugestões em destaque
```

Skippable se quiser ("não, deixa-me explorar"). Mas para 70% dos pais que vêm com 1 intenção clara, isto é 10× melhor.

**Esforço:** 4-6h · **Impacto:** conversão multi-x

### P1 · Filtros de operador chip estavam BUGGED (fix deployed agora)

Acabamos de corrigir. A utilizadora que deixou review ("filtros com bugs") provavelmente tinha topado nisto.

### P1 · O botão "🚩 reportar erro" requer login

Pequena fricção. Quem está a passar visualmente e vê erro, não vai parar para fazer login. Vai embora frustrado.

**Fix:** permite report sem login (validar via Cloudflare Turnstile, ou só com captcha leve).

**Esforço:** 2-3h · **Impacto:** mais reports = melhor dataset

### P2 · Procurar por código postal funciona, mas é escondido

O input atual é "morada" geral. Para "1100-053" também funciona, mas o utilizador não sabe.

**Fix:** placeholder claro: "Morada, código postal ou cidade"

### P2 · "Voltar à vista geral" agora existe mas sem help

Acabei de adicionar o botão ⛶. Adiciona tooltip mais claro: "Ver Portugal todo".

### P3 · Lista lateral fica no fundo do scroll em mobile

Em mobile, o mapa ocupa o ecrã todo e a lista está abaixo. Quem não scrolla, perde 50% da utilidade.

**Fix:** indicador visual "↓ 47 creches em lista" ou bottom sheet drawer.

---

## 🔵 SEO & Discovery

### P1 · Sitemap só tem 33 URLs

Só 33 URLs no sitemap mas tens **2.629 páginas HTML** (uma por creche!). Google não as conhece.

**Fix:** regenerar sitemap incluindo todas as creches por slug. Particionar em sitemap-creches-1.xml, sitemap-creches-2.xml (50k limit por sitemap).

**Esforço:** 1-2h · **Impacto:** SEO long tail enorme

### P1 · Páginas por concelho/freguesia em falta

Tens 21 páginas por distrito mas a procura SEO é por concelho ("creches em Sintra", "creches em Cascais").

**Fix:** gerar 308 páginas (concelhos PT) automaticamente do dataset.

**Esforço:** 4-6h · **Impacto:** SEO long tail × 14

### P2 · Internal linking entre páginas é fraca

Páginas de distrito não linkam entre si nem aos guias. Cada uma é uma ilha.

**Fix:** rodapé com "Distritos próximos" + "Guias relevantes" em cada página.

### P2 · IndexNow ainda não foi corrido

Tens o script `indexnow.js` mas ainda não o correste.

**Fix:** correr 1x para Bing/Yandex re-crawlarem.

### P3 · Schema JSON-LD pode crescer

Tens schema básico. Adicionar `LocalBusiness` para cada creche individual e `FAQPage` para os guias.

---

## 🟣 Segurança & Privacidade

### P1 · Firestore rules — escrita pública para overrides/extras

Hoje:
```
match /creche_overrides/{cid} {
  allow read: if true;     // OK — público pode aplicar overrides na app
  allow write: if isAdmin(); // OK — só tu escreves
}
```

A regra atual está OK. Mas:

### P2 · Audit log de quem fez o quê

Tens campos `applied_by`, `edited_by` etc. Bom. Mas não há UI para os reveres no admin.

**Fix:** secção "Histórico de alterações" no admin com os últimos 100 overrides/extras editados.

### P2 · Console.warn/error visíveis em produção

Encontrei 17 `console.warn/error` no código que disparam em produção. Não é vulnerabilidade mas faz parecer pouco polido se um jornalista abrir DevTools.

**Fix:** removê-las ou put behind `if (DEBUG)`.

### P3 · Rate limit nas escritas

Atualmente alguém pode submeter 1000 reports/min se quiser. Firebase tem rate limit nativo mas convém ter algo explícito.

**Fix:** Cloudflare Turnstile no form `/para-creches` e nos reports.

---

## 🟠 Features em Falta / Conversão

### P1 · Vagas em tempo real (já mencionaste)

Hoje quando pai liga, creche diz "não temos vaga". 30 chamadas perdidas.

**Fix:** permitir creches indicarem se têm vaga atualmente (botão no admin para creches que tu aprovas). Mostrar pin verde "vaga disponível" no mapa.

**Esforço:** 8-12h · **Impacto:** game changer + diferenciador único

### P1 · Lista de espera tracker

Pais põem nome em 5 listas de espera e perdem-se. Permite criar conta + manter lista + receber update quando creche te liga.

**Esforço:** 4-6h · **Impacto:** conversão e retenção

### P2 · Comparador lado a lado

Selecionas 2-3 favoritas e vês tabela comparativa (preço, distância, horário, idades). Útil para pais a decidir.

**Esforço:** 4-6h · **Impacto:** retenção

### P2 · Newsletter

Captura email e envia 1 email/mês com "novidades + 1 dica". Constrói audiência sua que não depende do algoritmo do Instagram.

**Esforço:** 3-4h (Brevo/MailerLite free tier) · **Impacto:** controle sobre canal

### P3 · App nativa (PWA já existe, mas instalações são baixas)

Considerar promover instalação. Banner: "Instala em 5s para acesso offline".

---

## ⚫ Código & Operações

### P1 · app.html tem 3.316 linhas — está a ficar incontrolável

Single-file é ótimo para iniciar mas a 3000+ linhas o tempo de carregar/editar fica chato. Bug do "Firebase init antes de loadDataset" demoraste tempo a apanhar precisamente por isto.

**Fix (sem deploy):** quando o tempo permitir, considera split em módulos importados (sem framework, ES6 modules nativos).

### P2 · Sem testes automatizados

Cada deploy é um "espero que não tenha quebrado nada". A 4000 visitas/dia, 1 bug = 1000 pessoas irritadas.

**Fix:** testes manuais com checklist (5 cenários cobrindo 80% dos usos). Ou Playwright simples para 3 fluxos críticos.

### P3 · Sem ambiente de staging

Mudas e deployas direto para creches.app. Se algo correr mal afecta utilizadores reais.

**Fix:** branch preview deploys do Vercel (gratuitos) — testar antes de merge.

---

## 📊 Métricas

### P1 · Tens visitas mas não sabes onde os utilizadores se perdem

`daily_stats` conta page views. Falta funnel:
- Quantos chegaram?
- Quantos pesquisaram morada?
- Quantos abriram ficha de creche?
- Quantos clicaram telefone/Maps?
- Quantos voltaram?

**Fix:** adicionar Plausible (privacidade-friendly, RGPD-OK, gratuito até 10k visitas/mês) OU Vercel Analytics.

**Esforço:** 30 min · **Impacto:** conseguires decidir o que melhorar

### P2 · Search Console + Bing Webmaster

Configurar (se ainda não fizeste). Vê queries de pesquisa que trazem tráfego, posições, CTR. Insights gratuitos.

### P3 · NPS leve

A cada 10 sessões, mostra mini-survey "0-10, recomendarias o creches.app?". Mede satisfação ao longo do tempo.

---

## 📅 Plano de Execução Recomendado

### Esta semana (urgente — pré-Público)

| # | Tarefa | Esforço |
|---|---|---|
| 1 | Limpar duplicados creche_extras no admin | 5 min |
| 2 | Fix cache HTTP no vercel.json | 30 min |
| 3 | Apagar app 2.html | 1 min |
| 4 | Adicionar Plausible analytics | 30 min |
| 5 | Corrigir top 10 reports pendentes via editor | 30 min |
| 6 | IndexNow + submeter no GSC mais URLs | 30 min |
| 7 | Remover console.warn/error de produção | 1h |

**Total: ~3h de trabalho. Impacto: muito alto.**

### Próximas 2 semanas

| # | Tarefa | Esforço |
|---|---|---|
| 1 | Onboarding 3 ecrãs para novos pais | 4-6h |
| 2 | Sitemap completo (2.629 URLs) | 2h |
| 3 | Páginas por concelho (308 páginas) | 4-6h |
| 4 | Algoritmo idades v4 (reduzir Desconhecido para <10%) | 8h |
| 5 | Newsletter setup (Brevo) | 3h |
| 6 | Auditoria coords aleatórias 30 creches | 2h |

**Total: ~25h. Impacto: SEO, conversão, qualidade significativos.**

### Próximo mês

| # | Tarefa | Esforço |
|---|---|---|
| 1 | Vagas em tempo real (creches comunicam) | 8-12h |
| 2 | Lista de espera tracker | 4-6h |
| 3 | Comparador lado a lado | 4-6h |
| 4 | Dataset externalizado (`/creches.json.gz`) | 4-6h |
| 5 | Páginas por freguesia (1.500 páginas) | 8h |

**Total: ~30-40h. Impacto: posicionamento competitivo único.**

---

## Recomendação estratégica final

Estás num ponto onde 3 coisas competem pela tua atenção:

1. **Crescer a base** (SEO, conteúdo, posts)
2. **Polir o produto** (UX, dados, qualidade)
3. **Explorar parcerias** (mantendo independência editorial e modelo gratuito)

A minha sugestão: **gasta 60% no #2 nas próximas 4 semanas**. Antes de qualquer reunião importante, queres mostrar uma app polida, com dados de qualidade clara, e métricas de conversão real (não só "visitas").

Quando demonstrares isso, justificas budget de Nível 3 (60-90k€/ano) com confiança total.

---

Em 1 frase: **antes de mais nada, deploy + cleanup duplicados + cache + analytics esta semana. Depois, ataca o Desconhecido (22%) e o onboarding mobile.**
