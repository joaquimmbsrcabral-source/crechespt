from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

OUT_DIR = "."
EMOJI_DIR = "./emoji"
FRED = "/tmp/crfonts/Fredoka-SemiBold.ttf"
QUICK = "/tmp/crfonts/Quicksand-SemiBold.ttf"

# Brand palette
CORAL = (255, 107, 157)
CORAL_SOFT = (255, 227, 238)
PEACH = (255, 159, 104)
PEACH_SOFT = (255, 232, 214)
TURQ = (72, 209, 204)
TURQ_SOFT = (216, 245, 244)
YELLOW = (255, 209, 102)
YELLOW_SOFT = (255, 243, 214)
INK = (44, 35, 86)
INK_SOFT = (110, 105, 137)
INK_FAINT = (155, 151, 181)
BG = (255, 246, 238)
WHITE = (255, 255, 255)

W, H = 1080, 1350

EMOJI_MAP = {
    "bottle": "1f37c",    # 🍼
    "baby": "1f476",      # 👶
    "art": "1f3a8",       # 🎨
    "rainbow": "1f308",   # 🌈
    "clipboard": "1f4cb", # 📋
    "heart": "1f49b",     # 💛
    "map": "1f5fa",       # 🗺
    "cake": "1f382",      # 🎂
    "pin": "1f4cd",       # 📍
}

def font(path, size):
    return ImageFont.truetype(path, size)

def text_w(d, txt, f):
    bbox = d.textbbox((0, 0), txt, font=f)
    return bbox[2] - bbox[0]

def paste_emoji(img, key, x, y, size):
    p = os.path.join(EMOJI_DIR, EMOJI_MAP[key]+".png")
    e = Image.open(p).convert("RGBA")
    e = e.resize((size, size), Image.LANCZOS)
    img.paste(e, (x, y), e)

def make_bg(corner_color="coral"):
    img = Image.new("RGB", (W, H), BG)
    blob = Image.new("RGBA", (W, H), (0,0,0,0))
    bd = ImageDraw.Draw(blob)
    bd.ellipse([-300, -300, 600, 500], fill=PEACH_SOFT + (180,))
    if corner_color == "coral":
        bd.ellipse([700, -200, 1280, 400], fill=CORAL_SOFT + (180,))
    elif corner_color == "yellow":
        bd.ellipse([700, -200, 1280, 400], fill=YELLOW_SOFT + (220,))
    elif corner_color == "turq":
        bd.ellipse([700, -200, 1280, 400], fill=TURQ_SOFT + (180,))
    blob = blob.filter(ImageFilter.GaussianBlur(80))
    img.paste(blob, (0,0), blob)
    return img

def rounded_rect(d, xy, r, fill, outline=None, width=0):
    d.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)

