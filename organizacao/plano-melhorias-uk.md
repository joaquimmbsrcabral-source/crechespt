# Plano de melhorias — o que aprender com o daynurseries.co.uk

**Data:** 26 de julho de 2026
**Método:** mapeámos o funil completo dos dois produtos — o deles (site, documentação pública de suporte, API, páginas reais de creche) e o nosso (código real: `app.html`, `perfil-creche.js`, `painel.html`, `candidatura.html`, `api/*`, `firestore.rules`, `scripts/gerar_fichas.py`).

Cada melhoria tem **número**, esforço e impacto, para escolheres por número.

**Legenda de esforço:** 🟢 pequeno (≤1 dia) · 🟡 médio (2–5 dias) · 🔴 grande (1–3 semanas)
**Legenda de impacto:** ⭐ marginal · ⭐⭐ notável · ⭐⭐⭐ estrutural

---

## Parte 1 — Os dois funis lado a lado

### Funil do pai no daynurseries.co.uk

| Fase | O que existe |
|---|---|
| **Descobrir** | Pesquisa por localidade, nome da creche, nome do grupo, nome do diretor. Filtros: com vagas · nota ≥9.5 · vencedoras de prémios · com reviews · com vídeo · com tour virtual 360° · a abrir em breve. |
| **Comparar** | Ficha com fotos, vídeo, tour 360°, descrição, "conhecer a equipa", horários dia-a-dia, capacidade registada, faixa etária exata (anos+meses), **estimador de mensalidade**, brochura PDF, notícias da creche, prémios. |
| **Guardar** | Shortlist · shortlists guardadas (várias) · creches vistas recentemente. Conta gratuita. |
| **Contactar** | **6 tipos de pedido distintos**: pedido geral · pedido de brochura · pedido de vaga ("care enquiry") · marcação de visita presencial · marcação de visita remota · pedido de emprego. |
| **Dados do pedido** | Data de nascimento da criança (data real), data de início pretendida, comentário, "queres visita? sim/não", e para visitas: data + hora + tipo. |
| **Depois** | A creche recebe por email e no portal. Avisam o pai que a hora da visita **ainda não está confirmada** — a creche tem de confirmar. |
| **Avaliar** | Depois de frequentar, o pai deixa review em **12 categorias**. |

### Funil do pai no creches.app (hoje)

| Fase | O que existe |
|---|---|
| **Descobrir** | Morada/GPS, nome, distrito, concelho, idade, tipo (Pública/IPSS/Privada), valência, com vaga, aderentes, Creche Feliz, área desenhada no mapa. Ordenação: nome (default), distrito, distância, estado, prioridade. |
| **Comparar** | Ficha com morada, contactos, tipo, faixa etária, operador, mapa. Fotos/mensalidade/horário/capacidade **só nas creches aderentes**. Comparador de até 3 creches com mensalidade *estimada por heurística*. |
| **Guardar** | Favoritos + pipeline pessoal (7 estados, prioridade, notas) — mas **em localStorage**. Sync opcional se fizer login. |
| **Contactar** | **1 tipo de pedido**, e só existe em creches aderentes. Nas restantes: `tel:` e `mailto:`. |
| **Dados do pedido** | Nome, email, telefone, faixa etária (não data), mês de entrada (texto livre), mensagem, RGPD. |
| **Depois** | Link privado `/candidatura?c=token` com 3 passos em tempo real. Um link por lead. |
| **Avaliar** | Não existe. |

### As 3 fugas maiores do nosso funil

1. **O botão de contacto só existe nas creches aderentes.** Numa creche não-aderente (a esmagadora maioria das 2.591) o pai sai da app para o telemóvel/email e nós perdemos tudo — o lead, o estado, a candidatura acompanhada, os emails de follow-up, a estatística. É a fuga número um.
2. **A ordenação por defeito é alfabética.** Não por relevância, distância, vaga, ou qualidade. Uma creche chamada "A Abelhinha" ganha sempre à melhor creche a 300 metros.
3. **Recolhemos sinal de qualidade e deitamo-lo fora.** O `creche_stats` (respostas sim/não dos pais ao email "a creche respondeu-te?") já é escrito, já tem leitura pública nas regras — e **nenhum ficheiro do site o lê**.

