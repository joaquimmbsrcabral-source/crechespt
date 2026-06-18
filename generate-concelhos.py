#!/usr/bin/env python3
"""
Gera páginas SEO por concelho/localidade para creches.app.

Estrutura de URL: /creches/{distrito-slug}/{concelho-slug}
Exemplo: /creches/lisboa/mem-martins

Só gera páginas para concelhos com >= MIN_CRECHES creches (para evitar thin content
penalizado pelo Google).

Uso:
  cd ~/Documents/Claude/Projects/CrechesPT
  python3 generate-concelhos.py
"""

import os
import re
import json
import gzip
import base64
import unicodedata
from collections import defaultdict
from html import escape
from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = "https://creches.app"
MIN_CRECHES = 3   # threshold para criar página

TODAY = datetime.now().strftime("%Y-%m-%d")


def slugify(text):
    """Slugifica string PT: 'Mem Martins' -> 'mem-martins'."""
    text = (text or "").strip()
    # remove accents
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text or "sem-nome"


def load_dataset():
    with open(os.path.join(ROOT, "app.html")) as f:
        html = f.read()
    m = re.search(r'<script[^>]*id="dataset"[^>]*>(.*?)</script>', html, re.DOTALL)
    if not m:
        raise RuntimeError("Dataset not found in app.html")
    b64 = m.group(1).strip()
    raw = gzip.decompress(base64.b64decode(b64))
    return json.loads(raw)


