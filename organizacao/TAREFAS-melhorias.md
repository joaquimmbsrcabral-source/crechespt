# ✅ Melhorias do creches.app — lista de tarefas

**Criado:** 26 de julho de 2026
**Base:** `organizacao/plano-melhorias-uk.md` (os números `#N` referem-se a esse documento)

Vai marcando `[x]` à medida que cada uma fica feita e publicada.
**Uma tarefa só conta como feita depois de `./deploy.sh` — não basta o código estar escrito.**

**Progresso:** 5 / 36 — *feitas em código a 26/07/2026, por publicar*

---

## 🌊 Vaga 1 — Ganhos imediatos
*Coisas que já estão quase feitas no código ou que são uma tarde de trabalho. Fazer tudo isto antes de tocar em qualquer outra coisa.*

- [x] **1.1 · Expor a taxa de resposta nas fichas** `#13` 🟢 ✅ *26/07*
  Novo módulo `window.CrecheStats` em `perfil-creche.js` (partilhado com o /app). Selo só aparece com **≥5 respostas e ≥70%** — abaixo disso ficamos calados, porque a amostra ainda não é justa.
  **Corrigido também o enviesamento** em `lead-reminders.js`: o follow-up só chegava a leads com estado `novo`, logo a creche que marcava "contactado" nunca era avaliada. Agora pergunta-se em todos os estados — e a resposta do pai passa a verificar o que a creche marcou.
  *`perfil-creche.js`, `app.html`, `api/lead-reminders.js`*

- [x] **1.2 · Ordenação por defeito deixa de ser alfabética** `#7` 🟢 ✅ *26/07*
  Nova opção **Relevância**, agora o defeito. Com morada/GPS manda a distância; sem ela, ordena por vaga aberta (8 pts) › página gerida (4) › Creche Feliz (2) › contactos (1+1). Nenhum destes critérios se compra.
  *`app.html`*

- [x] **1.3 · Botão "Tenho interesse" em TODAS as creches** `#1` 🟡 ✅ *26/07*
  A maior fuga do funil, tapada. O aviso passivo deu lugar a um cartão com botão real. Só é prometido onde há email conhecido — **1.828 das 2.578 fichas** (as outras 750 mostram o telefone e um pedido de ajuda para descobrir o email).
  *`perfil-creche.js`, `app.html`, `scripts/gerar_fichas.py`*

- [x] **1.4 · Data de nascimento da criança em vez de faixa etária** `#3` 🟢 ✅ *26/07*
  Campo de data com validação e feedback ao vivo ("Terá 1 ano e 3 meses hoje" / "Ainda não nasceu (prev. Outubro 2026)"). O `idade_crianca` continua a ser gravado, agora derivado da data — painel e emails não precisaram de mudar.
  *`perfil-creche.js`, `firestore.rules`, `api/lead-notify.js`*

- [x] **1.5 · Data de início em mês+ano estruturado** `#4` 🟢 ✅ *26/07*
  Select de 30 meses + "assim que houver vaga". Grava `inicio_ym` (`2026-09`, agregável) e mantém `mes_entrada` legível. Desbloqueia a 2.7 e o relatório para municípios.
  *`perfil-creche.js`, `firestore.rules`*

- [x] **1.6 · Reaproveitar dados da criança entre pedidos** `#5` 🟢 ✅ *26/07*
  Nome, email, telefone, nascimento e mês ficam guardados; a partir do 2.º pedido o formulário vem preenchido com um aviso discreto. A mensagem nunca é reaproveitada.
  *`perfil-creche.js`*

