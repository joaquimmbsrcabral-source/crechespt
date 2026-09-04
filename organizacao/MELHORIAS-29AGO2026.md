# O que melhorar no creches.app — 29 ago 2026

Três revisões em paralelo: o percurso da família, o lado das creches, e o
crescimento. Confirmei os achados principais no código antes de os escrever.
**Nove correções já feitas**; o resto está por ordem de retorno ÷ esforço.

---

## Já corrigido

| | O que era |
|---|---|
| `/creches` dizia **2591 creches** em nove sítios — é o que o Google mostra | 4.037 |
| `llms.txt` apontava para um guia que não existe | corrigido |
| **1.547 creches recebiam o convite sem link para a própria página** — o filtro `/^osm-/` excluía as `cs-` da Carta Social, cujas fichas existem | `/^(osm-\|cs-)/` |
| No painel, as creches `cs-` iam para `/app#creche-…` em vez da ficha SEO | idem |
| O convite dizia "2.591 estabelecimentos" e o site dizia 4.037 | uniformizado |
| `roadmap` com data de 19 de junho e "4 guias" quando são 6 | atualizado |

---

## 🔴 As três que mudam mais, por menos

### 1 · O `/app` ignora os parâmetros do URL

Não existe uma única ocorrência de `URLSearchParams` ou `location.search` no
`app.html`. O único deep-link é `#creche-<id>`.

Consequência: **as 292 páginas de concelho, as 20 de distrito, os 6 guias e os
três emails de lembrete** mandam a mãe para o mapa nacional com 4.037 creches e
o painel de filtros fechado. Ela refaz a pesquisa toda. O email diz "Ver creches
com vaga em Cascais" e o link é `creches.app/app`, sem Cascais.

Pior: o `index.html` declara no schema um `SearchAction` para
`creches.app/app?q={search_term_string}` — que não faz nada.

**Esforço:** uma tarde. Ler `?concelho=`, `?idade=`, `?vaga=1`, `?lat/lon=`
antes do primeiro `applyFilters()`, e atualizar os geradores e o
`lead-reminders.js`.

### 2 · A morada não filtra, só reordena

Escrever "1100-001" define a posição e muda a ordenação para distância — mas o
`applyFilters()` nunca corta por distância. A mãe continua a ler
**"Ver 4.037 creches"** no botão. Com páginas de 60, a 61.ª mais próxima já não
se vê, mas o número que ela lê é o do país inteiro.

**Esforço:** meio dia. Um chip de raio (1/3/5/10 km) e o contador a dizer
"23 creches a menos de 3 km". Substitui o "Desenhar área", que faz o mesmo com
dez vezes mais fricção no telemóvel.

### 3 · A ocupação oficial está no browser e ninguém a vê

**1.623 creches (39%) têm `capacidade_oficial` e `utentes_oficial`** da Carta
Social. Estão dentro do dataset comprimido que toda a gente descarrega — e têm
**zero ocorrências** no `app.html`, no `comparar.html`, no `perfil-creche.js` e
no gerador de fichas.

**526 dessas creches estão abaixo dos 90% de ocupação.** É o único sinal de
"onde provavelmente há lugar" com cobertura nacional, já pago e já no disco. O
filtro "🟢 Com vaga" depende de reports voluntários; este não.

**Esforço:** um dia. Uma linha na ficha e no detalhe do mapa — "Lotação oficial:
62 de 70 lugares (Carta Social, 2026)" — e um chip de filtro. Dizer sempre que é
um dado anual e não uma vaga confirmada.

---

## 🟠 O problema de fundo: 7 creches em 4.037

A taxa de adesão é de **0,17%**. Sem creches a gerir as páginas, os dados
envelhecem e os pedidos caem em caixas que ninguém abre. As três revisões
convergiram na mesma tese:

**A posse do email oficial já é prova suficiente.** O convite vai para o
endereço que consta do registo oficial. Um clique num link assinado nesse email
prova o mesmo que o telefonema — com registo e data.

