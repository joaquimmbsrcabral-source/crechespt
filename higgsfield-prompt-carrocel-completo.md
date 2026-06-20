# Higgsfield Computer — Prompt único do carrocel (sem Canva)

**Como usar:**
1. No Higgsfield Computer / Super Computer mode
2. **Primeiro** cola o conteúdo do `higgsfield-brand-bible.md` como contexto
3. **Depois** cola o prompt abaixo
4. Higgsfield Computer gera os 6 slides com texto incluído, em ordem
5. Download dos 6 PNGs

---

## ⚠ Aviso

A geração de **texto dentro de imagens** por AI tem fiabilidade limitada 
em todos os modelos (Higgsfield incluído). Para garantir qualidade:

- Os prompts estão optimizados para texto curto e claro
- Pedem fonte rounded sans-serif sólida (que AI consegue renderizar 
  melhor que fontes custom)
- Acentos PT podem aparecer errados — verifica antes de publicar
- Se algum slide sair mal, regera só esse slide com o prompt individual 
  (também incluído no fim deste ficheiro)

---

## 🎯 PROMPT MASTER (cola directamente no Higgsfield Computer)

```
TASK: Generate 6 Instagram carousel slides for Creches.app — a Portuguese 
childcare mapping platform. Each slide must be 1080×1350 pixels (4:5 
portrait aspect ratio), with all text rendered DIRECTLY in the design 
(not added later). All text in European Portuguese (PT-PT, not Brazilian).

Use the Creches.app Brand Bible loaded earlier as visual reference.

UNIVERSAL VISUAL RULES (apply to ALL 6 slides):
- Background: warm cream color #FFF6EE, with very subtle radial gradient 
  blooms in upper-left (coral pink #FFE3EE) and upper-right (peach 
  #FFE8D6), blurred and soft
- Header on every slide: small circular gradient logo (coral #FF6B9D to 
  peach #FF9F68) with a simple white house silhouette inside, placed 
  top-center, with "Creches.app" wordmark to the right in bold rounded 
  sans-serif (Fredoka-style), navy #2C2356
- Footer on every slide: small text "[slide number]/6 · creches.app" 
  centered at the bottom, in soft purple-gray #9B97B5
- All titles: BOLD rounded sans-serif (Fredoka or similar like Nunito 
  Black), navy #2C2356, large
- All body text: medium rounded sans-serif (Quicksand-style), soft 
  purple-gray #6E6989
- All cards: white background #FFFFFF, soft drop shadow, generously 
  rounded corners (24px), optional 5px colored left border
- Icon style: filled colored circles with simple white symbol inside 
  (use ✓, ★, ?, ⚡, ×, simple letters — NEVER complex emoji)
- Whitespace: generous, never crowded
- NO watermarks, NO additional logos, NO ads
- Consistent visual language across all 6 slides

GENERATE 6 SLIDES IN THIS ORDER:

═══════════════════════════════════════════════════════════
SLIDE 1 — COVER
═══════════════════════════════════════════════════════════
- Center: bold title in 2 lines:
  Line 1: "O QUE ESTAMOS"
  Line 2: "A CONSTRUIR"
  Use Fredoka-style bold font, very large (~110pt equivalent), 
  navy #2C2356
- Below title: subtitle "O roadmap da Creches.app" in medium weight, 
  smaller, soft purple-gray
- Below subtitle: a small pill-shaped badge with mint green background 
  #DEF5E1, dark green text #1F6E37, saying "📅 Página viva" 
  (with calendar emoji)
- Center bottom: simple flat illustration of Portugal map outline 
  (Iberian peninsula shape, terracotta/sandy color) with 5-6 small 
  colored map pins on it (coral, peach, turquoise, mint, yellow), 
  abstract and minimal
- Footer text: "creches.app/roadmap" centered, slightly above the 
  page number footer
- Page footer: "1/6"

═══════════════════════════════════════════════════════════
SLIDE 2 — "JÁ ESTÁ EM PRODUÇÃO" (DONE)
═══════════════════════════════════════════════════════════
- Top section: 
  - Solid mint green circle (50px) with white check ✓ symbol on the left
  - Title to the right: "Já está em produção" in bold rounded font, 
    navy color
- Subtitle below: "Funciona hoje. Podes usar agora." soft purple-gray
- Body: 2 columns × 3 rows grid of 6 white rounded cards (24px corners), 
  each card with soft shadow and 5px mint green left border. Each card 
  contains:
  - Top-left: small colored circle (different category color per card: 
    coral, peach, turquoise, mint, yellow, coral) with a simple white 
    symbol inside (avoid emoji — use letter or geometric shape)
  - Title in bold next to the circle
  
  Card 1: coral circle + "M" symbol → "Mapa nacional"
  Card 2: peach circle + "📍" geometric pin → "Pesquisa por GPS"
  Card 3: turquoise circle + "I" letter → "Filtros por idade"
  Card 4: mint circle + "★" star → "Favoritas"
  Card 5: yellow circle + "L" letter → "4 guias gratuitos"
  Card 6: coral circle + "▢" rounded square → "Instalável como app"
- Footer: "2/6 · creches.app"

═══════════════════════════════════════════════════════════
SLIDE 3 — "EM CURSO AGORA" (IN PROGRESS)
═══════════════════════════════════════════════════════════
- Top section:
  - Solid coral pink circle (50px) with white lightning bolt ⚡ symbol
  - Title: "Em curso agora" in bold navy
- Subtitle: "Estamos a trabalhar nisto neste momento." soft purple-gray
- Body: vertical list of 4 white rounded cards (24px corners), each with 
  5px coral pink left border, soft shadow. Each card contains:
  - Left: small colored circle (40px) with white symbol/letter
  - Right: bold title + small subtitle below
  
  Card 1: mint circle + "●" → 
    Title: "Vagas em tempo real"
    Subtitle: "Escalar para todas as creches"
  
  Card 2: coral circle + "?" → 
    Title: "Reduzir 'Desconhecido'"
    Subtitle: "Melhorar algoritmo + correções"
  
  Card 3: peach circle + "★" → 
    Title: "Mais cobertura editorial"
    Subtitle: "Wave 3 imprensa em curso"
  
  Card 4: turquoise circle + "EN" → 
    Title: "Páginas em inglês"
    Subtitle: "Para a comunidade expat"
- Footer: "3/6 · creches.app"

═══════════════════════════════════════════════════════════
SLIDE 4 — "EM EXPLORAÇÃO" (EXPLORING)
═══════════════════════════════════════════════════════════
- Top section:
  - Solid turquoise circle (50px) with white magnifying glass symbol 
    (simple: circle + line)
  - Title: "Em exploração" bold navy
- Subtitle: "Ideias que estamos a estudar. Sem garantias." 
  soft purple-gray
- Body: 2×2 grid of 4 white rounded cards (24px corners), each with 5px 
  turquoise left border, soft shadow. Each card is centered content:
  - Top: small turquoise circle (40px) with white letter inside
  - Below: bold title (centered)
  - Below: small subtitle (centered)
  
  Top-left card: "C" → "Conta para creches" / "Auto-edição de dados"
  Top-right card: "L" → "Lista de espera" / "Acompanhar posição"
  Bottom-left card: "≡" → "Comparador" / "3 creches lado a lado"
  Bottom-right card: "!" → "Alertas de vagas" / "Quando surgem novas"
- Footer: "4/6 · creches.app"

═══════════════════════════════════════════════════════════
SLIDE 5 — "PROVAVELMENTE NUNCA" (PROBABLY NEVER)
═══════════════════════════════════════════════════════════
- Top section:
  - Solid gray circle (50px) with white × symbol
  - Title: "Provavelmente nunca" bold navy
- Subtitle: "A direcção que faz sentido continuar." soft purple-gray
- Body: vertical list of 3 large white rounded cards (24px corners), 
  each with 5px gray left border, soft shadow. Each card:
  - Left: small gray circle (40px) with white symbol/letter
  - Right: bold title + small description below
  
  Card 1: gray circle + "✕" → 
    Title: "Publicidade na app"
    Subtitle: "Banners, promovidos, ranking pago"
  
  Card 2: gray circle + "🔒" simple lock shape → 
    Title: "Login obrigatório"
    Subtitle: "Para ver o mapa nunca será preciso"
  
  Card 3: gray circle + "$" → 
    Title: "Venda de dados"
    Subtitle: "Os teus dados não saem da Creches.app"
- Footer: "5/6 · creches.app"

═══════════════════════════════════════════════════════════
SLIDE 6 — CTA (CLOSING)
═══════════════════════════════════════════════════════════
- Top half of slide: gradient background coral pink #FF6B9D to peach 
  #FF9F68 (diagonal 135deg), flowing into the cream bottom half
- Inside the gradient area: 
  - Bold white title centered: "Vê o roadmap completo"
  - Below: white text "creches.app/roadmap" smaller
- Bottom half: cream background
  - Centered: large rounded white button with soft shadow saying 
    "ABRIR ROADMAP →" in bold navy text
  - Below button: small soft-gray text "Página viva, actualizada 
    quando há novidades"
- Footer: "6/6 · creches.app"
- Optional: subtle flat illustration of baby silhouettes at the very 
  bottom (cream tones, abstract, soft)

═══════════════════════════════════════════════════════════
END OF SLIDE SPECS
═══════════════════════════════════════════════════════════

FINAL OUTPUT:
Deliver 6 separate PNG files at 1080×1350 pixels each. Name them:
- slide-1-cover.png
- slide-2-done.png
- slide-3-doing.png
- slide-4-exploring.png
- slide-5-never.png
- slide-6-cta.png

IMPORTANT:
- All text must be readable, no distortion, no garbled letters
- All Portuguese accents (á, à, ã, ç, õ, é, í) must render correctly
- Maintain identical header (logo + "Creches.app") and footer 
  (page number) across all 6 slides
- Background gradients in corners should be subtle, not dominant
- Generous whitespace — no crowding
- Each slide must work visually on its own AND as part of a sequence
```

