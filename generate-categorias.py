#!/usr/bin/env python3
"""
Gera páginas SEO por categoria (tipo + resposta social) para creches.app.

URLs:
  /creches/{distrito}/ipss             — todas as IPSS do distrito
  /creches/{distrito}/publicas         — todas as públicas
  /creches/{distrito}/privadas         — todas as privadas
  /creches/{distrito}/bercario         — todas com berçário (0-12 meses)
  /creches/{distrito}/creche           — creches (1-3 anos)
  /creches/{distrito}/jardim-infancia  — JI (3-6 anos)
  /creches/{distrito}/atl              — ATL (6+ anos)

Só gera páginas com >= MIN_CRECHES creches (evita thin content).

Uso:
  cd ~/Documents/Claude/Projects/CrechesPT
  python3 generate-categorias.py
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
MIN_CRECHES = 5

TODAY = datetime.now().strftime("%Y-%m-%d")


# ============ CONFIG ============

TIPO_PAGES = {
    "ipss": {
        "tipo": "IPSS",
        "h1": "Creches IPSS em {distrito}",
        "kicker": "IPSS",
        "title": "Creches IPSS em {distrito} ({n}) — solidariedade + acordos",
        "description": "{n} creches IPSS (instituições de solidariedade social) em {distrito}, com mapa, contactos e filtros por idade. Muitas comparticipadas pelo Estado.",
        "intro": "As creches IPSS são instituições de solidariedade social. Têm acordos com a Segurança Social, o que permite mensalidades comparticipadas em função do rendimento do agregado familiar.",
        "filter": lambda c: c.get("tipo_oper") == "IPSS" or c.get("tipo") == "IPSS",
        "color": "peach",
    },
    "publicas": {
        "tipo": "Pública",
        "h1": "Creches públicas em {distrito}",
        "kicker": "PÚBLICAS",
        "title": "Creches públicas em {distrito} ({n}) — rede do Ministério da Educação",
        "description": "{n} creches e jardins de infância públicos em {distrito}, com mapa, contactos e filtros por idade. Gratuito ou de baixa mensalidade.",
        "intro": "As creches e jardins de infância públicos integram a rede do Ministério da Educação. As mensalidades são baixas ou inexistentes, mas as vagas são limitadas.",
        "filter": lambda c: c.get("tipo_oper") == "Pública" or c.get("tipo") == "Pública",
        "color": "turq",
    },
    "privadas": {
        "tipo": "Privada",
        "h1": "Creches privadas em {distrito}",
        "kicker": "PRIVADAS",
        "title": "Creches privadas em {distrito} ({n}) — mensalidades, contactos, mapa",
        "description": "{n} creches privadas em {distrito}, com mapa, contactos e filtros por idade. Mensalidades médias entre €600 e €900/mês.",
        "intro": "As creches privadas têm mensalidades mais elevadas — em média entre €600 e €900/mês — mas geralmente vagas mais rápidas e horários mais flexíveis.",
        "filter": lambda c: c.get("tipo_oper") == "Privada" or c.get("tipo") == "Privada",
        "color": "coral",
    },
}

IDADE_PAGES = {
    "bercario": {
        "label": "Berçário",
        "h1": "Berçário em {distrito}",
        "kicker": "BERÇÁRIO · 0-1 ANO",
        "title": "Berçário em {distrito} ({n}) — creches que aceitam bebés",
        "description": "{n} creches em {distrito} que aceitam bebés (0-12 meses), com mapa, contactos e filtros. Berçário gratuito.",
        "intro": "As creches com berçário aceitam bebés desde os 4 ou 6 meses (dependendo da instituição). A procura é grande — começa a procurar com 6 meses de antecedência.",
        "filter": lambda c: (c.get("idade_min_meses") is not None and c["idade_min_meses"] <= 6) or "berc" in (c.get("resposta") or "").lower(),
        "color": "coral",
    },
    "creche": {
        "label": "Creche",
        "h1": "Creches em {distrito}",
        "kicker": "CRECHE · 1-3 ANOS",
        "title": "Creches em {distrito} ({n}) — crianças 1-3 anos, mapa e contactos",
        "description": "{n} creches em {distrito} para crianças entre os 1 e os 3 anos, com mapa, contactos e filtros por tipo (IPSS, pública, privada).",
        "intro": "As creches recebem crianças entre os 12 meses e os 3 anos. Esta é a faixa etária mais procurada e onde há mais oferta — mas também onde há mais listas de espera.",
        "filter": lambda c: ("creche" in (c.get("resposta") or "").lower() or "infant" in (c.get("resposta") or "").lower()) and (c.get("idade_min_meses") is None or c["idade_min_meses"] <= 36),
        "color": "peach",
    },
    "jardim-infancia": {
        "label": "Jardim de Infância",
        "h1": "Jardim de Infância em {distrito}",
        "kicker": "JI · 3-6 ANOS",
        "title": "Jardim de Infância em {distrito} ({n}) — crianças 3-6 anos",
        "description": "{n} jardins de infância em {distrito} para crianças entre os 3 e os 6 anos, com mapa, contactos e filtros por tipo.",
        "intro": "Os jardins de infância recebem crianças entre os 3 e os 6 anos. Em Portugal, muitas IPSS oferecem JI gratuito através do programa Creche Feliz.",
        "filter": lambda c: "jardim" in (c.get("resposta") or "").lower() or (c.get("idade_max_meses") is not None and c["idade_max_meses"] >= 60),
        "color": "turq",
    },
    "atl": {
        "label": "ATL",
        "h1": "ATL em {distrito}",
        "kicker": "ATL · 6+ ANOS",
        "title": "ATL em {distrito} ({n}) — atividades de tempos livres",
        "description": "{n} ATL (atividades de tempos livres) em {distrito}, para crianças do 1º ciclo, com mapa, contactos e horários.",
        "intro": "Os ATL acolhem crianças do 1º ciclo no tempo extra-escolar. Muitos funcionam também durante as férias escolares.",
        "filter": lambda c: "atl" in (c.get("resposta") or "").lower() or (c.get("idade_max_meses") is not None and c["idade_max_meses"] > 72),
        "color": "yellow",
    },
}


# ============ HELPERS ============

def slugify(text):
    text = (text or "").strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "sem-nome"


def load_dataset():
    with open(os.path.join(ROOT, "app.html")) as f:
        html = f.read()
    m = re.search(r'<script[^>]*id="dataset"[^>]*>(.*?)</script>', html, re.DOTALL)
    if not m:
        raise RuntimeError("Dataset not found in app.html")
    b64 = m.group(1).strip()
    raw = gzip.decompress(base64.b64decode(b64))
    return json.loads(raw)


# ============ TEMPLATE ============

def render_page(distrito, slug, cfg, creches, sibling_categories):
    """
    Renderiza HTML de uma página de categoria.
    sibling_categories = [(slug, label), ...] outras categorias do mesmo distrito (links cruzados)
    """
    distrito_slug = slugify(distrito)
    n = len(creches)
    url = f"{BASE}/creches/{distrito_slug}/{slug}"

    title = cfg["title"].format(distrito=distrito, n=n)
    description = cfg["description"].format(distrito=distrito, n=n)
    h1 = cfg["h1"].format(distrito=distrito)
    intro = cfg["intro"]

    # Cards das creches
    list_html = []
    for c in creches:
        nome = escape(c.get("nome", "(sem nome)"))
        morada = escape(c.get("morada", ""))
        cp = escape(c.get("codigo_postal", ""))
        tel = escape(c.get("telefone", ""))
        tipo = escape(c.get("tipo", "Desconhecido"))
        slug_creche = slugify(nome) + "-" + str(c.get("id", "")).replace("osm-node-", "").replace("osm-way-", "")
        cslug = c.get("slug") or slug_creche
        url_creche = f"{BASE}/creche/{cslug}"
        tel_block = f'<div class="tel">📞 {tel}</div>' if tel else ""
        morada_block = f'<div class="addr">📍 {morada} {cp}</div>' if morada or cp else ""
        list_html.append(f'''<li class="row">
  <a class="nm" href="{url_creche}">{nome}</a>
  <div class="meta"><span class="tipo">{tipo}</span></div>
  {morada_block}
  {tel_block}
</li>''')
    list_html = "\n".join(list_html)

    # Outras categorias do mesmo distrito
    sibling_html = []
    for s, label in sibling_categories:
        if s == slug:
            continue
        sibling_html.append(
            f'<a href="{BASE}/creches/{distrito_slug}/{s}">{escape(label)}</a>'
        )
    sibling_html = " · ".join(sibling_html)

    # Schema JSON-LD
    json_ld = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": h1,
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
                        "addressLocality": c.get("localidade", ""),
                        "addressRegion": distrito,
                        "addressCountry": "PT"
                    },
                    "telephone": c.get("telefone", "")
                }
            }
            for i, c in enumerate(creches[:20])
        ]
    }

    breadcrumbs_ld = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Início", "item": BASE},
            {"@type": "ListItem", "position": 2, "name": "Creches", "item": f"{BASE}/creches"},
            {"@type": "ListItem", "position": 3, "name": distrito, "item": f"{BASE}/creches/{distrito_slug}"},
            {"@type": "ListItem", "position": 4, "name": cfg.get("label", slug.title()), "item": url}
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
  .hero-cat{{padding:30px 24px 10px;text-align:center;max-width:720px;margin:0 auto}}
  .hero-cat .kicker{{display:inline-block;background:var(--c-coral-soft);color:var(--c-coral);
    padding:3px 12px;border-radius:var(--r-pill);font-weight:700;font-size:11px;margin-bottom:12px}}
  .hero-cat h1{{font-size:32px;margin-bottom:8px;line-height:1.15}}
  .hero-cat .sub{{color:var(--ink-soft);font-size:15px;margin:0 0 18px}}
  .hero-cat .intro{{background:rgba(255,255,255,.7);border-radius:14px;padding:16px 20px;margin:18px auto 0;
    font-size:14px;line-height:1.55;color:var(--ink);max-width:680px}}
  .hero-cat .ctas a{{display:inline-block;padding:12px 22px;border-radius:var(--r-pill);
    font-weight:700;font-size:14px;text-decoration:none;margin:0 6px}}
  .hero-cat .ctas .primary{{background:linear-gradient(135deg,var(--c-coral),var(--c-peach));color:#fff;
    box-shadow:0 6px 16px rgba(255,107,157,.35)}}
  .hero-cat .ctas .ghost{{background:#fff;color:var(--ink);box-shadow:var(--sh-1)}}
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
  <span>{escape(cfg.get("label", slug.title()))}</span>
</nav>

<section class="hero-cat">
  <span class="kicker">{cfg["kicker"]}</span>
  <h1>{escape(h1)}</h1>
  <p class="sub">{n} estabelecimentos encontrados. Vê no mapa, contacta diretamente.</p>
  <div class="intro">{escape(intro)}</div>
  <div class="ctas" style="margin-top:18px">
    <a href="/app?distrito={escape(distrito)}" class="primary">Abrir no mapa →</a>
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
  <a href="/guias/creche-feliz-creche-gratuita-portugal">Creche Feliz (gratuito)</a>
</div>

<div class="sister">
  <b>Outras categorias em {escape(distrito)}:</b>
  {sibling_html or '<i>(esta é a única categoria com creches mapeadas neste distrito)</i>'}
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


# ============ MAIN ============

def main():
    print("=== Generator: páginas por categoria (tipo + idade) ===\n")
    data = load_dataset()
    print(f"Dataset: {len(data)} creches")

    # Agrupar por distrito
    por_distrito = defaultdict(list)
    for c in data:
        d = c.get("distrito", "").strip()
        if d:
            por_distrito[d].append(c)
    print(f"Distritos: {len(por_distrito)}\n")

    generated = []
    skipped = 0

    all_pages = {**TIPO_PAGES, **IDADE_PAGES}

    for distrito, creches_d in sorted(por_distrito.items()):
        distrito_slug = slugify(distrito)

        # Filtrar para cada categoria
        results = {}
        for slug, cfg in all_pages.items():
            filtered = [c for c in creches_d if cfg["filter"](c)]
            if len(filtered) >= MIN_CRECHES:
                results[slug] = (cfg, filtered)

        # siblings = todas as categorias activas neste distrito
        siblings = [(slug, cfg.get("label", slug.title())) for slug, (cfg, _) in results.items()]

        for slug, (cfg, filtered) in results.items():
            try:
                filtered_sorted = sorted(filtered, key=lambda c: (c.get("nome", "")).lower())
                # Adicionar label ao cfg para fallback
                cfg_with_label = dict(cfg)
                if "label" not in cfg_with_label:
                    # tipo pages: usar 'tipo' como label
                    cfg_with_label["label"] = cfg.get("tipo", slug.title())
                html = render_page(distrito, slug, cfg_with_label, filtered_sorted, siblings)
                # Save
                out_dir = os.path.join(ROOT, "creches", distrito_slug)
                os.makedirs(out_dir, exist_ok=True)
                out_path = os.path.join(out_dir, f"{slug}.html")
                with open(out_path, "w") as f:
                    f.write(html)
                generated.append({
                    "distrito": distrito, "slug": slug,
                    "n": len(filtered), "path": f"/creches/{distrito_slug}/{slug}"
                })
            except Exception as e:
                print(f"  ⚠ skip {distrito}/{slug}: {e}")
                skipped += 1

    print(f"\n✓ Geradas {len(generated)} páginas de categoria")
    print(f"  Saltadas: {skipped}")

    # Sitemap
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
    with open(os.path.join(ROOT, "sitemap-categorias.xml"), "w") as f:
        f.write("\n".join(sitemap_lines))
    print(f"  ✓ sitemap-categorias.xml: {len(generated)} URLs")

    # Resumo por tipo de categoria
    print("\nResumo por slug:")
    counts = defaultdict(int)
    for g in generated:
        counts[g["slug"]] += 1
    for slug, n in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"  {slug:25} {n:3} distritos")

    print("\nPróximos passos:")
    print("  1. vercel.json já tem rewrite /creches/:distrito/:concelho → cobre estas URLs")
    print("  2. Adicionar sitemap-categorias.xml ao sitemap-index.xml")
    print("  3. ./deploy.sh 'feat: páginas categoria distrito (tipo + idade)'")


if __name__ == "__main__":
    main()
