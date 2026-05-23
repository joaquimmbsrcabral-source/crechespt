from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import math

FRED = "/tmp/crfonts/Fredoka-SemiBold.ttf"
QUICK = "/tmp/crfonts/Quicksand-SemiBold.ttf"

CORAL = (255, 107, 157)
INK = (44, 35, 86)
INK_DARK = (24, 18, 56)
INK_SOFT = (110, 105, 137)
WHITE = (255, 255, 255)
CREAM = (255, 246, 238)

W, H = 1080, 1350

# Load + cover-crop photo
photo = Image.open("post1.jpg").convert("RGB")
src_w, src_h = photo.size
src_ratio = src_w / src_h
tgt_ratio = W / H
if src_ratio > tgt_ratio:
    new_h = H; new_w = int(new_h * src_ratio)
else:
    new_w = W; new_h = int(new_w / src_ratio)
photo = photo.resize((new_w, new_h), Image.LANCZOS)
crop_x = max((new_w - W)//2, 0)
crop_y = max((new_h - H)//2, 0)
photo = photo.crop((crop_x, crop_y, crop_x + W, crop_y + H))

# Subtle warm color grading
overlay = Image.new("RGB", (W, H), (255, 220, 200))
photo = Image.blend(photo, overlay, 0.05)
photo = ImageEnhance.Color(photo).enhance(1.05)
photo = ImageEnhance.Contrast(photo).enhance(1.02)

# Stronger cream gradient at top — for readability of headline + subtitle
img = photo.convert("RGBA")
gradient = Image.new("RGBA", (W, H), (0,0,0,0))
gd = ImageDraw.Draw(gradient)
top_fade_h = 520  # taller fade
for y in range(0, top_fade_h):
    # ease-out curve
    t = y / top_fade_h
    eased = 1 - (t * t * (3 - 2 * t))  # smoothstep inverted
    alpha = int(200 * eased)
    gd.line([(0, y), (W, y)], fill=CREAM + (alpha,))
img = Image.alpha_composite(img, gradient)
img = img.convert("RGB")

d = ImageDraw.Draw(img)
def tw(t, f): return d.textbbox((0,0), t, font=f)[2]

# Wordmark top-left
f_brand = ImageFont.truetype(FRED, 36)
d.text((60, 60), "Creches", fill=INK_DARK, font=f_brand)
w_c = tw("Creches", f_brand)
d.text((60 + w_c, 60), ".app", fill=CORAL, font=f_brand)
# small tagline below
f_tag = ImageFont.truetype(QUICK, 14)
d.text((60, 105), "MAPA DE CRECHES · GRÁTIS", fill=INK_SOFT, font=f_tag)

# Headline
f_head = ImageFont.truetype(FRED, 70)
y0 = 170
d.text((60, y0), "Procurar creche", fill=INK_DARK, font=f_head)
d.text((60, y0+78), "não tem que ser", fill=INK_DARK, font=f_head)
# "caótico." in coral
d.text((60, y0+156), "caótico.", fill=CORAL, font=f_head)

# Hand-drawn coral underline UNDER caótico (closer to letters)
def hand_underline(d, x, y, length, color, thickness=9):
    points = []
    for i in range(60):
        t = i / 59
        px = x + t * length
        py = y + math.sin(t * math.pi) * 5
        points.append((px, py))
    for i in range(len(points)-1):
        d.line([points[i], points[i+1]], fill=color, width=thickness)
w_cao = tw("caótico.", f_head)
hand_underline(d, 65, y0 + 156 + 84, w_cao - 15, CORAL, thickness=9)

# Subtitle — moved to BELOW the underline, with bg pill for readability
f_sub = ImageFont.truetype(QUICK, 26)
sub_text = "2591 creches num só mapa · grátis · sem anúncios"
sub_y = y0 + 156 + 130
sub_w = tw(sub_text, f_sub)
# semi-transparent cream pill behind subtitle
sub_pill = Image.new("RGBA", (W, H), (0,0,0,0))
spd = ImageDraw.Draw(sub_pill)
spd.rounded_rectangle((50, sub_y - 8, 60 + sub_w + 24, sub_y + 38), 20, fill=CREAM + (220,))
img_rgba = img.convert("RGBA")
img_rgba = Image.alpha_composite(img_rgba, sub_pill)
d = ImageDraw.Draw(img_rgba)
d.text((62, sub_y - 3), sub_text, fill=INK, font=f_sub)

# Bottom CTA pill with shadow
f_cta = ImageFont.truetype(QUICK, 26)
cta_text = "→ abrir mapa · creches.app"
cta_w = d.textbbox((0,0), cta_text, font=f_cta)[2]
pad_x, pad_y = 30, 16
pill_w = cta_w + pad_x*2
pill_x = W - pill_w - 60
pill_y = H - 110

# shadow
shadow = Image.new("RGBA", (W, H), (0,0,0,0))
sd = ImageDraw.Draw(shadow)
sd.rounded_rectangle((pill_x+4, pill_y+8, pill_x+pill_w+4, pill_y+pad_y*2+30+8), 30, fill=(0,0,0,90))
shadow = shadow.filter(ImageFilter.GaussianBlur(10))
img_rgba = Image.alpha_composite(img_rgba, shadow)
d = ImageDraw.Draw(img_rgba)
d.rounded_rectangle((pill_x, pill_y, pill_x+pill_w, pill_y+pad_y*2+30), 30, fill=CORAL)
d.text((pill_x + pad_x, pill_y + pad_y - 1), cta_text, fill=WHITE, font=f_cta)

img_rgba.convert("RGB").save("post1-final.jpg", "JPEG", quality=92)
print("✓ post1-final.jpg")
