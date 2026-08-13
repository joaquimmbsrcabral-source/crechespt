# Avaliação completa do creches.app

**Data:** 13 de agosto de 2026
**Método:** quatro auditorias independentes — segurança e backend, UX e acessibilidade,
SEO e produção, qualidade dos dados — com verificação directa das conclusões críticas.
Todos os números foram calculados sobre o código e o dataset reais.

---

## Veredicto em cinco linhas

A engenharia é boa e, em vários pontos, melhor do que a de produtos com equipa.
A segurança está bem pensada onde foi pensada, e tem um buraco que pode custar a
conta de email numa tarde. A experiência tem um defeito de duas linhas que
sabota a conversão em 1.906 páginas. E o problema mais sério não é técnico: é
que **o produto afirma como facto aquilo que o pipeline gerou por defeito.**

O activo — o mapa — é real. A confiança que o site projecta sobre ele não é.

---

## 1. As sete coisas que eu corrigia esta semana

Por ordem de urgência. As cinco primeiras são horas de trabalho, não dias.

### 1.1 · 521 estabelecimentos públicos estão marcados como "Privada" — e dizemos aos pais que têm de pagar
**Risco: crítico. Custo de correcção: uma hora.**

521 dos 898 registos classificados "Privada" têm email `@escolas.min-edu.pt`,
ou seja, são da rede pública do Ministério da Educação. Exemplos verificados:
*Jardim de Infância "Chuxinhas"* (`ji.chuxinhas@escolas.min-edu.pt`),
*Colégio Santiago*, *Casa das Abelhinhas*.

O `gerar_fichas.py` escreve, em todas as fichas de tipo "Privada":

> "X é privada. As creches privadas só são gratuitas se forem aderentes ao
> programa Creche Feliz…"

Estamos a dar informação errada sobre gratuitidade em 521 páginas indexadas, a
famílias que estão precisamente a tentar perceber o que vão pagar. É o único
erro do site que magoa alguém directamente.

**Correcção:** regra determinística — email `@escolas.min-edu.pt` → `tipo: "Pública"`,
com `tipo_inferido: true`. Regenerar as fichas.

---

### 1.2 · O selo "✓ Contactos verificados" está em 1.828 fichas e não verifica nada
**Risco: crítico. Custo: três linhas.**

`scripts/gerar_fichas.py:489`:

```python
else:
    banner = '<div class="q-banner ok">✓ Contactos verificados</div>'
```

A condição é apenas "tem telefone **e** email". Nenhum foi testado. Vieram do
OpenStreetMap. Só 107 registos passaram alguma vez pelo agente de enriquecimento
e 214 têm confirmação da Carta Social.

Um jornalista precisa de três telefonemas para desmontar isto, e a resposta
honesta — "o código põe o selo sempre que existem os dois campos" — não
sobrevive a ser citada. Ainda por cima num projecto cuja credibilidade pública
foi construída sobre rigor de dados.

**Correcção:** o selo só quando existir `enriquecido_em` ou `carta_social_id`.
Para os restantes: *"Contactos do OpenStreetMap — confirma antes de ligar."*

---

### 1.3 · `/api/lead-notify` é um enviador de email aberto ao mundo
**Risco: crítico. Custo: meio dia.**

A coleção `creche_leads` aceita `create` de qualquer pessoa não autenticada, e o
endpoint só verifica que o lead existe e tem menos de 10 minutos. O endereço de
destino vem do próprio lead:

```js
to: [lead.email],   // controlado por quem cria o lead
```

Um script cria N leads e chama o endpoint N vezes. Cada chamada dispara **dois
emails** pela nossa conta Resend — um para a creche real, outro para onde o
atacante quiser — com o nosso domínio, DKIM e branding. Resultado possível:
quota queimada, conta suspensa, reputação do domínio destruída, e qualquer
creche do mapa a levar com email-bombing em nosso nome.

O `Access-Control-Allow-Origin` não protege nada: CORS é uma regra do browser e
o `curl` ignora-a. Não há rate limiting em nenhum endpoint.

