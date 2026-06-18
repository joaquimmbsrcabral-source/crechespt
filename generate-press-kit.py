#!/usr/bin/env python3
"""
Gera o Press Kit PDF do Creches.app.
12 slides em landscape A4 com brand colors da app.
"""
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.units import cm

# Brand colors
CORAL = HexColor("#FF6B9D")
PEACH = HexColor("#FF9F68")
INK = HexColor("#2C2356")
INK_SOFT = HexColor("#6E6989")
CORAL_SOFT = HexColor("#FFE3EE")
PEACH_SOFT = HexColor("#FFE8D6")
MINT_SOFT = HexColor("#DEF5E1")
TURQ_SOFT = HexColor("#D8F5F4")
YELLOW_SOFT = HexColor("#FFF3D6")
BG = HexColor("#FFF8EE")
WHITE = HexColor("#FFFFFF")

OUTPUT = "Creches-app-Press-Kit.pdf"
PAGE_W, PAGE_H = landscape(A4)

c = canvas.Canvas(OUTPUT, pagesize=landscape(A4))


# ============ HELPERS ============

def fill_bg(color=BG):
    c.setFillColor(color)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)


def draw_logo(x, y, scale=1):
    """Pequeno logo Creches.app — círculo coral com 'C' branco."""
    r = 22 * scale
    c.setFillColor(CORAL)
    c.circle(x, y, r, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", int(26 * scale))
    c.drawCentredString(x, y - 9 * scale, "C")


def footer():
    c.setFont("Helvetica", 9)
    c.setFillColor(INK_SOFT)
    c.drawString(2 * cm, 1 * cm, "creches.app  ·  geral@creches.app")
    c.drawRightString(PAGE_W - 2 * cm, 1 * cm, "Press Kit · Junho 2026")


def title(text, x=2 * cm, y=None, color=INK, size=32):
    if y is None:
        y = PAGE_H - 3.2 * cm
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", size)
    c.drawString(x, y, text)


def subtitle(text, x=2 * cm, y=None, color=INK_SOFT, size=15):
    if y is None:
        y = PAGE_H - 4.5 * cm
    c.setFillColor(color)
    c.setFont("Helvetica", size)
    c.drawString(x, y, text)


def body_line(text, x, y, size=13, bold=False, color=INK):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.drawString(x, y, text)


def coral_bar(y):
    c.setFillColor(CORAL)
    c.rect(2 * cm, y, 4 * cm, 0.18 * cm, fill=1, stroke=0)


def stat_card(x, y, w, h, label, value, bg_color, text_color):
    c.setFillColor(bg_color)
    c.roundRect(x, y, w, h, 0.4 * cm, fill=1, stroke=0)
    c.setFillColor(text_color)
    c.setFont("Helvetica-Bold", 32)
    c.drawCentredString(x + w / 2, y + h / 2 + 0.2 * cm, value)
    c.setFillColor(INK_SOFT)
    c.setFont("Helvetica", 10)
    c.drawCentredString(x + w / 2, y + 0.7 * cm, label)


# ============ SLIDE 1 — CAPA ============
fill_bg(BG)

# Hero block
c.setFillColor(CORAL_SOFT)
c.roundRect(2 * cm, 4 * cm, PAGE_W - 4 * cm, PAGE_H - 7 * cm, 0.6 * cm, fill=1, stroke=0)

# Logo
draw_logo(PAGE_W / 2, PAGE_H - 7 * cm, scale=2)

# Title
c.setFillColor(INK)
c.setFont("Helvetica-Bold", 56)
c.drawCentredString(PAGE_W / 2, PAGE_H / 2 - 0.5 * cm, "Creches.app")

# Tagline
c.setFillColor(INK_SOFT)
c.setFont("Helvetica", 18)
c.drawCentredString(PAGE_W / 2, PAGE_H / 2 - 2.2 * cm, "O mapa das creches em Portugal")

c.setFillColor(CORAL)
c.setFont("Helvetica-Bold", 14)
c.drawCentredString(PAGE_W / 2, PAGE_H / 2 - 3.5 * cm, "Gratis  ·  Sem ads  ·  Sem login obrigatorio")

c.setFillColor(INK_SOFT)
c.setFont("Helvetica", 11)
c.drawCentredString(PAGE_W / 2, 5.5 * cm, "Press Kit  ·  Junho 2026")

footer()
c.showPage()


# ============ SLIDE 2 — QUEM ESTA POR TRAS ============
fill_bg(BG)
title("Quem esta por tras")
coral_bar(PAGE_H - 3.7 * cm)
subtitle("Joaquim Cabral, 28 anos, de Lisboa")

# Avatar circle
c.setFillColor(CORAL)
c.circle(5 * cm, PAGE_H / 2 - 1 * cm, 2.5 * cm, fill=1, stroke=0)
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 48)
c.drawCentredString(5 * cm, PAGE_H / 2 - 2 * cm, "JC")