def render_page(distrito, localidade, creches, all_localidades_in_distrito):
    """Renderiza HTML de uma página de concelho."""
    distrito_slug = slugify(distrito)
    localidade_slug = slugify(localidade)
    n = len(creches)
    url = f"{BASE}/creches/{distrito_slug}/{localidade_slug}"

    title = f"Creches em {localidade}, {distrito} ({n}) — Creches.app"
    description = (
        f"Lista atualizada de {n} creches, jardins de infância e infantários em "
        f"{localidade} ({distrito}), com mapa, contactos e filtros por idade. Gratuito."
    )

    # Cards das creches
    list_html = []
    for c in creches:
        nome = escape(c.get("nome", "(sem nome)"))
        morada = escape(c.get("morada", ""))
        cp = escape(c.get("codigo_postal", ""))
        tel = escape(c.get("telefone", ""))
        tipo = escape(c.get("tipo", "Desconhecido"))
        slug_creche = slugify(nome) + "-" + str(c.get("id", "")).replace("osm-node-","").replace("osm-way-","")
        # use existing slug if possible
        slug = c.get("slug") or slug_creche
        url_creche = f"{BASE}/creche/{slug}"
        tel_block = f'<div class="tel">📞 {tel}</div>' if tel else ""
        morada_block = f'<div class="addr">📍 {morada} {cp}</div>' if morada or cp else ""
        list_html.append(f'''<li class="row">
  <a class="nm" href="{url_creche}">{nome}</a>
  <div class="meta"><span class="tipo">{tipo}</span></div>
  {morada_block}
  {tel_block}
</li>''')
    list_html = "\n".join(list_html)

    # Outras localidades no mesmo distrito
    sister_html = []
    for other in sorted(all_localidades_in_distrito):
        if other == localidade:
            continue
        other_slug = slugify(other)
        sister_html.append(
            f'<a href="{BASE}/creches/{distrito_slug}/{other_slug}">{escape(other)}</a>'
        )
    sister_html = " · ".join(sister_html[:30])  # cap a 30 links

    # Schema JSON-LD
    json_ld = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": f"Creches em {localidade}, {distrito}",
        "description": description,
        "numberOfItems": n,
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": i + 1,
                "item": {
                    "@type": "ChildCare",
                    "name": c.get("nome", ""),
                    "address": {
                        "@type": "PostalAddress",
                        "streetAddress": c.get("morada", ""),
                        "postalCode": c.get("codigo_postal", ""),
                        "addressLocality": localidade,
                        "addressRegion": distrito,
                        "addressCountry": "PT"
                    },
                    "telephone": c.get("telefone", "")
                }
            }
            for i, c in enumerate(creches[:20])
        ]
    }

    # Breadcrumbs schema
    breadcrumbs_ld = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Início", "item": BASE},
            {"@type": "ListItem", "position": 2, "name": "Creches", "item": f"{BASE}/creches"},
            {"@type": "ListItem", "position": 3, "name": distrito,
             "item": f"{BASE}/creches/{distrito_slug}"},
            {"@type": "ListItem", "position": 4, "name": localidade, "item": url}
        ]
    }

    html = f'''<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#FF9F68">
<meta name="description" content="{escape(description)}">
<meta name="robots" content="index, follow">
<meta property="og:title" content="{escape(title)}">
<meta property="og:description" content="{escape(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="canonical" href="{url}">
<title>{escape(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Fredoka:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/legal.css">
<style>
  .hero-conc{{padding:30px 24px 10px;text-align:center;max-width:720px;margin:0 auto}}
  .hero-conc .kicker{{display:inline-block;background:var(--c-coral-soft);color:var(--c-coral);
    padding:3px 12px;border-radius:var(--r-pill);font-weight:700;font-size:11px;margin-bottom:12px}}
  .hero-conc h1{{font-size:32px;margin-bottom:8px;line-height:1.15}}
  .hero-conc .sub{{color:var(--ink-soft);font-size:15px;margin:0 0 18px}}
  .hero-conc .ctas a{{display:inline-block;padding:12px 22px;border-radius:var(--r-pill);
    font-weight:700;font-size:14px;text-decoration:none;margin:0 6px}}
  .hero-conc .ctas .primary{{background:linear-gradient(135deg,var(--c-coral),var(--c-peach));color:#fff;
    box-shadow:0 6px 16px rgba(255,107,157,.35)}}
  .hero-conc .ctas .ghost{{background:#fff;color:var(--ink);box-shadow:var(--sh-1)}}
  .breadcrumb{{text-align:center;font-size:12px;color:var(--ink-soft);margin:20px auto 0;padding:0 24px}}
  .breadcrumb a{{color:var(--ink-soft);text-decoration:none}}
  .breadcrumb a:hover{{color:var(--c-coral)}}
  .list-wrap{{max-width:780px;margin:0 auto;padding:18px 24px 40px}}
  ul.creche-list{{list-style:none;padding:0;margin:0;display:grid;gap:10px}}
  .creche-list .row{{background:rgba(255,255,255,.95);border-radius:var(--r-md);padding:14px 16px;
    box-shadow:0 1px 2px rgba(60,40,90,.04);transition:all .15s}}
  .creche-list .row:hover{{box-shadow:var(--sh-1);transform:translateY(-1px)}}
  .creche-list .nm{{font-weight:700;color:var(--ink);font-size:15px;text-decoration:none;display:block}}
  .creche-list .nm:hover{{color:var(--c-coral)}}
  .creche-list .meta{{font-size:12px;color:var(--ink-soft);margin-top:4px}}
  .creche-list .tipo{{display:inline-block;background:var(--c-coral-soft);color:var(--c-coral);
    padding:2px 8px;border-radius:var(--r-pill);font-weight:600;font-size:11px}}
  .creche-list .addr{{font-size:12px;color:var(--ink-soft);margin-top:6px}}
  .creche-list .tel{{font-size:12px;color:var(--ink-soft);margin-top:2px}}
  .sister{{background:rgba(255,255,255,.7);border-radius:var(--r-md);padding:16px 20px;margin:20px auto;
    max-width:780px;font-size:13px;color:var(--ink-soft)}}
  .sister b{{display:block;color:var(--ink);margin-bottom:8px;font-family:"Fredoka"}}
  .sister a{{color:var(--c-coral);text-decoration:none}}
  .sister a:hover{{text-decoration:underline}}
  .related-guias{{background:linear-gradient(135deg,var(--c-coral-soft),var(--c-peach-soft));
    border-radius:var(--r-md);padding:20px;margin:20px auto;max-width:780px;text-align:center}}
  .related-guias h3{{margin:0 0 10px;font-family:"Fredoka";color:var(--ink)}}
  .related-guias a{{display:inline-block;background:#fff;padding:8px 16px;border-radius:var(--r-pill);
    color:var(--ink);text-decoration:none;font-weight:600;font-size:13px;margin:4px 4px;box-shadow:var(--sh-1)}}
</style>
<script type="application/ld+json">{json.dumps(json_ld, ensure_ascii=False)}</script>
<script type="application/ld+json">{json.dumps(breadcrumbs_ld, ensure_ascii=False)}</script>
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{{"token": "076bc362f2104b70ba542774beb4a274"}}'></script>
</head>
<body>

<nav class="breadcrumb">
  <a href="/">Início</a> →
  <a href="/creches">Creches</a> →
  <a href="/creches/{distrito_slug}">{escape(distrito)}</a> →
  <span>{escape(localidade)}</span>
</nav>

<section class="hero-conc">
  <span class="kicker">{escape(distrito).upper()}</span>
  <h1>Creches em {escape(localidade)}</h1>
  <p class="sub">{n} creches, jardins de infância e infantários encontrados. Vê no mapa, contacta diretamente.</p>
  <div class="ctas">
    <a href="/app?q={escape(localidade)}" class="primary">Abrir no mapa →</a>
    <a href="/guias/como-escolher-creche" class="ghost">Como escolher creche</a>
  </div>
</section>

<div class="list-wrap">
  <ul class="creche-list">
    {list_html}
  </ul>
</div>

<div class="related-guias">
  <h3>Guias para pais a procurar creche</h3>
  <a href="/guias/como-escolher-creche">Como escolher creche</a>
  <a href="/guias/quanto-custa-creche-portugal">Quanto custa em 2026</a>
  <a href="/guias/creche-ama-avos-qual-escolher">Creche vs ama vs avós</a>
</div>

<div class="sister">
  <b>Outras zonas em {escape(distrito)}:</b>
  {sister_html or '<i>(esta é a única localidade no distrito com creches mapeadas)</i>'}
</div>

<footer style="text-align:center;padding:30px 20px;font-size:12px;color:var(--ink-soft)">
  <a href="/">Início</a> ·
  <a href="/app">App</a> ·
  <a href="/sobre">Sobre</a> ·
  <a href="/imprensa">Imprensa</a> ·
  <a href="/privacidade">Privacidade</a> ·
  <a href="/cookies">Cookies</a> ·
  <a href="/termos">Termos</a>
  <p style="margin-top:14px">© 2026 Creches.app · Feito em Lisboa</p>
</footer>

</body>
</html>'''
    return html