---

## Parte 2 — Melhorias numeradas

### Bloco A — Tapar a fuga do funil (o mais urgente)

**1. Botão "Tenho interesse" em TODAS as creches** 🟡 ⭐⭐⭐
Hoje só aparece em creches com `creche_profiles`. Passa a aparecer sempre. Para as não-aderentes, o `api/lead-notify.js` já sabe ir buscar o email ao dataset público (`emailDoDataset()`) — a infraestrutura já existe, falta expor o botão. Ganho: o lead entra no sistema, o pai recebe acompanhamento, a creche recebe um convite implícito para aderir.

**2. Segundo tipo de pedido: "Quero visitar"** 🟡 ⭐⭐⭐
O daynurseries diz explicitamente que *"as marcações de visita geram os nossos leads mais fortes — quem marca visita precisa de creche em breve e converte mais"*. Adiciona um botão distinto que recolhe data e período preferidos, com o aviso honesto "esta hora ainda não está confirmada — a creche vai confirmar contigo".

**3. Data de nascimento real em vez de faixa etária** 🟢 ⭐⭐
Hoje pedimos "0-12 meses / 1-2 anos…". Eles pedem a data. Com a data sabemos exatamente quando a criança entra em cada valência, podemos avisar antecipadamente, e a creche sabe logo se cabe na sala.

**4. Data de início estruturada em vez de texto livre** 🟢 ⭐⭐
Hoje é um campo de texto ("Ex.: Setembro 2026"). Passa a mês+ano em select. Torna o dado agregável — e permite responder à pergunta que vale ouro: *"quantas famílias procuram vaga em Setembro no concelho X?"*

**5. Reaproveitar os dados da criança entre pedidos** 🟢 ⭐⭐
Hoje o pai reescreve tudo em cada creche. Guardar em localStorage/conta e pré-preencher. Reduz o atrito de contactar a 2ª, 3ª e 4ª creche — que é exatamente o comportamento que queremos.

**6. Candidatura múltipla: "enviar às 5 creches selecionadas"** 🟡 ⭐⭐⭐
Nenhuma plataforma europeia que vimos faz isto bem. Seria a nossa diferenciação real: o pai escolhe 5, preenche uma vez, e nós enviamos 5 pedidos personalizados. Muito forte para comunicação e imprensa.

---

### Bloco B — Ordenação e relevância (barato, grande efeito)

**7. Mudar a ordenação por defeito** 🟢 ⭐⭐⭐
Alfabética → distância quando há morada/GPS (já acontece), e "relevância" quando não há. Uma linha de código com impacto real na experiência.

**8. Criar um "Score de ficha" (qualidade dos dados)** 🟡 ⭐⭐
Pontuação interna 0–100 por creche: tem contactos verificados? tem perfil gerido? tem fotos? tem vaga recente? tem mensalidade? Usar para ordenar e para saber onde o agente de enriquecimento deve atacar.

**9. Publicar as regras de ordenação** 🟢 ⭐⭐
Eles publicam o algoritmo exato ("Platinum = 11+1 pontos, review score = pontos"). Nós podemos ir mais longe e prometer o oposto: *"nenhuma creche pode pagar para subir nos resultados"*. É um compromisso que reforça a promessa de neutralidade da apresentação à Fundação.

**10. Filtro por raio em km** 🟢 ⭐
Hoje só existe polígono desenhado à mão. Um "até 3 / 5 / 10 km" é o que as pessoas esperam.

