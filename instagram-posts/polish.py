from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import math, os

FRED = "/tmp/crfonts/Fredoka-SemiBold.ttf"
QUICK = "/tmp/crfonts/Quicksand-SemiBold.ttf"

CORAL = (255, 107, 157)
CORAL_SOFT = (255, 227, 238)
PEACH = (255, 159, 104)
PEACH_SOFT = (255, 232, 214)
TURQ = (72, 209, 204)
TURQ_SOFT = (216, 245, 244)
YELLOW = (255, 209, 102)
YELLOW_SOFT = (255, 243, 214)
INK = (44, 35, 86)
INK_DARK = (24, 18, 56)
INK_SOFT = (110, 105, 137)
WHITE = (255, 255, 255)
CREAM = (255, 246, 238)
W, H = 1080, 1350

def cover_crop(src_path):
    photo = Image.open(src_path).convert("RGB")
    sw, sh = photo.size
    sr = sw / sh
    tr = W / H
    if sr > tr:
        new_h = H; new_w = int(new_h * sr)
    else:
        new_w = W; new_h = int(new_w / sr)
    photo = photo.resize((new_w, new_h), Image.LANCZOS)
    cx = max((new_w - W)//2, 0)
    cy = max((new_h - H)//2, 0)
    return photo.crop((cx, cy, cx + W, cy + H))

def tw(d, t, f): return d.textbbox((0,0), t, font=f)[2]

def draw_arrow(d, x, y, size=14, color=WHITE, thickness=3):
    """Triangle right-arrow drawn with primitives (not font)"""
    # Horizontal shaft
    d.line([(x, y), (x+size, y)], fill=color, width=thickness)
    # Head
    d.polygon([(x+size, y-size//2), (x+size+size//2, y), (x+size, y+size//2)], fill=color)

def draw_cta_pill(img, label, y_offset_bottom=110, accent=CORAL, txt_color=WHITE, with_arrow=True):
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(QUICK, 26)
    text_w_val = tw(d, label, f)
    arrow_space = 36 if with_arrow else 0
    pad_x, pad_y = 30, 16
    pill_w = text_w_val + arrow_space + pad_x*2
    pill_x = W - pill_w - 60
    pill_y = H - y_offset_bottom

    # shadow
    sh = Image.new("RGBA", (W, H), (0,0,0,0))
    sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle((pill_x+4, pill_y+8, pill_x+pill_w+4, pill_y+pad_y*2+30+8), 30, fill=(0,0,0,90))
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    rgba = img.convert("RGBA")
    rgba = Image.alpha_composite(rgba, sh)
    d = ImageDraw.Draw(rgba)
    d.rounded_rectangle((pill_x, pill_y, pill_x+pill_w, pill_y+pad_y*2+30), 30, fill=accent)
    if with_arrow:
        draw_arrow(d, pill_x + pad_x, pill_y + pad_y + 15, size=14, color=txt_color, thickness=3)
        d.text((pill_x + pad_x + arrow_space, pill_y + pad_y - 1), label, fill=txt_color, font=f)
    else:
        d.text((pill_x + pad_x, pill_y + pad_y - 1), label, fill=txt_color, font=f)
    return rgba.convert("RGB")

def hand_underline(d, x, y, length, color, thickness=9):
    pts = []
    for i in range(60):
        t = i / 59
        px = x + t * length
        py = y + math.sin(t * math.pi) * 5
        pts.append((px, py))
    for i in range(len(pts)-1):
        d.line([pts[i], pts[i+1]], fill=color, width=thickness)

def add_wordmark(d, x=60, y=60, with_tagline=True):
    f_brand = ImageFont.truetype(FRED, 36)
    d.text((x, y), "Creches", fill=INK_DARK, font=f_brand)
    w_c = tw(d, "Creches", f_brand)
    d.text((x + w_c, y), ".app", fill=CORAL, font=f_brand)
    if with_tagline:
        f_tag = ImageFont.truetype(QUICK, 14)
        d.text((x, y+45), "MAPA DE CRECHES · GRÁTIS", fill=INK_SOFT, font=f_tag)

# ============================================================
# POST 1 — Hero photo
# ============================================================
def post1():
    photo = cover_crop("post1.jpg")
    # warm grading
    overlay = Image.new("RGB", (W, H), (255, 220, 200))
    photo = Image.blend(photo, overlay, 0.05)
    photo = ImageEnhance.Color(photo).enhance(1.05)
    photo = ImageEnhance.Contrast(photo).enhance(1.02)

    # top cream gradient for readability
    img = photo.convert("RGBA")
    grad = Image.new("RGBA", (W, H), (0,0,0,0))
    gd = ImageDraw.Draw(grad)
    fade_h = 520
    for y in range(fade_h):
        t = y / fade_h
        eased = 1 - (t * t * (3 - 2 * t))
        gd.line([(0, y), (W, y)], fill=CREAM + (int(200 * eased),))
    img = Image.alpha_composite(img, grad).convert("RGB")
    d = ImageDraw.Draw(img)

    add_wordmark(d)

    # Headline
    f_head = ImageFont.truetype(FRED, 70)
    y0 = 170
    d.text((60, y0), "Procurar creche", fill=INK_DARK, font=f_head)
    d.text((60, y0+78), "não tem que ser", fill=INK_DARK, font=f_head)
    d.text((60, y0+156), "caótico.", fill=CORAL, font=f_head)
    w_cao = tw(d, "caótico.", f_head)
    hand_underline(d, 65, y0 + 156 + 84, w_cao - 15, CORAL, thickness=9)

    # Subtitle inside cream pill
    f_sub = ImageFont.truetype(QUICK, 26)
    sub_text = "2591 creches num só mapa · grátis · sem anúncios"
    sub_y = y0 + 156 + 130
    sub_w = tw(d, sub_text, f_sub)
    pill = Image.new("RGBA", (W, H), (0,0,0,0))
    pd = ImageDraw.Draw(pill)
    pd.rounded_rectangle((50, sub_y - 8, 60 + sub_w + 24, sub_y + 38), 20, fill=CREAM + (220,))
    img = Image.alpha_composite(img.convert("RGBA"), pill).convert("RGB")
    d = ImageDraw.Draw(img)
    d.text((62, sub_y - 3), sub_text, fill=INK, font=f_sub)

    # CTA pill with proper drawn arrow (no font glyph)
    img = draw_cta_pill(img, "abrir mapa · creches.app", with_arrow=True)
    img.save("post1-final.jpg", "JPEG", quality=92)
    print("✓ post1-final.jpg")

# ============================================================
# POST 2 — Toys 2x2 grid
# ============================================================
def post2():
    photo = cover_crop("post2.png")
    # subtle warmth
    photo = ImageEnhance.Color(photo).enhance(1.03)

    # Top cream gradient for the title area
    img = photo.convert("RGBA")
    grad = Image.new("RGBA", (W, H), (0,0,0,0))
    gd = ImageDraw.Draw(grad)
    fade_h = 280
    for y in range(fade_h):
        t = y / fade_h
        eased = 1 - (t * t * (3 - 2 * t))
        gd.line([(0, y), (W, y)], fill=CREAM + (int(210 * eased),))
    img = Image.alpha_composite(img, grad).convert("RGB")
    d = ImageDraw.Draw(img)

    add_wordmark(d, with_tagline=False)

    # Title (top center, above the toys)
    f_title = ImageFont.truetype(FRED, 50)
    title = "Sabes a diferença?"
    title_w = tw(d, title, f_title)
    d.text(((W - title_w)//2, 130), title, fill=INK_DARK, font=f_title)

    # The 4 toys are at approximate centers (the image is 1856x2304 cropped to 1080x1350)
    # After cover crop, the toys remain in their 4 quadrants. Estimate centers:
    # Top-left (rattle):  approx (270, 480)
    # Top-right (blocks): approx (810, 470)
    # Bottom-left (paints): approx (270, 870)
    # Bottom-right (rainbow): approx (810, 940)
    # Place small label pills NEAR each toy (offset to side)
    labels = [
        ("Berçário",  "4-12 m",   (260, 660),  CORAL),   # under rattle
        ("Creche",    "4 m-3 a",  (810, 660),  PEACH),  # under blocks
        ("Jardim de Infância", "3-6 a", (260, 1090), (33, 137, 133)),  # under paints
        ("Infantário", "0-6 a", (810, 1090), (168, 116, 32)),  # under rainbow
    ]
    f_name = ImageFont.truetype(FRED, 30)
    f_age = ImageFont.truetype(QUICK, 22)

    for name, age, (cx, cy), accent in labels:
        nw = tw(d, name, f_name)
        aw = tw(d, age, f_age)
        max_w = max(nw, aw) + 40
        pill_w = max_w
        pill_h = 90
        x = cx - pill_w//2
        y = cy
        # shadow
        sh = Image.new("RGBA", (W, H), (0,0,0,0))
        sd_d = ImageDraw.Draw(sh)
        sd_d.rounded_rectangle((x+3, y+6, x+pill_w+3, y+pill_h+6), 22, fill=(0,0,0,70))
        sh = sh.filter(ImageFilter.GaussianBlur(8))
        rgba = img.convert("RGBA")
        rgba = Image.alpha_composite(rgba, sh)
        d = ImageDraw.Draw(rgba)
        d.rounded_rectangle((x, y, x+pill_w, y+pill_h), 22, fill=WHITE)
        # Name
        d.text((cx - nw//2, y + 14), name, fill=INK_DARK, font=f_name)
        # Age (colored)
        d.text((cx - aw//2, y + 54), age, fill=accent, font=f_age)
        img = rgba.convert("RGB")
        d = ImageDraw.Draw(img)

    # CTA bottom — full guide
    img = draw_cta_pill(img, "guia completo · /guias", with_arrow=True)
    img.save("post2-final.jpg", "JPEG", quality=92)
    print("✓ post2-final.jpg")

post1()
post2()
print("\nFeito.")
