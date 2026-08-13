# Prompt Higgsfield — vídeo das novas funcionalidades do Creches.app

**Objetivo:** um vídeo vertical de ~30 s que mostra o que a app passou a fazer:
encontrar, contactar, acompanhar e ser avisado. Sem inventar números.

**Formato:** 1080×1920 (9:16), 6 planos de 5 s, cortes secos.
**Modelos:** *Soul* para os fotogramas → *Image-to-Video* (Kling ou Veo) para animar.

---

## ⚠️ LÊ ISTO ANTES DE GERAR — poupa-te horas

**Nenhum gerador de vídeo escreve texto português legível.** Vai sair
"Tenh interese", "creches.aqp", acentos partidos. É a falha número um deste
tipo de vídeo e não se resolve com prompt.

O fluxo que funciona é este:

1. **Fotogramas primeiro.** Ou tiras *screenshots reais* da app (melhor
   opção — é o teu produto, mostra-o a sério), ou geras cada fotograma no
   **Soul** com os prompts da secção B.
2. **Depois animas.** Metes cada fotograma em **Image-to-Video** com o
   preset de câmara indicado. O modelo mexe a imagem, não reescreve o texto.
3. **Texto por cima no fim.** As headlines de cada plano são sobrepostas
   em CapCut/Premiere com a tipografia da marca. Nunca geradas.

Se fores direto a texto-para-vídeo, o texto sai ilegível e o vídeo não serve.

---

## 🎨 BIBLIA VISUAL (colar no início de qualquer geração)

```
IDENTIDADE VISUAL — CRECHES.APP

PALETA (usar exatamente estes valores):
  coral      #FF6B9D    cor principal, botões e destaques
  pêssego    #FF9F68    par de gradiente com o coral
  menta      #7DD389    sinais positivos, vagas, confirmações
  turquesa   #48D1CC    elementos secundários
  amarelo    #FFD166    avisos e alertas suaves
  creme      #FFF6EE    fundo geral, sempre
  navy       #2C2356    todo o texto forte
  cinza-roxo #6E6989    texto secundário
  rosa claro #FFE2EC    fundos suaves de caixas coral
  menta clara#DEF5E1    fundos suaves de caixas verdes

TIPOGRAFIA: geométrica arredondada tipo Fredoka ou Quicksand. Nunca serif,
nunca condensada. Acentuação portuguesa correta e visível: á ã õ ç é ê.

LUZ: difusa, quente, de manhã, vinda de cima e da esquerda. Sombras longas,
suaves, com tom rosado. Nunca sombras duras nem cinzentas.

ESTILO: editorial minimalista, Kinfolk / Vogue Portugal. Quente, adulto,
otimista. Muito espaço em branco. Zero clutter. Zero azul frio. Zero
gradientes néon. Zero estética "tech startup".

TELEMÓVEL: iPhone moderno, titânio grafite neutro, sem capa, sem logo,
bordas finas. Nunca com barra de estado do iOS (horas, bateria, rede).
Nunca com mãos, dedos, pessoas ou caras.
```

---

# A · GUIÃO — 6 PLANOS

| # | Funcionalidade | Preset de câmara | Headline sobreposta |
|---|---|---|---|
| 1 | O mapa nacional | Dolly In lento | Todas as creches do país. Num mapa. |
| 2 | Ordenar por relevância | Crash Zoom Out | As que têm vaga aparecem primeiro. |
| 3 | Tenho interesse | Dolly In + Push | Contactas sem sair da app. |
| 4 | Acompanhar candidatura | Vertical Pan Up | Vês o estado sem criar conta. |
| 5 | Avisos de vaga | Static + Parallax | Avisamos-te quando abrir vaga. |
| 6 | Assinatura | Slow Pull Back | creches.app · grátis, sempre. |

---

# B · PROMPTS DOS FOTOGRAMAS (Soul)

> Cola a **BÍBLIA VISUAL** acima antes de cada um destes blocos.

## ▸ Fotograma 1 — O mapa nacional

