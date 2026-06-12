# Briefing — Entrevista PÚBLICO

Junho 2026 · Dados atualizados a partir do dataset em produção.
**Antes da entrevista:** preenche os valores marcados como `⚠ INSERIR` (vais buscar ao `creches.app/admin`).

---

## 1 · Headline em 30 segundos

**Quem:** Joaquim Cabral, engenheiro de Lisboa, 28 anos, prestes a ser pai pela primeira vez.

**O quê:** Creches.app — mapa nacional de creches em Portugal.

**Por quê:** Andou semanas à procura de creche, 30 chamadas sem clareza. Decidiu juntar tudo num sítio.

**Quando:** Lançado em maio de 2026. Cobertura NiT em junho.

**Modelo:** Grátis para pais e creches. Sem ads. Sem subscrições. Sem venda de dados.

---

## 2 · Os números (verificados a partir do dataset em produção)

### Cobertura

| Métrica | Valor |
|---|---|
| **Creches mapeadas** | **2.591** |
| **Distritos cobertos** | **20** (todo o continente + Açores + Madeira) |
| **Páginas de distrito publicadas** | 21 |
| **Guias publicados** | 4 (escolher creche, custos, ama vs avós, sobre) |
| **URLs no sitemap** | 33 |

### Qualidade dos dados

| Métrica | Valor |
|---|---|
| Creches com telefone validado | **1.916** (74%) |
| Creches com morada | **1.843** (71%) |
| Creches com email | **1.808** (70%) |
| Creches com código postal | **2.052** (79%) |

### Por tipo

| Tipo | Quantidade |
|---|---|
| Pública | 997 |
| Privada | 874 |
| IPSS (validadas) | 151 |
| Tipo a verificar | 569 |

*Nota: a categorização de tipo está em refinamento — o algoritmo de inferência v3 reconhece padrões linguísticos no nome cruzados com tipologia oficial. Tipo "a verificar" são casos onde queremos confirmação manual.*

### Top 10 distritos por número de creches

| # | Distrito | Creches |
|---|---|---|
| 1 | Lisboa | 497 |
| 2 | Porto | 342 |
| 3 | Setúbal | 253 |
| 4 | Braga | 201 |
| 5 | Leiria | 183 |
| 6 | Coimbra | 147 |
| 7 | Aveiro | 144 |
| 8 | Faro | 136 |
| 9 | Santarém | 106 |
| 10 | Castelo Branco | 88 |

### Tráfego e adoção

| Métrica | Valor |
|---|---|
| Visitas hoje | ⚠ INSERIR (vê em `creches.app/admin` → "Visitas hoje") |
| Visitas últimos 7 dias | ⚠ INSERIR (vê em `creches.app/admin` → "Visitas 7 dias") |
| Visitas desde lançamento | ⚠ INSERIR (vê em `creches.app/admin` → gráfico) |
| Utilizadores registados (login Google) | ⚠ INSERIR (vê em `creches.app/admin` → "Utilizadores") |
| Reports de idade incorretos recebidos | ⚠ INSERIR (vê "Idades reportadas") |
| Creches que pediram para ser listadas | ⚠ INSERIR (vê "Creches interessadas") |
| Pedidos de remoção | ⚠ INSERIR (vê "Pedidos de remoção") |

---

## 3 · Cronologia do projeto

| Data | Evento |
|---|---|
| Janeiro/Fevereiro 2026 | Procura pessoal de creche para o primeiro filho |
| Março 2026 | Decisão: construir uma ferramenta |
| Abril 2026 | Primeira versão funcional (Firebase + Vercel + Leaflet) |
| Maio 2026 | Lançamento público em creches.app |
| Maio-Junho 2026 | 3 guias SEO publicados; 20 distritos cobertos |
| Junho 2026 | Cobertura NiT • primeira onda de tráfego orgânico • 100+ visitas/dia |

---

## 4 · Bio pessoal (versão curta para usar nas respostas)