# Text right
tx = 9 * cm
c.setFillColor(INK)
c.setFont("Helvetica", 14)
lines = [
    "Pai a espera do primeiro filho. Constroi a Creches.app",
    "ao perceber que faltava uma ferramenta simples e",
    "gratuita para os pais navegarem a procura de creche",
    "em Portugal.",
    "",
    "Promessa publica:",
]
y = PAGE_H / 2 + 1.5 * cm
for line in lines:
    c.drawString(tx, y, line)
    y -= 0.7 * cm

c.setFillColor(CORAL)
c.setFont("Helvetica-Bold", 14)
c.drawString(tx, y, "A Creches.app e, e sera, sempre gratuita para pais.")

footer()
c.showPage()


# ============ SLIDE 3 — O PROBLEMA ============
fill_bg(BG)
title("O problema", color=CORAL)
coral_bar(PAGE_H - 3.7 * cm)
subtitle("A informacao das creches em Portugal nao esta organizada num unico sitio amigavel")

# 3 colunas: dados
col_w = (PAGE_W - 4 * cm - 2 * cm) / 3
col_y = PAGE_H / 2 - 2 * cm
col_h = 5 * cm

cols = [
    ("85 mil", "bebes nascidos por ano em Portugal", CORAL_SOFT, CORAL),
    ("2.500+", "creches no pais (publicas, IPSS, privadas)", PEACH_SOFT, HexColor("#A8780E")),
    ("EUR 600-900", "mensalidade media numa creche privada", TURQ_SOFT, HexColor("#218985")),
]

for i, (val, label, bg, fg) in enumerate(cols):
    x = 2 * cm + i * (col_w + 1 * cm)
    c.setFillColor(bg)
    c.roundRect(x, col_y, col_w, col_h, 0.4 * cm, fill=1, stroke=0)
    c.setFillColor(fg)
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(x + col_w / 2, col_y + col_h / 2 + 0.5 * cm, val)
    c.setFillColor(INK_SOFT)
    c.setFont("Helvetica", 11)
    # quebra label em 2 linhas se preciso
    words = label.split()
    line1, line2 = "", ""
    for w in words:
        if len(line1 + " " + w) < 30:
            line1 = (line1 + " " + w).strip()
        else:
            line2 = (line2 + " " + w).strip()
    c.drawCentredString(x + col_w / 2, col_y + 1.2 * cm, line1)
    if line2:
        c.drawCentredString(x + col_w / 2, col_y + 0.5 * cm, line2)

# Bottom note
c.setFillColor(INK)
c.setFont("Helvetica-Oblique", 12)
c.drawCentredString(PAGE_W / 2, 3.5 * cm,
                    "Pais comecam a procurar com 6 meses de gestacao, percorrem 20 telefones,")
c.drawCentredString(PAGE_W / 2, 3 * cm,
                    "e ainda assim muitos ficam em listas de espera.")

footer()
c.showPage()