**Correcção:** exigir token de Firebase App Check no POST (o SDK já está
carregado no cliente) e limitar por IP e por `creche_id`.

---

### 1.4 · O formulário de contacto faz zoom no iPhone — em 1.906 fichas
**Risco: alto, e é dinheiro. Custo: dois minutos.**

`perfil-creche.js:133`:

```js
var INPUT_CSS = "...font-size:.92rem;..."
```

`.92rem` = 14,72px. Abaixo de 16px, o Safari iOS amplia a página ao focar o
campo — **e não volta atrás**. A mãe fica com a página ampliada e o botão
"Enviar à creche" fora do ecrã.

O `app.css` tem a regra que corrige isto (`font-size:16px !important` abaixo de
820px), mas as fichas não carregam o `app.css`. Ou seja: está corrigido no mapa
e partido nas 1.906 páginas onde a maioria das pessoas entra, vinda do Google.

É a correcção com melhor retorno de todo o relatório.

**Correcção:** `font-size:16px`. Também em `gerar_fichas.py:790`.

---

### 1.5 · Bug de conversão: 41 escolas aparecem a aceitar bebés
**Risco: alto (ridículo à vista desarmada). Custo: quinze minutos.**

Quando o campo `grades` do OSM tem limite superior acima de 5, a conversão
anos→meses não é aplicada. `grades="3-9"` (3 a 9 **anos**) fica gravado como 3 a
9 **meses**.

Verificado: *Jardim de Infância "O Girassol"*, *1º Jardim-Escola João de Deus*,
*Escola Básica do 1º Ciclo de Igreja* — todos listados como aceitando bebés de 3
a 9 meses. A *Escola Básica de Tondela* aparece a aceitar bebés dos 6 aos 14 meses.

**Correcção:** se o limite superior de `grades` for >5, multiplicar por 12.

---

### 1.6 · O mapa live está 18 dias atrasado — e esconde o nosso melhor trabalho
**Risco: alto. Custo: correr um script.**

O `app.html` tem o dataset embutido em gzip+base64 (245 KB) e é esse o caminho
principal — o `fetch("/creches_pt.json")` é apenas fallback para Safari antigo.
O embutido é de 26 de julho. Divergências face ao ficheiro actual:

| Campo | Registos divergentes |
|---|---:|
| `concelho` | 2.591 (o campo nem existe no embutido) |
| `idade_min_meses` | 171 |
| `email` | 102 |
| `tipo` | 71 |
| `telefone` | 32 |

As 171 creches que confirmámos com a Carta Social como aceitando bebés a partir
dos 4 meses **continuam invisíveis no filtro de idade do mapa**. O trabalho de
validação oficial mais valioso que fizemos não chegou ao produto.

**Correcção:** regenerar o bloco embutido, e acrescentar um teste que falha o
build se divergir do ficheiro.

---

### 1.7 · As 20 páginas de distrito listam creches do distrito errado
**Risco: alto para o tráfego orgânico. Custo: correr o gerador.**

Nunca foram regeneradas depois da correcção de distritos. `creches/guarda.html`
lista 60 fichas, das quais **só 31 são da Guarda** — 25 são de Viseu. A página de
Lisboa diz 497 creches quando os seus 16 concelhos somam 526.

São as páginas mais linkadas do site (2.529 das 2.578 fichas apontam para elas) e
os números errados propagam-se à homepage.

---

## 2. O problema de fundo: confiança a fingir

Isto não é um bug, é uma decisão de produto que ficou por tomar.

| O que mostramos | O que temos |
|---|---|
| 2.591 creches | 2.591 equipamentos de infância. **1.822 (70%) são jardim de infância puro** — 3 aos 5 anos, não aceitam bebés |
| Idades afirmadas como facto em 2.578 FAQ estruturados no Google | **91,7% não têm fonte.** 64% são o default do OSM (`grades="3-5"`). Só 214 (8,3%) têm confirmação oficial |
| "Todas as creches de Portugal num só mapa" | Na Área Metropolitana de Lisboa — a região melhor mapeada — temos **33%** do que a Carta Social conhece. Faltam 444 creches oficiais |
| Filtro "aceita bebés" devolve 737 resultados | 214 confirmados, 41 são o bug do ponto 1.5, **482 são inferência não verificada** |
| "77% com contactos verificados" | 78% têm *algum* contacto. Verificados, 4,1% |