### 4 · Link mágico no convite: de 15 passos para 2

Contei o percurso atual: abrir email → clicar → escolher método → inventar
palavra-passe → esperar 3,3 MB → procurar a creche → nome → cargo → telefone →
submeter → **esperar 24-48h** → atender o telefone → novo email → voltar a
entrar. Quinze ações, uma espera e um telefonema.

Com `?c=<creche_id>&t=<HMAC>` no convite, é clicar e estar dentro. O padrão já
existe no `api/_lib/lead-feedback.js`.

**Nota:** as 12 funções do plano Hobby estão gastas — tem de entrar como `fn=`
dentro de um endpoint existente. Alterações a nome e morada continuam a passar
por revisão; fotos continuam moderadas.

### 5 · Confirmação de vagas sem conta nenhuma

Se a maioria nunca vai criar conta, o problema dos dados resolve-se sem depender
disso. **3.556 creches têm email.** Dois botões num email — 🟢 Temos vaga /
🔴 Sem vaga — com token assinado, cobrem **88% do mapa** em vez de 0,17%.

E os mesmos dois botões no rodapé do email de lead, que é o momento de maior
abertura que existe: a creche já ali está a responder a uma família.

### 6 · A prova existe e nunca sai da base de dados

O `construirLoteAuto()` **já calcula as visualizações por creche** — usa-as para
ordenar o lote e depois deita-as fora. O convite nunca as menciona.

Trocar "A página da X — já a podem gerir (grátis)" por
**"A página da X foi vista 143 vezes no creches.app"** muda o email de carta
comercial para facto sobre ela.

O mesmo na ficha pública: hoje há uma linha de letra miudinha no rodapé que nem
diz qual é a creche. São 4.025 páginas indexadas onde a diretora cai ao
pesquisar o nome da própria instituição.

### 7 · Um gestor só pode gerir uma creche

`creche_managers/{uid}` tem **um** `creche_id`. Mas os maiores operadores são
multi-equipamento: SCML 20, João de Deus 19, Cruz Vermelha 19, Misericórdia de
Oeiras 17, Misericórdia da Maia 17. Dez domínios valem mais de 150 creches.

**Uma conversa com uma sede vale 20 adesões** — e hoje o sistema não a suporta.

---

## 🟡 Crescimento: onde está o espaço vazio

### 8 · Páginas de horário alargado — o activo que ninguém pode copiar

**Nem o apoioperto, nem o crechecerta, nem o skoolist, nem a Segurança Social
publicam horários.** Temos 1.728 confirmados e **nenhuma página que os agregue**.

99 concelhos têm 5 ou mais. São 99 páginas mais 20 de distrito, para uma
pesquisa sem concorrência orgânica e com intenção altíssima — quem entra às 7h
não tem hoje forma nenhuma de saber que creches abrem a tempo.

**Esforço:** 2 a 3 dias, adaptando o gerador que já existe.

### 9 · As 292 páginas de concelho são finas e não ranqueiam

"creches em Sintra" e "creches em Braga IPSS" — **ausentes do top 10**, com o
apoioperto em #2. As páginas existem; são uma lista de links.

Falta-lhes tabela com horário e telefone, a caixa "X das Y abrem às 7h30 ou
antes", a ocupação do concelho, e sub-páginas por tipo (260 combinações têm 5 ou
mais creches).

### 10 · O concorrente a sério é o apoioperto.com

Mesma história — uma pessoa, gratuito, Carta Social — mas **só continente, sem
Açores nem Madeira**, e sem horários. Ganha os títulos com números
("973 IPSS em Braga, 565 creches…") enquanto o creches.app aparecia com "2.591".

A defesa não é o número de registos. É o horário, as ilhas e a profundidade.

### 11 · Câmaras e juntas de freguesia

A Câmara de Cascais publica um PDF de creches **de 2022**. Há dezenas de casos
iguais. Um email curto — "a vossa lista é de 2022, esta é atualizada
mensalmente contra a Carta Social" — rende backlinks `.pt` institucionais
exatamente nas páginas de concelho.

