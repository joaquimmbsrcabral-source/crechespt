# Creches.app — Estado actual + Próximos passos
**22 Junho 2026** · 25 ondas completas · 69 melhorias implementadas

---

## 📊 Onde estamos hoje

| Dimensão | Antes | Hoje | Δ |
|---|---:|---:|---|
| Design visual | 5/10 | **9/10** | +4 ⬆ |
| UX flows | 6/10 | **9/10** | +3 ⬆ |
| Performance | 4/10 | **8/10** | +4 ⬆ |
| Acessibilidade | 5/10 | **8/10** | +3 ⬆ |
| Mobile | 6/10 | **9/10** | +3 ⬆ |
| Confiança | 8/10 | **8/10** | = |
| **Média ponderada** | **6.8/10** | **8.6/10** | **+1.8** |

**Dataset:** 2.855 creches (de 2.585 — **+270** via Carta Social oficial 24 jun)
**SEO pages:** 2.578 fichas + 156 concelhos + 104 categorias + 20 distritos + 1 calculadora = **2.859 pages indexadas**

---

## ✅ O QUE JÁ ESTÁ FEITO (25 ondas)

### 🎨 Visual / Design
- ✅ Header unificado em **100% das páginas** (8 top-level + 156 concelhos + 2578 fichas)
- ✅ **Ficha de creche redesenhada** com hero gradient por tipo, avatar emoji 96px, 4 CTAs grandes
- ✅ Popup `/app` redesenhado **igual às fichas estáticas** (consistência visual total)
- ✅ Pills coloridos por tipo (IPSS turquesa · Pública verde · Privada coral · ?cinza)
- ✅ Cards `/guias` com 4 cores por categoria
- ✅ Headline emocional na home ("Encontra creche sem perder a cabeça")
- ✅ Banner cookies compacto em mobile
- ✅ Página `/404` branded

### 📱 UX / Mobile
- ✅ Onboarding **skip-by-default** (mãe vê mapa imediatamente)
- ✅ Filtros **colapsados por defeito** (zero cognitive overload inicial)
- ✅ Default mobile = **lista** (não mapa, mais simples)
- ✅ `mob-toggle` com glow ring + pulse animation
- ✅ Botão "✓ Ver X creches ↓" no fundo dos filtros (contagem dinâmica)
- ✅ Filtros fecham automaticamente após "Procurar" + scroll para lista
- ✅ Pill "📮 A partir de [endereço]" confirma localização
- ✅ Banner "Em breve vagas" escondido em mobile (era distractivo)
- ✅ 4-5 CTAs grandes no popup (📞 ✉ 🌐 🗺 💬)
- ✅ Tracking colapsado sob `<details>` (foco em contactar, não admin)
- ✅ **Botão "💬 Partilhar"** WhatsApp/Web Share API em fichas + popup

### 🚀 Performance / Técnico
- ✅ CSS extraído `/app.css` (43KB cacheável 1 dia + SWR)
- ✅ Preconnect + dns-prefetch (unpkg, gstatic, firestore)
- ✅ Cache headers vercel.json (.js/.css/.png/fichas)
- ✅ HSTS strict-transport-security (1 ano)
- ✅ Console.warn protegido por __DEV__
- ✅ viewport `maximum-scale=5` removido (WCAG 1.4.4 fix)
- ✅ focus-visible global
- ✅ `lang="pt-PT"` em 284 ficheiros
- ✅ ARIA labels nos botões

### 🔍 SEO / Conteúdo
- ✅ **FAQPage JSON-LD** em todas as 2.578 fichas (rich snippets)
- ✅ Schema WebApplication no `/app` (com Wikidata sameAs)
- ✅ Sitemap completo + cache headers correctos
- ✅ **Página /calculadora** (novo target SEO + ferramenta útil)
- ✅ llms.txt + llms-full.txt (AI visibility)
- ✅ Página /sobre/metodologia com Dataset schema
- ✅ TOC sticky nos guias longos (35 H2s slugified)
- ✅ Mid-page CTAs nos guias
- ✅ TL;DR no /guias/creche-feliz
- ✅ Exemplo Braga/Coimbra no /quanto-custa

### 📊 Dados
- ✅ **Carta Social aplicada** (270 novas creches + 28 enrichments)
- ✅ Filtro Escolas Básicas (13 removidas)
- ✅ Capitalize concelhos (LISBOA → Lisboa, Title Case PT)
- ✅ Esconder lixo (Inactivo, Datacool, ≤3 chars)
- ✅ Algoritmo idades v4 (Desconhecido <10%)
- ✅ Reclassificação tipo (Pública/IPSS/Privada)
- ✅ Integração Creche Feliz (campo + badge + filtro)

### 🗞 Imprensa / Marketing
- ✅ Press Kit `/imprensa` com 6 cards
- ✅ Wave 4 imprensa: 21 drafts com **emails REAIS** verificados (Expresso, MAGG, Observador, Time Out, etc.)
- ✅ Pack 1 Instagram (post + reel) **publicados**
- ✅ Pack 2 Instagram (4 prompts Gemini prontos)
- ✅ Press Release reutilizável
- ✅ Press Kit PDF actualizado

### 💼 Admin / Backend
- ✅ Override layer (correções sem deploy)
- ✅ Emails automáticos (aprovar report/creche notifica autor)
- ✅ Form /para-creches: 11 → 4 campos obrigatórios
- ✅ Editor universal de creches
- ✅ Reports expandidos (telefone, encerrada, idade, outra)
- ✅ Multi-tipo + fix filtros operador

---

## ⏳ O QUE FALTA — Prioridades