- [x] **1.6b · Medir se os leads funcionam (funil ponta-a-ponta)** ★ NOVA ✅ *29/07*
  Sabíamos se a creche respondia, não se a família conseguia vaga. Novo `api/lead-resultado.js` + bloco 4 no `lead-reminders.js`: aos 45 dias pergunta-se o desfecho com 4 botões (entrou · lista de espera · sem vaga · desistiu), token HMAC, uma resposta por lead. Agrega em `concelho_stats` — **por concelho, nunca por creche**, porque conseguir vaga depende da lotação e não da instituição. No `/admin` → Leads há agora o "funil real", que só conta leads com idade suficiente para já terem sido perguntados.
  *`api/lead-resultado.js`, `api/lead-reminders.js`, `admin.html`, `firestore.rules`*

- [ ] **1.7 · Modelos de resposta no painel** `#27` 🟢
  Três textos prontos: temos vaga · estamos cheios mas fico com o contacto · convido para visita.
  *Ficheiro: `painel.html`*

- [ ] **1.8 · Estatísticas de conversão no painel** `#25` 🟢
  Visualização→contacto, tempo médio de resposta, comparação com a média do concelho.
  *Ficheiros: `painel.html`, `api/geo-stats.js`*

- [ ] **1.9 · Exportar leads em CSV** `#26` 🟢
  *Ficheiro: `painel.html`*

- [ ] **1.10 · Filtro por raio em km** `#10` 🟢
  Até 3 / 5 / 10 km. Hoje só existe o polígono desenhado à mão.
  *Ficheiro: `app.html`*

- [ ] **1.11 · "Vistas recentemente"** `#32` 🟢
  *Ficheiro: `app.html`*

- [ ] **1.12 · FAQ automática expandida nas fichas** `#23` 🟢
  De 3 para 6–8 perguntas geradas dos dados. SEO puro.
  *Ficheiro: `scripts/gerar_fichas.py`*

---

## 🌊 Vaga 2 — Mudar o produto
*Aqui o creches.app deixa de ser um mapa e passa a ser uma plataforma de candidatura. É a vaga que mais muda a vida dos pais.*

- [ ] **2.1 · Conta do pai a sério** `#30` 🔴
  **Faz-se primeiro** — a 2.2, a 2.5 e o email marketing dependem disto. Hoje tudo vive em `localStorage` e perde-se ao mudar de telemóvel.
  *Ficheiros: `app.html`, `firestore.rules`*

- [ ] **2.2 · Vista agregada "as minhas candidaturas"** `#31` 🟡
  Hoje cada lead tem o seu link isolado. Um painel com as 5 candidaturas e o estado de cada uma. Nenhum concorrente europeu tem isto.
  *Ficheiros: `candidatura.html` (ou página nova), `app.html`*
  *Depende de: 2.1*

- [ ] **2.3 · Pedido de visita como tipo distinto** `#2` 🟡
  Os leads que mais convertem, segundo os dados deles. Data + período preferidos, com o aviso "ainda não confirmado pela creche".
  *Ficheiros: `perfil-creche.js`, `painel.html`, `api/lead-notify.js`, `firestore.rules`*

- [ ] **2.3b · Ligar o canal de resposta das creches** ★ NOVA · *construído, adormecido*
  `api/resposta-inbound.js` está feito e testado: cada lead teria um endereço próprio (`lead-{token}@resposta.creches.app`), a resposta da creche passaria por nós, seria registada (só o facto e a hora, nunca o conteúdo) e reencaminhada ao pai em segundos. Privacidade já escrita na política (secção 4.1) e no formulário.
  **Bloqueado por:** Resend gratuito só permite 1 domínio, e os MX de `creches.app` apontam para o Google (email `geral@`) — não se pode tocar. Ligar exige **Resend pago** ou **migrar DNS para Cloudflare** (Email Routing gratuito).
  **Interruptor:** basta criar `RESPOSTA_DOMINIO` no Vercel. Sem ela, comportamento antigo intacto. Passos completos no topo do `SETUP-EMAILS.md`.

- [ ] **2.4 · Responder ao pai dentro do painel** `#24` 🟡
  Hoje abre o `mailto:` e a conversa sai da plataforma — ficamos cegos. Enviar via Resend com `reply-to`.
  *Ficheiros: `painel.html`, `api/` (endpoint novo)*