---

## 🔁 Prompts INDIVIDUAIS (se algum slide sair mal)

Se 1 ou 2 slides falharem, regenera-os usando estes prompts isolados. 
Cada um tem todo o contexto necessário.

### Slide 1 isolado

```
Instagram carousel slide, 1080×1350 pixels, 4:5 portrait.
Brand: Creches.app (Portuguese childcare mapping platform).
Background: warm cream #FFF6EE with subtle radial gradients of coral 
pink (top-left) and peach orange (top-right), blurred.

Header centered at top: 
- Small circular gradient logo (coral #FF6B9D to peach #FF9F68) with 
  white house silhouette inside
- Right of logo: "Creches.app" wordmark in bold rounded sans-serif 
  (Fredoka-style), navy color #2C2356

Centered content (rendered AS PART OF the image, not overlay):
- 2-line bold title in Fredoka-like font, navy #2C2356, very large:
  "O QUE ESTAMOS"
  "A CONSTRUIR"
- Subtitle below: "O roadmap da Creches.app" smaller, soft purple-gray
- Pill-shaped badge in mint green: "📅 Página viva"
- Below: simple flat illustration of Portugal map outline (sandy color) 
  with 5 colored pins on it (coral, peach, turquoise, mint, yellow)
- Above footer: "creches.app/roadmap" text

Footer at very bottom: "1/6 · creches.app" in soft purple-gray.

All text in European Portuguese. Generous whitespace.
```