> *"Joaquim Cabral, 28 anos. Sou engenheiro, vivo em Lisboa. A minha mulher e eu vamos ser pais pela primeira vez ainda este ano. Foi à procura de creche para o nosso filho que percebi quão difícil isto era em Portugal — não por falta de creches, mas por falta de informação acessível. O Creches.app é a ferramenta que eu próprio gostaria de ter encontrado."*

---

## 5 · Quotes prontos a usar (podes citar literalmente)

**Sobre o porquê:**
> *"Procurei creche para o meu filho durante semanas. Não era um problema de mercado — era um problema de informação. O Creches.app é a ferramenta que eu próprio gostaria de ter encontrado."*

**Sobre os dados:**
> *"A Carta Social é um tesouro escondido. Tem milhares de creches, mas em formatos que poucos pais conseguem abrir. Trouxemos isso para o mapa, em português, num clique."*

**Sobre o modelo:**
> *"Não cobramos a pais, nem cobramos a creches. Não vendemos dados. Vivemos da convicção de que isto devia existir — e por isso construí-mo."*

**Sobre o futuro:**
> *"O objetivo nunca foi ter o negócio. O objetivo é que nenhum pai português volte a perder 30 chamadas porque a informação não estava acessível."*

---

## 6 · Metodologia (responde a "como é que isto se constrói sozinho?")

### De onde vêm os dados
- **Fonte primária:** Carta Social do Ministério do Trabalho, Solidariedade e Segurança Social
- **Cruzamento:** validação com sites institucionais, números de registo ERC
- **Geocodificação:** OpenStreetMap (Nominatim) + correções manuais para sítios pequenos
- **Inferência de idades:** algoritmo próprio que analisa padrões no nome (berçário, infantário, ATL, etc.) cruzado com a tipologia oficial — 88% de cobertura, 0% falsos positivos validados

### Como é mantido atualizado
- **Botão público "🚩 idade errada?"** em cada ficha — pais reportam diretamente na app
- **Botão "creche quer entrar"** em `/para-creches` — instituições pedem para ser listadas
- **Botão público "remover esta creche"** — RGPD-friendly, qualquer instituição pode pedir saída
- **Painel admin privado** onde aplicação de correções é 1 clique → fica visível em produção em 30 segundos (sem redeploy)

### Stack técnico
- **Frontend:** HTML/CSS/JS vanilla. Single-file architecture. Sem framework.
- **Backend:** Firebase (Firestore) + Vercel (serverless functions).
- **Mapa:** Leaflet.js + OpenStreetMap. Nominatim para geocodificação.
- **Auth:** Firebase Auth (Google OAuth). Login opcional — vê o mapa sem registar.
- **Hosting:** Vercel. Domínio creches.app. Servidores na UE (RGPD-friendly).
- **Código fonte:** privado por agora. Abertura prevista 2027.

---

## 7 · Comparação com o que já existe

| Solução | Cobertura | Modelo | Limitações |
|---|---|---|---|
| **Carta Social (Estado)** | Nacional | Gratuita | Interface complexa, sem mapa, dados em PDF/Excel |
| **Creche Feliz (Seg. Social)** | Apenas creches gratuitas | Gratuita | Limitado ao programa; lista apenas instituições aderentes |
| **Coverflex** | 2.600+ creches | Pago (benefícios B2B) | Direcionado a empresas, não a pais individuais |
| **Creche na Minha Rua** | ND | Pago | Modelo de subscrição |
| **Creches.app** | 2.591 creches, 20 distritos | **Grátis para todos. Sem ads.** | Site novo, autoridade SEO em construção |

**Diferenciador-chave:** sou o único 100% gratuito, sem login obrigatório, com botão de remoção RGPD-explícito, e mantido por uma pessoa só com dados oficiais.

---

## 8 · Cobertura de imprensa até agora

| Data | Publicação | Tipo |
|---|---|---|
| Junho 2026 | **NiT — New in Town** | Reportagem |
| Junho 2026 (em curso) | Wave 2 — 8 contactos a sair (TSF, Renascença, Visão, Expresso, JN, DN, Activa, JE) | Outreach ativo |

---

## 9 · Perguntas típicas + respostas preparadas

### "Como é que conseguiste fazer isto sozinho?"

