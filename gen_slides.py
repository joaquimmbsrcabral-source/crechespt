#!/usr/bin/env python3
"""Gerar slides 3 e 4 do carrocel Creches.app (corrigidos, sem 'Quicksand')."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

W, H = 1080, 1350

CREAM = (255, 246, 238)
CORAL = (255, 107, 157)
CORAL_SOFT = (255, 227, 238)
PEACH = (255, 159, 104)
PEACH_SOFT = (255, 232, 214)
TURQ = (72, 209, 204)
TURQ_SOFT = (216, 245, 244)
MINT = (125, 211, 137)
MINT_DARK = (91, 192, 122)
INK = (44, 35, 86)
INK_SOFT = (110, 105, 137)
INK_FAINT = (155, 151, 181)
WHITE = (255, 255, 255)

FONT_DIR = "/usr/share/fonts/truetype/lato"
def font(weight, size):
    weights = {"black": "Black", "bold": "Bold", "heavy": "Heavy",
               "semibold": "Semibold", "medium": "Medium", "regular": "Regular"}
    return ImageFont.truetype(f"{FONT_DIR}/Lato-{weights[weight]}.ttf", size)

def draw_gradient_corners(img):
    overlay = Image.new("RGB", (W, H), CREAM)
    od = ImageDraw.Draw(overlay)
    for r in range(700, 0, -10):
        alpha = (700 - r) / 700 * 0.5
        c = tuple(int(CREAM[i] + (CORAL_SOFT[i] - CREAM[i]) * alpha) for i in range(3))
        od.ellipse([-350 - r//4, -250 - r//4, -350 + r, -250 + r], fill=c)
    for r in range(700, 0, -10):
        alpha = (700 - r) / 700 * 0.5
        c = tuple(int(CREAM[i] + (PEACH_SOFT[i] - CREAM[i]) * alpha) for i in range(3))
        od.ellipse([W - r, -250 - r//4, W + 350 + r//4, -250 + r], fill=c)
    overlay = overlay.filter(ImageFilter.GaussianBlur(80))
    img.paste(overlay, (0, 0))

def draw_header(d, slide_num):
    cx, cy = 405, 110
    r = 28
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CORAL)
    d.polygon([(cx - 14, cy - 4), (cx, cy - 18), (cx + 14, cy - 4)], fill=WHITE)
    d.rectangle([cx - 11, cy - 4, cx + 11, cy + 13], fill=WHITE)
    d.rectangle([cx - 3, cy + 3, cx + 3, cy + 13], fill=CORAL)
    d.text((cx + 50, cy - 22), "Creches.app", font=font("black", 38), fill=INK)
    fmsg = f"{slide_num}/6 · creches.app"
    bbox = d.textbbox((0, 0), fmsg, font=font("medium", 22))
    fw = bbox[2] - bbox[0]
    d.text(((W - fw) / 2, H - 50), fmsg, font=font("medium", 22), fill=INK_FAINT)

def rounded_rect(d, xy, radius, fill, outline=None, width=1):
    d.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def shadow_card(img, xy, radius=24, fill=WHITE, border_color=None, border_width=6):
    x1, y1, x2, y2 = xy
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([x1 + 3, y1 + 6, x2 + 3, y2 + 6], radius=radius, fill=(60, 40, 90, 28))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    img.paste(shadow, (0, 0), shadow)
    d = ImageDraw.Draw(img)
    rounded_rect(d, xy, radius=radius, fill=fill)
    if border_color:
        d.rounded_rectangle([x1, y1, x1 + border_width, y2], radius=2, fill=border_color)

def draw_icon_circle(d, cx, cy, r, color, symbol_color=WHITE, symbol=None, symbol_font_size=None):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    if symbol:
        fnt = font("black", symbol_font_size or int(r * 1.1))
        bbox = d.textbbox((0, 0), symbol, font=fnt)
        sw = bbox[2] - bbox[0]
        sh = bbox[3] - bbox[1]
        d.text((cx - sw / 2 - bbox[0]/2, cy - sh / 2 - bbox[1] + 2), symbol, font=fnt, fill=symbol_color)

# ============ SLIDE 3 ============
def slide_3():
    img = Image.new("RGB", (W, H), CREAM)
    draw_gradient_corners(img)
    d = ImageDraw.Draw(img)
    draw_header(d, 3)

    # Title section
    icon_x, icon_y = 90, 215
    icon_r = 42
    d.ellipse([icon_x - icon_r, icon_y - icon_r, icon_x + icon_r, icon_y + icon_r], fill=CORAL)
    # Raio simbolizado por triângulos
    d.polygon([
        (icon_x - 5, icon_y - 22),
        (icon_x + 14, icon_y - 4),
        (icon_x + 2, icon_y - 2),
        (icon_x + 14, icon_y + 20),
        (icon_x - 8, icon_y + 4),
        (icon_x + 2, icon_y + 2),
    ], fill=WHITE)

    d.text((160, 178), "Em curso agora", font=font("black", 64), fill=INK)
    d.text((160, 260), "Estamos a trabalhar nisto.", font=font("medium", 28), fill=INK_SOFT)

    # 4 cards verticais
    cards = [
        ("V", MINT, "Vagas em tempo real", "Escalar para todas as creches"),
        ("?", CORAL, "Reduzir 'Desconhecido'", "Melhorar algoritmo + correções"),
        ("★", PEACH, "Mais cobertura editorial", "Wave 3 imprensa em curso"),
        ("EN", TURQ, "Páginas em inglês", "Para a comunidade expat em PT"),
    ]

    y0 = 380
    card_h = 150
    gap = 22
    for i, (icon, color, title, subtitle) in enumerate(cards):
        y1 = y0 + i * (card_h + gap)
        y2 = y1 + card_h
        shadow_card(img, [60, y1, W - 60, y2], radius=22, border_color=color)
        d = ImageDraw.Draw(img)
        draw_icon_circle(d, 150, y1 + card_h // 2, 42, color, WHITE, icon, 36 if icon != "EN" else 28)
        d.text((230, y1 + 36), title, font=font("black", 36), fill=INK)
        d.text((230, y1 + 88), subtitle, font=font("medium", 22), fill=INK_SOFT)

    img.save("/tmp/slide3.png")
    print("✓ Slide 3 saved to /tmp/slide3.png")

# ============ SLIDE 4 ============
def slide_4():
    img = Image.new("RGB", (W, H), CREAM)
    draw_gradient_corners(img)
    d = ImageDraw.Draw(img)
    draw_header(d, 4)

    icon_x, icon_y = 90, 215
    icon_r = 42
    d.ellipse([icon_x - icon_r, icon_y - icon_r, icon_x + icon_r, icon_y + icon_r], fill=TURQ)
    # Lupa: círculo branco + linha
    d.ellipse([icon_x - 15, icon_y - 15, icon_x + 8, icon_y + 8], outline=WHITE, width=5)
    d.line([icon_x + 5, icon_y + 5, icon_x + 20, icon_y + 20], fill=WHITE, width=5)

    d.text((160, 178), "Em exploração", font=font("black", 64), fill=INK)
    d.text((160, 260), "Ideias que estamos a estudar.", font=font("medium", 28), fill=INK_SOFT)

    cards = [
        ("C", "Conta para creches", "Auto-edição de dados"),
        ("L", "Lista de espera", "Acompanhar posição"),
        ("≡", "Comparador", "3 creches lado a lado"),
        ("!", "Alertas de vagas", "Quando surgem novas"),
    ]

    x_left = 60
    card_w = (W - 60 * 2 - 22) // 2
    card_h = 220
    gap = 22
    y0 = 400

    for i, (icon, title, subtitle) in enumerate(cards):
        col = i % 2
        row = i // 2
        x1 = x_left + col * (card_w + gap)
        y1 = y0 + row * (card_h + gap)
        x2 = x1 + card_w
        y2 = y1 + card_h
        shadow_card(img, [x1, y1, x2, y2], radius=22, border_color=TURQ)
        d = ImageDraw.Draw(img)
        cx = (x1 + x2) // 2
        cy = y1 + 65
        draw_icon_circle(d, cx, cy, 40, TURQ, WHITE, icon, 38)
        bbox = d.textbbox((0, 0), title, font=font("black", 32))
        tw = bbox[2] - bbox[0]
        d.text((cx - tw / 2, y1 + 125), title, font=font("black", 32), fill=INK)
        bbox = d.textbbox((0, 0), subtitle, font=font("medium", 20))
        sw = bbox[2] - bbox[0]
        d.text((cx - sw / 2, y1 + 172), subtitle, font=font("medium", 20), fill=INK_SOFT)

    img.save("/tmp/slide4.png")
    print("✓ Slide 4 saved to /tmp/slide4.png")

slide_3()
slide_4()
