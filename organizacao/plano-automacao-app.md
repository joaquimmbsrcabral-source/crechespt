# Plano de automação e melhoria do creches.app

*Baseado numa auditoria completa do código + pesquisa de mercado (julho 2026)*

---

## O diagnóstico em 3 frases

O creches.app opera num mercado com escassez estrutural de vagas que vai durar anos (o PRR só concluiu 1.225 dos 24.143 lugares previstos), sem nenhum concorrente nacional que combine vagas em tempo real com painel para creches. A auditoria ao código mostra que o produto tem o funil quase completo mas com três buracos: os pais não são avisados quando abre vaga, toda a operação passa manualmente pelo fundador, e 22% do dataset tem dados incompletos que ninguém mantém. As referências internacionais (Kinside, Winnie, Playground) validam exatamente o caminho: alertas de vaga para reter pais, agents de resposta automática para servir creches — e ninguém oferece isto em Portugal.

---

## Prioridade 1 — Alertas de vaga (a funcionalidade que falta)

**O problema:** um pai que procura creche em Odivelas visita a app, não há vaga, vai embora — e quando a vaga abre duas semanas depois, nunca fica a saber. Todo o valor do sistema de vagas em tempo real perde-se porque só beneficia quem por acaso volta.

**A solução:** botão "🔔 Avisa-me quando abrir vaga" na ficha de cada creche e nos filtros por concelho. O pai deixa o email (ou já está autenticado); quando alguém reporta vaga nessa creche ou zona, recebe email automático via Resend.

**Porquê primeiro:** é o mecanismo de retenção mais forte do setor (a Kinside promete que a família "é a primeira a saber"), usa infraestrutura que já existe toda (coleção `vagas`, Resend, favoritos, `creche_leads`), e cria um ciclo virtuoso — mais pais subscrevem → mais valor em cada report de vaga → mais razões para creches reportarem.

**Como se constrói:** nova coleção `vaga_alerts` (creche_id ou concelho + email + criado_em), novo endpoint `/api/vaga-alert-notify` chamado quando um report de vaga é criado, com idempotência e limite de 1 email/dia por subscritor. Estimativa: 1-2 sessões de trabalho.

---

## Prioridade 2 — Agente de operações (tirar o fundador do circuito)

**O problema:** aprovação de claims, moderação de fotos, correções de nome/morada, reports de idades, pedidos de remoção, geocodificação falhada — tudo espera pelo Joaquim no /admin. Isto não escala além de dezenas de creches aderentes.

**A solução:** uma scheduled task diária ("Agente de operações") que corre de manhã antes do briefing e faz a triagem:

- **Correções e reports de alta confiança aplica sozinho** — as regras de validação já existem no `audit_dataset.py` (telefone PT válido, email válido, coordenadas dentro de Portugal, idades 0-156 meses). Se a correção proposta passa nas validações e não contradiz dados verificados, aplica ao `creche_overrides` e regista.
- **Fotos:** analisa cada foto pendente (é uma creche/espaço infantil? tem qualidade mínima? não tem crianças identificáveis em situação sensível?) e aprova as óbvias, rejeita as óbvias, escala as dúvidas.
- **Claims:** verifica sinais de legitimidade (email do domínio da creche? nome bate certo?) e prepara a recomendação — a aprovação final fica com o Joaquim, mas passa de "investigar cada um" a "confirmar com um clique".
- **Tudo o que fez fica registado no Diário dos Agents** — o Joaquim lê em 1 minuto e só intervém nos casos escalados.

**Porquê segundo:** é o que permite crescer a rede de creches aderentes sem o fundador ser o gargalo. O objetivo dos convites em massa (já automatizados) é gerar dezenas de claims — que hoje iriam todos parar à fila manual.

---

## Prioridade 3 — Pipeline de frescura de dados

**O problema:** website preenchido em só 13% das creches, tipo "Desconhecido" em 569 (22%), sem preços nem horários no dataset base. As fichas estáticas e o sitemap regeneram-se à mão com data hardcoded no script.

**A solução em 3 camadas:**

