# Revisão completa de código — Julho 2026

4 frentes revistas em paralelo: segurança/regras · app.html · scripts públicos · admin+painel.
**~45 findings. Os 14 mais graves foram CORRIGIDOS nesta sessão** (secção A). O resto está priorizado na secção B.

---

## A. CORRIGIDO AGORA ✅ (pronto para deploy)

### Críticos
1. **painel.html — IDs das creches "extra" sem prefixo `extra_`** — o painel gravava perfis
   em `creche_profiles/<docId>` mas a app/fichas leem `creche_profiles/extra_<docId>`.
   **Tudo o que uma creche extra preenchesse nunca apareceria publicamente.** Corrigido
   para a mesma convenção do app/admin. ⚠️ *Se já aprovaste claims de creches extra,
   verifica o campo `creche_id` em `creche_managers` e nos claims (deve começar por `extra_`).*
2. **XSS no /comparar** — nome, morada, email, telefone, operador e website (dados OSM,
   editáveis por terceiros) iam para `innerHTML`/`href` sem escape; `website` aceitava
   `javascript:`. Adicionadas funções `esc()` + `safeUrl()` em todos os pontos.
3. **XSS no /app** — 5 sinks sem escape: tooltip dos markers (Leaflet = innerHTML),
   minitags de tipos (extras), `osm_url`, nome nos modais de vaga/Creche Feliz, e o CTA
   website sem validação de esquema. Todos escapados/validados.
4. **firestore.rules: `vagas` e `creche_feliz_reports`** usavam `hasAll` (campos extra
   livres) e não validavam `verificado` nem `expires_at` — qualquer anónimo podia forjar
   `verificado:true` + vaga eterna via API. Agora: `hasOnly` fechado, `verificado == false`
   obrigatório, `expires_at` timestamp ≤ 8 dias.
5. **admin.html: aprovar claim substituía `creche_managers/{uid}` às cegas** — perdia-se
   silenciosamente o acesso anterior do uid, e a mesma creche podia ganhar 2 gestores sem
   aviso. Agora: verifica ambos os casos e pede confirmação explícita.

### Altos
6. **admin: link "🌐 site" nos pedidos de creches** aceitava `javascript:` — clique do admin
   = takeover da sessão admin. Agora só renderiza `http(s)`.
7. **admin: `daily_stats.limit(60)` sem orderBy** — quando passasse 60 dias de dados, o
   dashboard mostraria os 60 dias mais ANTIGOS ("hoje" = 0 para sempre). Agora ordena desc.
8. **painel: link "Ver página pública"** usava `#id` mas a app só reconhece `#creche-id` —
   nunca abria a ficha. Corrigido.
9. **painel: mensalidade esvaziada mantinha o valor antigo** (merge) — a creche não
   conseguia apagar um preço errado. Agora usa `FieldValue.delete()` + clamp 0-3000.
10. **vercel.json: header do /sw.js era sobreposto** pela regra genérica `.js` (a última
    ganha) → service worker preso em cache 24h. Ordem corrigida.
11. **rules: `creche_interest`** não validava website/horario/mensagem (tipo/tamanho) — fechado.
12. **rules: `creche_profiles.updated_by`** falsificável — agora tem de ser o próprio uid.
13. **comparar: manifest.json → manifest.webmanifest** (404 em cada visita).
14. *(já estava feito no sw.js: não cachear respostas de erro — confirmado `res.ok`)*

---

## B2. TAMBÉM CORRIGIDO (2.ª ronda — "faz todas") ✅

- app.html: **merge convidado↔servidor no login** — favoritos locais já não se perdem
- comparar.html: **carrega overrides + creches extra do Firestore** (REST) — dados iguais à app
- comparar.html: links de creches extra vão para /app#creche-id (fichas estáticas não existem)
- admin: aprovar interesse agora é **atómico** (batch) — sem duplicados se falhar a meio
- admin: tile "reportes" conta só pendentes; editor permite **limpar campos** (FieldValue.delete)
- painel: ecrã de erro com retry (gestor já não cai no ecrã de claim); bloqueio de claims duplicados; fotos aprovadas aparecem na grelha; botão "Não sei" com cor neutra
- rules: hasOnly em feedback/creche_reports/creche_removals; valores limitados em daily_stats e creche_views (anti-inflação de métricas)
- ~~FEITO~~ cookies.js: revogar consentimento desliga o GA e apaga cookies _ga* (RGPD)
- ~~FEITO~~ newsletter.js: self-XSS no eco do email corrigido
- calculadora: rendimento negativo bloqueado
- compare.js: sincronização da barra entre tabs
- .vercelignore: *.rules; vercel.json: X-Frame-Options DENY em /admin e /painel