**11. Filtro "preciso de vaga em [mês]"** 🟡 ⭐⭐
Combina com a melhoria 4. Ninguém em Portugal oferece isto.

**12. Guardar pesquisas com alerta** 🟡 ⭐⭐
Já temos alertas por creche (`vaga_alerts`). Falta "avisa-me se abrir vaga em qualquer creche a 3 km de casa" — muito mais útil, e multiplica a base de emails.

---

### Bloco C — Confiança e prova social

**13. Expor a taxa de resposta que já recolhemos** 🟢 ⭐⭐⭐
`creche_stats` já tem `respostas_sim`/`respostas_nao`/`respostas_total` e já tem leitura pública. Mostrar nas fichas: *"9 em 10 famílias que contactaram esta creche receberam resposta"*. **Custo quase zero, sinal enorme.** Só mostrar acima de um mínimo de respostas (ex.: ≥5) para não ser injusto.

**14. Sistema de avaliações de pais** 🔴 ⭐⭐⭐
É a joia da coroa deles: 257 mil reviews, e é o que gera 90% do domínio da categoria. Modelo a copiar:
- Só pais/tutores de crianças que frequentam ou frequentaram
- Várias categorias, não uma nota só (eles usam 12: experiência global, aprendizagem, cuidado, equipa, direção, segurança, espaço exterior, materiais, atividades, alimentação, limpeza, relação qualidade-preço)
- Verificação antes de publicar (telefone igual ao da creche? nome do diretor mencionado? IP repetido? comentário duplicado?)
- **A creche é avisada e tem 7 dias para responder antes da publicação automática** — isto é o que torna o sistema aceitável para o setor
- Uma review por pessoa; a mais recente substitui a anterior

**15. Nota que decai com o tempo** 🟡 ⭐⭐
Não uses média simples. A fórmula deles: só contam reviews dos últimos 24 meses, e a nota é metade média das avaliações + metade volume face a um alvo (20 reviews positivas, mais um bónus proporcional a 20% da capacidade registada). Impede que uma creche viva para sempre de 5 reviews antigas.

**16. Prémios anuais "Top 20 por distrito"** 🟡 ⭐⭐⭐
Depende da 14. Todas as creches entram automaticamente, sem custo. Gera imprensa local todos os anos, dá às creches uma razão para pedir reviews, e dá-nos um selo para elas porem na porta. É a peça de marketing mais eficiente que eles têm.

**17. Página pública de transparência** 🟢 ⭐⭐
Eles publicam um comparativo com fontes (Similarweb, SEMrush) a mostrar que têm mais tráfego, mais reviews e mais cobertura que os concorrentes. Nós podemos publicar: nº de creches, % com contactos verificados, data da última atualização, taxa de resposta média nacional. Reforça a credibilidade junto de imprensa e financiadores.

---

### Bloco D — A ficha da creche

**18. Estimador de mensalidade** 🔴 ⭐⭐⭐
O maior buraco do produto: o pai não sabe quanto vai pagar. Eles estão a lançar um calculador que pede à creche campos que o pai **nunca vê**, usados só para calcular. Em Portugal é mais fácil e mais valioso: as IPSS têm escalões públicos por rendimento. Um simulador "diz-me o teu rendimento e agregado → esta creche custa-te aproximadamente X" seria a funcionalidade mais falada da app. Já temos uma heurística grosseira no comparador (`comparar.html`) — falta transformá-la em algo sério.

**19. Horário nas fichas de todas as creches** 🟡 ⭐⭐
Hoje só existe nas aderentes. É dos primeiros filtros que um pai que trabalha quer ("abre antes das 8h?"). O agente de enriquecimento pode ir buscá-lo.

**20. Fotos nas fichas estáticas** 🟡 ⭐⭐
As fichas `/creche/{slug}` não têm uma única imagem. Mesmo uma foto do exterior via Street View, ou uma imagem gerada com a identidade da app, melhora muito a partilha em redes sociais e o tempo na página.