> "Sou engenheiro de formação, programo desde adolescente. O que mais demorou não foi o código — foi limpar os dados. A Carta Social tem campos inconsistentes, instituições com nomes ambíguos, idades implícitas mas não escritas. Construí um algoritmo que olha para o nome e infere o tipo de resposta social — funciona em 88% dos casos."

### "Não é arriscado depender da Carta Social? E se o Estado mudar o formato?"

> "Os dados públicos têm essa fragilidade, sim. Por isso construí 3 camadas de redundância: dataset base (Carta Social), camada de overrides (correções vindas dos pais via app), e camada de extras (creches que se inscrevem por iniciativa própria em /para-creches). Mesmo que a fonte primária mude, a aplicação continua viva."

### "Não vais ganhar dinheiro com isto? Como vives?"

> "Tenho trabalho como engenheiro. O Creches.app é projecto pessoal feito à noite. Não tenho intenção de cobrar a pais nem a creches. Se algum dia precisar de cobrir custos de servidor, ponderaria opções como donations ou patrocínios institucionais — nunca ads ou venda de dados. Mas a base é, e fica, gratuita."

### "O que dizes às creches que não querem aparecer no mapa?"

> "Têm um botão público para pedir saída. Comprometo-me a responder em 7 dias úteis, e o pedido é honrado. Está nos Termos. Mas a maioria das que contactaram quer entrar — não sair. O mapa traz-lhes pais que de outra forma nunca chegariam a saber que existem."

### "Quantos pais usam isto hoje?"

> "[INSERIR número de visitas dos últimos 7 dias do admin]. E está a crescer — depois da cobertura NiT, no primeiro dia tivemos [INSERIR] visitas únicas. O sinal mais forte para mim não é o número de visitas, mas as mensagens que recebo de pais a dizerem 'encontrei a creche aqui'."

### "E se vier alguma startup ou empresa fazer o mesmo, gratuitamente?"

> "Adoraria. O objectivo nunca foi ter o produto — foi ter o problema resolvido. Se outra equipa o resolver melhor, com mais cobertura ou melhor UX, óptimo. O código vai abrir em 2027 precisamente para que ninguém tenha de começar do zero."

### "Tens planos para expandir?"

> "Para já, foco em três coisas: (1) aumentar a qualidade dos dados que já tenho — 26% das fichas ainda precisam de validação de idades; (2) adicionar páginas por freguesia para SEO local; (3) criar uma funcionalidade de 'vagas em tempo real' para creches que queiram comunicá-las. Tudo grátis."

### "Quais foram as maiores dificuldades?"

> "A qualidade dos dados oficiais. Há instituições com nomes ambíguos — uma 'Casa do Sol' pode ser tudo: berçário, ATL, lar de idosos. Ter um algoritmo que separa o que é creche do que não é foi o maior desafio técnico. Cruzar com a Carta Social ajuda, mas há buracos."

---

## 10 · Material visual / multimédia disponível

Tudo descarregável em `creches.app/imprensa`:

- Logo (SVG vetorial + PNG transparente)
- Foto do fundador (alta resolução)
- Screenshots da app (mapa, lista, ficha, mobile)
- Dataset agregado anónimo (CSV, CC-BY 4.0)
- Vídeo 9:16 de 30s (para Stories/Reels)
- Press kit em PDF (12 slides)

---

## 11 · Contactos para a jornalista

- **Email principal:** geral@creches.app
- **Telefone:** [adicionar se quiseres dar — alternativa: pelo email é mais rápido]
- **Disponibilidade:** Lisboa presencial (preferido), telefone, ou vídeo
- **Tempo de resposta típico:** menos de 4 horas em horário útil

---

## Checklist final (antes da entrevista)

- [ ] Abrir `creches.app/admin` e atualizar os 7 valores marcados `⚠ INSERIR`
- [ ] Confirmar handle Instagram da jornalista — pré-seguir e tag em qualquer post de agradecimento depois
- [ ] Levar 1 versão impressa do press kit para a entrevista (se for presencial)
- [ ] Levar o telemóvel com a app aberta — pode ser útil para demonstrar
- [ ] Beber água. Dormir bem na véspera. És bom nisto.
