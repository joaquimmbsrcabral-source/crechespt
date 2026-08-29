#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera /creches-horario-alargado/{concelho} e o índice /creches-horario-alargado.

Porque existe: nem o apoioperto, nem o crechecerta, nem o skoolist, nem o portal
da Segurança Social publicam horários de creche. Nós temos 1.728 confirmados na
Carta Social — e até hoje esse dado só era visível se o pai abrisse a ficha de
cada creche, uma a uma.

Quem entra ao turno das 8h não tem hoje forma nenhuma de descobrir que creches
do seu concelho abrem a tempo. É uma pesquisa com intenção altíssima e sem
concorrência orgânica, e é o único activo do creches.app que a concorrência não
consegue copiar sem repetir a recolha inteira.

Só geramos páginas para concelhos com 5 ou mais creches confirmadas: abaixo
disso a página é fina, não ranqueia, e dilui a autoridade das que ranqueiam.

Uso: python3 scripts/gerar_horario_alargado.py [--limpar-orfas]
"""
import json, os, re, sys, unicodedata
from datetime import date
from collections import defaultdict
from html import escape as esc

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from horario import horario_da_creche
from layout_listas import CSS, HEADER, FOOTER

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)
HOJE = date.today().isoformat()
DIR = "creches-horario-alargado"

# Abaixo de 5 a página não tem massa crítica para ranquear e rouba autoridade
# às que têm. É o mesmo limiar usado na análise que motivou estas páginas.
MINIMO = 5

DIST_SLUG = {
    "Lisboa": "lisboa", "Porto": "porto", "Braga": "braga", "Setúbal": "setubal",
    "Aveiro": "aveiro", "Leiria": "leiria", "Coimbra": "coimbra", "Faro": "faro",
    "Santarém": "santarem", "Viseu": "viseu", "Madeira": "madeira", "Açores": "acores",
    "Viana do Castelo": "viana-do-castelo", "Vila Real": "vila-real",
    "Bragança": "braganca", "Castelo Branco": "castelo-branco", "Guarda": "guarda",
    "Portalegre": "portalegre", "Évora": "evora", "Beja": "beja",
    "Região Autónoma dos Açores": "acores",
    "Região Autónoma da Madeira": "madeira",
}


def slugify(s):
    s = unicodedata.normalize("NFD", str(s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def tipo_classe(t):
    t = (t or "").lower()
    if "ipss" in t or "solidar" in t or "solidár" in t: return "tipo-ipss", "IPSS"
    if "públ" in t or "publ" in t: return "tipo-publica", "Pública"
    if "priv" in t: return "tipo-privada", "Privada"
    return "tipo-outro", "Sem classificação"


CSS_EXTRA = """
  .hora-badge{display:inline-block;background:linear-gradient(135deg,var(--c-peach-soft),var(--c-yellow-soft));
    color:#7A4A12;padding:3px 11px;border-radius:var(--r-pill);font-weight:700;font-size:12px;margin-top:6px}
  .criterio{max-width:780px;margin:18px auto 0;padding:14px 20px;background:rgba(255,255,255,.8);
    border-radius:var(--r-md);font-size:13px;color:var(--ink-soft);line-height:1.6;border-left:3px solid var(--c-peach)}
  .criterio b{color:var(--ink)}
  .idx-grid{max-width:900px;margin:0 auto;padding:18px 24px 40px;display:grid;
    grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;list-style:none}
  .idx-grid a{display:flex;justify-content:space-between;align-items:center;gap:8px;
    background:rgba(255,255,255,.95);border-radius:var(--r-md);padding:13px 16px;text-decoration:none;
    color:var(--ink);font-weight:600;font-size:14px;box-shadow:0 1px 2px rgba(60,40,90,.04);transition:all .15s}
  .idx-grid a:hover{box-shadow:var(--sh-1);transform:translateY(-1px);color:var(--c-coral)}
  .idx-grid .n{background:var(--c-peach-soft);color:#7A4A12;border-radius:var(--r-pill);
    padding:2px 9px;font-size:12px;font-weight:700;flex:none}
  .idx-dist{max-width:900px;margin:26px auto 0;padding:0 24px;font-family:Fredoka;font-size:19px;color:var(--ink)}"""


# ── Dados ────────────────────────────────────────────────────────────────────
dados = [c for c in json.load(open("creches_pt.json", encoding="utf-8"))
         if not c.get("oculto_duplicado")]
slugs = json.load(open("scripts/slugs.json", encoding="utf-8"))

por_concelho = defaultdict(list)
for c in dados:
    h = horario_da_creche(c)
    if not (h and h.get("alargado")):
        continue
    cs = c.get("concelho_slug")
    if not cs or c["id"] not in slugs:
        continue
    c["_h"] = h
    por_concelho[cs].append(c)

elegiveis = {cs: v for cs, v in por_concelho.items() if len(v) >= MINIMO}

# Índice distrito → concelhos, para os links entre irmãs e para o índice geral
por_distrito = defaultdict(list)
for cs, lista in elegiveis.items():
    dist = lista[0].get("distrito") or ""
    por_distrito[dist].append((cs, lista[0].get("concelho") or cs, len(lista)))
for v in por_distrito.values():
    v.sort(key=lambda x: -x[2])

os.makedirs(DIR, exist_ok=True)
urls, n_paginas = [], 0


def cabeca(titulo, desc, url, ld_blocos):
    lds = "\n".join(f'<script type="application/ld+json">{b}</script>' for b in ld_blocos)
    return f"""<!doctype html>
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
<meta property="og:locale" content="pt_PT">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://creches.app/og-image.png">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="canonical" href="{url}">
<title>{esc(titulo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Fredoka:wght@500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/legal.css">
<style>
{CSS}
{CSS_EXTRA}
</style>
{lds}
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{{"token": "076bc362f2104b70ba542774beb4a274"}}'></script>
</head>
<body>

{HEADER}
"""


# ── Páginas de concelho ──────────────────────────────────────────────────────
for cs, lista in sorted(elegiveis.items()):
    nome = lista[0].get("concelho") or cs
    dist = lista[0].get("distrito") or ""
    dslug = DIST_SLUG.get(dist, slugify(dist))
    lista.sort(key=lambda c: (c.get("nome") or "").lower())
    n = len(lista)
    url = f"https://creches.app/{DIR}/{cs}"

    # abre_cedo / fecha_tarde vêm já decididos pelo horario.py — o critério tem de
    # ser um só em todo o site, e recalculá-lo aqui era a forma garantida de,
    # daqui a seis meses, esta página dizer uma coisa e a ficha dizer outra.
    n_cedo = sum(1 for c in lista if c["_h"].get("abre_cedo"))
    n_tarde = sum(1 for c in lista if c["_h"].get("fecha_tarde"))
    n_ambos = sum(1 for c in lista if c["_h"].get("abre_cedo") and c["_h"].get("fecha_tarde"))

    titulo = f"Creches com horário alargado em {nome} ({n}) — abrem às 7h30 ou fecham às 19h"
    desc = (f"{n} creches em {nome} com horário alargado confirmado na Carta Social: "
            f"{n_cedo} abrem às 7h30 ou antes e {n_tarde} fecham às 19h00 ou depois. "
            f"Com morada, telefone e horário exato.")

    itens, ld_itens = [], []
    for i, c in enumerate(lista, 1):
        cls, lbl = tipo_classe(c.get("tipo"))
        cslug = slugs.get(c["id"])
        tel = (c.get("telefone") or "").strip()
        tel_href = re.sub(r"[^\d+]", "", tel)
        morada = " ".join(x for x in [(c.get("morada") or "").strip(),
                                      (c.get("codigo_postal") or "").strip()] if x)
        itens.append(
            f'<li class="row">\n'
            f'  <a class="nm" href="/creche/{esc(cslug)}">{esc(c.get("nome") or "")}</a>\n'
            f'  <div class="meta"><span class="tipo {cls}">{lbl}</span></div>\n'
            f'  <div class="hora-badge">🕐 {esc(c["_h"]["texto"])}</div>\n'
            + (f'  <div class="addr">📍 {esc(morada)}</div>\n' if morada else "")
            + (f'  <div class="tel">📞 <a href="tel:{esc(tel_href)}">{esc(tel)}</a></div>\n' if tel else "")
            + '</li>')
        ld_itens.append({
            "@type": "ListItem", "position": i,
            "item": {"@type": "ChildCare", "name": c.get("nome") or "",
                     "url": f"https://creches.app/creche/{cslug}",
                     "openingHours": c["_h"]["texto"],
                     "address": {"@type": "PostalAddress",
                                 "streetAddress": (c.get("morada") or ""),
                                 "postalCode": (c.get("codigo_postal") or ""),
                                 "addressLocality": nome, "addressRegion": dist,
                                 "addressCountry": "PT"},
                     **({"telephone": tel} if tel else {})}})

    ld_lista = json.dumps({"@context": "https://schema.org", "@type": "ItemList",
                           "name": f"Creches com horário alargado em {nome}",
                           "description": desc, "numberOfItems": n,
                           "itemListElement": ld_itens}, ensure_ascii=False)
    ld_bread = json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Início", "item": "https://creches.app"},
            {"@type": "ListItem", "position": 2, "name": "Horário alargado",
             "item": f"https://creches.app/{DIR}"},
            {"@type": "ListItem", "position": 3, "name": nome, "item": url}]},
        ensure_ascii=False)
    ld_faq = json.dumps({"@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question",
             "name": f"Que creches em {nome} abrem às 7h30 ou antes?",
             "acceptedAnswer": {"@type": "Answer", "text":
                f"{n_cedo} das {n} creches com horário confirmado em {nome} abrem às 7h30 ou antes. "
                f"A lista completa, com o horário exato de cada uma, está nesta página."}},
            {"@type": "Question",
             "name": f"Há creches em {nome} abertas depois das 19h?",
             "acceptedAnswer": {"@type": "Answer", "text":
                f"{n_tarde} creches em {nome} fecham às 19h00 ou depois. "
                f"{n_ambos} cumprem as duas pontas: abrem às 7h30 ou antes e fecham às 19h00 ou depois."}},
            {"@type": "Question",
             "name": "De onde vêm estes horários?",
             "acceptedAnswer": {"@type": "Answer", "text":
                "Do registo oficial da Carta Social, da Segurança Social. São horários declarados "
                "pelas próprias instituições — confirma sempre por telefone antes de contar com eles, "
                "porque podem mudar de ano letivo para ano letivo."}}]}, ensure_ascii=False)

    irmas = [(s, nm, k) for s, nm, k in por_distrito.get(dist, []) if s != cs]
    sister = " · ".join(
        f'<a href="/{DIR}/{s}">{esc(nm)}</a> <span style="opacity:.6">({k})</span>'
        for s, nm, k in irmas[:30])
    bloco_sister = (f'<div class="sister">\n  <b>Horário alargado noutros concelhos de {esc(dist)}:</b>\n'
                    f'  {sister}\n</div>\n') if sister else ""

    partes = [(n, "com horário alargado"), (n_cedo, "abrem às 7h30 ou antes"),
              (n_tarde, "fecham às 19h ou depois")]
    if n_ambos:
        partes.append((n_ambos, "cumprem as duas pontas"))
    resumo = ('<div class="resumo">' + "".join(
        f'<div><b>{v}</b><span>{t}</span></div>' for v, t in partes) + "</div>")

    html = cabeca(titulo, desc, url, [ld_lista, ld_bread, ld_faq]) + f"""
<nav class="breadcrumb">
  <a href="/">Início</a> →
  <a href="/{DIR}">Horário alargado</a> →
  <a href="/creches/{dslug}/{cs}">{esc(nome)}</a> →
  <span>Horário alargado</span>
</nav>

<section class="hero-conc">
  <span class="kicker">{esc(dist.upper())}</span>
  <h1>Creches com horário alargado em {esc(nome)}</h1>
  <p class="sub">{n} creches no concelho de {esc(nome)} que abrem às 7h30 ou antes, ou fecham às 19h00 ou depois — com o horário exato de cada uma.</p>
  <div class="ctas">
    <a href="/app?concelho={esc(cs)}&amp;horario=1" class="primary">Ver no mapa →</a>
    <a href="/creches/{dslug}/{cs}" class="ghost">Todas as creches em {esc(nome)}</a>
  </div>
</section>

{resumo}

<div class="criterio">
  <b>O que conta como horário alargado:</b> abrir às <b>7h30 ou antes</b>, ou fechar às
  <b>19h00 ou depois</b>. Basta uma das pontas — quem faz turno da manhã precisa que abra cedo,
  quem faz turno da tarde precisa que feche tarde, e exigir as duas esconderia creches que
  resolvem o problema real. Horários do registo oficial da <b>Carta Social</b>, declarados pelas
  próprias instituições. Podem mudar de ano letivo para ano letivo — <b>confirma por telefone</b>
  antes de contar com eles.
</div>

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

{bloco_sister}
{FOOTER}

</body>
</html>"""

    caminho = f"{DIR}/{cs}.html"
    try:
        igual = open(caminho, encoding="utf-8").read() == html
    except FileNotFoundError:
        igual = False
    if not igual:
        open(caminho, "w", encoding="utf-8").write(html)
        n_paginas += 1
    urls.append(url)

# ── Índice ───────────────────────────────────────────────────────────────────
total_creches = sum(len(v) for v in elegiveis.values())
url_idx = f"https://creches.app/{DIR}"
titulo_idx = (f"Creches com horário alargado em Portugal — {total_creches} que abrem às 7h30 "
              f"ou fecham às 19h")
desc_idx = (f"{total_creches} creches em {len(elegiveis)} concelhos com horário alargado "
            f"confirmado na Carta Social. Para quem entra ao turno das 8h ou sai depois das 18h30.")

ld_idx = json.dumps({"@context": "https://schema.org", "@type": "CollectionPage",
                     "name": titulo_idx, "description": desc_idx, "url": url_idx,
                     "inLanguage": "pt-PT", "dateModified": HOJE}, ensure_ascii=False)
ld_bread_idx = json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList",
    "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Início", "item": "https://creches.app"},
        {"@type": "ListItem", "position": 2, "name": "Horário alargado", "item": url_idx}]},
    ensure_ascii=False)

blocos = []
for dist in sorted(por_distrito, key=lambda d: -sum(k for _, _, k in por_distrito[d])):
    linhas = "\n".join(
        f'    <li><a href="/{DIR}/{s}">{esc(nm)}<span class="n">{k}</span></a></li>'
        for s, nm, k in por_distrito[dist])
    blocos.append(f'  <h2 class="idx-dist">{esc(dist)}</h2>\n'
                  f'  <ul class="idx-grid">\n{linhas}\n  </ul>')

html_idx = cabeca(titulo_idx, desc_idx, url_idx, [ld_idx, ld_bread_idx]) + f"""
<nav class="breadcrumb">
  <a href="/">Início</a> →
  <span>Horário alargado</span>
</nav>

<section class="hero-conc">
  <span class="kicker">HORÁRIO CONFIRMADO</span>
  <h1>Creches com horário alargado</h1>
  <p class="sub">{total_creches} creches em {len(elegiveis)} concelhos que abrem às 7h30 ou antes, ou fecham às 19h00 ou depois. Para quem entra ao turno das 8h — ou sai da loja às 18h30.</p>
  <div class="ctas">
    <a href="/app?horario=1" class="primary">Ver no mapa →</a>
    <a href="/creches" class="ghost">Todas as creches por distrito</a>
  </div>
</section>

<div class="criterio">
  <b>Porque é que esta página existe:</b> nenhum outro site publica horários de creche em Portugal —
  nem o portal da Segurança Social. Se trabalhas por turnos, a informação de que precisas para
  decidir simplesmente não estava disponível em lado nenhum. Estes horários vêm do registo
  oficial da <b>Carta Social</b> e são declarados pelas próprias instituições.
  Só listamos concelhos com {MINIMO} ou mais creches confirmadas — abaixo disso a lista seria
  curta demais para ser útil. <b>Confirma sempre por telefone</b> antes de contar com um horário.
</div>

{chr(10).join(blocos)}

<div class="related-guias">
  <h3>Guias para pais a procurar creche</h3>
  <a href="/guias/como-escolher-creche">Como escolher creche</a>
  <a href="/guias/quanto-custa-creche-portugal">Quanto custa em 2026</a>
  <a href="/guias/lista-de-espera-creche">Listas de espera</a>
  <a href="/guias/creche-feliz">Creche Feliz</a>
</div>

{FOOTER}

</body>
</html>"""

caminho_idx = f"{DIR}/index.html"
try:
    igual = open(caminho_idx, encoding="utf-8").read() == html_idx
except FileNotFoundError:
    igual = False
if not igual:
    open(caminho_idx, "w", encoding="utf-8").write(html_idx)
    n_paginas += 1
urls.append(url_idx)

print(f"✓ {len(urls) - 1} páginas de concelho + índice ({n_paginas} alteradas), "
      f"{total_creches} creches listadas")

# ── Órfãs ────────────────────────────────────────────────────────────────────
if "--limpar-orfas" in sys.argv:
    vivos = {f"{cs}.html" for cs in elegiveis} | {"index.html"}
    for f in os.listdir(DIR):
        if f.endswith(".html") and f not in vivos:
            os.remove(os.path.join(DIR, f))
            print(f"  ✗ removida órfã {f}")

# ── Sitemap ──────────────────────────────────────────────────────────────────
with open("sitemap-horario-alargado.xml", "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    # O índice é a página-mãe: prioridade acima das folhas.
    f.write(f"  <url><loc>{url_idx}</loc><lastmod>{HOJE}</lastmod>"
            f"<changefreq>weekly</changefreq><priority>0.8</priority></url>\n")
    for u in sorted(x for x in urls if x != url_idx):
        f.write(f"  <url><loc>{u}</loc><lastmod>{HOJE}</lastmod>"
                f"<changefreq>monthly</changefreq><priority>0.7</priority></url>\n")
    f.write("</urlset>\n")
print(f"✓ sitemap-horario-alargado.xml: {len(urls)} URLs")