Para uma pessoa só, é melhor rácio do que grupos de Facebook, que exigem
presença diária e não deixam rasto indexável.

---

## O que está a mais

- **Ordenação com 6 opções** — "Distrito", "Estado" e "Prioridade" só servem a
  quem já tem 20 creches marcadas.
- **"Desenhar área"** — carrega uma biblioteca inteira para fazer o que um
  filtro de raio faz melhor.
- **Filtro "✓ Aderentes"** — é uma métrica do negócio, não um critério de uma
  família. O selo na lista chega.
- **Chip de tipo "?"** — pedir a uma mãe que filtre por "não sabemos o que isto é".
- **O CRM dentro do mapa** — nove campos no detalhe (estado, último contacto,
  próxima ação, data, prioridade em estrelas, favorita, mensalidade, vagas,
  notas). Vale a pena medir antes de manter os seis do meio.

---

## O que está bem e não se mexe

- **A ficha de creche.** Responde em 5 segundos, hierarquia de ações resolvida.
- **O ciclo de vida do lead** (`lead-reminders.js`): lembrete à creche aos 2
  dias, alternativas ao pai aos 5, "a creche respondeu?" aos 7, desfecho aos 45.
  Poucos produtos pagos fazem isto.
- **A honestidade do `CrecheStats`** — só mostra o sinal quando é positivo,
  porque a amostra é enviesada. Decisão certa e documentada.
- **"creches perto de mim": #1 e #5 no Google.**

---

## Se só houvesse tempo para três

1. **Parâmetros de URL + filtro de raio** (uma tarde) — corrigem o caminho de
   entrada de toda a gente que vem do Google e dos emails.
2. **Mostrar a ocupação oficial** (um dia) — dados já pagos, já no browser, e é
   a resposta à única pergunta que a mãe tem: *onde é que há lugar*.
3. **Páginas de horário alargado** (2-3 dias) — o único activo que a
   concorrência não tem e não consegue copiar depressa.

E, antes de tudo isto, uma verificação de dez minutos: **confirmar no Resend a
taxa de abertura dos convites.** O `send-invites.js` tem
`EMAIL_FROM || "onboarding@resend.dev"` — se a variável não estiver definida em
produção, os convites saíram todos de um domínio de teste. Se a abertura for 5%,
o problema não é o produto; é o SPF/DKIM.

---

# Executado — 29 ago 2026 (segunda passagem)

Do plano acima, ficou feito:

| # | O que era | O que ficou |
|---|---|---|
| **1** | `/app` ignorava os parâmetros do URL — 292 páginas de concelho, 20 de distrito, 6 guias e 3 emails atiravam a mãe para o mapa nacional com o painel fechado | Lê `?concelho= ?distrito= ?idade= ?vaga=1 ?horario=1 ?crechefeliz=1 ?tipo= ?q=` antes do primeiro `applyFilters()`, nos três caminhos de arranque. O `SearchAction` do schema passa a funcionar |
| **2** | A morada definia a posição mas nunca cortava por distância — o botão continuava a dizer "Ver 4.037 creches" | Chips de raio 1/3/5/10 km, visíveis só quando há posição. `haversineKm` dentro do `applyFilters()` |
| **3** | 1.547 creches com `capacidade_oficial` e `utentes_oficial` no browser de toda a gente, com zero ocorrências no UI | Linha "Lotação oficial" no detalhe do mapa e banner na ficha. Sempre com a data e sempre a dizer que não é vaga confirmada |
| **6** | O `construirLoteAuto()` calculava as visualizações para ordenar o lote e deitava-as fora | Assunto e corpo do convite passam a dizer "A página da X foi vista 143 vezes" — acima de 10 visualizações. Abaixo disso, o texto genérico, porque o número não provaria nada |
| **8** | 1.728 horários confirmados e nenhuma página que os agregasse | **100 páginas novas**: `/creches-horario-alargado` + 99 concelhos, 1.462 creches. FAQ em JSON-LD, `openingHours` no schema, ligadas da homepage, do `/creches` e de cada página de concelho |
| — | A ficha reclamava-se numa linha de letra miudinha no rodapé que nem dizia o nome da creche | Bloco "Trabalha n' X?" com botão para `/painel?creche=<id>`, que já pré-seleciona a instituição. 4.025 fichas |

