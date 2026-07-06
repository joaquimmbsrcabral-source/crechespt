# 🔍 Audit completo + Plano de melhorias — 6 Julho 2026

**Contexto:** Fable 5 fez 6 commits grandes (Ondas 33-34: painel das
creches + PWA + cleanup do repo). Este documento consolida o
estado técnico e propõe o próximo caminho.

---

## 🚨 BUG CRÍTICO — atacar HOJE

### Firebase projects DIFERENTES entre fichas e painel

**O que se passa:**

| Onde | Firebase project | Chave |
|---|---|---|
| Fichas estáticas (×2.578), app.html, admin | `creches-pt` | `AIzaSyDjs9ZmZS...` |
| **`painel.html`** (NOVO) | `crechespt` | `AIzaSyCOGTFg5...` |

**Consequência:** o `perfil-creche.js` que injecta o cartão verde
"✓ INFORMAÇÃO DA CRECHE" nas 2.578 fichas **NUNCA vai encontrar
dados** do painel, porque as fichas leem do `creches-pt` e o
painel escreve para `crechespt` — são projectos Firebase distintos.

Ou seja: uma creche pode reclamar o perfil, preencher tudo, mas
os pais nunca verão essas informações na ficha pública.

**Como corrigir (2 opções):**

**Opção A — Uniformizar para o project antigo `creches-pt`** ⭐
Recomendado (não precisas reindexar dados existentes):
1. Editar `painel.html` linha 249: substituir a config Firebase
   pelo bloco usado em `app.html`
2. Editar `admin.html` — verificar se o Fable 5 aplicou também
   uma config nova
3. Deploy
4. Se já houve criações no `crechespt`, exportar e importar para
   `creches-pt`

**Opção B — Uniformizar para `crechespt`** (mais trabalho):
- Migrar todos os dados de `creches-pt` (users, overrides, extras,
  vagas, etc.) para `crechespt`
- Regenerar 2.578 fichas com a config nova
- Ajustar 8 ficheiros JS

**Verifica primeiro qual é o project real activo:**
1. Firebase Console → confirma qual dos 2 projectos tens
   documentos escritos
2. Se ambos tiverem dados → decide qual manter, migra o outro

---

## 📊 O que o Fable 5 fez (resumo)

### 🆕 Onda 34 — Painel das Creches

- **`/painel`** — auth Google/email + fluxo de claim (pesquisa →
  pedido → aprovado) → dashboard onde a creche pode gerir:
  - Vagas por idade (berçário / 12m / 24m)
  - Creche Feliz on/off
  - Descrição até 1500 chars
  - Horário, mensalidades min/max, contactos, website
  - Upload de fotos
- **`admin.html` +100 linhas** — moderação de claims e fotos
- **`perfil-creche.js`** — injecta cartão verde nas 2.578 fichas
- **`firestore.rules` 261 linhas** — regras para `creche_claims`,
  `creche_managers`, `creche_profiles`, `creche_fotos`
- **`storage.rules`** novo — upload seguro, 5MB max, só imagens

### 🌐 Onda 33 — PWA + Higiene

- **`sw.js`** — service worker network-first + SWR
- **`offline.html`** — fallback branded
- **`.vercelignore`** — corrige exposição pública de `.md`, `.py`,
  drafts, ficheiros CONFIDENCIAL
- **`.well-known/security.txt`** — RFC 9116
- **Cleanup dos 903 ficheiros "* 2.html" duplicados** em `/creche/`
  (3.481 → 2.578)
- **`manifest.webmanifest`** actualizado

### 🔧 Fixes admin
- Contagem real de utilizadores via REST API
- Admin dashboard à prova de falhas no `count()`
- Pesquisa do painel inclui creches novas

---

## 📏 Estado técnico actual

| Métrica | Valor |
|---|---|
| Total HTML | 2.886 |
| Fichas `/creche/` | **2.578** (média 32.8 KB) |
| Páginas concelho/distrito | 279 |
| Guias | 5 |
| `app.html` | **3.337 linhas / 396 KB** ⚠ ainda grande |
| `admin.html` | 2.007 linhas / 96 KB |
| `painel.html` | 537 linhas / 32 KB |
| Total JS libs | 8 |
| Dataset | 2.591 registos em `creches_pt.json` |
| Repo size | 452 MB |

---

## ⚡ Onda 35 — Quick wins técnicos (2-3h)

### 1. 🐛 [CRÍTICO] Uniformizar Firebase config
Descrito acima. **Atacar primeiro.**

### 2. 🧹 `sw.js` precache de asset inexistente
Linha 13 pede `/app.css` que não existe (CSS está inline). Remover.
Sem isto, o SW falha o install silenciosamente.

### 3. 🧹 Console.log em produção
- `app.html:3146` — "Creche Feliz reports activos:"
- `app.html:3237` — "Vagas activas carregadas:"

Passar por `_w()` (o wrapper `__DEV__` já existe em `app.html:826`).

### 4. 🔧 Firebase SDK inconsistente
Fichas usam v10.7.0, painel/admin usam v10.13.2. Padronizar em
v10.13.2 (mais recente + segurança).

### 5. 🗑 Ficheiros órfãos navegáveis
`stats-test.html`, `test-stats.html`, `gmail-drafts-*.html`,
`instagram-dms-wave1.html`, `Assinatura-Gmail-Creches.html` —
confirmar se `.vercelignore` cobre todos, senão adicionar.

**Total esforço:** 2-3 horas · **Impacto:** grande (bug crítico
resolvido, saúde do código)

---

## 🎯 Onda 36 — Features de médio prazo (1-2 dias cada)

