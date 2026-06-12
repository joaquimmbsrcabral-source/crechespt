#!/usr/bin/env python3
"""Gera og-image.png (1200x630) para creches.app — correr da raiz do projeto."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os

W, H = 1200, 630
INK = (44, 35, 86); INK_SOFT = (110, 105, 137)
CORAL = (255, 107, 157); PEACH = (255, 159, 104)
CREAM = (255, 246, 238); CORAL_SOFT = (255, 227, 238); PEACH_SOFT = (255, 232, 214)
TURQ = (72, 209, 204); YELLOW = (255, 209, 102); MINT = (125, 211, 137)

F = "/usr/share/fonts/truetype/google-fonts/"
f_title = ImageFont.truetype(F + "Poppins-Bold.ttf", 88)
f_sub   = ImageFont.truetype(F + "Poppins-Medium.ttf", 34)
f_pill  = ImageFont.truetype(F + "Poppins-Bold.ttf", 26)
f_url   = ImageFont.truetype(F + "Poppins-Medium.ttf", 24)
f_card  = ImageFont.truetype(F + "Poppins-Bold.ttf", 22)

img = Image.new("RGB", (W, H), CREAM)
d = ImageDraw.Draw(img)

# blobs suaves de fundo
blob = Image.new("RGB", (W, H), CREAM)
bd = ImageDraw.Draw(blob)
bd.ellipse([-250, -300, 550, 350], fill=PEACH_SOFT)
bd.ellipse([750, -250, 1450, 320], fill=CORAL_SOFT)
bd.ellipse([350, 480, 980, 950], fill=(222, 245, 225))
blob = blob.filter(ImageFilter.GaussianBlur(90))
img = Image.blend(img, blob, 0.75)
d = ImageDraw.Draw(img)

def rr(xy, r, **kw): d.rounded_rectangle(xy, radius=r, **kw)

def grad_circle(cx, cy, rad):
    g = Image.new("RGB", (rad*2, rad*2))
    gd = ImageDraw.Draw(g)
    for y in range(rad*2):
        t = y/(rad*2)
        col = tuple(int(CORAL[i]*(1-t)+PEACH[i]*t) for i in range(3))
        gd.line([(0,y),(rad*2,y)], fill=col)
    mask = Image.new("L",(rad*2,rad*2),0)
    ImageDraw.Draw(mask).ellipse([0,0,rad*2,rad*2], fill=255)
    img.paste(g,(cx-rad,cy-rad),mask)

def pin(cx, cy, s, color):
    d.polygon([(cx-s*0.62,cy-s*0.15),(cx+s*0.62,cy-s*0.15),(cx,cy+s)], fill=color)
    d.ellipse([cx-s*0.62,cy-s*0.95,cx+s*0.62,cy+0.29*s], fill=color)
    d.ellipse([cx-s*0.24,cy-s*0.57,cx+s*0.24,cy-s*0.09], fill="white")

# ---- coluna esquerda ----
LX = 80
grad_circle(LX+44, 150, 44)
pin(LX+44, 154, 30, (255,255,255))
d.text((LX+108, 105), "Creches", font=f_title, fill=INK)
w = d.textlength("Creches", font=f_title)
d.text((LX+108+w, 105), ".app", font=f_title, fill=CORAL)

d.text((LX, 248), "Todas as creches de Portugal", font=f_sub, fill=INK_SOFT)
d.text((LX, 296), "num só mapa — grátis, sem anúncios", font=f_sub, fill=INK_SOFT)

pills = [("2 591 creches", CORAL), ("21 distritos", TURQ), ("0 €", MINT)]
px = LX
for txt, col in pills:
    tw = d.textlength(txt, font=f_pill)
    rr([px, 380, px+tw+44, 434], 27, fill="white", outline=None)
    d.ellipse([px+16, 398, px+34, 416], fill=col)
    d.text((px+42, 392), txt, font=f_pill, fill=INK)
    px += tw + 64

d.text((LX, 520), "creches.app", font=f_url, fill=CORAL)

# ---- cartão "mapa" à direita ----
CX0, CY0, CX1, CY1 = 800, 90, 1130, 545
sh = Image.new("RGBA",(W,H),(0,0,0,0))
ImageDraw.Draw(sh).rounded_rectangle([CX0+6,CY0+14,CX1+6,CY1+14], radius=28, fill=(60,40,90,60))
sh = sh.filter(ImageFilter.GaussianBlur(12))
img.paste(sh,(0,0),sh); d = ImageDraw.Draw(img)
rr([CX0,CY0,CX1,CY1], 28, fill="white")
# "ruas"
for i,gy in enumerate(range(CY0+50, CY1-120, 52)):
    d.line([(CX0+18,gy),(CX1-18,gy+(-14 if i%2 else 10))], fill=(238,232,244), width=10)
for gx in range(CX0+60, CX1-30, 78):
    d.line([(gx,CY0+24),(gx+16,CY1-110)], fill=(243,238,248), width=10)
# zona verde + água
d.ellipse([CX0+28,CY0+220,CX0+128,CY0+300], fill=(222,245,225))
d.ellipse([CX1-130,CY0+60,CX1-40,CY0+130], fill=(216,245,244))
# pins no mapa
pin(CX0+90,  CY0+120, 34, CORAL)
pin(CX0+215, CY0+200, 28, TURQ)
pin(CX0+150, CY0+320, 28, YELLOW)
pin(CX0+265, CY0+95,  24, MINT)
# barra-lista no fundo do cartão
rr([CX0+20, CY1-96, CX1-20, CY1-22], 18, fill=(255,246,238))
d.ellipse([CX0+36, CY1-80, CX0+78, CY1-38], fill=CORAL_SOFT)
pin(CX0+57, CY1-56, 13, CORAL)
d.text((CX0+92, CY1-84), "Casinha dos Sonhos", font=f_card, fill=INK)
d.text((CX0+92, CY1-54), "IPSS · 0-3 anos · 0,8 km", font=ImageFont.truetype(F+"Poppins-Medium.ttf", 19), fill=INK_SOFT)

img.save("og-image.png", optimize=True)
print("og-image.png", os.path.getsize("og-image.png"), "bytes")