**O que a Segurança Social encontraria em vinte minutos:** pega na Carta Social
de Lisboa (198 creches), encontra 49 no nosso mapa. Inverte, e dos nossos 130
registos de Lisboa, 81 não constam como creche. Conclusão dupla: *têm um quarto
das creches que existem, e um terço do que mostram não são creches.*

**A boa notícia:** nada disto exige dados novos. Os quatro problemas mais graves
resolvem-se com o que já está no ficheiro. E há uma versão desta história que é
melhor do que a actual — *"somos o único directório de Portugal que diz de onde
vem cada campo"* é uma posição mais forte, e mais defensável, do que uma
confiança uniforme que não se aguenta a um telefonema.

**Correcção estrutural:** um campo `confianca` por dado (`oficial` / `osm` /
`inferido`). Idades sem fonte saem do JSON-LD e passam a *"Idades indicativas
(OpenStreetMap) — confirma com a instituição"*. E os números públicos passam a
ser: *"2.591 equipamentos de infância, dos quais 737 com valência de creche —
214 confirmados pela Carta Social."*

---

## 3. Buracos por onde se perdem pessoas

### 571 fichas (22%) são becos sem saída
Sem telefone nem email, o gerador não produz acção nenhuma
(`gerar_fichas.py:461`: `cta_primary = ""`). Resta um banner amarelo que **pede
ajuda ao pai** em vez de o ajudar. Uma em cada cinco pessoas que chega do Google
não tem nada que possa fazer.

**Correcção:** CTA alternativo — *"Ver as creches mais próximas com contacto"* (a
função `vizinhas()` já existe) — mais captura de lead: *"avisamos-te quando
descobrirmos o contacto desta creche"*. Converte 22% de páginas mortas em pipeline.

### Dizemos "faz 3 a 5 candidaturas" e bloqueamos à terceira
`candidatura.html:100` aconselha 3-5 candidaturas em paralelo.
`perfil-creche.js:73` bloqueia às 3 por dia, com a mensagem *"Já enviaste 3
pedidos hoje. Tenta amanhã."* Uma mãe segue o nosso conselho e é tratada como
abusadora, exactamente no momento em que estava a fazer o que queremos.

### `/app` abre com ecrã branco
O shell só aparece depois de descarregar 429 KB, parsear 2.591 registos e
**esperar por duas leituras completas do Firestore** que estão dentro de um
`await` (com um comentário no código a dizer que não bloqueiam — bloqueiam). Sem
spinner, sem skeleton. Com rede fraca, não há forma de saber se está a carregar
ou partido.

### Nenhuma ficha linka para a sua página de concelho
2.529 fichas linkam para a página de distrito (que está errada, ver 1.7). Zero
linkam para o concelho. As 275 páginas de concelho — as melhores páginas do site,
e as que devem rankear para *"creches em Sintra"* — recebem autoridade interna de
apenas 16 links. Meter o concelho no breadcrumb são 2.578 links novos apontados
ao sítio certo. É o maior ganho estrutural de SEO disponível.

### Contraste: a acção principal é a menos legível
O botão "💌 Tenho interesse" é coral `#FF6B9D` sobre branco: **2,68:1**, quando o
mínimo WCAG é 4,5:1. E a frase que gera confiança — *"Deixas o contacto, enviamos
o pedido à creche"* — é branca a 12px sobre amarelo `#FFD166` nas 1.009 fichas de
creches públicas: **1,44:1**. Praticamente invisível.

---

## 4. O que está bem feito

Não é cortesia. É metade do relatório.