```
Imagem vertical 1080x1920. Fundo creme #FFF6EE.

Um iPhone visto de frente, centrado, ligeiramente inclinado 6 graus para a
direita, ocupando 70% da altura. Sombra rosada longa e difusa em baixo à
direita.

NO ECRÃ: o mapa de Portugal continental visto de cima, desenhado de forma
limpa e editorial — terra em creme quente #FFF6EE, mar em turquesa muito
claro e esbatido, fronteiras dos concelhos em linhas finíssimas cinza-rosa
quase impercetíveis. Sobre o mapa, muitas dezenas de pequenos marcadores
circulares em coral #FF6B9D, concentrados em Lisboa e Porto e espalhados
por todo o território até ao Algarve. Alguns marcadores, poucos, são verde
menta #7DD389 e ligeiramente maiores, com um anel branco à volta.

No topo do ecrã, uma barra de pesquisa arredondada branca com sombra muito
suave e, dentro dela em cinza-roxo #6E6989, o texto: Procurar creche ou
localidade

Sem texto adicional no ecrã. Sem números. Sem barra de estado do iOS.

Composição com muito ar em cima e em baixo, para sobrepor texto depois.
```

**→ Animar com:** *Dolly In* muito lento, 5 s. O mapa aproxima-se
suavemente, os marcadores ganham presença. Nada mais se mexe.

---

## ▸ Fotograma 2 — Ordenar por relevância

```
Imagem vertical 1080x1920. Fundo creme #FFF6EE.

iPhone de frente, centrado, sem inclinação, a ocupar 75% da altura.

NO ECRÃ: uma lista vertical de quatro cartões de creche, cantos muito
arredondados, fundo branco, sombra ténue.

O PRIMEIRO cartão está destacado: tem uma borda fina verde menta #7DD389 e,
no canto superior direito, uma pequena etiqueta arredondada verde menta
clara #DEF5E1 com um ponto verde e o texto verde-escuro: Tem vaga

Dentro de cada cartão: à esquerda um quadrado arredondado com gradiente
coral #FF6B9D para pêssego #FF9F68 com um emoji de biberão; à direita, o
nome de uma creche fictícia portuguesa em navy #2C2356 negrito, e por baixo
uma linha cinza-roxo #6E6989 mais pequena com uma freguesia.

Usar estes nomes fictícios, por esta ordem:
  Centro Infantil O Caracol
  Creche Pequenos Passos
  Jardim da Nossa Senhora
  Infantário A Cegonha

Acima da lista, uma pequena barra com um seletor arredondado branco, com o
texto em navy: Ordenar por: Relevância

Sem números. Sem barra de estado do iOS.
```

**→ Animar com:** *Crash Zoom Out* suave, 5 s. Começa fechado no primeiro
cartão e abre para mostrar a lista inteira.

---

## ▸ Fotograma 3 — Tenho interesse

```
Imagem vertical 1080x1920. Fundo creme #FFF6EE com gradiente radial muito
subtil para rosa claro #FFE2EC nos cantos superiores.

iPhone de frente, centrado, a ocupar 78% da altura.

NO ECRÃ, de cima para baixo:

  1. Cabeçalho com gradiente diagonal coral #FF6B9D para pêssego #FF9F68.
     Dentro, à esquerda, um quadrado branco translúcido com um emoji de
     biberão. Ao lado, em branco negrito: Centro Infantil O Caracol
     Por baixo, duas etiquetas pill brancas translúcidas com texto branco
     pequeno: IPSS   e   Lisboa

  2. Corpo creme. O elemento MAIS DESTACADO da imagem: um botão retangular
     grande, de cantos muito arredondados, a toda a largura, com gradiente
     coral #FF6B9D para pêssego #FF9F68, sombra rosada suave por baixo, e
     texto branco negrito centrado:
     💌 Tenho interesse

  3. Por baixo do botão, duas linhas de texto pequeno centrado em cinza-roxo
     #6E6989:
     Deixas o contacto, enviamos o pedido à creche
     e avisamos-te se não responderem

  4. Uma faixa verde menta clara #DEF5E1 com borda verde #7DD389, cantos
     arredondados, com um ícone de balão de fala à esquerda e texto
     verde-escuro pequeno:
     Costuma responder às famílias

  5. No rodapé do ecrã, duas barras esbatidas cinza claro a simular texto,
     sem legibilidade obrigatória.

Sem números. Sem barra de estado do iOS.
```

**→ Animar com:** *Dolly In* + leve *Push*, 5 s. A câmara aproxima-se do
botão coral, que ganha um brilho muito subtil ao centro. Sem cliques
simulados, sem dedos.

---

## ▸ Fotograma 4 — Acompanhar a candidatura

