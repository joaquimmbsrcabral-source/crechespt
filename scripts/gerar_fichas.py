#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera fichas individuais /creche/{slug}.html + sitemap-creches.xml a partir de creches_pt.json.
Correr da raiz do projeto: python3 scripts/gerar_fichas.py"""
import json, re, unicodedata, html, math, os, shutil

HOJE = "2026-06-12"
BASE = "https://creches.app"

def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii","ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+","-", s).strip("-").lower()
    return re.sub(r"-{2,}","-", s)[:70].rstrip("-")

def esc(s): return html.escape(str(s), quote=True) if s else ""

def idade_txt(m):
    if m is None: return None
    if m == 0: return "0 meses"
    if m < 12: return f"{m} meses"
    a = m // 12
    if m % 12 == 0: return f"{a} ano" + ("s" if a>1 else "")
    return f"{m} meses"

def faixa(c):
    mi, ma = c.get("idade_min_meses"), c.get("idade_max_meses")
    if mi is None and ma is None: return "Idades não especificadas"
    ti, ta = idade_txt(mi), idade_txt(ma)
    if mi == 0: return f"Dos 0 aos {ta}"
    return f"Dos {ti} aos {ta}"

def hav(a, b):
    R=6371; la1,lo1,la2,lo2 = map(math.radians,[a["lat"],a["lon"],b["lat"],b["lon"]])
    dla, dlo = la2-la1, lo2-lo1
    h = math.sin(dla/2)**2 + math.cos(la1)*math.cos(la2)*math.sin(dlo/2)**2
    return 2*R*math.asin(math.sqrt(h))

creches = json.load(open("creches_pt.json", encoding="utf-8"))

# slugs únicos
slugs = {}
for c in creches:
    nid = re.sub(r"\D","", c["id"]) or c["id"]
    slugs[c["id"]] = f"{slugify(c['nome']) or 'creche'}-{nid}"

# vizinhas: grelha espacial para acelerar
from collections import defaultdict
grid = defaultdict(list)
def cell(c): return (round(c["lat"]/0.05), round(c["lon"]/0.05))
for c in creches: grid[cell(c)].append(c)
def vizinhas(c, n=6):
    cands = []
    cl = cell(c)
    for r in (1,2,4,8):
        cands = [o for dx in range(-r,r+1) for dy in range(-r,r+1)
                 for o in grid[(cl[0]+dx, cl[1]+dy)] if o["id"] != c["id"]]
        if len(cands) >= n+2: break
    cands.sort(key=lambda o: hav(c,o))
    return [(o, hav(c,o)) for o in cands[:n]]

DIST_SLUG = {"Lisboa":"lisboa","Porto":"porto","Braga":"braga","Setúbal":"setubal","Aveiro":"aveiro",
"Leiria":"leiria","Coimbra":"coimbra","Faro":"faro","Santarém":"santarem","Viseu":"viseu","Madeira":"madeira",
"Açores":"acores","Viana do Castelo":"viana-do-castelo","Vila Real":"vila-real","Bragança":"braganca",
"Castelo Branco":"castelo-branco","Guarda":"guarda","Portalegre":"portalegre","Évora":"evora","Beja":"beja"}

STYLE = """<style>
:root{--c-coral:#FF6B9D;--c-coral-soft:#FFE3EE;--c-peach:#FF9F68;--c-peach-soft:#FFE8D6;--c-turquoise:#48D1CC;
--c-turquoise-soft:#D8F5F4;--c-mint:#7DD389;--c-mint-soft:#DEF5E1;--c-yellow:#FFD166;--c-yellow-soft:#FFF3D6;--bg:#FFF6EE;--ink:#2C2356;
--ink-soft:#6E6989;--ink-faint:#9B97B5;--line:rgba(60,40,90,.08);--r-pill:999px;--r-md:14px;--r-card:18px;
--sh-1:0 1px 3px rgba(60,40,90,.06),0 2px 8px rgba(60,40,90,.05);
--sh-2:0 4px 12px rgba(60,40,90,.08),0 16px 32px rgba(60,40,90,.06)}
*{box-sizing:border-box}html,body{margin:0;padding:0}
*:focus-visible{outline:2px solid var(--c-peach);outline-offset:2px;border-radius:6px}
body{background:radial-gradient(900px 600px at 10% 0%,var(--c-peach-soft) 0%,transparent 55%),
radial-gradient(800px 600px at 100% 0%,var(--c-coral-soft) 0%,transparent 55%),var(--bg);color:var(--ink);
font-family:"Quicksand",system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.65;min-height:100vh}
h1,h2,h3{font-family:"Fredoka";font-weight:600;letter-spacing:-.01em;line-height:1.25;color:var(--ink)}
a{color:var(--c-coral);text-decoration:none}a:hover{text-decoration:underline}
.brand-tld{background:linear-gradient(135deg,var(--c-coral),var(--c-peach));-webkit-background-clip:text;background-clip:text;color:transparent}
header.top{display:flex;align-items:center;gap:14px;padding:14px 24px;background:rgba(255,255,255,.7);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:50}
.brand{display:flex;align-items:center;gap:10px;color:inherit}
.logo{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--c-coral),var(--c-peach));display:flex;align-items:center;justify-content:center;color:#fff;font-size:17px}
.brand-name b{font-family:"Fredoka";font-size:19px;display:block;line-height:1}
.brand-name span{font-size:11px;color:var(--ink-soft);font-weight:600}
header .spacer{flex:1}header nav{display:flex;gap:6px;align-items:center}
header nav a{color:var(--ink-soft);font-weight:600;font-size:13.5px;padding:8px 12px;border-radius:var(--r-pill)}
header nav a:hover{background:rgba(255,255,255,.9);color:var(--ink);text-decoration:none}
header .cta{background:linear-gradient(135deg,var(--c-coral),var(--c-peach));color:#fff;font-weight:700;padding:9px 18px;box-shadow:0 6px 16px rgba(255,107,157,.35)}
header .cta:hover{filter:brightness(1.05);color:#fff;text-decoration:none}
main{max-width:760px;margin:0 auto;padding:26px 24px 60px}
.breadcrumb{font-size:12.5px;color:var(--ink-soft);margin-bottom:14px}.breadcrumb a{color:var(--ink-soft)}.breadcrumb a:hover{color:var(--c-coral)}
h1.nome{font-size:32px;margin:6px 0 10px}
.badges{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}
.badge{font-size:12px;font-weight:700;padding:4px 12px;border-radius:var(--r-pill);background:#fff;box-shadow:var(--sh-1);color:var(--ink-soft)}
.badge.tipo-IPSS{background:var(--c-turquoise-soft);color:#1d7d78}
.badge.tipo-Privada{background:var(--c-coral-soft);color:#c2447a}
.badge.tipo-Pública,.badge.tipo-Publica{background:var(--c-mint-soft);color:#2f7d3b}
.badge.tipo-Desconhecido{background:#F0EBF8;color:#6E6989}

/* === HERO CARD === */
.hero-creche{background:#fff;border-radius:var(--r-card);box-shadow:var(--sh-2);padding:22px 24px;margin:14px 0 16px;border-top:4px solid var(--c-peach)}
.hero-creche .top{display:flex;gap:14px;align-items:flex-start;margin-bottom:12px}
.hero-creche .avatar{width:62px;height:62px;border-radius:18px;background:linear-gradient(135deg,var(--c-coral),var(--c-peach));display:flex;align-items:center;justify-content:center;color:#fff;font-family:"Fredoka";font-size:26px;font-weight:700;flex-shrink:0;box-shadow:0 4px 12px rgba(255,107,157,.3)}
.hero-creche .info{flex:1;min-width:0}
.hero-creche h1{font-size:26px;margin:0 0 6px;line-height:1.2}
.hero-creche .badges{margin:0}

/* CTAs grandes */
.ctas-big{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:14px}
.cta-big{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:14px 8px;border-radius:14px;background:linear-gradient(135deg,var(--c-coral),var(--c-peach));color:#fff;font-weight:700;font-size:13px;text-decoration:none;box-shadow:0 4px 12px rgba(255,107,157,.25);transition:transform .15s;text-align:center}
.cta-big:hover{transform:translateY(-2px);text-decoration:none;color:#fff}
.cta-big.disabled{background:#F0EBF8;color:#9B97B5;box-shadow:none;cursor:not-allowed;pointer-events:none}
.cta-big .ic{font-size:20px;line-height:1}
.cta-big .lb{font-size:12.5px;font-weight:700;letter-spacing:.02em}

/* Banner qualidade de dados */
.q-banner{padding:11px 16px;border-radius:12px;font-size:13px;margin:14px 0;display:flex;align-items:center;gap:10px;font-weight:600}
.q-banner.warn{background:var(--c-yellow-soft);color:#856404;border-left:3px solid var(--c-yellow)}
.q-banner.ok{background:var(--c-mint-soft);color:#2f7d3b;border-left:3px solid var(--c-mint)}
.q-banner a{color:inherit;text-decoration:underline;font-weight:700}

.card{background:#fff;border-radius:var(--r-card);box-shadow:var(--sh-1);padding:20px 22px;margin:16px 0}
.card h2{font-size:18px;margin:0 0 14px}

/* Grelha 2 colunas para dados */
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px 22px}
.grid2 .item .k{display:block;color:var(--ink-faint);font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px}
.grid2 .item .v{color:var(--ink);font-weight:600;font-size:14.5px;line-height:1.45}
.grid2 .item.wide{grid-column:1 / -1}
@media(max-width:520px){.grid2{grid-template-columns:1fr}}

.mapa-embed{border:0;width:100%;height:280px;border-radius:var(--r-card);box-shadow:var(--sh-1);display:block}

/* Creches próximas — mini-cards */
.prox{list-style:none;margin:0;padding:0;display:grid;gap:9px}
.prox li{background:#fff;border-radius:var(--r-md);box-shadow:var(--sh-1);padding:12px 14px;transition:transform .15s}
.prox li:hover{transform:translateY(-1px);box-shadow:var(--sh-2)}
.prox li a.nm{color:var(--ink);font-weight:700;font-size:14.5px;text-decoration:none;display:block;margin-bottom:4px}
.prox li a.nm:hover{color:var(--c-coral);text-decoration:none}
.prox .meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.prox .pill{display:inline-block;padding:2px 9px;border-radius:var(--r-pill);font-weight:700;font-size:10.5px;letter-spacing:.02em}
.prox .pill.tipo-IPSS,.prox .pill.tipo-ipss{background:var(--c-turquoise-soft);color:#1d7d78}
.prox .pill.tipo-Privada,.prox .pill.tipo-privada{background:var(--c-coral-soft);color:#c2447a}
.prox .pill.tipo-Publica,.prox .pill.tipo-Pública,.prox .pill.tipo-publica{background:var(--c-mint-soft);color:#2f7d3b}
.prox .pill.tipo-Desconhecido,.prox .pill.tipo-outro{background:#F0EBF8;color:#6E6989}
.prox .d{color:var(--ink-faint);font-size:12px;font-weight:700;margin-left:auto}
.faq details{background:#fff;border-radius:var(--r-md);box-shadow:var(--sh-1);padding:13px 16px;margin:9px 0;cursor:pointer}
.faq summary{font-weight:700;font-family:"Fredoka";font-size:15.5px;list-style:none}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";float:right;color:var(--c-coral);font-size:20px;line-height:.8}
.faq details[open] summary::after{content:"−"}
.faq p{margin:8px 0 2px;font-size:14px;color:var(--ink-soft)}
.aviso{font-size:12.5px;color:var(--ink-faint);margin-top:26px;border-top:1px solid var(--line);padding-top:16px}
footer{background:#fff;border-top:1px solid var(--line);padding:26px 24px;text-align:center;color:var(--ink-soft);font-size:13px;margin-top:50px}
footer a{color:var(--ink-soft);margin:0 7px}footer a:hover{color:var(--c-coral)}
@media(max-width:640px){main{padding:20px 16px 40px}h1.nome{font-size:25px}header nav a:not(.cta){display:none}.brand-name span{display:none}.drow{flex-direction:column;gap:2px}.drow .k{min-width:0}}
</style>"""

HEADER = """<header class="top">
  <a href="/" class="brand">
    <div class="logo">🍼</div>
    <div class="brand-name"><b>Creches<span class="brand-tld">.app</span></b><span>Mapa de creches</span></div>
  </a>
  <div class="spacer"></div>
  <nav><a href="/guias">Guias</a><a href="/creches">Por distrito</a><a href="/app" class="cta">Abrir mapa</a></nav>
</header>"""

FOOTER = """<footer>
  <p><a href="/">Início</a> ·<a href="/app">Mapa</a> ·<a href="/guias">Guias</a> ·<a href="/para-creches">Para creches</a> ·<a href="/privacidade">Privacidade</a> ·<a href="/termos">Termos</a></p>
  <p style="margin-top:8px">Creches<span class="brand-tld">.app</span> © 2026 · Dados: <a href="https://www.openstreetmap.org/copyright" rel="nofollow noopener">OpenStreetMap</a> (ODbL)</p>
</footer>"""

# Filtro Escolas Básicas — não gerar fichas para EB1, agrupamentos, etc.
_EB_RX = [re.compile(p, re.I) for p in [
    r"^escola\s*b[aá]sica\b", r"^eb\b",
    r"^agrupamento\s*de\s*escolas",
    r"\beb\s*[1-3]\s*[/,]\s*ji\b",
]]
def _is_eb(nm): return any(p.search(nm or "") for p in _EB_RX)

os.makedirs("creche", exist_ok=True)
urls = []
n_skip_eb = 0
for c in creches:
    if _is_eb(c.get("nome","")):
        n_skip_eb += 1
        continue
    slug = slugs[c["id"]]
    url = f"{BASE}/creche/{slug}"
    nome, tipo = c["nome"], c.get("tipo","")
    resposta = c.get("resposta") or "Creche"
    distrito = c.get("distrito") or c.get("distrito_inferido") or ""
    dslug = DIST_SLUG.get(distrito)
    local = c.get("localidade") or distrito
    morada = " ".join(filter(None,[c.get("morada"), str(c.get("numero") or "")])).strip()
    cp = c.get("codigo_postal",""); tel = c.get("telefone",""); mail = c.get("email",""); site = c.get("website","")
    oper = c.get("operador","")
    lat, lon = c["lat"], c["lon"]
    fx = faixa(c)
    en, el, etipo = esc(nome), esc(local), esc(tipo)

    title = f"{en} — {esc(resposta)} em {el} | Creches.app"
    bits = [b for b in [etipo or None, f"{esc(resposta)} em {el}" if local else None,
            f"tel. {esc(tel)}" if tel else None] if b]
    desc = f"{en}: " + ", ".join(bits) + f". Morada, contactos, idades e creches próximas. Vê no mapa gratuito do Creches.app."
    desc = desc[:158]

    # JSON-LD ChildCare
    ld = {"@context":"https://schema.org","@type":"ChildCare","name":nome,"url":url,
          "address":{"@type":"PostalAddress","addressCountry":"PT"},
          "geo":{"@type":"GeoCoordinates","latitude":lat,"longitude":lon},
          "sameAs":c.get("osm_url")}
    if morada: ld["address"]["streetAddress"] = morada
    if cp: ld["address"]["postalCode"] = cp
    if local: ld["address"]["addressLocality"] = local
    if distrito: ld["address"]["addressRegion"] = distrito
    if tel: ld["telephone"] = tel
    if mail: ld["email"] = mail
    if site: ld["url"] = site; ld["mainEntityOfPage"] = url
    ldjson = json.dumps(ld, ensure_ascii=False)

    crumbs = [{"@type":"ListItem","position":1,"name":"Início","item":BASE+"/"},
              {"@type":"ListItem","position":2,"name":"Creches por distrito","item":BASE+"/creches"}]
    if dslug: crumbs.append({"@type":"ListItem","position":3,"name":f"Creches em {distrito}","item":f"{BASE}/creches/{dslug}"})
    crumbs.append({"@type":"ListItem","position":len(crumbs)+1,"name":nome,"item":url})
    ldbc = json.dumps({"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":crumbs}, ensure_ascii=False)

    # === Avatar inicial ===
    inicial = (nome or "?")[:1].upper()

    # === Dados em grelha 2 colunas (sem duplicar info do hero) ===
    items = []
    if morada or cp:
        end = esc(morada) + (f", {esc(cp)}" if cp else "")
        if local: end += f" {el}"
        items.append(("Morada", end, True))
    if distrito:
        items.append(("Distrito", f'<a href="/creches/{dslug}">{esc(distrito)}</a>' if dslug else esc(distrito), False))
    items.append(("Resposta social", esc(resposta), False))
    if oper:
        items.append(("Operador", esc(oper), False))
    if site:
        items.append(("Site", f'<a href="{esc(site)}" rel="nofollow noopener" target="_blank">{esc(site[:50])}↗</a>', False))
    drows = "\n".join(
        f'<div class="item{" wide" if wide else ""}"><span class="k">{k}</span><span class="v">{v}</span></div>'
        for k,v,wide in items)

    # === CTAs grandes — 3 sempre visíveis (disabled se faltar dado) ===
    tel_clean = tel.replace(" ","").replace("/","")
    if tel:
        cta_tel = f'<a class="cta-big" href="tel:{esc(tel_clean)}" aria-label="Ligar"><span class="ic">📞</span><span class="lb">Ligar</span></a>'
    else:
        cta_tel = '<span class="cta-big disabled" aria-label="Sem telefone registado"><span class="ic">📞</span><span class="lb">Sem telefone</span></span>'

    if mail:
        # Email template pré-preenchido (sem dados pessoais sensíveis no client; o pai pode editar)
        subj = f"Pedido de informação — {nome}"
        body_tpl = (f"Olá,\n\nGostaria de saber se têm vaga para a próxima época "
                    f"e qual o procedimento de inscrição.\n\nObrigado(a)")
        import urllib.parse as _u
        href = f"mailto:{mail}?subject={_u.quote(subj)}&body={_u.quote(body_tpl)}"
        cta_mail = f'<a class="cta-big" href="{esc(href)}" aria-label="Enviar email"><span class="ic">✉</span><span class="lb">Email</span></a>'
    else:
        cta_mail = '<span class="cta-big disabled" aria-label="Sem email registado"><span class="ic">✉</span><span class="lb">Sem email</span></span>'

    # Direcções via Google Maps (sempre temos lat/lon)
    dir_url = f"https://www.google.com/maps/dir/?api=1&destination={lat},{lon}"
    cta_dir = f'<a class="cta-big" href="{dir_url}" target="_blank" rel="noopener" aria-label="Como chegar"><span class="ic">🗺</span><span class="lb">Direcções</span></a>'

    ctas_html = f'<div class="ctas-big">{cta_tel}{cta_mail}{cta_dir}</div>'

    # === Banner qualidade de dados ===
    missing = []
    if not tel: missing.append("telefone")
    if not mail: missing.append("email")
    if missing:
        what = " e ".join(missing)
        banner = (f'<div class="q-banner warn">⚠ Faltam-nos os contactos desta creche ({what}). '
                  f'<a href="mailto:geral@creches.app?subject=Contacto%20{esc(nome).replace(" ","%20")}">Sabes? Ajuda outros pais →</a></div>')
    else:
        banner = '<div class="q-banner ok">✓ Contactos verificados</div>'

    # === Creches próximas — mini-cards com pills coloridos ===
    viz = vizinhas(c)
    vlis = "\n".join(
        f'<li><a class="nm" href="/creche/{slugs[o["id"]]}">{esc(o["nome"])}</a>'
        f'<div class="meta">'
        f'<span class="pill tipo-{esc(o.get("tipo","Desconhecido") or "Desconhecido")}">{esc(o.get("tipo","Desconhecido") or "Desconhecido")}</span>'
        f'<span class="d">{d:.1f} km</span>'
        f'</div></li>'
        for o,d in viz)

    # FAQ condicional
    if tipo in ("IPSS","Pública"):
        grat = (f"A {en} integra a rede {'solidária (IPSS)' if tipo=='IPSS' else 'pública'}. "
                "Para crianças nascidas a partir de 1 de setembro de 2021, a frequência de creche pode ser gratuita ao abrigo do programa "
                '<a href="/guias/creche-feliz">Creche Feliz</a>, se a instituição integrar a rede aderente e tiver vaga. '
                "Confirma diretamente com a instituição ou na app oficial da Segurança Social.")
    else:
        grat = (f"A {en} é {etipo.lower() if tipo else 'privada'}. As creches privadas só são gratuitas se forem "
                '<strong>aderentes ao programa <a href="/guias/creche-feliz">Creche Feliz</a></strong> e quando não há vagas na rede social da zona. '
                "Confirma a adesão e o valor da mensalidade diretamente com a creche.")
    contacto_faq = (f"Podes ligar para o <a href=\"tel:{esc(tel.replace(' ',''))}\">{esc(tel)}</a>" + (f" ou escrever para <a href=\"mailto:{esc(mail)}\">{esc(mail)}</a>" if mail else "") + "." if tel
                    else (f"Podes escrever para <a href=\"mailto:{esc(mail)}\">{esc(mail)}</a>." if mail
                    else "Não temos contacto registado para esta creche. Abre-a no <a href=\"/app#creche-" + c["id"] + "\">mapa</a> para veres a localização exata e procura o contacto localmente — e se o souberes, <a href=\"mailto:geral@creches.app\">envia-nos</a> para ajudarmos outros pais."))

    page = f"""<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#FF9F68">
<title>{title}</title>
<meta name="description" content="{esc(desc)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{url}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:title" content="{en} — {esc(resposta)} em {el}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="place">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="pt_PT">
<meta name="twitter:image" content="{BASE}/og-image.png">
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">
{STYLE}
<script type="application/ld+json">{ldjson}</script>
<script type="application/ld+json">{ldbc}</script>
<script defer src="/_vercel/insights/script.js"></script>
</head>
<body>
{HEADER}
<main>
  <div class="breadcrumb"><a href="/">Início</a> › <a href="/creches">Distritos</a>{f' › <a href="/creches/{dslug}">{esc(distrito)}</a>' if dslug else ''} › {en}</div>

  <!-- HERO CARD: avatar + nome + badges + 3 CTAs grandes -->
  <div class="hero-creche">
    <div class="top">
      <div class="avatar" aria-hidden="true">{esc(inicial)}</div>
      <div class="info">
        <h1>{en}</h1>
        <div class="badges">{f'<span class="badge tipo-{esc(tipo) or "Desconhecido"}">{etipo or "Sem classificação"}</span>'}<span class="badge">{esc(resposta)}</span><span class="badge">👶 {esc(fx)}</span>{f'<span class="badge">📍 {el}</span>' if local else ''}</div>
      </div>
    </div>
    {ctas_html}
  </div>

  {banner}

  <div class="card">
    <h2>Detalhes</h2>
    <div class="grid2">{drows}</div>
  </div>

  <div class="card" style="padding:10px">
    <iframe class="mapa-embed" loading="lazy" title="Mapa: {en}" src="https://www.openstreetmap.org/export/embed.html?bbox={lon-0.008:.5f}%2C{lat-0.005:.5f}%2C{lon+0.008:.5f}%2C{lat+0.005:.5f}&amp;layer=mapnik&amp;marker={lat:.6f}%2C{lon:.6f}"></iframe>
    <p style="margin:10px 4px 4px;font-size:13px;color:var(--ink-soft);text-align:center">
      <a href="/app#creche-{c['id']}" style="font-weight:700">→ Ver área completa no mapa interativo</a>
    </p>
  </div>

  <h2 style="font-size:18px;margin:28px 0 10px">Creches perto desta</h2>
  <ul class="prox">
{vlis}
  </ul>
  <p style="font-size:14px;color:var(--ink-soft);margin-top:10px">Compara todas as creches da zona, com filtros por idade e tipo, no <a href="/app">mapa interativo</a>{f' — ou vê a <a href="/creches/{dslug}">lista completa de creches em {esc(distrito)}</a>' if dslug else ''}.</p>

  <h2 style="font-size:18px;margin:28px 0 6px">Perguntas frequentes</h2>
  <div class="faq">
    <details><summary>{('A ' + en) if not nome.lower().startswith('a ') else en} é gratuita?</summary><p>{grat}</p></details>
    <details><summary>Que idades aceita?</summary><p>{esc(fx)}{' — funciona como ' + esc(resposta.lower()) if resposta else ''}. Em caso de dúvida (berçário, salas por ano), confirma com a instituição: a capacidade por sala muda todos os anos letivos.</p></details>
    <details><summary>Como posso contactar ou visitar?</summary><p>{contacto_faq} Vê no nosso guia <a href="/guias/como-escolher-creche">as 15 perguntas a fazer na visita</a>.</p></details>
  </div>

  <div class="aviso">
    Dados de <a href="{esc(c.get('osm_url',''))}" rel="nofollow noopener" target="_blank">OpenStreetMap</a> (ODbL), atualizados a {HOJE}. Podem existir alterações de contactos ou horários — confirma sempre com a instituição.
    És responsável por esta creche? <a href="/para-creches">Atualiza os teus dados</a> ou <a href="mailto:geral@creches.app?subject=Correção: {en}">reporta uma correção</a>.
  </div>
</main>
{FOOTER}
</body>
</html>"""
    with open(f"creche/{slug}.html","w",encoding="utf-8") as f:
        f.write(page)
    urls.append(url)

print(f"✓ Geradas {len(urls)} fichas")
print(f"  Saltadas (Escolas Básicas): {n_skip_eb}")

# sitemap-creches.xml
with open("sitemap-creches.xml","w",encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    for u in urls:
        f.write(f"  <url><loc>{u}</loc><lastmod>{HOJE}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n")
    f.write("</urlset>\n")
print(f"✓ sitemap-creches.xml: {len(urls)} URLs")

# mapping id->slug para outros scripts
json.dump(slugs, open("scripts/slugs.json","w",encoding="utf-8"), ensure_ascii=False, indent=0)
print(f"✓ {len(urls)} fichas geradas em /creche/")
print(f"✓ sitemap-creches.xml ({len(urls)} URLs)")