### 1. Perfil da creche no popup do `/app`
O `perfil-creche.js` só injecta na ficha estática. Adaptar para o
popup em `app.html` — significa que quem entra pelo mapa (a
maioria) também vê o perfil rico da creche.

### 2. Email automático ao aprovar claim
Em `admin.html` o `batch.set(creche_managers/...)` não notifica
ninguém. Adicionar Gmail compose URL (padrão já usado) — ao
aprovar, abre draft com "Parabéns, o teu painel está activo:
https://creches.app/painel"

### 3. Analytics para a creche
Adicionar ao `/painel` widget "visualizações da ficha esta semana":
- Reusar `daily_stats` já existente
- Filtrar por `creche_id`
- Gráfico simples de 7 dias

### 4. Bulk approval no `/admin`
Quando chegar volume, aprovar claim + fotos uma-a-uma não escala.
Multi-select + botão "Aprovar seleccionados".

### 5. Dashboard mais rico para creche
- "Últimos pais que ligaram" (tracking Click on 📞)
- Comparação de posição vs concorrência no mesmo concelho
- Sugestão de features a preencher para aumentar visibilidade

**Total esforço:** 5-10 dias · **Impacto:** grande em retenção
das creches

---

## 🏗 Onda 37+ — Refactorings maiores (dias)

### 1. Extrair CSS inline do `app.html`
396 KB carregado em cada visita. Um `app.css` separado + cache
imutável no `vercel.json` corta ~200 KB do first paint. Ganho
grande em mobile.

Já tentámos antes mas foi complicado — vale a pena revisitar
agora que temos `sw.js`.

### 2. Modularizar `app.html` (3.337 linhas)
Separar em módulos com ES modules:
- `map.js` (Leaflet + markers)
- `filters.js`
- `popup.js`
- `share.js`
- `vagas-app.js`
- `feliz-app.js`

**Ganho:** manutenção 10× mais fácil, deploy incremental
possível, debug muito mais rápido.

### 3. Migrar geração de fichas para Edge Function
2.578 × 32.8 KB = 90 MB no repo. Cada correcção obriga a regerar
tudo. Solução: template + JSON leve + Edge Function no Vercel
que renderiza on-the-fly. Cache 1 dia.

**Ganho:** correcções instantâneas, deploy 20× mais rápido, repo
tem 5% do tamanho actual.

**Risco:** perder SEO se implementado mal. Testar com 10 páginas
primeiro.

**Total esforço:** 10-15 dias · **Impacto:** transformador para
escalabilidade

---

## 💀 Dívida técnica identificada

| Item | Ficheiro | Ação |
|---|---|---|
| Firebase config duplicada em 2.582 ficheiros | 2.578 fichas + app.html + admin + painel | Extrair para `/firebase-config.js` central |
| Firebase init sem check `firebase.apps.length` | `painel.html:251` | Adicionar guard |
| Passos manuais não automáticos | `SETUP-PAINEL-CRECHES.md` | Cloud Function ou setup script |
| Ficheiros grandes no git | `.mp4`, `.pptx`, `.docx` | Considerar `git lfs` ou mover para `~/CrechesPT-interno/` |
| Task list stale | tasks #53-67 (calendário Junho) | Marcar completed ou remove |
| CONFIDENCIAL-*.md no repo | 5 ficheiros | Mover para pasta local externa |

---

## 🎯 Plano de execução recomendado

### Esta semana (~3h)
- ✅ **Onda 35 completa** (quick wins técnicos)
  - Priorizar bug do Firebase config (1h)
  - Depois console.logs (10 min)
  - Depois SDK unificação (30 min)
  - Depois cleanup órfãos (30 min)

### Próxima semana (~2 dias)
- ⚡ **Onda 36 features 1 e 2** (perfil popup + email automático)
  - São as que mais alavancam o Painel das Creches
  - Multiplicam o valor do trabalho do Fable 5

### Próximas 2 semanas
- 🚀 **Onda 36 features 3, 4, 5** (analytics, bulk approval,
  dashboard rico)
- Começar a discussão do refactor CSS/JS do `/app` (Onda 37)

### Q3 2026 (Fundação)
- Se o financiamento avançar, contratar Dev Senior para:
  - Refactor `/app` (extrair CSS/JS)
  - Modularizar admin
  - Migrar geração de fichas para Edge Function
  - Setup CI/CD com tests

---

## 🎯 Sugestão imediata

Começa pela **investigação do Firebase project bug** —
literalmente 15 min para descobrir se há dados a serem escritos
para o project errado (e portanto perdidos).

1. Abre Firebase Console
2. Confirma quais projectos tens (`creches-pt` vs `crechespt`)
3. Se ambos tiverem dados:
   - Qual é o "principal"?
   - Migrar o outro
4. Se só um tiver dados:
   - Uniformizar toda a config para esse
   - Deploy

Diz-me o que descobrires e ataco isto contigo. 🍼

---

## 📈 Métricas de sucesso do Painel das Creches

Depois de resolver o bug, medir semanalmente:

1. **Claims recebidas** (creche_claims onde status=pending)
2. **Claims aprovadas** (creche_claims onde status=approved)
3. **Perfis publicados** (creche_profiles docs)
4. **Fotos aprovadas** (creche_fotos onde approved=true)
5. **Vagas reportadas por creches vs pais** (ratio)
6. **Fichas com badge "✓ INFORMAÇÃO DA CRECHE"** (contar quando bug
   estiver fixed)

Meta 30 dias: 20 claims aprovadas, 10 perfis completos, 30 vagas
reportadas por creches.