**21. "Conhecer a equipa"** 🟡 ⭐
Eles têm. Para as creches aderentes, deixar acrescentar diretora e educadoras com foto. Humaniza — e é um bom argumento de venda para a creche aderir.

**22. Vídeo e tour virtual** 🔴 ⭐
Eles têm 2.758 creches com vídeo e 322 com tour 360°. Baixa prioridade para nós agora, mas é um filtro que os pais usam.

**23. Perguntas frequentes automáticas por creche** 🟢 ⭐
Eles geram FAQ a partir dos dados ("Que idades aceita? Que horas abre? Que capacidade tem?"). Nós já fazemos isto no `gerar_fichas.py` com 3 perguntas — expandir para 6-8 com os campos que tivermos. Puro SEO, custo quase zero.

---

### Bloco E — O painel da creche

**24. Responder ao pai dentro do painel** 🟡 ⭐⭐⭐
Hoje o painel abre o `mailto:` do utilizador — a conversa sai da plataforma e nós ficamos cegos. Uma caixa de resposta simples (que envia por Resend com `reply-to`) devolve-nos a visibilidade, e permite medir tempo de resposta a sério em vez de perguntar ao pai.

**25. Estatísticas de conversão** 🟢 ⭐⭐
Hoje o painel só mostra visualizações. Acrescentar: taxa visualização→contacto, tempo médio de resposta, comparação com a média do concelho. Eles vendem isto como funcionalidade paga — nós podemos dar de graça e usar como isco para aderir.

**26. Exportar leads (CSV)** 🟢 ⭐
Eles têm exportação em CSV e PDF em tudo. Trivial de fazer, e as creches maiores vão pedir.

**27. Modelos de resposta** 🟢 ⭐⭐
Três textos prontos: "temos vaga", "estamos cheios mas fico com o contacto", "convido para visita". Reduz o atrito da creche responder — e o problema real que temos hoje é creches que não respondem.

**28. Lista de espera gerida na plataforma** 🔴 ⭐⭐
Eles nem têm isto (só um artigo a explicar que existem listas e que a caução média é ~£70). Seria uma vantagem nossa: a creche marca "lista de espera, posição 4" e o pai vê no `/candidatura`. Resolve a angústia número um dos pais portugueses.

**29. Webhook / API de leads** 🟡 ⭐
Eles têm API e webhooks para a creche integrar no CRM próprio. Só relevante para grupos grandes — guardar para quando houver cadeias interessadas.

---

### Bloco F — Conta e retenção do pai

**30. Conta do pai a sério** 🔴 ⭐⭐⭐
Hoje o pipeline vive em `localStorage`. Muda de telemóvel, perde tudo. Eles têm conta gratuita com shortlist, shortlists guardadas e "vistas recentemente". Sem conta não há retenção, não há email marketing, não há como avisar "abriu vaga na creche que guardaste".

**31. Vista agregada "as minhas candidaturas"** 🟡 ⭐⭐⭐
Hoje cada lead tem o seu link isolado `/candidatura?c=token`, sem página que junte tudo. Um painel "as minhas 5 candidaturas e em que ponto estão" é o produto que os pais realmente querem — e nenhum concorrente europeu que vimos tem.

**32. "Vistas recentemente"** 🟢 ⭐
Barato, e trá-los de volta.

**33. Newsletter + centro de conteúdos** 🟡 ⭐⭐
Eles têm uma secção de conselhos enorme com FAQ estruturada, autor identificado, data de atualização e captura de email em cada artigo. É o motor de SEO deles. Temas óbvios para Portugal: como funcionam os escalões das IPSS, o que perguntar numa visita, quando inscrever, apoios do Estado, Creche Feliz explicada.

---

### Bloco G — Sustentabilidade (liga à apresentação da Fundação)