- [ ] **2.5 · Candidatura múltipla — "enviar às 5 creches"** `#6` 🟡
  A nossa diferenciação real. Preenche uma vez, enviamos cinco pedidos personalizados.
  *Ficheiros: `app.html`, `perfil-creche.js`, `api/lead-notify.js`*
  *Depende de: 1.6, 2.1*

- [ ] **2.6 · Score interno de qualidade da ficha** `#8` 🟡
  0–100 por creche. Serve para ordenar e para dirigir o agente de enriquecimento.
  *Ficheiros: `scripts/`, `admin.html`*

- [ ] **2.7 · Filtro "preciso de vaga em [mês]"** `#11` 🟡
  *Ficheiro: `app.html`*
  *Depende de: 1.5*

- [ ] **2.8 · Pesquisas guardadas com alerta** `#12` 🟡
  "Avisa-me se abrir vaga em qualquer creche a 3 km de casa." Multiplica a base de emails.
  *Ficheiros: `app.html`, `api/vaga-alert-notify.js`, `firestore.rules`*
  *Depende de: 2.1*

- [ ] **2.9 · Horário em todas as fichas** `#19` 🟡
  Tarefa para o agente de enriquecimento semanal.
  *Ficheiros: agente de enriquecimento, `creches_pt.json`*

- [ ] **2.9b · Integrar a Carta Social no dataset (nacional)** 🔴 ★ NOVA
  Piloto AML feito a 29/07: 658 dos 814 equipamentos oficiais extraídos por freguesia (`scripts/carta_social_freguesias.py`), 214 cruzados por nome → 171 "JI" reclassificados para Creche/JI com fonte oficial. **Falta:** (a) as 444 creches oficiais da AML que não estão no mapa (`dados/creches-oficiais-em-falta-aml.json`) — precisam de morada/coordenadas para entrar; (b) as freguesias com >10 resultados (paginação JSF); (c) alargar aos restantes 260 concelhos. É a via para valência 0-3 confirmada a 100% e para os rácios de creche verdadeiros no relatório de imprensa.
  *Ficheiros: `scripts/carta_social_freguesias.py`, `dados/carta-social-*.json`, agente de enriquecimento*

- [ ] **2.10 · Fotos nas fichas estáticas** `#20` 🟡
  Hoje `/creche/{slug}` não tem uma única imagem. Mata a partilha em redes sociais.
  *Ficheiro: `scripts/gerar_fichas.py`*

- [ ] **2.11 · Publicar as regras de ordenação** `#9` 🟢
  Com a promessa que eles não podem fazer: *nenhuma creche pode pagar para subir*.
  *Ficheiros: `sobre.html`, `app.html`*

- [ ] **2.12 · Página pública de transparência** `#17` 🟢
  Nº de creches, % com contactos verificados, última atualização, taxa de resposta nacional.
  *Ficheiro: página nova*
  *Depende de: 1.1*

---

## 🌊 Vaga 3 — O salto
*Confiança pública e a funcionalidade que faz falar de nós. Só depois das vagas 1 e 2 estarem estáveis.*

- [ ] **3.1 · Estimador de mensalidade** `#18` 🔴
  O maior buraco do produto. Em Portugal é mais fácil que no UK: as IPSS têm escalões públicos por rendimento. "Diz-me o teu rendimento e agregado → esta creche custa-te ~X." Será a funcionalidade mais falada da app.
  *Ficheiros: `comparar.html`, `perfil-creche.js`, dados novos de escalões*

- [ ] **3.2 · Relatório de procura para municípios** `#36` 🟡
  Já temos o heatmap e os dados do INE. Falta empacotar. É a "Via 2" da apresentação de sustentabilidade.
  *Ficheiros: `admin.html`, `api/geo-stats.js`*
  *Depende de: 1.5*