# ============ SLIDE 4 — A SOLUCAO ============
fill_bg(BG)
title("A solucao")
coral_bar(PAGE_H - 3.7 * cm)
subtitle("Creches.app  -  o primeiro mapa nacional de creches, completamente gratuito")

c.setFillColor(WHITE)
c.roundRect(2 * cm, 4 * cm, PAGE_W - 4 * cm, PAGE_H - 8 * cm, 0.5 * cm, fill=1, stroke=0)

c.setFillColor(INK)
c.setFont("Helvetica", 14)
y = PAGE_H - 6.5 * cm

points = [
    "Mais de 2.500 creches mapeadas dos Acores ao Algarve",
    "Publicas, IPSS e privadas no mesmo mapa, com filtros por idade aceite",
    "Pesquisa por morada, codigo postal, distrito, concelho ou GPS",
    "Sem publicidade. Sem login obrigatorio. Sem venda de dados.",
    "Pais podem reportar erros e creches podem submeter os seus dados",
]
for p in points:
    c.setFillColor(CORAL)
    c.circle(3.5 * cm, y + 0.15 * cm, 0.15 * cm, fill=1, stroke=0)
    c.setFillColor(INK)
    c.drawString(4.2 * cm, y, p)
    y -= 1.2 * cm

footer()
c.showPage()


# ============ SLIDE 5 — DADOS-CHAVE ============
fill_bg(BG)
title("Dados-chave")
coral_bar(PAGE_H - 3.7 * cm)
subtitle("Numeros que contam a historia em 30 segundos")

# 2x2 grid
gw = (PAGE_W - 4 * cm - 1 * cm) / 2
gh = 4 * cm
gx0 = 2 * cm
gy_top = PAGE_H / 2 - 0.5 * cm
gy_bot = gy_top - gh - 1 * cm

stat_card(gx0, gy_top, gw, gh, "Creches mapeadas", "2.500+", CORAL_SOFT, CORAL)
stat_card(gx0 + gw + 1 * cm, gy_top, gw, gh, "Distritos cobertos", "20", PEACH_SOFT, HexColor("#A8780E"))
stat_card(gx0, gy_bot, gw, gh, "Visitantes nos ultimos dias", "4000", TURQ_SOFT, HexColor("#218985"))
stat_card(gx0 + gw + 1 * cm, gy_bot, gw, gh, "Concelhos com pagina dedicada", "154", MINT_SOFT, HexColor("#3CA64B"))

footer()
c.showPage()


# ============ SLIDE 6 — COMO FUNCIONA ============
fill_bg(BG)
title("Como funciona")
coral_bar(PAGE_H - 3.7 * cm)
subtitle("3 passos do problema ao contacto com a creche certa")

steps = [
    ("1", "Diz onde moras", "Escreve a morada ou usa GPS. A app filtra as creches mais proximas."),
    ("2", "Escolhe a idade", "Filtra automaticamente as creches que aceitam a idade do teu filho."),
    ("3", "Contacta", "Liga, marca visita, envia email. Marca o que ja contactaste, o que respondeu, o que tens visita marcada."),
]

step_w = (PAGE_W - 4 * cm - 2 * cm) / 3
step_h = 6 * cm
step_y = PAGE_H / 2 - 3 * cm