## Corrigido pelo caminho

- **`/creches` anunciava 2591 creches** e a grelha de distritos estava nos valores de antes da Carta Social (Lisboa 497 quando são 836; Aveiro em 7.º quando é 4.º). É a página que o Google mostra para "creches em Portugal". Agora é gerada pelo `scripts/atualizar_creches_index.py` — H1, barra de estatísticas, grelha, top 5, FAQ visível e FAQ em JSON-LD, todos derivados do dataset.
- **A homepage dizia Lisboa 853** enquanto `/creches/lisboa` dizia 836. O atualizador tinha dois regexes que nunca casavam com o HTML real; passou a ancorar no `href`.
- **`api/lead-reminders.js` ia rebentar** nos emails do dia 7 e do dia 45: `linkMapa(zona, …)` em duas funções que não declaravam `zona`.
- **3 emails com acentos antes do `@`** (`associaçao@filadelfia.org` e outros) — nenhum servidor os aceita. Removidos e marcados; a ficha mostra o telefone.
- **`leaflet-draw` deixou de carregar no arranque** — ~50 KB de JS e CSS que todos os telemóveis descarregavam para uma funcionalidade que quase ninguém usa. Carrega ao primeiro clique.
- **`/app` não tinha `og:title` nem `og:description`** — partilhar o mapa no WhatsApp caía para o título cru.
- **O roadmap listava como "em exploração"** o painel das creches, o comparador e os alertas de vaga, que estão no ar. Movidos, mais dois que não estavam listados em lado nenhum.
- **`llms.txt` e `llms-full.txt`** diziam 4.150 estabelecimentos e 154 concelhos.
- **Documentos internos na raiz** (propostas datadas, rascunhos de outreach) estavam indexáveis com números de julho, a competir nos resultados com as páginas reais. `noindex` + `Disallow`.
- **O `atualizar_sitemap_index.py`** só atualizava datas de sitemaps já listados; um sitemap novo ficava invisível. Passa a acrescentar os que encontrar em disco.

## O que ficou por fazer, e porquê

- **4 · Link mágico no convite** e **5 · Confirmação de vaga sem conta** — as 12 funções do plano Hobby estão gastas; entram como `fn=` dentro de um endpoint existente. É trabalho de desenho de tokens, não de meia hora.
- **7 · Gestor multi-creche** — muda o modelo de dados (`creche_managers.creche_ids[]`) e as regras do Firestore.
- **9 · Páginas de concelho mais grossas** e **10/11 · Câmaras e juntas** — trabalho de conteúdo e de outreach.
- **Podar o UI** (3 ordenações mortas, filtro "✓ Aderentes", chip de tipo "?") — deixei por medir. Apagar funcionalidades que funcionam com base num palpite meu não é melhoria; vale mais um mês de dados.
- **Verificar a taxa de abertura no Resend.** Continua a ser a coisa de dez minutos com maior retorno: se o `EMAIL_FROM` não estiver definido em produção, todos os convites saíram de `onboarding@resend.dev` e o problema não é o produto, é o SPF/DKIM.

---

## Campanha de vagas — 1 set 2026

Enviado a **13 creches aderentes** (14 no `creche_managers`, mais uma que aderiu
durante o envio; as 2 contas de teste ficaram de fora). Todos entregues.

O que o teste de ponta a ponta apanhou, antes e depois:

- **A métrica `vaga_publicada` do `/api/ops` mentia.** Dizia 9 quando eram 4:
  contava os 32 documentos de vaga já expirados e os 64 reportados por famílias.
  O mapa está correcto — o `app.html` filtra por `expires_at` — era só a métrica.
  Corrigido; falta o deploy.
