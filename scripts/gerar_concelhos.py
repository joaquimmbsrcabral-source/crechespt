#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera as páginas /creches/{distrito}/{concelho} a partir do concelho REAL.

Porque existe: as páginas antigas foram construídas a partir do campo
`localidade` do OpenStreetMap, que muitas vezes é a freguesia e não o concelho.
Resultado: "Creches em Lisboa" listava 7 de 130, "Creches em Sintra" 6 de 81 —
65% das creches não apareciam na página que corresponde exatamente à pesquisa
que os pais fazem no Google ("creches em X"). Havia ainda 191 concelhos sem
página nenhuma e 77 páginas de freguesias soltas a fragmentar a autoridade.

Agora usa `concelho_slug`, atribuído por point-in-polygon sobre as fronteiras
oficiais da CAOP — cobre 100% do dataset.

Uso: python3 scripts/gerar_concelhos.py [--limpar-orfas]
"""
import json, os, re, sys, unicodedata
from datetime import date
from collections import defaultdict
from html import escape as esc

# Mesmo normalizador de horário das fichas — o critério de "horário alargado"
# tem de ser um só em todo o site. O sys.path é preciso porque o os.chdir abaixo
# muda o directório antes de o import correr em alguns modos de invocação.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from horario import tem_horario_alargado

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)
HOJE = date.today().isoformat()

DIST_SLUG = {
    "Lisboa": "lisboa", "Porto": "porto", "Braga": "braga", "Setúbal": "setubal",
    "Aveiro": "aveiro", "Leiria": "leiria", "Coimbra": "coimbra", "Faro": "faro",
    "Santarém": "santarem", "Viseu": "viseu", "Madeira": "madeira", "Açores": "acores",
    "Viana do Castelo": "viana-do-castelo", "Vila Real": "vila-real",
    "Bragança": "braganca", "Castelo Branco": "castelo-branco", "Guarda": "guarda",
    "Portalegre": "portalegre", "Évora": "evora", "Beja": "beja",
    # As regiões autónomas aparecem no dataset com o nome completo. Sem estas
    # entradas, 51 creches dos Açores e da Madeira ficavam sem página nenhuma.
    "Região Autónoma dos Açores": "acores",
    "Região Autónoma da Madeira": "madeira",
}

def slugify(s):
    s = unicodedata.normalize("NFD", str(s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s

TITULOS_RESUMO = {
    "com horário alargado": ("Abre às 7h30 ou antes, ou fecha às 19h00 ou depois — "
                             "horário confirmado na Carta Social"),
}

def tipo_classe(t):
    t = (t or "").lower()
    if "ipss" in t or "solidar" in t or "solidár" in t: return "tipo-ipss", "IPSS"
    if "públ" in t or "publ" in t: return "tipo-publica", "Pública"
    if "priv" in t: return "tipo-privada", "Privada"
    return "tipo-outro", "Sem classificação"

# ── Dados ────────────────────────────────────────────────────────────────────
d = json.load(open("creches_pt.json", encoding="utf-8"))
creches = d if isinstance(d, list) else d.get("creches", d)
# Gémeos da Carta Social: contam uma vez só, pelo registo original.
creches = [c for c in creches if not c.get("oculto_duplicado")]
slugs = json.load(open("scripts/slugs.json", encoding="utf-8"))

# Só entram creches com ficha gerada (o gerar_fichas.py salta Escolas Básicas)
por_concelho = defaultdict(list)
for c in creches:
    cs = c.get("concelho_slug")
    if not cs or c["id"] not in slugs:
        continue
    por_concelho[cs].append(c)

# Índice distrito → [(concelho_slug, nome, n)] para os links entre irmãs
por_distrito = defaultdict(list)
for cs, lista in por_concelho.items():
    nome = lista[0].get("concelho") or cs
    dist = lista[0].get("distrito") or ""
    por_distrito[DIST_SLUG.get(dist, slugify(dist))].append((cs, nome, len(lista)))
for k in por_distrito:
    por_distrito[k].sort(key=lambda x: x[1])

CSS = """  .hero-conc{padding:30px 24px 10px;text-align:center;max-width:720px;margin:0 auto}
  .hero-conc .kicker{display:inline-block;background:var(--c-coral-soft);color:var(--c-coral);
    padding:3px 12px;border-radius:var(--r-pill);font-weight:700;font-size:11px;margin-bottom:12px}
  .hero-conc h1{font-size:32px;margin-bottom:8px;line-height:1.15}
  .hero-conc .sub{color:var(--ink-soft);font-size:15px;margin:0 0 18px}
  .hero-conc .ctas a{display:inline-block;padding:12px 22px;border-radius:var(--r-pill);
    font-weight:700;font-size:14px;text-decoration:none;margin:0 6px}
  .hero-conc .ctas .primary{background:linear-gradient(135deg,var(--c-coral),var(--c-peach));color:#fff;
    box-shadow:0 6px 16px rgba(255,107,157,.35)}
  .hero-conc .ctas .ghost{background:#fff;color:var(--ink);box-shadow:var(--sh-1)}
  .breadcrumb{text-align:center;font-size:12px;color:var(--ink-soft);margin:20px auto 0;padding:0 24px}
  .breadcrumb a{color:var(--ink-soft);text-decoration:none}
  .breadcrumb a:hover{color:var(--c-coral)}
  .list-wrap{max-width:780px;margin:0 auto;padding:18px 24px 40px}
  ul.creche-list{list-style:none;padding:0;margin:0;display:grid;gap:10px}
  .creche-list .row{background:rgba(255,255,255,.95);border-radius:var(--r-md);padding:14px 16px;
    box-shadow:0 1px 2px rgba(60,40,90,.04);transition:all .15s}
  .creche-list .row:hover{box-shadow:var(--sh-1);transform:translateY(-1px)}
  .creche-list .nm{font-weight:700;color:var(--ink);font-size:15px;text-decoration:none;display:block}
  .creche-list .nm:hover{color:var(--c-coral)}
  .creche-list .meta{font-size:12px;color:var(--ink-soft);margin-top:4px}
  .creche-list .tipo{display:inline-block;padding:2px 10px;border-radius:var(--r-pill);font-weight:700;font-size:11px;letter-spacing:.02em}
  .creche-list .tipo.tipo-ipss{background:#D8F5F4;color:#1d7d78}
  .creche-list .tipo.tipo-publica{background:#DEF5E1;color:#2f7d3b}
  .creche-list .tipo.tipo-privada{background:#FFE3EE;color:#c2447a}
  .creche-list .tipo.tipo-outro{background:#F0EBF8;color:#6E6989}
  .creche-list .fx{margin-left:6px}
  .creche-list .tel a{color:inherit;text-decoration:none}
  .creche-list .tel a:hover{color:var(--c-coral)}
  *:focus-visible{outline:2px solid #FF9F68;outline-offset:2px;border-radius:6px}
  .creche-list .addr{font-size:12px;color:var(--ink-soft);margin-top:6px}
  .creche-list .tel{font-size:12px;color:var(--ink-soft);margin-top:2px}
  .resumo{max-width:780px;margin:0 auto;padding:0 24px;display:grid;
    grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}
  .resumo div{background:rgba(255,255,255,.85);border-radius:var(--r-md);padding:12px 14px;text-align:center}
  .resumo b{display:block;font-family:"Fredoka";font-size:20px;color:var(--ink)}
  .resumo span{font-size:11.5px;color:var(--ink-soft);font-weight:600}
  .sister{background:rgba(255,255,255,.7);border-radius:var(--r-md);padding:16px 20px;margin:20px auto;
    max-width:780px;font-size:13px;color:var(--ink-soft)}
  .sister b{display:block;color:var(--ink);margin-bottom:8px;font-family:"Fredoka"}
  .sister a{color:var(--c-coral);text-decoration:none}
  .sister a:hover{text-decoration:underline}
  .related-guias{background:linear-gradient(135deg,var(--c-coral-soft),var(--c-peach-soft));
    border-radius:var(--r-md);padding:20px;margin:20px auto;max-width:780px;text-align:center}
  .related-guias h3{margin:0 0 10px;font-family:"Fredoka";color:var(--ink)}
  .related-guias a{display:inline-block;background:#fff;padding:8px 16px;border-radius:var(--r-pill);
    color:var(--ink);text-decoration:none;font-weight:600;font-size:13px;margin:4px 4px;box-shadow:var(--sh-1)}"""

HEADER = """<header style="display:flex;align-items:center;gap:14px;padding:14px 24px;background:rgba(255,255,255,.7);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:50">
  <a href="/" style="display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none">
    <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--c-coral),var(--c-peach));display:flex;align-items:center;justify-content:center;color:#fff;font-size:17px">🍼</div>
    <div><b style="font-family:Fredoka;font-size:19px;display:block;line-height:1">Creches<span style="background:linear-gradient(135deg,var(--c-coral),var(--c-peach));-webkit-background-clip:text;background-clip:text;color:transparent">.app</span></b><span style="font-size:11px;color:var(--ink-soft);font-weight:600">Mapa de creches</span></div>
  </a>
  <div style="flex:1"></div>
  <nav style="display:flex;gap:6px;align-items:center">
    <a href="/guias" style="color:var(--ink-soft);font-weight:600;font-size:13.5px;padding:8px 12px;border-radius:var(--r-pill);text-decoration:none">Guias</a>
    <a href="/creches" style="color:var(--ink-soft);font-weight:600;font-size:13.5px;padding:8px 12px;border-radius:var(--r-pill);text-decoration:none">Distritos</a>
    <a href="/app" style="background:linear-gradient(135deg,var(--c-coral),var(--c-peach));color:#fff;font-weight:700;padding:9px 18px;border-radius:var(--r-pill);box-shadow:0 6px 16px rgba(255,107,157,.35);text-decoration:none">Abrir mapa</a>
  </nav>
</header>"""

FOOTER = """<footer style="text-align:center;padding:30px 20px;font-size:12px;color:var(--ink-soft)">
  <a href="/">Início</a> ·
  <a href="/app">App</a> ·
  <a href="/sobre">Sobre</a> ·
  <a href="/imprensa">Imprensa</a> ·
  <a href="/privacidade">Privacidade</a> ·
  <a href="/cookies">Cookies</a> ·
  <a href="/termos">Termos</a>
  <p style="margin-top:14px">© 2026 Creches.app · Feito em Lisboa</p>
</footer>"""

urls, n_paginas = [], 0
for cs, lista in sorted(por_concelho.items()):
    nome = lista[0].get("concelho") or cs
    dist = lista[0].get("distrito") or ""
    dslug = DIST_SLUG.get(dist, slugify(dist))
    if not dslug:
        continue
    lista.sort(key=lambda c: (c.get("nome") or "").lower())
    n = len(lista)
    url = f"https://creches.app/creches/{dslug}/{cs}"

    # ── Contagens para o resumo ──
    n_ipss = sum(1 for c in lista if tipo_classe(c.get("tipo"))[1] == "IPSS")
    n_pub = sum(1 for c in lista if tipo_classe(c.get("tipo"))[1] == "Pública")
    n_priv = sum(1 for c in lista if tipo_classe(c.get("tipo"))[1] == "Privada")
    n_bercario = sum(1 for c in lista if (c.get("idade_min_meses") or 99) < 12)
    # Conta só as que têm horário confirmado e alargado. As que não têm horário
    # não entram nem para um lado nem para o outro — o número tem de poder ser
    # lido como "sabemos que estas X abrem cedo ou fecham tarde".
    n_horario = sum(1 for c in lista if tem_horario_alargado(c))

    desc = (f"Lista atualizada de {n} creches, jardins de infância e infantários "
            f"em {nome} ({dist}), com morada, contactos e mapa. Gratuito.")
    titulo = f"Creches em {nome}, {dist} ({n}) — Creches.app"

    # ── Itens ──
    itens, ld_itens = [], []
    for i, c in enumerate(lista, 1):
        cls, lbl = tipo_classe(c.get("tipo"))
        cslug = slugs.get(c["id"])
        tel = (c.get("telefone") or "").strip()
        tel_href = re.sub(r"[^\d+]", "", tel)
        morada = " ".join(x for x in [(c.get("morada") or "").strip(),
                                      (c.get("codigo_postal") or "").strip()] if x)
        fx = (c.get("fx") or "").strip()
        itens.append(
            f'<li class="row">\n'
            f'  <a class="nm" href="/creche/{esc(cslug)}">{esc(c.get("nome") or "")}</a>\n'
            f'  <div class="meta"><span class="tipo {cls}">{lbl}</span>'
            + (f'<span class="fx">🎂 {esc(fx)}</span>' if fx else "") + '</div>\n'
            + (f'  <div class="addr">📍 {esc(morada)}</div>\n' if morada else "")
            + (f'  <div class="tel">📞 <a href="tel:{esc(tel_href)}">{esc(tel)}</a></div>\n' if tel else "")
            + '</li>'
        )
        ld_itens.append({
            "@type": "ListItem", "position": i,
            "item": {
                "@type": "ChildCare", "name": c.get("nome") or "",
                "url": f"https://creches.app/creche/{cslug}",
                "address": {"@type": "PostalAddress",
                            "streetAddress": (c.get("morada") or ""),
                            "postalCode": (c.get("codigo_postal") or ""),
                            "addressLocality": nome, "addressRegion": dist,
                            "addressCountry": "PT"},
                **({"telephone": tel} if tel else {})
            }
        })

    ld_lista = json.dumps({"@context": "https://schema.org", "@type": "ItemList",
                           "name": f"Creches em {nome}, {dist}", "description": desc,
                           "numberOfItems": n, "itemListElement": ld_itens},
                          ensure_ascii=False)
    ld_bread = json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Início", "item": "https://creches.app"},
            {"@type": "ListItem", "position": 2, "name": "Creches", "item": "https://creches.app/creches"},
            {"@type": "ListItem", "position": 3, "name": dist, "item": f"https://creches.app/creches/{dslug}"},
            {"@type": "ListItem", "position": 4, "name": nome, "item": url}]}, ensure_ascii=False)

    # ── Concelhos irmãos do mesmo distrito (sem repetir o próprio) ──
    irmas = [(s, nm, k) for s, nm, k in por_distrito.get(dslug, []) if s != cs]
    irmas.sort(key=lambda x: -x[2])
    sister = " · ".join(f'<a href="/creches/{dslug}/{s}">{esc(nm)}</a> <span style="opacity:.6">({k})</span>'
                        for s, nm, k in irmas[:30])

    resumo = ""
    partes = [(n, "no total")]
    if n_ipss: partes.append((n_ipss, "IPSS"))
    if n_pub: partes.append((n_pub, "públicas"))
    if n_priv: partes.append((n_priv, "privadas"))
    if n_bercario: partes.append((n_bercario, "com berçário"))
    if n_horario: partes.append((n_horario, "com horário alargado"))
    # O título só existe para os rótulos que precisam de explicação: "IPSS" ou
    # "privadas" toda a gente lê, "horário alargado" é um critério nosso e tem
    # de ser dito qual é.
    resumo = ('<div class="resumo">' +
              "".join('<div{}><b>{}</b><span>{}</span></div>'.format(
                  ' title="{}"'.format(esc(TITULOS_RESUMO[t])) if t in TITULOS_RESUMO else "",
                  v, t) for v, t in partes) +
              "</div>")

    html = f"""<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#FF9F68">
<meta name="description" content="{esc(desc)}">
<meta name="robots" content="index, follow">
<meta property="og:title" content="{esc(titulo)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:image" content="https://creches.app/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="canonical" href="{url}">
<title>{esc(titulo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Fredoka:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/legal.css">
<style>
{CSS}
</style>
<script type="application/ld+json">{ld_lista}</script>
<script type="application/ld+json">{ld_bread}</script>
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{{"token": "076bc362f2104b70ba542774beb4a274"}}'></script>
</head>
<body>

{HEADER}

<nav class="breadcrumb">
  <a href="/">Início</a> →
  <a href="/creches">Creches</a> →
  <a href="/creches/{dslug}">{esc(dist)}</a> →
  <span>{esc(nome)}</span>
</nav>

<section class="hero-conc">
  <span class="kicker">{esc(dist.upper())}</span>
  <h1>Creches em {esc(nome)}</h1>
  <p class="sub">{n} creches, jardins de infância e infantários no concelho de {esc(nome)}. Vê no mapa, contacta diretamente.</p>
  <div class="ctas">
    <a href="/app?concelho={esc(cs)}" class="primary">Abrir no mapa →</a>
    <a href="/guias/como-escolher-creche" class="ghost">Como escolher creche</a>
  </div>
</section>

{resumo}

<div class="list-wrap">
  <ul class="creche-list">
{chr(10).join(itens)}
  </ul>
</div>

<div class="related-guias">
  <h3>Guias para pais a procurar creche</h3>
  <a href="/guias/como-escolher-creche">Como escolher creche</a>
  <a href="/guias/quanto-custa-creche-portugal">Quanto custa em 2026</a>
  <a href="/guias/lista-de-espera-creche">Listas de espera</a>
  <a href="/guias/creche-feliz">Creche Feliz</a>
</div>

<div class="sister">
  <b>Outros concelhos em {esc(dist)}:</b>
  {sister}
</div>

{FOOTER}

</body>
</html>"""

    caminho = f"creches/{dslug}/{cs}.html"
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    try:
        igual = open(caminho, encoding="utf-8").read() == html
    except FileNotFoundError:
        igual = False
    if not igual:
        open(caminho, "w", encoding="utf-8").write(html)
        n_paginas += 1
    urls.append(url)

print(f"✓ {len(urls)} páginas de concelho ({n_paginas} alteradas)")

# ── Sitemap ──────────────────────────────────────────────────────────────────
with open("sitemap-concelhos.xml", "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    for u in sorted(urls):
        f.write(f'  <url><loc>{u}</loc><lastmod>{HOJE}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n')
    f.write("</urlset>\n")
print(f"✓ sitemap-concelhos.xml: {len(urls)} URLs")

# ── Páginas órfãs (freguesias do modelo antigo) ──────────────────────────────
# CUIDADO: /creches/{distrito}/{categoria} também existe (ipss, publicas,
# bercario, creche, jardim-infancia, privadas) e está no sitemap-categorias.
# Essas NÃO são órfãs — são páginas legítimas de outra família.
CATEGORIAS = {"ipss", "publicas", "privadas", "bercario", "creche",
              "jardim-infancia", "atl", "infantario"}
validos = {u.rsplit("/", 1)[-1] for u in urls}
import glob as _g
orfas = [p for p in _g.glob("creches/*/*.html")
         if os.path.basename(p)[:-5] not in validos
         and os.path.basename(p)[:-5] not in CATEGORIAS]
if orfas:
    print(f"\n⚠ {len(orfas)} páginas órfãs (freguesias do modelo antigo):")
    print("   " + ", ".join(sorted(os.path.basename(p)[:-5] for p in orfas))[:300] + "…")
    if "--limpar-orfas" in sys.argv:
        for p in orfas:
            os.remove(p)
        print(f"   → apagadas. Acrescenta os redirects ao vercel.json (ver README do script).")
    else:
        print("   Corre com --limpar-orfas para as apagar (fá-lo depois de pôr os redirects).")