- [ ] **3.3 · Sistema de avaliações de pais** `#14` 🔴
  A joia da coroa deles. Regras a copiar: só pais/tutores · várias categorias e não uma nota só · verificação antes de publicar · **a creche é avisada e tem 7 dias para responder antes da publicação automática** (é isto que torna o sistema aceitável para o setor) · uma review por pessoa.
  *Ficheiros: front-end novo, `api/`, `firestore.rules`, `admin.html`*

- [ ] **3.4 · Nota que decai com o tempo** `#15` 🟡
  Só reviews dos últimos 24 meses; metade média das avaliações, metade volume face a um alvo. Impede que uma creche viva de cinco elogios de 2019.
  *Depende de: 3.3*

- [ ] **3.5 · Prémios anuais "Top 20 por distrito"** `#16` 🟡
  Entrada automática e gratuita para todas. Gera imprensa local todos os anos e dá às creches uma razão para pedir reviews.
  *Depende de: 3.3, 3.4*

- [ ] **3.6 · Centro de conteúdos + newsletter** `#33` 🟡
  O motor de SEO deles. Temas: escalões das IPSS · o que perguntar numa visita · quando inscrever · apoios do Estado · Creche Feliz explicada.
  *Ficheiros: páginas novas, `scripts/`*

- [ ] **3.7 · "Conhecer a equipa" nas creches aderentes** `#21` 🟡
  Humaniza a ficha e é bom argumento para a creche aderir.
  *Ficheiros: `painel.html`, `perfil-creche.js`*

- [ ] **3.8 · Lista de espera gerida na plataforma** `#28` 🔴
  Vantagem sobre eles — nem o daynurseries tem. A creche marca "lista de espera, posição 4" e o pai vê. Resolve a angústia número um dos pais portugueses.
  *Ficheiros: `painel.html`, `candidatura.html`, `firestore.rules`*
  *Depende de: 2.2*

---

## 🌊 Vaga 4 — Sustentabilidade
*Só faz sentido com tráfego e adesão de creches consolidados. Liga diretamente à apresentação da Fundação.*

- [ ] **4.1 · Subscrição opcional para creches** `#35` 🔴
  ⚠️ **A linha que não se atravessa:** eles vendem posição nos resultados (Platinum sobe 12 pontos no ranking). Nós vendemos **ferramentas** — estatísticas avançadas, respostas no painel, exportação, gestão de lista de espera, mais fotos — e **nunca** posição. Referência de mercado deles: 429 £/ano e 858 £/ano, 3.000+ creches a pagar.
  *Depende de: 2.4, 1.8, 1.9, 3.8*

- [ ] **4.2 · Bolsa de emprego do setor** `#34` 🔴
  Segunda fonte de receita, mesma audiência, e as creches portuguesas têm falta crónica de educadoras. Eles têm 1.803 vagas e 8.252 candidatos.

- [ ] **4.3 · Webhook / API de leads para grupos** `#29` 🟡
  Só quando houver cadeias grandes interessadas.

- [ ] **4.4 · Vídeo e tour virtual** `#22` 🔴
  Baixa prioridade. Eles têm 2.758 com vídeo e 322 com tour 360°.

---

## Notas de execução

**Porquê esta ordem.** A Vaga 1 são doze tarefas em que o trabalho pesado já está feito — a taxa de resposta já está na base de dados, o `lead-notify` já sabe encontrar o email de qualquer creche, a ordenação é uma condição. São ganhos que se veem na mesma semana. A Vaga 2 exige decidir a conta do pai primeiro, porque quase tudo o resto depende dela. A Vaga 3 tem uma dependência interna forte (reviews → nota → prémios) e não vale a pena começá-la antes das anteriores estarem estáveis. A Vaga 4 só faz sentido com números para mostrar.

**Sempre que uma tarefa mexer em regras:** `firebase deploy --only firestore:rules` além do `./deploy.sh`.
**Sempre que mexer no dataset:** regenerar as fichas antes do deploy.