```
Imagem vertical 1080x1920. Fundo creme #FFF6EE.

iPhone de frente, centrado, a ocupar 78% da altura.

NO ECRÃ: uma linha do tempo vertical, à esquerda, com quatro pontos ligados
por uma linha fina vertical.

  Ponto 1 — círculo cheio coral #FF6B9D com um visto branco.
     Título navy negrito: Pedido enviado
     Subtítulo cinza-roxo pequeno: Enviámos o teu contacto à creche

  Ponto 2 — círculo cheio coral #FF6B9D com um visto branco.
     Título navy negrito: Creche contactada
     Subtítulo cinza-roxo pequeno: Recebeu o pedido por email

  Ponto 3 — círculo cheio verde menta #7DD389 com um visto branco, com um
     halo verde suave à volta.
     Título navy negrito: A creche respondeu
     Subtítulo cinza-roxo pequeno: Vê a resposta no teu email

  Ponto 4 — círculo vazio, apenas contorno cinza claro, ainda por cumprir.
     Título cinza claro: Resultado da candidatura

No topo do ecrã, uma faixa creme mais escura com cantos arredondados e o
texto pequeno centrado em cinza-roxo #6E6989:
Link privado — não precisas de criar conta

Sem números. Sem datas. Sem barra de estado do iOS.
```

**→ Animar com:** *Vertical Pan Up* lento, 5 s. A câmara sobe pela linha do
tempo, de baixo para cima, terminando no ponto verde.

---

## ▸ Fotograma 5 — Avisos de vaga

```
Imagem vertical 1080x1920. Fundo creme #FFF6EE.

iPhone de frente, ligeiramente inclinado 5 graus para a esquerda, a ocupar
70% da altura.

NO ECRÃ, centrado verticalmente com muito ar à volta:

  1. Um ícone grande e simples de sino, desenhado em traço arredondado,
     em coral #FF6B9D, dentro de um círculo rosa claro #FFE2EC.

  2. Por baixo, título em navy #2C2356 negrito, duas linhas centradas:
     Não tens de andar a
     verificar todos os dias

  3. Subtítulo cinza-roxo #6E6989, centrado:
     Avisamos-te por email assim que abrir vaga

  4. Um botão de cantos totalmente arredondados, gradiente coral #FF6B9D
     para pêssego #FF9F68, texto branco negrito centrado:
     🔔 Avisa-me quando abrir vaga

FLUTUANDO FORA DO ECRÃ, à direita e ligeiramente acima do telemóvel, um
cartão de notificação branco pequeno com cantos arredondados e sombra
suave, inclinado 8 graus, com uma barra lateral verde menta #7DD389 à
esquerda e, dentro, texto pequeno navy negrito numa linha e cinza-roxo
noutra:
  Abriu vaga perto de ti
  Centro Infantil O Caracol

Sem números. Sem barra de estado do iOS.
```

**→ Animar com:** câmara *estática* com *parallax* muito ligeiro, 5 s. O
cartão de notificação entra a flutuar da direita, com uma sombra que se
move com ele. O telemóvel fica quieto.

---

## ▸ Fotograma 6 — Assinatura

```
Imagem vertical 1080x1920. Sem telemóvel. Composição puramente tipográfica.

Fundo creme #FFF6EE com um gradiente radial muito subtil, saindo do centro
para rosa claro #FFE2EC nas margens.

Ao centro, com muitíssima respiração à volta:

  1. Um emoji de biberão grande, isolado, no terço superior.

  2. Por baixo, em navy #2C2356 negrito, fonte geométrica arredondada,
     grande, duas linhas centradas:
     Todas as creches
     de Portugal

  3. Por baixo, em cinza-roxo #6E6989, regular, claramente mais pequeno:
     Grátis para as famílias. Grátis para as creches.

  4. Mais abaixo, uma pill de cantos totalmente arredondados, com gradiente
     coral #FF6B9D para pêssego #FF9F68, sombra rosada suave, com texto
     branco negrito centrado:
     creches.app

Muito espaço em branco. Nada mais na imagem. Sem números.
```

**→ Animar com:** *Slow Pull Back*, 5 s. A câmara afasta-se devagar, a
composição respira, o gradiente do fundo pulsa quase impercetivelmente.

---

# C · NEGATIVE PROMPT (colar em todas as gerações)