### Slide 6 isolado (CTA — o mais importante)

```
Instagram carousel slide, 1080×1350 pixels, 4:5 portrait.
Brand: Creches.app.

Header at top: small circular coral-to-peach gradient logo with white 
house silhouette + "Creches.app" wordmark in bold rounded sans-serif, 
navy.

Top half (~60%): large diagonal gradient from coral pink #FF6B9D 
(top-left) to peach orange #FF9F68 (bottom-right), curving into the 
cream lower half.
Inside the gradient area, centered:
- Bold white title: "Vê o roadmap completo" (very large, rounded font)
- Below in white smaller: "creches.app/roadmap"

Bottom half: cream background #FFF6EE.
- Centered: large rounded white button with soft drop shadow, saying 
  "ABRIR ROADMAP →" in bold navy text #2C2356
- Below button: small soft purple-gray text "Página viva, actualizada 
  quando há novidades"

Footer: "6/6 · creches.app" centered at very bottom, soft purple-gray.

All text rendered IN the image. European Portuguese. No distortion.
```

---

## 📋 Workflow recomendado

1. **Higgsfield Computer (modo Super)**
2. **Carrega Brand Bible** — cola o conteúdo de `higgsfield-brand-bible.md` 
   primeiro como contexto
3. **Cola o PROMPT MASTER** — pede os 6 slides
4. **Espera** — pode demorar 3-5 min (Higgsfield Computer faz multi-step)
5. **Avalia cada slide** — vê se o texto está bem, sem distorções
6. **Para os que falham:** usa os prompts individuais
7. **Download** — 6 PNGs, prontos a publicar

---

## ✅ Checklist antes de publicar

- [ ] Os 6 slides têm o mesmo header (logo + Creches.app)
- [ ] Todos têm footer com "X/6 · creches.app"
- [ ] Texto está em Português europeu (PT-PT)
- [ ] Acentos visíveis: à, ã, é, í, ó, ç
- [ ] Cores HEX bem aplicadas (coral, peach, turquesa, mint)
- [ ] Background creme em todos (não branco puro)
- [ ] Cantos arredondados nos cards
- [ ] Sem texto distorcido, sem "Quicksand" ou outros bugs
- [ ] Sem watermarks Higgsfield (verifica plano Starter)
- [ ] Resolução 1080×1350

---

## 💡 Se Higgsfield não conseguir renderizar texto bem

Backup plan: usa Higgsfield para gerar **só o background visual** (foto 
ou ilustração) de cada slide, e mete texto via:

- **Pixelmator / Photoshop** se tens
- **Canva** (grátis) — 30 min total
- **Figma** (grátis) — mais controlo

Os textos curtos (títulos) renderizam OK por AI. Os longos (subtítulos 
+ descrições nos cards) podem falhar — para esses, overlay manual é 
mais seguro.

---

**Boa sorte! Se o resultado for excelente em 80% dos slides — usa-os 
com Canva nos restantes. Não percas mais de 1h em iteração.** 🚀
