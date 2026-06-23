# Higgsfield Prompt ÚNICO — Post final pronto (sem Canva)

**1 prompt. 1 geração. Imagem final pronta para Instagram.**

Formato: 1080×1080 (quadrado feed)

---

## ⚙️ SETUP

1. No Higgsfield, modo Computer / Super Computer
2. Cola `higgsfield-brand-bible.md` como contexto permanente (se ainda não está)
3. **Modelo recomendado:** Ideogram 2.0 ou Flux 1.1 Pro (renderizam texto bem)
4. Cola o prompt abaixo

---

## 🎯 PROMPT (copia tudo)

```
Use the Creches.app brand bible.

Generate a 1080x1080 square Instagram post (final image, ready to
publish — text included).

LAYOUT:
- Upper 60% of image: a soft, warm, photographic background showing
  the interior of a small Portuguese childcare center (creche).
  Cream-painted walls, terracotta tile floor, one small wooden shelf
  with soft natural-colored wooden toys, one azulejo tile detail
  blurred in the background. Window with white linen curtain letting
  in warm golden morning light from upper-left. NO PEOPLE in the
  image. Soft bokeh, editorial Vogue Portugal aesthetic, slight
  film grain. Warm color grading — cream, peach, coral whisper,
  navy shadows. NO blue tint.
- Lower 40% of image: a clean cream-colored panel (color HEX
  #FFF6EE) with rounded top corners, occupying the bottom of the
  square. This panel contains the text.

TEXT TO RENDER (must appear exactly as written, in Portuguese from
Portugal):

Headline (large, bold rounded sans-serif, color deep navy HEX
#2C2356, two lines, centered):
"A tua creche não está
no mapa?"

Subhead (medium, regular rounded sans-serif, color soft purple-gray
HEX #6E6989, one line, centered, below headline):
"Adiciona-a em 30 segundos. Grátis."

CTA pill (rounded pill button, gradient background from coral HEX
#FF6B9D to peach HEX #FF9F68 left-to-right diagonal, white bold text
inside, centered below subhead):
"creches.app/para-creches"

Small text (very small, regular, color faint gray HEX #9B97B5,
centered at very bottom):
"🍼 Creches.app"

TYPOGRAPHY:
- Use a rounded geometric sans-serif font similar to Fredoka or
  Quicksand for ALL text
- NEVER use serif fonts (no Times, no Georgia)
- Text must be PERFECTLY LEGIBLE, sharp, no distortion
- Portuguese characters (ã, á, í, ç) must render correctly

OVERALL STYLE:
- Editorial Vogue Portugal aesthetic
- Warm, hopeful, intimate
- Clean, minimal, NOT cluttered
- Brand colors: cream background, coral pink accent, peach orange
  accent, deep navy text
- Soft shadows, generous rounded corners

NEGATIVE: no cartoon, no illustration, no people, no babies in image,
no stock-photo aesthetic, no fake smiles, no blue tint, no cool color
grading, no neon, no watermark, no distorted text, no broken
Portuguese characters, no English text, no Brazilian Portuguese, no
glossy plastic look, no oversaturation, no harsh shadows, no
serif fonts.

Output a single high-resolution square image, 1080x1080, ready to
publish on Instagram with no further editing needed.
```

---

## 💡 SE O TEXTO SAIR MAL

Se o Higgsfield falhar no texto português (caracteres ã/ç/í errados),
prova estas variações:

### Variação A — só ASCII no texto (sem acentos)

Substitui no prompt:
- `A tua creche nao esta no mapa?`
- `Adiciona-a em 30 segundos. Gratis.`

Depois corriges os acentos em 30 seg num editor simples (Preview ou
Photos) ou voltas a fazer e usas a outra variação.

### Variação B — texto numa "etiqueta" separada

Acrescenta no prompt antes de TYPOGRAPHY:

```
The text panel should look like a hand-printed sticker / label
attached to the lower part of the image, with subtle paper texture
and slight shadow underneath. Make the text feel typeset like
high-end editorial print, not like AI-generated.
```

### Variação C — modelo diferente

Se Ideogram falhar → tenta **Flux 1.1 Pro Ultra** ou **Imagen 3**.
Para texto perfeito em PT-PT, **Ideogram 3.0** é o melhor.

---

## ✅ CHECKLIST APÓS GERAÇÃO

Antes de publicar, confirma na imagem:

- [ ] "A tua creche não está no mapa?" — sem erros, com ã e ?
- [ ] "Adiciona-a em 30 segundos. Grátis." — com á em Grátis
- [ ] "creches.app/para-creches" — URL bem escrito
- [ ] Cores: cream + coral + peach + navy (NÃO azul)
- [ ] Sem caras humanas (queremos foco no espaço, não em pessoa
      específica)
- [ ] Aspect ratio 1:1 quadrado
- [ ] Texto legível sem aproximar

Se passar tudo → publica direto. Caption pronta em
`instagram-caption-creche-nao-aparece.md`.