### 🔴 ALTA PRIORIDADE (esta/próxima semana)

| # | Tarefa | Esforço | ROI |
|---|---|---|---|
| 1 | **Enviar Wave 4 imprensa** (21 drafts prontos) | 1-2h tuas | 🔥🔥🔥 |
| 2 | **Foto real do Joaquim** (precisa upload teu) | 5 min teus | 🔥🔥 |
| 3 | **Postar Pack 2 Instagram** (4 posts ao longo de 10 dias) | 10 min/post | 🔥🔥 |
| 4 | **Auditoria das 270 creches novas** (dados suspeitos) | 30 min nossa | 🔥 |
| 5 | **Outreach Instagram parenting** (5 DMs) | 1h tua | 🔥🔥 |

### 🟡 MÉDIA PRIORIDADE (próximas 2-3 semanas)

| # | Tarefa | Esforço | Notas |
|---|---|---|---|
| 6 | **Tabs Mapa/Em processo/Favoritas** em vez de filtros | 4h | Reduz overload no /app |
| 7 | **Comparador lado-a-lado** (2-3 creches) | 3 dias | Diferenciador chave |
| 8 | **Reviews de pais nas fichas** | 1-2 dias | Eleva acima Carta Social |
| 9 | **Press Kit ZIP num clique** | 1h | Reduz fricção jornalistas |
| 10 | **Refactor /app — extrair JS** | 4h | CSS já feito; JS arriscado |
| 11 | **Paginação distritos** (50/página) | 2h | Lista interminável fica grande agora |

### 🟢 BAIXA PRIORIDADE (quando der)

| # | Tarefa | Esforço | Notas |
|---|---|---|---|
| 12 | **Páginas /en/ para expats** | 1 semana | ~50k expats em Lisboa |
| 13 | **Roadmap com voto público** | 4h | Engagement |
| 14 | **Newsletter setup mais sério** | 2 dias | Já capturas emails |
| 15 | **Vagas em tempo real (full)** | 1-2 meses | Em curso 40% |
| 16 | **Vídeo 60s no /sobre** com voz Joaquim | 1h | Eleva confiança |
| 17 | **App PWA com push notifications** | 1 semana | "Vaga aberta em X!" |
| 18 | **Comparativo com CrecheFácil** público | 2h | Posicionamento |

---

## 🎯 Recomendação: próximas 3 ondas

### **Onda 26 — Auditoria das 270 creches novas** (30 min)
Antes que apareçam reports de pais, varrer as 270 novas (Carta Social) para detectar:
- Nomes com lixo ("Lda", "Casa-Mãe", etc.)
- Telefones em formato errado
- Coordenadas suspeitas (fora de Portugal)
- Duplicados com fichas existentes
- Idades mal classificadas

Output: lista de fixes prioritários no /admin.

### **Onda 27 — Comparador de creches (MVP)** (3 dias)
Feature decisiva: utilizadores marcam 2-3 creches → tabela compara
preço, idades, horário, contactos, distância. Lock-in feature massivo.

```
┌──────────────┬─────────────┬─────────────┐
│              │ Casa Amarela│ Sol Nascente│
├──────────────┼─────────────┼─────────────┤
│ Tipo         │ IPSS        │ Privada     │
│ Idades       │ 3-6 anos    │ 0-3 anos    │
│ Mensalidade  │ ~180€       │ ~450€       │
│ Distância    │ 350m        │ 1.2km       │
│ Telefone     │ 21 xxx xxxx │ 21 xxx xxxx │
│ Email        │ ✓           │ ✗ (em falta)│
└──────────────┴─────────────┴─────────────┘
```

Sticky bar no fundo: "✓ Marcaste 2 creches · Comparar →"

### **Onda 28 — Reviews de pais nas fichas** (1-2 dias)
Sistema light de reviews (estrelas 1-5 + texto curto + idade do filho).
- Firebase Auth já feito
- Mostrar apenas reviews aprovadas (moderação no /admin)
- Posicionamento "transparente": "Não somos TripAdvisor, somos pais a partilhar"

---

## 🚀 Movimento estratégico — 4 semanas

```
Semana 1: Wave 4 imprensa enviada + Pack 2 IG publicado
          + Auditoria 270 novas (Onda 26)
Semana 2: Tabs Mapa/Processo/Fav + Press Kit ZIP
          + Foto real Joaquim
Semana 3: Comparador (Onda 27) MVP
Semana 4: Reviews de pais (Onda 28) MVP
```

**Resultado:** app de 8.6/10 → **9.5/10** + dataset diferenciador (reviews +
comparador) que nem a Carta Social oficial tem.

---

## 📈 KPIs a monitorizar semanalmente

1. **Visitas únicas / dia** (Cloudflare Analytics)
2. **Pedidos `/para-creches`** (admin)
3. **Reports de pais** (admin) — sinal de uso real
4. **Newsletter signups** (admin)
5. **Share button clicks** (adicionar tracking?) — Onda 25
6. **Top distritos** vistos
7. **Conversion rate**: visitas → uso real (favoritar, partilhar, ligar)

Sugestão: **dashboard /admin/stats** semanal que mande email Joaquim.

---

## 💡 Estratégia macro

O produto deixou de ser **directorio (Carta Social oficial faz isso)**
para ser **plataforma de decisão (calculadora + reviews + comparador +
partilha)**. Esse é o moat.

- **Carta Social** = lista oficial estática
- **CrecheFácil** = lista + inscrição paga
- **Creches.app** = **decidir + partilhar + acompanhar** (gratuito)

Essa é a posição defensável. Cada onda futura deve perguntar:
"Isto aproxima-nos de ser a plataforma de decisão?"
