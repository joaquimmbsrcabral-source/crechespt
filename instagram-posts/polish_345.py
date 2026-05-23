from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import math

FRED = "/tmp/crfonts/Fredoka-SemiBold.ttf"
QUICK = "/tmp/crfonts/Quicksand-SemiBold.ttf"
CORAL = (255, 107, 157); CORAL_SOFT = (255, 227, 238)
PEACH = (255, 159, 104); PEACH_SOFT = (255, 232, 214)
TURQ = (72, 209, 204);  TURQ_SOFT = (216, 245, 244)
YELLOW = (255, 209, 102); YELLOW_SOFT = (255, 243, 214)
INK = (44, 35, 86); INK_DARK = (24, 18, 56); INK_SOFT = (110, 105, 137)
WHITE = (255, 255, 255); CREAM = (255, 246, 238)
W, H = 1080, 1350

def cover_crop(src):
    p = Image.open(src).convert("RGB")
    sw, sh = p.size; sr = sw/sh; tr = W/H
    if sr > tr: nh = H; nw = int(nh * sr)
    else: nw = W; nh = int(nw / sr)
    p = p.resize((nw, nh), Image.LANCZOS)
    cx = max((nw-W)//2, 0); cy = max((nh-H)//2, 0)
    return p.crop((cx, cy, cx+W, cy+H))

def tw(d, t, f): return d.textbbox((0,0), t, font=f)[2]

def draw_arrow(d, x, y, size=14, color=WHITE, thickness=3):
    d.line([(x, y), (x+size, y)], fill=color, width=thickness)
    d.polygon([(x+size, y-size//2), (x+size+size//2, y), (x+size, y+size//2)], fill=color)

def cta_pill(img, label, accent=CORAL, txt_color=WHITE, y_bottom=110):
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(QUICK, 26)
    tw_v = tw(d, label, f)
    arrow_space = 36
    pad_x, pad_y = 30, 16
    pw = tw_v + arrow_space + pad_x*2
    px = W - pw - 60
    py = H - y_bottom
    sh = Image.new("RGBA", (W, H), (0,0,0,0))
    sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle((px+4, py+8, px+pw+4, py+pad_y*2+30+8), 30, fill=(0,0,0,90))
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    rgba = img.convert("RGBA")
    rgba = Image.alpha_composite(rgba, sh)
    d = ImageDraw.Draw(rgba)
    d.rounded_rectangle((px, py, px+pw, py+pad_y*2+30), 30, fill=accent)
    draw_arrow(d, px + pad_x, py + pad_y + 15, size=14, color=txt_color, thickness=3)
    d.text((px + pad_x + arrow_space, py + pad_y - 1), label, fill=txt_color, font=f)
    return rgba.convert("RGB")

def hand_underline(d, x, y, length, color, thickness=9):
    pts = []
    for i in range(60):
        t = i/59
        pts.append((x + t*length, y + math.sin(t*math.pi)*5))
    for i in range(len(pts)-1):
        d.line([pts[i], pts[i+1]], fill=color, width=thickness)

def wordmark(d, x=60, y=60, with_tagline=True):
    fb = ImageFont.truetype(FRED, 36)
    d.text((x, y), "Creches", fill=INK_DARK, font=fb)
    w_c = tw(d, "Creches", fb)
    d.text((x + w_c, y), ".app", fill=CORAL, font=fb)
    if with_tagline:
        ft = ImageFont.truetype(QUICK, 14)
        d.text((x, y+45), "MAPA DE CRECHES · GRÁTIS", fill=INK_SOFT, font=ft)

def top_gradient(img, fade_h=480, alpha=210):
    rgba = img.convert("RGBA")
    grad = Image.new("RGBA", (W, H), (0,0,0,0))
    gd = ImageDraw.Draw(grad)
    for y in range(fade_h):
        t = y/fade_h; eased = 1 - (t*t*(3-2*t))
        gd.line([(0,y),(W,y)], fill=CREAM + (int(alpha*eased),))
    return Image.alpha_composite(rgba, grad).convert("RGB")

# ============================================================
# POST 3 — Notes/visit
# ============================================================
def post3():
    photo = cover_crop("post3.jpg")
    photo = ImageEnhance.Color(photo).enhance(1.05)
    img = top_gradient(photo, fade_h=540, alpha=215)
    d = ImageDraw.Draw(img)
    wordmark(d, with_tagline=False)

    # Kicker pill TURQ
    f_kicker = ImageFont.truetype(QUICK, 18)
    kt = "📋 CHECKLIST DE VISITA"
    # We can't use emoji in font, draw a clipboard-like icon
    # Use turq pill with just text, no emoji
    kt = "CHECKLIST DE VISITA"
    kw = tw(d, kt, f_kicker)
    rgba = img.convert("RGBA")
    sh = Image.new("RGBA", (W, H), (0,0,0,0))
    sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle((60, 145, 60+kw+44, 145+38), 22, fill=TURQ_SOFT + (235,))
    rgba = Image.alpha_composite(rgba, sh)
    d = ImageDraw.Draw(rgba)
    d.text((82, 151), kt, fill=(33,137,133), font=f_kicker)
    img = rgba.convert("RGB")
    d = ImageDraw.Draw(img)

    # Headline
    f_head = ImageFont.truetype(FRED, 68)
    d.text((60, 200), "5 perguntas a", fill=INK_DARK, font=f_head)
    d.text((60, 274), "fazer numa", fill=INK_DARK, font=f_head)
    d.text((60, 348), "visita à creche.", fill=CORAL, font=f_head)
    w_v = tw(d, "visita à creche.", f_head)
    hand_underline(d, 65, 348 + 84, w_v - 15, CORAL, thickness=9)

    # Subtitle pill
    f_sub = ImageFont.truetype(QUICK, 24)
    sub = "Guarda este post · checklist completa no link"
    sw = tw(d, sub, f_sub)
    sub_y = 480
    rgba = img.convert("RGBA")
    sh = Image.new("RGBA", (W, H), (0,0,0,0))
    sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle((50, sub_y-8, 60+sw+24, sub_y+38), 20, fill=CREAM + (215,))
    rgba = Image.alpha_composite(rgba, sh)
    d = ImageDraw.Draw(rgba)
    d.text((62, sub_y-3), sub, fill=INK, font=f_sub)
    img = rgba.convert("RGB")

    img = cta_pill(img, "creches.app/guias")
    img.save("post3-final.jpg", "JPEG", quality=92)
    print("✓ post3-final.jpg")

# ============================================================
# POST 4 — Creche Feliz (happy kids)
# ============================================================
def post4():
    photo = cover_crop("post4.jpg")
    photo = ImageEnhance.Color(photo).enhance(1.05)
    photo = ImageEnhance.Brightness(photo).enhance(1.02)
    img = top_gradient(photo, fade_h=460, alpha=200)
    d = ImageDraw.Draw(img)
    wordmark(d, with_tagline=False)

    # Yellow kicker
    f_kicker = ImageFont.truetype(QUICK, 18)
    kt = "SABIAS QUE..."
    kw = tw(d, kt, f_kicker)
    rgba = img.convert("RGBA")
    sh = Image.new("RGBA", (W, H), (0,0,0,0))
    sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle((60, 145, 60+kw+44, 145+38), 22, fill=YELLOW_SOFT + (240,))
    rgba = Image.alpha_composite(rgba, sh)
    d = ImageDraw.Draw(rgba)
    d.text((82, 151), kt, fill=(168,116,32), font=f_kicker)
    img = rgba.convert("RGB")
    d = ImageDraw.Draw(img)

    # Huge "0€" in coral
    f_huge = ImageFont.truetype(FRED, 180)
    d.text((60, 195), "0€/mês", fill=CORAL, font=f_huge)

    # Sub
    f_h2 = ImageFont.truetype(FRED, 44)
    d.text((60, 410), "Creche pode ser", fill=INK_DARK, font=f_h2)
    d.text((60, 460), "gratuita.", fill=INK_DARK, font=f_h2)

    # Bottom info pill (over the photo, but with white card)
    info_y = H - 350
    rgba = img.convert("RGBA")
    sh = Image.new("RGBA", (W, H), (0,0,0,0))
    sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle((60+3, info_y+6, W-60+3, info_y+220+6), 26, fill=(0,0,0,75))
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    rgba = Image.alpha_composite(rgba, sh)
    d = ImageDraw.Draw(rgba)
    d.rounded_rectangle((60, info_y, W-60, info_y+220), 26, fill=WHITE)
    f_card_t = ImageFont.truetype(FRED, 28)
    f_card_p = ImageFont.truetype(QUICK, 22)
    d.text((85, info_y+22), "Programa Creche Feliz", fill=INK_DARK, font=f_card_t)
    lines = [
        "Desde set/2022, crianças nascidas após essa",
        "data têm direito a creche gratuita em IPSS",
        "com acordo — independentemente do rendimento.",
    ]
    y = info_y + 75
    for ln in lines:
        d.text((85, y), ln, fill=INK_SOFT, font=f_card_p)
        y += 32
    img = rgba.convert("RGB")

    img = cta_pill(img, "saber mais · /guias")
    img.save("post4-final.jpg", "JPEG", quality=92)
    print("✓ post4-final.jpg")

# ============================================================
# POST 5 — App mockup (phone with map)
# ============================================================
def post5():
    photo = cover_crop("post5.jpg")
    photo = ImageEnhance.Color(photo).enhance(1.05)
    img = top_gradient(photo, fade_h=500, alpha=180)
    d = ImageDraw.Draw(img)
    wordmark(d, with_tagline=False)

    # Headline LEFT side, photo is on right
    f_head = ImageFont.truetype(FRED, 64)
    d.text((60, 180), "Todas as", fill=INK_DARK, font=f_head)
    d.text((60, 250), "2591 creches", fill=CORAL, font=f_head)
    w_2591 = tw(d, "2591 creches", f_head)
    hand_underline(d, 65, 250+82, w_2591-15, CORAL, thickness=9)
    d.text((60, 350), "num só mapa.", fill=INK_DARK, font=f_head)

    # 4 small feature pills under headline (left side, doesn't overlap phone)
    feats = [
        ("Mapa interativo", CORAL),
        ("Filtros por idade", PEACH),
        ("Pipeline contactos", (33,137,133)),
        ("Perto de mim", (168,116,32)),
    ]
    f_feat = ImageFont.truetype(QUICK, 20)
    y = 480
    for label, accent in feats:
        lw = tw(d, label, f_feat)
        rgba = img.convert("RGBA")
        sh = Image.new("RGBA", (W, H), (0,0,0,0))
        sd = ImageDraw.Draw(sh)
        sd.rounded_rectangle((60+3, y+4, 60+lw+34, y+44), 22, fill=(0,0,0,50))
        sh = sh.filter(ImageFilter.GaussianBlur(6))
        rgba = Image.alpha_composite(rgba, sh)
        d = ImageDraw.Draw(rgba)
        d.rounded_rectangle((60, y, 60+lw+30, y+40), 22, fill=WHITE)
        d.ellipse((73, y+13, 87, y+27), fill=accent)
        d.text((96, y+9), label, fill=INK_DARK, font=f_feat)
        img = rgba.convert("RGB")
        d = ImageDraw.Draw(img)
        y += 56

    img = cta_pill(img, "abrir mapa · creches.app")
    img.save("post5-final.jpg", "JPEG", quality=92)
    print("✓ post5-final.jpg")

post3()
post4()
post5()
print("\nTodos prontos.")
