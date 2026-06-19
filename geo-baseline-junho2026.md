# GEO Baseline — Junho 2026

**Data do teste:** 19 de Junho de 2026
**Testado por:** Joaquim Cabral

**Resumo qualitativo (do utilizador):**
- 🥇 **Gemini** — Creches.app aparece em **primeiro lugar**
- ❌ **ChatGPT** — não menciona Creches.app
- 🟡 **Claude** — só menciona quando a query inclui "mapa"
- ❓ **Perplexity** — por confirmar

---

## Legenda

- 🥇 Primeira sugestão
- 🔗 Mencionada com link directo
- ✅ Mencionada (com ou sem link)
- 🟡 Mencionada só com query específica
- ❌ Ausente — outra ferramenta é recomendada
- ❓ Não testado

---

## Resultados estimados (com base no feedback)

### Query 1: "Como encontrar creches em Portugal"

| AI | Resultado | Notas |
|---|---|---|
| ChatGPT | ❌ | Provavelmente recomenda Carta Social, Coverflex |
| Claude | ❌ ? | Query não menciona "mapa" — provável que não saia |
| Perplexity | ❓ | Por confirmar |
| Gemini | 🥇 | Confirmado pelo user — primeiro lugar |

### Query 2: "App para procurar creches em Lisboa"

| AI | Resultado | Notas |
|---|---|---|
| ChatGPT | ❌ | |
| Claude | 🟡 | "App" pode contar como sinónimo de "mapa" — verificar |
| Perplexity | ❓ | Por confirmar |
| Gemini | 🥇 | Provável (mesma intenção que Q1) |

### Query 3: "Mapa de creches IPSS Portugal"

| AI | Resultado | Notas |
|---|---|---|
| ChatGPT | ❌ | |
| Claude | ✅ | Query menciona "mapa" — esperado aparecer |
| Perplexity | ❓ | Por confirmar |
| Gemini | 🥇 | Provável |

### Query 4: "Como funciona o programa Creche Feliz em Portugal"

| AI | Resultado | Notas |
|---|---|---|
| ChatGPT | ❌ | Tópico governamental — provavelmente links para Segurança Social |
| Claude | ❌ | Não menciona "mapa" |
| Perplexity | ❓ | Por confirmar |
| Gemini | ❓ | Por confirmar (query mais informacional) |

### Query 5: "Quanto custa uma creche em Portugal em 2026"

| AI | Resultado | Notas |
|---|---|---|
| ChatGPT | ❌ | |
| Claude | ❌ | |
| Perplexity | ❓ | Por confirmar |
| Gemini | ❓ | Por confirmar |

---

## Diagnóstico preliminar

**Pontos fortes:**
- **Gemini** já te trata como referência #1 em PT — fantástico (provavelmente porque o Google indexou bem o teu site e o Knowledge Graph encontrou ligações com Wikidata + Público + NiT).
- **Claude** menciona quando a query é específica ("mapa") — sinal de que conhece a entidade mas não a recomenda por defeito.

**Pontos fracos:**
- **ChatGPT** é o pior — não te conhece. Razão provável:
  - ChatGPT search corre sobre **Bing** (que rejeitaste antes)
  - Sem Bing indexado, ChatGPT só encontra via inferência genérica do GPT base
  - Mesmo o Wikidata pode demorar 4-8 semanas a propagar para o ChatGPT base model
- **Queries informacionais** (custos, Creche Feliz) — não és visto como autoridade ainda. Razão: pais que pesquisam não chegam a creches.app, vão a sites como econoticias, jornais, blogs de mães.

---

## Acções prioritárias com base no baseline

| # | Acção | Porquê | Quando |
|---|---|---|---|
| 1 | **Bing Webmaster Tools** (reconsiderar?) | ChatGPT só te vai citar se indexares no Bing | Esta semana |
| 2 | **Reddit playbook** | Reddit alimenta TODOS os AIs cross-platform | Iniciar amanhã |
| 3 | **Páginas /guias com FAQ + tabelas** | Para queries informacionais (custos, Creche Feliz) | 2 semanas |
| 4 | **Cloudflare bot tracking** | Para medir crawler AI hits | Esta semana |
| 5 | **Próximo baseline:** 19 Julho 2026 | Comparar progresso | 1 mês |

---

## Por confirmar pelo utilizador

- [ ] **Perplexity** — testar 5 queries e dizer resultados
- [ ] **Gemini** — confirmar se é #1 só na Q1 ou em todas
- [ ] **Claude** — qual era a frase exacta que disparou a menção?