1. **Agente de enriquecimento** (scheduled task semanal): pega em 20-30 creches com campos em falta, pesquisa na web (site oficial, Facebook, Google), e escreve email/website/telefone encontrados em `creche_overrides` com nota de fonte. Os 569 "Desconhecido" reclassificam-se pela heurística de nome que já está esboçada no `audit_dataset.py`.
2. **Regeneração automática das fichas**: corrigir a data hardcoded nos scripts (`gerar_fichas.py`, `generate-sitemap.py`) para data dinâmica, e correr a regeneração semanalmente — assim as remoções, correções e perfis ricos das aderentes aparecem nas fichas SEO sem intervenção manual. Ping ao IndexNow no fim.
3. **Refresh periódico OSM/Carta Social** (mensal): diff contra o dataset atual, apresentado ao admin para revisão em lote.

**Porquê:** dados vivos são a vantagem competitiva contra a Carta Social (estática) e o ApoioPerto. E cada campo preenchido melhora o SEO e o funil de convites (mais emails conhecidos = mais creches contactáveis).

---

## Prioridade 4 — Resposta automática a leads (o produto que as creches vão pagar)

**O problema:** quando um pai envia um pedido de contacto, a creche recebe um email — e muitas nunca respondem. O pai fica pendurado; a creche perde a matrícula (nos EUA, creches com resposta automática capturam 2-3 matrículas extra por mês só do que antes se perdia).

**A solução em 2 fases:**

1. **Fase A (sem IA):** acknowledgment automático ao pai ("a creche X recebeu o teu pedido; se não responderem em 3 dias dizemos-te") + lembrete automático à creche ao fim de 48h sem resposta + sugestão ao pai de 3 creches alternativas com vaga na mesma zona se passarem 5 dias.
2. **Fase B (com IA — o diferencial):** um assistente que responde na hora ao pai em nome da creche aderente, com base no perfil que ela preencheu no painel (mensalidade, horário, valências, vagas atuais), e propõe agendar visita. É o modelo "AI receptionist" (Playground, Hyperleap) que ninguém oferece em Portugal — e é a base de um futuro plano pago.

---

## Prioridade 5 — Insights automáticos para creches (alimenta a monetização)

O digest semanal já existe. Expandir com o que os dados já permitem: "12 famílias viram a vossa página esta semana", "a vossa vaga está reportada há 25 dias — ainda está aberta?", "3 creches vizinhas têm vaga ativa e vocês não". Para creches **não aderentes**, versão de conquista: "houve X pesquisas na vossa zona este mês — crie o seu painel gratuito". Isto transforma os `creche_views` parados em pressão de adesão constante.

---

## O que fica para depois (registado, não esquecido)

**Candidatura única multi-creche** (modelo alemão Little Bird: um pedido, várias creches, uma oferta garantida) — potencial enorme mas exige massa crítica de creches aderentes primeiro. **Reviews de famílias** — retenção comprovada, mas com moderação delicada; esperar pelo agente de operações. **Marcação de visitas/tours online** — natural depois da Fase B dos leads. **Dados de preços públicos** — a calculadora já existe; ligá-la aos preços reais dos perfis quando houver volume suficiente.

---

## Sequência recomendada

| # | O quê | Tipo | Esforço |
|---|-------|------|---------|
| 1 | Alertas de vaga | Código na app + endpoint | 1-2 sessões |
| 2 | Agente de operações | Scheduled task (sem tocar na app) | 1 sessão |
| 3a | Fichas com regeneração automática | Corrigir scripts + cron | 1 sessão |
| 3b | Agente de enriquecimento de dados | Scheduled task | 1 sessão |
| 4a | Leads: acknowledgment + lembretes | Endpoints + cron | 1 sessão |
| 5 | Insights expandidos no digest | Alterar weekly-digest.js | ½ sessão |
| 3c | Refresh OSM/Carta Social mensal | Script + revisão em lote | 2 sessões |
| 4b | AI receptionist para creches | Produto novo (base do plano pago) | várias sessões |

A regra de ouro que emerge do mercado: **os pais retêm-se com alertas, as creches pagam por leads respondidos**. Tudo no plano serve um destes dois motores.