def main():
    print("=== Concelho page generator ===\n")
    data = load_dataset()
    print(f"Dataset: {len(data)} creches\n")

    # Agrupar por (distrito, localidade)
    groups = defaultdict(list)
    for c in data:
        d = c.get("distrito", "").strip()
        l = c.get("localidade", "").strip()
        if d and l:
            groups[(d, l)].append(c)

    # localidades por distrito (para internal linking)
    distrito_to_localidades = defaultdict(list)
    for (d, l), creches in groups.items():
        if len(creches) >= MIN_CRECHES:
            distrito_to_localidades[d].append(l)

    # Filtrar e gerar
    eligible = [(d, l, cs) for (d, l), cs in groups.items() if len(cs) >= MIN_CRECHES]
    print(f"Concelhos com >= {MIN_CRECHES} creches: {len(eligible)}")

    generated = []
    skipped = 0
    for distrito, localidade, creches in eligible:
        try:
            distrito_slug = slugify(distrito)
            localidade_slug = slugify(localidade)
            # ordenar creches alfabeticamente
            creches_sorted = sorted(creches, key=lambda c: (c.get("nome", "")).lower())
            html = render_page(distrito, localidade, creches_sorted,
                               distrito_to_localidades[distrito])
            # Criar dir
            out_dir = os.path.join(ROOT, "creches", distrito_slug)
            os.makedirs(out_dir, exist_ok=True)
            out_path = os.path.join(out_dir, f"{localidade_slug}.html")
            with open(out_path, "w") as f:
                f.write(html)
            generated.append({
                "distrito": distrito, "localidade": localidade,
                "n": len(creches), "path": f"/creches/{distrito_slug}/{localidade_slug}"
            })
        except Exception as e:
            print(f"  ⚠ skip {distrito}/{localidade}: {e}")
            skipped += 1

    print(f"\n✓ Geradas {len(generated)} páginas")
    print(f"  Saltadas: {skipped}")

    # Sitemap específico para concelhos
    sitemap_lines = ['<?xml version="1.0" encoding="UTF-8"?>',
                     '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for g in generated:
        sitemap_lines.append("  <url>")
        sitemap_lines.append(f"    <loc>{BASE}{g['path']}</loc>")
        sitemap_lines.append(f"    <lastmod>{TODAY}</lastmod>")
        sitemap_lines.append(f"    <changefreq>weekly</changefreq>")
        sitemap_lines.append(f"    <priority>0.7</priority>")
        sitemap_lines.append("  </url>")
    sitemap_lines.append("</urlset>")
    with open(os.path.join(ROOT, "sitemap-concelhos.xml"), "w") as f:
        f.write("\n".join(sitemap_lines))
    print(f"  ✓ sitemap-concelhos.xml: {len(generated)} URLs")

    print("\nPróximos passos:")
    print("  1. Adiciona ao vercel.json:")
    print('     { "source": "/creches/:distrito/:concelho", "destination": "/creches/:distrito/:concelho.html" }')
    print("  2. Adiciona sitemap-concelhos.xml ao sitemap-index")
    print("  3. ./deploy.sh 'feat: páginas por concelho (300+ URLs SEO)'")


if __name__ == "__main__":
    main()