def draw_logo(img, d, x, y, size=58):
    """Branded logo: coral circle with a tiny baby bottle shape inside"""
    # Coral background circle
    d.ellipse([x, y, x+size, y+size], fill=CORAL)
    # Overlay the bottle emoji small inside
    paste_emoji(img, "bottle", x+size//5, y+size//6, size - 2*size//5)

def draw_header_brand(img, d, y=60):
    draw_logo(img, d, 60, y, 56)
    f_brand = font(FRED, 38)
    # Re-instantiate draw on the image (paste_emoji uses paste which doesn't affect d, but to be safe...)
    d.text((136, y+2), "Creches", fill=INK, font=f_brand)
    w_creches = text_w(d, "Creches", f_brand)
    d.text((136 + w_creches, y+2), ".app", fill=CORAL, font=f_brand)
    f_sub = font(QUICK, 17)
    d.text((136, y+50), "para pais à procura de creche", fill=INK_SOFT, font=f_sub)

def draw_footer_cta(d, text="creches.app", y=H-90):
    f = font(QUICK, 26)
    w = text_w(d, text, f)
    pad_x, pad_y = 28, 14
    pill_w = w + pad_x*2
    pill_x = W - pill_w - 60
    rounded_rect(d, (pill_x, y, pill_x+pill_w, y+50), 25, CORAL)
    d.text((pill_x + pad_x, y + 8), text, fill=WHITE, font=f)

# ============================================
# POST 1 — Hook
# ============================================
def post1():
    img = make_bg()
    d = ImageDraw.Draw(img)
    draw_header_brand(img, d)

    f_hook = font(FRED, 90)
    d.text((80, 360), "Procurar creche", fill=INK, font=f_hook)
    d.text((80, 462), "não tem que ser", fill=INK, font=f_hook)
    d.text((80, 564), "caótico.", fill=CORAL, font=f_hook)
    # baby bottle next to caótico
    w_c = text_w(d, "caótico.", f_hook)
    paste_emoji(img, "bottle", 80 + w_c + 25, 572, 80)

    f_sub = font(QUICK, 32)
    d.text((80, 740), "2591 creches num só mapa.", fill=INK_SOFT, font=f_sub)
    d.text((80, 784), "Gratuito. Sem anúncios.", fill=INK_SOFT, font=f_sub)

    # tip strip
    rounded_rect(d, (80, 870, 480, 920), 25, WHITE)
    f_tip = font(QUICK, 22)
    d.text((100, 884), "↗ link na bio · creches.app", fill=INK, font=f_tip)

    draw_footer_cta(d)
    img.save(f"{OUT_DIR}/post1-bemvindo.png", "PNG", quality=95)
    print("✓ post1-bemvindo.png")

# ============================================
# POST 2 — Tipos
# ============================================
def post2():
    img = make_bg(corner_color="turq")
    d = ImageDraw.Draw(img)
    draw_header_brand(img, d)

    f_title = font(FRED, 64)
    d.text((80, 220), "Sabes a diferença?", fill=INK, font=f_title)
    f_sub = font(QUICK, 26)
    d.text((80, 300), "Berçário · Creche · JI · Infantário", fill=INK_SOFT, font=f_sub)

    cards = [
        ("baby", "Berçário", "4 a 12 meses", CORAL_SOFT, CORAL),
        ("bottle", "Creche", "4 meses a 3 anos", PEACH_SOFT, (200, 100, 30)),
        ("art", "Jardim de Infância", "3 a 6 anos", TURQ_SOFT, (33, 137, 133)),
        ("rainbow", "Infantário", "Creche + JI · 4 m. a 6 anos", YELLOW_SOFT, (168, 116, 32)),
    ]
    y = 410
    for emo, name, age, bg_c, accent in cards:
        rounded_rect(d, (80, y, W-80, y+155), 26, bg_c)
        paste_emoji(img, emo, 110, y+38, 80)
        f_name = font(FRED, 40)
        d.text((220, y+30), name, fill=INK, font=f_name)
        f_age = font(QUICK, 24)
        d.text((220, y+88), age, fill=accent, font=f_age)
        y += 175

    # CTA
    f_note = font(QUICK, 22)
    d.text((80, H-130), "Guia completo → link na bio", fill=INK_SOFT, font=f_note)
    draw_footer_cta(d, text="creches.app/guias")
    img.save(f"{OUT_DIR}/post2-tipos.png", "PNG", quality=95)
    print("✓ post2-tipos.png")

# ============================================
# POST 3 — 5 perguntas
# ============================================
def post3():
    img = make_bg()
    d = ImageDraw.Draw(img)
    draw_header_brand(img, d)

    # Kicker
    f_kicker = font(QUICK, 22)
    rounded_rect(d, (80, 215, 320, 257), 21, TURQ_SOFT)
    paste_emoji(img, "clipboard", 92, 222, 26)
    d.text((128, 224), "CHECKLIST", fill=(33,137,133), font=f_kicker)

    f_title = font(FRED, 56)
    d.text((80, 280), "5 perguntas a fazer", fill=INK, font=f_title)
    d.text((80, 344), "numa visita à creche", fill=INK, font=f_title)

    questions = [
        "Qual é o rácio real de adultos por criança?",
        "Posso ver a sala onde o meu filho ficaria?",
        "Como gerem o período de adaptação?",
        "O que está incluído na mensalidade?",
        "Posso falar com 1-2 pais cujos filhos andam aqui?",
    ]
    y = 470
    f_n = font(FRED, 42)
    f_q = font(QUICK, 26)
    for i, q in enumerate(questions, 1):
        d.ellipse([80, y, 142, y+62], fill=CORAL)
        nw = text_w(d, str(i), f_n)
        d.text((80 + 31 - nw//2, y+4), str(i), fill=WHITE, font=f_n)
        # wrap if needed
        if text_w(d, q, f_q) > W - 220:
            mid = len(q) // 2
            split_idx = q.find(" ", mid)
            if split_idx == -1: split_idx = mid
            line1 = q[:split_idx].strip()
            line2 = q[split_idx:].strip()
            d.text((170, y+4), line1, fill=INK, font=f_q)
            d.text((170, y+38), line2, fill=INK, font=f_q)
        else:
            d.text((170, y+16), q, fill=INK, font=f_q)
        y += 108

    f_note = font(QUICK, 22)
    d.text((80, H-130), "Guia completo (15 perguntas) → link na bio", fill=INK_SOFT, font=f_note)
    img.save(f"{OUT_DIR}/post3-perguntas.png", "PNG", quality=95)
    print("✓ post3-perguntas.png")

# ============================================
# POST 4 — Creche Feliz
# ============================================
def post4():
    img = make_bg(corner_color="yellow")
    d = ImageDraw.Draw(img)
    draw_header_brand(img, d)

    f_kicker = font(QUICK, 22)
    rounded_rect(d, (80, 240, 380, 282), 21, YELLOW_SOFT)
    paste_emoji(img, "heart", 92, 246, 28)
    d.text((128, 248), "SABIAS QUE...", fill=(168,116,32), font=f_kicker)

    f_huge = font(FRED, 240)
    d.text((80, 310), "0€", fill=CORAL, font=f_huge)

    f_title = font(FRED, 52)
    d.text((80, 620), "Creche pode ser", fill=INK, font=f_title)
    d.text((80, 682), "gratuita para o", fill=INK, font=f_title)
    d.text((80, 744), "teu filho.", fill=INK, font=f_title)

    rounded_rect(d, (80, 850, W-80, 1140), 26, WHITE)
    f_body_t = font(FRED, 32)
    f_body = font(QUICK, 25)
    d.text((110, 875), "Programa Creche Feliz", fill=INK, font=f_body_t)
    lines = [
        "Desde set/2022, crianças nascidas após",
        "essa data têm direito a creche gratuita",
        "em todas as IPSS com acordo de cooperação —",
        "independentemente do rendimento da família.",
    ]
    y = 935
    for ln in lines:
        d.text((110, y), ln, fill=INK_SOFT, font=f_body)
        y += 35

    f_note = font(QUICK, 22)
    d.text((80, H-130), "Como funciona? Guia completo → link na bio", fill=INK_SOFT, font=f_note)
    img.save(f"{OUT_DIR}/post4-creche-feliz.png", "PNG", quality=95)
    print("✓ post4-creche-feliz.png")

# ============================================
# POST 5 — App features
# ============================================
def post5():
    img = make_bg()
    d = ImageDraw.Draw(img)
    draw_header_brand(img, d)

    f_title = font(FRED, 62)
    d.text((80, 220), "Todas as 2591", fill=INK, font=f_title)
    d.text((80, 290), "creches num só mapa.", fill=CORAL, font=f_title)

    f_sub = font(QUICK, 26)
    d.text((80, 380), "Pesquisa, organiza, decide. Tudo grátis.", fill=INK_SOFT, font=f_sub)

    feats = [
        ("map", "Mapa interativo", "Vê todas no teu distrito"),
        ("cake", "Filtros por idade", "Berçário, creche, JI, infantário"),
        ("clipboard", "Pipeline de contactos", "A contactar, visita marcada, decidida"),
        ("pin", "Perto de mim", "Encontra as mais próximas"),
    ]
    y = 470
    f_h = font(FRED, 30)
    f_p = font(QUICK, 22)
    for emo, head, body in feats:
        rounded_rect(d, (80, y, W-80, y+135), 22, WHITE)
        paste_emoji(img, emo, 110, y+38, 60)
        d.text((200, y+28), head, fill=INK, font=f_h)
        d.text((200, y+74), body, fill=INK_SOFT, font=f_p)
        y += 155

    draw_footer_cta(d)
    img.save(f"{OUT_DIR}/post5-app.png", "PNG", quality=95)
    print("✓ post5-app.png")

post1()
post2()
post3()
post4()
post5()
print("\nFeito.")