```
números, dígitos, percentagens, contadores, estatísticas, badges numéricos,
notificações com números, gráficos, dashboards com métricas;

mãos, dedos, braços, pessoas, caras, crianças, bebés, educadoras;

barra de estado do iOS, horas, bateria, sinal de rede, ícones de apps,
notch, dynamic island, teclado, cursor, ponteiro de rato;

logos de marcas reais, nomes de creches reais, marcas de água, assinaturas;

fontes serif, fontes condensadas, letras distorcidas, texto cortado,
caracteres errados, acentos partidos, inglês, português do Brasil,
"celular", "você", "aplicativo";

azul frio, roxo néon, verde-lima, preto puro, cinzento industrial,
gradientes saturados, brilho néon, efeito glassmorphism exagerado;

ilustração infantil, cartoon, clipart, 3D render frio, fotografia de stock,
estética de publicidade de telecomunicações, lens flare, bokeh exagerado;

molduras, bordas, vinhetas, ruído, grão, aberração cromática, texturas
sujas, papel amarrotado.
```

---

# D · MONTAGEM

**Ordem e tempos:** 1 → 2 → 3 → 4 → 5 → 6, cinco segundos cada, cortes
secos. Total 30 s.

**Texto sobreposto** (adicionar em CapCut/Premiere, nunca gerar):
fonte Fredoka SemiBold, navy #2C2356, entrada com fade de 300 ms no
segundo 1 de cada plano, saída no segundo 4.

| Plano | Texto a sobrepor |
|---|---|
| 1 | Todas as creches do país. Num mapa. |
| 2 | As que têm vaga aparecem primeiro. |
| 3 | Contactas sem sair da app. |
| 4 | Acompanhas sem criar conta. |
| 5 | Avisamos-te quando abrir vaga. |
| 6 | *(sem sobreposição — o texto já está no fotograma)* |

**Som:** piano ou marimba, andamento lento, tom quente e otimista. Sem voz
off. Sem efeitos sonoros de notificação — soa a publicidade barata.

---

# E · CHECKLIST ANTES DE PUBLICAR

- [ ] **Não há um único número em todo o vídeo**
- [ ] Todo o texto está em português de Portugal, com acentos corretos
- [ ] "Tenho interesse" e "Avisa-me quando abrir vaga" estão escritos exatamente assim
- [ ] Os nomes das creches são fictícios — nunca uma creche real do mapa
- [ ] Não há mãos, dedos, caras nem crianças em nenhum plano
- [ ] Não há barra de estado do iOS em nenhum ecrã
- [ ] O coral é o da marca (#FF6B9D), não rosa-choque
- [ ] Não há uma única palavra em inglês
- [ ] Todas as funcionalidades mostradas **existem mesmo** na app
- [ ] O vídeo não promete nada que a app não faça

---

# F · LEGENDA PARA PUBLICAR

```
O que mudou no creches.app. 🍼

Continuamos a ser o mapa de todas as creches, jardins de infância e
infantários de Portugal — em todos os 308 concelhos. Mas encontrar
nunca foi o problema todo.

Agora também:

✓ As creches com vaga aparecem primeiro
✓ Contactas a creche sem sair da app
✓ Acompanhas o pedido num link privado, sem criar conta
✓ Se a creche não responder, avisamos-te
✓ Pedes para ser avisado quando abrir vaga

E para as creches, um painel gratuito para gerir a página e as vagas.

Grátis para as famílias. Grátis para as creches. Sem publicidade e sem
venda de dados — hoje e sempre.

→ creches.app

#crechesapp #maternidadept #paternidadept #creches #vagacreche
#listadeespera #portugal #educacaoinfantil #maesportuguesas #paisportugueses
```

---

# G · SE ALGO CORRER MAL

**Texto ilegível no ecrã** → Não insistas no prompt. Volta atrás e usa um
screenshot real da app como fotograma inicial. É o caminho certo, não o
atalho.

**O telemóvel parece um render frio de publicidade** → acrescenta ao prompt:
*"apresenta o telemóvel como uma ilustração vetorial plana e editorial, não
como render fotorrealista; mantém a paleta e os textos exatamente iguais"*.

**Movimento de câmara demasiado agressivo** → baixa a intensidade do preset
para 30–40%. Este vídeo é calmo por opção; um crash zoom violento contradiz
o tom do produto.

**A imagem sai fria ou azulada** → acrescenta: *"temperatura de cor quente,
luz de manhã, sem qualquer tom azul ou cinzento na imagem"*.

**Aparecem números do nada** → regenera com o negative prompt e acrescenta:
*"o ecrã não pode conter um único dígito"*.