## B. PENDENTE — priorizado (residual)

### 🔴 Alta prioridade (próxima sessão)
- ~~FEITO~~ **app.html: perda de dados no login** — o doc do servidor substitui favoritos/pipeline
  criados como convidado na sessão; e `set()` sem merge = last-write-wins entre 2 tabs/
  dispositivos. Fix: merge por creche + bloquear saves até load resolver. (app.html ~l.900-927)
- ~~FEITO~~ **comparar.html usa creches_pt.json desatualizado** (maio, 2.591 crus) — idades/tipos
  divergem da app, sem overrides, sem Creche Feliz, extras quase vazias. Fix estrutural:
  regenerar o JSON no pipeline a partir do dataset limpo + overrides.
- ~~FEITO~~ **Links de partilha/ficha para creches extra** — `id.replace(/\D/g,"")` produz slugs
  errados (`extra_aB3` → "3"); e `osm-node-123` vs `osm-way-123` colidem. Precisa de novo
  formato de slug + resolver.
- **Rate-limiting real nos reports** — localStorage é contornável; considerar Firebase
  App Check + limites por uid nas rules.

### 🟡 Média
- app.html: filtro "Com vaga" mostra creches sem badge (fontes inconsistentes entre filtro e render)
- app.html: overrides não se aplicam a extras; override de tipo não recalcula idades
- app.html: recria 2.600 markers a cada tecla (perf) — cache de markers + diff
- app.html: leitura integral de 4 coleções por visita + retries infinitos sem Firebase
- ~~FEITO~~ admin: `approveInterest` não-atómico (duplicados se falhar a meio) — usar batch
- ~~FEITO~~ admin: métricas reports/removals contam resolvidos; contadores não refrescam após ações
- ~~FEITO~~ admin/painel: editor não permite limpar campos (payload apaga vazios em vez de FieldValue.delete)
- ~~FEITO~~ painel: erro de leitura no arranque manda gestor aprovado para o ecrã de claim (criar ecrã de erro)
- ~~FEITO~~ painel: fotos aprovadas desaparecem da grelha até reload (PROFILE stale)
- ~~FEITO~~ rules: `daily_stats`/`creche_views` sem validar incrementos (métricas infláveis)
- **CSP + X-Frame-Options em falta** no vercel.json (defesa em profundidade; exige mexer
  nos inline scripts — planear com calma)
- api/notify.js: from `onboarding@resend.dev` → verificar domínio creches.app no Resend
- ~~FEITO~~ cookies.js: revogar consentimento não desliga o GA na sessão (RGPD)

### 🟢 Baixa
- ~~FEITO~~ newsletter.js: self-XSS no eco do email (usar textContent)
- ~~FEITO~~ calculadora: agregado "4+" trata 5-6 pessoas como 4; rendimento negativo aceite
- ~~FEITO~~ compare.js: sem sync entre tabs (listener storage)
- ~~FEITO~~ painel: botão "Não sei/Em processo" fica verde como o "Sim" (cosmético)
- admin: "Visitas 7 dias" soma 8 dias; datas em UTC (off-by-one à meia-noite)
- ~~FEITO~~ rules: `feedback`/`creche_reports`/`creche_removals` sem hasOnly
- ~~FEITO~~ .vercelignore: adicionar `*.rules` (storage.rules fica exposto no site)
- app.html: highlightTerm pode partir entidades HTML; dedup dataset↔extras inexistente

### ✅ Confirmado seguro
- Escalada de privilégios fechada (admins write:false; managers só via admin)
- Sem índices compostos em falta (nenhuma query where+orderBy cruzado)
- Geolocalização/Nominatim com erros bem tratados
- notify.js sem segredos hardcoded (env vars corretas)
- XSS no admin (claims/fotos/newsletter/reports) — tudo escapado

---

## Deploy

As correções da secção A exigem:
1. `firebase deploy --only firestore:rules` (regras mudaram!)
2. `./deploy.sh "fix: revisão de código — 14 correções críticas/altas (Onda 37)"`
3. Testar: /comparar (dados renderizam), /app (tooltips, popup, reportar vaga),
   /painel (claim de creche extra → perfil aparece na ficha), /admin (aprovar claim
   com os novos avisos)