**Segurança onde foi pensada.** A verificação HMAC dos links de email é correcta:
valida o formato antes do `timingSafeEqual` (evitando o `RangeError` clássico) e
inclui a resposta no HMAC, pelo que quem tem o link do "sim" não consegue derivar
o do "não". A verificação do webhook Svix é textbook — body cru preservado,
anti-replay de 5 minutos, recusa liminar se o segredo não estiver configurado.
Todos os endpoints de cron estão protegidos. Os destinatários são sempre
resolvidos no servidor, nunca ditados pelo pedido. Zero segredos no repo ou no
histórico git.

**Geografia impecável.** 2.591 coordenadas, todas dentro de Portugal, sem (0,0),
sem duplicados exactos, sem precisão degradada. A atribuição de concelho por
point-in-polygon sobre a CAOP reproduz-se com **zero discrepâncias**. Telefones
99,7% válidos, emails 100% sintaticamente válidos. Isto defende-se em qualquer sala.

**Dados estruturados sem um único erro.** 7.734 blocos JSON-LD validados, zero
malformados, campos obrigatórios todos presentes — e a disciplina de **não
inventar `aggregateRating`**, que é o erro clássico dos directórios locais.
Cobertura sitemap↔ficheiros de 100% nos dois sentidos, em 2.983 URLs.

**Decisões de privacidade tomadas de propósito.** O `resposta-inbound` não guarda
corpo, assunto nem anexos. O `lead-resultado` agrega por concelho e nunca por
creche. O texto de RGPD do formulário é o mais claro que se vê num site
português: *"registamos que houve resposta e quando, nunca o conteúdo"*.

**Honestidade estatística onde ninguém ia reparar.** A taxa de resposta só é
mostrada quando é positiva, porque a amostra está enviesada. Está escrito no
código, com a justificação.

**Atenção ao contexto real das pessoas.** Tratamento da Visual Viewport API para
a barra do Safari iOS. `env(safe-area-inset)` em todas as páginas.
`prefers-reduced-motion` global. Detecção de browsers embutidos do Instagram com
instruções para sair. `sendBeacon` com fallback para o aviso à creche sobreviver
ao fecho do separador. Escrita incremental no gerador.

**Acompanhamento sem conta.** Token de 128 bits, `onSnapshot` em tempo real,
espelho público sem dados pessoais. É desenho de produto de bom nível.

**E o principal: sem publicidade, sem venda de dados, e a dizê-lo em todo o lado.**
Numa categoria cheia de agregadores predatórios, isso não é uma nota de rodapé —
é o produto.

---

## 5. Plano de execução

### Hoje (uma tarde, tudo num deploy)
1. `perfil-creche.js:133` → `font-size:16px` · **2 minutos, o mais rentável do lote**
2. Reclassificar os 521 `@escolas.min-edu.pt` → Pública
3. Selo "Contactos verificados" só com `enriquecido_em` ou `carta_social_id`
4. Corrigir o bug anos→meses (41 registos)
5. Regenerar o dataset embutido no `app.html`
6. Regenerar as 20 páginas de distrito e as contagens da homepage
7. `perfil-creche.js:73` → limite de 3 para 8 pedidos/dia, e reescrever a mensagem
8. Cor do botão principal → `--c-coral-dk` (#C2185B, 6,0:1)

### Esta semana
9. App Check + rate limit no `/api/lead-notify`
10. Tirar `reportado_por.email` da coleção pública `vagas` (expõe emails de gestores)
11. Concelho no breadcrumb das 2.578 fichas
12. Campo `confianca` por dado + reescrever os números públicos
13. Actualizar a política de privacidade (não menciona leads, alertas nem newsletter)
14. CTA alternativo nas 571 fichas sem contacto

### Próximas semanas
15. Terminar a Carta Social nacional (tarefas CS1–CS3, já em backlog) — é a única
    acção que muda a natureza do dataset
16. Importar as 444 creches oficiais da AML em falta
17. Skeleton no boot do `/app` e Firestore fora do caminho crítico
18. Botão de guardar próprio no cartão de Vagas do painel

---

## Nota sobre o repositório

`git fsck` acusa referências corrompidas (`refs/heads/main 2`, com espaço no
nome — provável artefacto de sincronização do iCloud). O `git fetch` falha. Vale
a pena reparar antes do próximo deploy.