for i, (num, ttl, desc) in enumerate(steps):
    x = 2 * cm + i * (step_w + 1 * cm)
    c.setFillColor(WHITE)
    c.roundRect(x, step_y, step_w, step_h, 0.4 * cm, fill=1, stroke=0)
    # number circle
    c.setFillColor(CORAL)
    c.circle(x + step_w / 2, step_y + step_h - 1.2 * cm, 0.8 * cm, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(x + step_w / 2, step_y + step_h - 1.5 * cm, num)
    # title
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(x + step_w / 2, step_y + step_h - 3 * cm, ttl)
    # description
    c.setFillColor(INK_SOFT)
    c.setFont("Helvetica", 10.5)
    # word wrap manual
    words = desc.split()
    line = ""
    yy = step_y + step_h - 4 * cm
    for w in words:
        candidate = (line + " " + w).strip()
        if len(candidate) > 32:
            c.drawCentredString(x + step_w / 2, yy, line)
            yy -= 0.55 * cm
            line = w
        else:
            line = candidate
    if line:
        c.drawCentredString(x + step_w / 2, yy, line)

footer()
c.showPage()


# ============ SLIDE 7 — MODELO GRATUITO ============
fill_bg(BG)
title("Modelo: gratis para sempre")
coral_bar(PAGE_H - 3.7 * cm)
subtitle("Os principios que estao escritos nos Termos e nao mudarao")

promises = [
    ("Gratis", "Para pais e para creches. Sempre."),
    ("Sem ads", "Nenhuma publicidade na app. Nunca."),
    ("Sem login obrigatorio", "Os pais ve o mapa imediatamente. Login so para guardar pesquisas."),
    ("Sem venda de dados", "Os dados dos utilizadores nao sao vendidos a terceiros."),
    ("Botao de remocao", "Qualquer creche pode pedir saida do mapa. Resposta em 7 dias uteis."),
]

ny = PAGE_H - 6 * cm
for ttl, desc in promises:
    c.setFillColor(CORAL_SOFT)
    c.roundRect(2 * cm, ny - 0.3 * cm, PAGE_W - 4 * cm, 1.5 * cm, 0.3 * cm, fill=1, stroke=0)
    c.setFillColor(CORAL)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(2.5 * cm, ny + 0.2 * cm, ttl)
    c.setFillColor(INK)
    c.setFont("Helvetica", 12)
    c.drawString(7 * cm, ny + 0.2 * cm, desc)
    ny -= 1.9 * cm

footer()
c.showPage()


# ============ SLIDE 8 — COBERTURA IMPRENSA ============
fill_bg(BG)
title("Cobertura de imprensa")
coral_bar(PAGE_H - 3.7 * cm)
subtitle("Junho 2026  -  prova social dupla")

# 2 cards
card_w = (PAGE_W - 4 * cm - 1 * cm) / 2
card_h = 10 * cm
card_y = 4.5 * cm

# NiT
c.setFillColor(WHITE)
c.roundRect(2 * cm, card_y, card_w, card_h, 0.5 * cm, fill=1, stroke=0)
c.setFillColor(CORAL)
c.setFont("Helvetica-Bold", 36)
c.drawCentredString(2 * cm + card_w / 2, card_y + card_h - 2.5 * cm, "NiT")
c.setFillColor(INK_SOFT)
c.setFont("Helvetica", 12)
c.drawCentredString(2 * cm + card_w / 2, card_y + card_h - 3.3 * cm, "New in Town")
c.setFillColor(INK)
c.setFont("Helvetica-Oblique", 11)
c.drawCentredString(2 * cm + card_w / 2, card_y + card_h - 5 * cm,
                    "\"Este portugues criou uma plataforma")
c.drawCentredString(2 * cm + card_w / 2, card_y + card_h - 5.6 * cm,
                    "que junta todas as creches de Portugal\"")
c.setFillColor(CORAL_SOFT)
c.roundRect(2 * cm + 1 * cm, card_y + 1 * cm, card_w - 2 * cm, 2 * cm, 0.3 * cm, fill=1, stroke=0)
c.setFillColor(INK)
c.setFont("Helvetica-Bold", 11)
c.drawCentredString(2 * cm + card_w / 2, card_y + 2.3 * cm, "Resultado: 100 -> 4000 visitantes / dia")
c.setFillColor(INK_SOFT)
c.setFont("Helvetica", 9)
c.drawCentredString(2 * cm + card_w / 2, card_y + 1.6 * cm, "nos dias seguintes")

# Publico
px = 2 * cm + card_w + 1 * cm
c.setFillColor(WHITE)
c.roundRect(px, card_y, card_w, card_h, 0.5 * cm, fill=1, stroke=0)
c.setFillColor(HexColor("#218985"))
c.setFont("Helvetica-Bold", 36)
c.drawCentredString(px + card_w / 2, card_y + card_h - 2.5 * cm, "Publico")
c.setFillColor(INK_SOFT)
c.setFont("Helvetica", 12)
c.drawCentredString(px + card_w / 2, card_y + card_h - 3.3 * cm, "P3 / Reportagem")
c.setFillColor(INK)
c.setFont("Helvetica-Oblique", 11)
c.drawCentredString(px + card_w / 2, card_y + card_h - 5 * cm,
                    "\"Joaquim criou site que mapeia creches")
c.drawCentredString(px + card_w / 2, card_y + card_h - 5.6 * cm,
                    "em Portugal, usou IA e demorou duas semanas\"")
c.setFillColor(TURQ_SOFT)
c.roundRect(px + 1 * cm, card_y + 1 * cm, card_w - 2 * cm, 2 * cm, 0.3 * cm, fill=1, stroke=0)
c.setFillColor(INK)
c.setFont("Helvetica-Bold", 11)
c.drawCentredString(px + card_w / 2, card_y + 2.3 * cm, "Resultado: cobertura nacional")
c.setFillColor(INK_SOFT)
c.setFont("Helvetica", 9)
c.drawCentredString(px + card_w / 2, card_y + 1.6 * cm, "uma das maiores publicacoes do pais")

footer()
c.showPage()


# ============ SLIDE 9 — QUOTE DO FUNDADOR ============
fill_bg(BG)
title("Em uma frase", x=2 * cm, y=PAGE_H - 3.2 * cm)
coral_bar(PAGE_H - 3.7 * cm)

# Big quote
c.setFillColor(CORAL_SOFT)
c.roundRect(3 * cm, 4 * cm, PAGE_W - 6 * cm, PAGE_H - 8 * cm, 0.6 * cm, fill=1, stroke=0)

c.setFillColor(CORAL)
c.setFont("Helvetica-Bold", 120)
c.drawString(4 * cm, PAGE_H - 7 * cm, "\"")

c.setFillColor(INK)
c.setFont("Helvetica-Oblique", 19)
lines = [
    "Antes do meu filho nascer, queria saber quais",
    "as creches perto de casa e quais aceitavam bebes.",
    "Em 2026 isso devia ser uma pesquisa de",
    "30 segundos. Nao era. Agora e.",
]
ly = PAGE_H - 7.5 * cm
for line in lines:
    c.drawString(6 * cm, ly, line)
    ly -= 1.2 * cm

c.setFillColor(INK_SOFT)
c.setFont("Helvetica-Bold", 13)
c.drawString(6 * cm, ly - 0.5 * cm, "- Joaquim Cabral, fundador da Creches.app")

footer()
c.showPage()


# ============ SLIDE 10 — FONTES DE DADOS ============
fill_bg(BG)
title("Fontes de dados")
coral_bar(PAGE_H - 3.7 * cm)
subtitle("Tres camadas de informacao, num modelo aberto e atualizavel")

sources = [
    ("1. Carta Social", "Registo oficial da Seguranca Social. Base do dataset, especialmente para IPSS e creches publicas.", CORAL_SOFT),
    ("2. OpenStreetMap", "Dados colaborativos abertos, para localizacao e coordenadas geograficas (licenca ODbL).", PEACH_SOFT),
    ("3. Contributos dos pais e das creches", "Pais reportam erros via app. Creches submetem dados em /para-creches. Tudo verificado antes de publicar.", TURQ_SOFT),
]

ny = PAGE_H - 6 * cm
for ttl, desc, bg in sources:
    c.setFillColor(bg)
    c.roundRect(2 * cm, ny - 1.5 * cm, PAGE_W - 4 * cm, 2.2 * cm, 0.4 * cm, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(2.7 * cm, ny + 0.3 * cm, ttl)
    c.setFillColor(INK_SOFT)
    c.setFont("Helvetica", 11)
    # Wrap
    words = desc.split()
    line = ""
    yy = ny - 0.3 * cm
    max_chars = 95
    for w in words:
        candidate = (line + " " + w).strip()
        if len(candidate) > max_chars:
            c.drawString(2.7 * cm, yy, line)
            yy -= 0.55 * cm
            line = w
        else:
            line = candidate
    if line:
        c.drawString(2.7 * cm, yy, line)
    ny -= 2.7 * cm

footer()
c.showPage()


# ============ SLIDE 11 — PROXIMOS PASSOS ============
fill_bg(BG)
title("O que ai vem")
coral_bar(PAGE_H - 3.7 * cm)
subtitle("Roadmap proximo, com base nos pedidos reais dos pais")

items = [
    ("Vagas em tempo real", "As creches sinalizam quando tem vaga aberta. Em fase inicial."),
    ("Paginas por freguesia", "Cobertura SEO ate ao nivel da rua, para zonas urbanas grandes."),
    ("Lista de espera tracker", "Acompanha em que posicao estas em cada creche onde te inscreveste."),
    ("Comparador lado a lado", "Compara 3 creches lado a lado: precos, idades, horario, distancia."),
    ("Newsletter mensal", "Novidades, novos guias, atualizacoes importantes. 1 email por mes, sem spam."),
]

ny = PAGE_H - 5.5 * cm
for ttl, desc in items:
    c.setFillColor(CORAL)
    c.circle(2.5 * cm, ny + 0.2 * cm, 0.2 * cm, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(3 * cm, ny + 0.1 * cm, ttl)
    c.setFillColor(INK_SOFT)
    c.setFont("Helvetica", 11.5)
    c.drawString(3 * cm, ny - 0.5 * cm, desc)
    ny -= 1.7 * cm

footer()
c.showPage()


# ============ SLIDE 12 — CONTACTO ============
fill_bg(BG)

# Big block
c.setFillColor(CORAL_SOFT)
c.roundRect(2 * cm, 4 * cm, PAGE_W - 4 * cm, PAGE_H - 6 * cm, 0.6 * cm, fill=1, stroke=0)

c.setFillColor(INK)
c.setFont("Helvetica-Bold", 40)
c.drawCentredString(PAGE_W / 2, PAGE_H - 6 * cm, "Vamos falar?")

c.setFillColor(INK_SOFT)
c.setFont("Helvetica", 16)
c.drawCentredString(PAGE_W / 2, PAGE_H - 7.5 * cm, "Disponivel para entrevistas, reportagens, textos de opiniao.")
c.drawCentredString(PAGE_W / 2, PAGE_H - 8.3 * cm, "Em Lisboa  ·  remoto  ·  no estudio  ·  em casa com a app em uso")

# Contact lines
cy = PAGE_H / 2 - 1.5 * cm

c.setFillColor(CORAL)
c.setFont("Helvetica-Bold", 14)
c.drawCentredString(PAGE_W / 2, cy, "Email")
c.setFillColor(INK)
c.setFont("Helvetica-Bold", 22)
c.drawCentredString(PAGE_W / 2, cy - 1 * cm, "geral@creches.app")

cy -= 3 * cm
c.setFillColor(CORAL)
c.setFont("Helvetica-Bold", 14)
c.drawCentredString(PAGE_W / 2, cy, "Site")
c.setFillColor(INK)
c.setFont("Helvetica-Bold", 22)
c.drawCentredString(PAGE_W / 2, cy - 1 * cm, "creches.app")

cy -= 3 * cm
c.setFillColor(CORAL)
c.setFont("Helvetica-Bold", 14)
c.drawCentredString(PAGE_W / 2, cy, "Sala de imprensa")
c.setFillColor(INK)
c.setFont("Helvetica", 16)
c.drawCentredString(PAGE_W / 2, cy - 0.9 * cm, "creches.app/imprensa")

footer()
c.showPage()


# ============ SAVE ============
c.save()
print(f"PDF gerado: {OUTPUT}")