**34. Bolsa de emprego do setor** 🔴 ⭐⭐
Eles têm 1.803 vagas ativas e 8.252 candidatos registados — segunda fonte de receita, mesma audiência, e as creches portuguesas têm falta crónica de educadoras. Argumento forte: resolve um problema real do setor e paga-se a si próprio.

**35. Subscrição opcional para creches** 🔴 ⭐⭐⭐
O modelo deles, com preços públicos: Enhanced 429 £/ano, Platinum 858 £/ano, mais de 3.000 creches a pagar, e a promessa "£50 de retorno por cada £1". **Atenção à diferença que temos de manter:** eles vendem *posição nos resultados*, o que compromete a neutralidade. Nós prometemos o contrário. A nossa versão vende **ferramentas** (estatísticas avançadas, respostas dentro do painel, exportação, gestão de lista de espera, mais fotos) e nunca posição. É exatamente a "Via 1" da apresentação de sustentabilidade.

**36. Dados agregados para municípios** 🟡 ⭐⭐⭐
Já temos o heatmap de procura e os dados do INE por concelho. Falta empacotar como relatório vendável/oferecível às Câmaras — é a "Via 2" da apresentação, e o modelo alemão (Little Bird) mostra que os municípios pagam por isto.

---

## Parte 3 — A minha recomendação de ordem

Se fosse escolher por retorno sobre esforço, faria por esta ordem:

**Primeiro (dias, impacto imediato):** 13 (taxa de resposta), 7 (ordenação), 1 (botão em todas as creches), 3 e 4 (dados estruturados), 5 (reaproveitar dados), 27 (modelos de resposta), 25 (conversão no painel).

**Segundo (semanas, mudam o produto):** 2 (pedido de visita), 31 (as minhas candidaturas), 30 (conta), 24 (responder no painel), 6 (candidatura múltipla).

**Terceiro (o salto):** 18 (estimador de mensalidade), 14+15+16 (reviews e prémios), 33 (conteúdos), 35 (subscrição).

O 13 é o que faria hoje: o dado já está na base de dados, já é público nas regras, e ninguém o está a ler.

---

## Fontes

- daynurseries.co.uk — [homepage](https://www.daynurseries.co.uk/), [About](https://www.daynurseries.co.uk/about/), [Our Services](https://www.daynurseries.co.uk/our-services/services), [Prémios](https://www.daynurseries.co.uk/awards/)
- Documentação de suporte: [como funciona](https://support.daynurseries.co.uk/docs/daynurseries-co-uk-overview), [como funciona a pesquisa e o ranking](https://support.daynurseries.co.uk/docs/how-do-daynurseriescouk-searches-work), [cálculo da nota](https://support.daynurseries.co.uk/docs/how-is-the-review-score-calculated), [processo de publicação de reviews](https://support.daynurseries.co.uk/docs/our-review-publishing-process), [disponibilidade para visitas](https://support.daynurseries.co.uk/docs/7-tour-availability), [completude do perfil](https://support.daynurseries.co.uk/docs/what-is-profile-completeness-1), [relatório de ranking](https://support.daynurseries.co.uk/docs/ranking-report), [acesso a leads](https://support.daynurseries.co.uk/docs/how-to-access-enquiries-from-childcare-seekers), [tipos de pedido (API)](https://support.daynurseries.co.uk/docs/enquiry-categories), [dados do pedido (API)](https://support.daynurseries.co.uk/docs/enquiry-data), [mensalidades](https://support.daynurseries.co.uk/docs/2b-funding-and-fees-new-field-guide)
- Código do creches.app: `app.html`, `app.css`, `perfil-creche.js`, `painel.html`, `candidatura.html`, `comparar.html`, `compare.js`, `vagas.js`, `firestore.rules`, `scripts/gerar_fichas.py`, `api/lead-notify.js`, `api/lead-reminders.js`, `api/lead-feedback.js`, `api/vaga-alert-notify.js`, `api/weekly-digest.js`, `api/notify.js`