- **Enviei os três primeiros emails à mão** e em dois copiei o `creche_id` da
  creche errada. Como o token é HMAC de `id:resposta`, deixou de bater certo e o
  endpoint devolveu 403 — **nenhum dado errado foi escrito**, que é precisamente
  para isto que a assinatura existe. Mas dois emails saíram com botões mortos.
  Reenviados corrigidos.

A causa não foi distração, foi o método: ler ids de uma listagem no ecrã e
escrevê-los noutro sítio. O envio passa a sair sempre do
`scripts/email_vagas_aderentes.mjs`, que constrói tudo a partir dos dados, e que
agora reconstrói o token a partir do id que está no próprio link e **recusa-se a
enviar** se divergirem.

---

## O email de um pai, 4 set 2026

Um pai escreveu a pedir o contacto de uma creche onde o nosso alerta lhe disse
que havia vaga. Ao investigar porquê, apareceram três coisas.

**O `?creche=` nunca foi lido pelo mapa.** O alerta de vaga — o email mais
urgente que o produto envia, "liga já, as vagas preenchem-se rápido" — mandava
para `creches.app/app?creche=<id>`, e o `app.html` só sabia ler `#creche-<id>`.
Toda a gente que clicou desde que os alertas existem caiu no mapa nacional com
4.037 creches. O `/admin` gera o mesmo link em "ver no mapa ↗". Corrigido, com
espera para as creches "extra" que só chegam depois do Firebase.

**O alerta não dizia quem reportou a vaga.** Dizia "acabou de ser reportada uma
vaga" tanto quando é a creche a confirmar como quando é outra família a
sinalizar. São coisas diferentes e mudam o que o pai deve esperar ao telefone.
Passa a distinguir, com aviso explícito quando não é verificada.

**A creche em causa não tem contacto nenhum** — nem telefone, nem email, nem
site. Procurei e não consegui confirmar: o número que aparece nas pesquisas é da
Escola EB1/JI de Fitares, que tem outro código postal e começa aos 3 anos,
enquanto a vaga reportada era de berçário. Não é a mesma instituição.

Isto expõe um buraco maior: **mandamos alertas de vaga para creches que não têm
como ser contactadas.** Vale a pena não deixar ativar alerta numa creche sem
contacto, ou pelo menos dizê-lo à cabeça — em vez de o pai descobrir depois de
receber a boa notícia.

---

## A métrica que faltava — 4 set 2026

**As creches respondem a 20% dos pedidos das famílias.**

De `creche_stats` (agregado das respostas dos pais ao follow-up dos 7 dias):
46 famílias disseram-nos o que aconteceu — **9 dizem que a creche respondeu, 37
dizem que não**.

Ressalva honesta: só 46 dos 241 leads têm resposta do pai (19%), e quem foi
ignorado tem mais motivo para responder ao inquérito. A taxa real é
provavelmente melhor do que 20%. Mesmo a corrigir com generosidade, a distância
para o número seguinte não desaparece.

### O contraste que diz o que fazer

| pedimos à creche | fazem |
|---|---|
| responder por email a uma família | **20%** |
| carregar num de dois botões | **69%** (9 de 13, 1 set) |

São as mesmas instituições. A diferença não é vontade, é fricção: responder a
uma família obriga a compor uma mensagem; carregar num botão demora um segundo.

### O que isto implica

O email que a creche recebe com um pedido (`api/lead-notify.js`) tem exatamente
dois botões: **"Gerir no painel →"** e **"Pedir acesso ao painel →"**. Ambos
exigem login. Para responder à família, a creche tem de escrever um email do
zero — e 4 em cada 5 não escreve.

A correção é usar a máquina que já está construída e provada: **dois botões
assinados no email do lead**, que respondem à família na hora e em nome da
creche. É o mesmo padrão do `vaga-confirmar` e entra como `fn=` num endpoint
existente (as 12 funções do plano Hobby continuam gastas).

Enquanto isto não existir, todo o SEO e todos os convites levam famílias a uma
promessa que falha 80% das vezes.
