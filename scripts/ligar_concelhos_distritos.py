#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Injeta, em cada página de distrito, o índice dos seus concelhos.

Porque existe: as 275 páginas /creches/{distrito}/{concelho} estavam órfãs no
grafo interno do site — nenhuma página ligava para elas, só o sitemap. O Google
segue links; páginas sem ligações internas são rastreadas tarde e valem menos.

Idempotente: substitui o bloco entre os marcadores se já existir.
Uso: python3 scripts/ligar_concelhos_distritos.py
"""
import json, os, re, glob
from collections import defaultdict
from html import escape as esc

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)

INI = "<!-- CONCELHOS:INICIO -->"
FIM = "<!-- CONCELHOS:FIM -->"

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

d = json.load(open("creches_pt.json", encoding="utf-8"))
creches = d if isinstance(d, list) else d.get("creches", d)
slugs = json.load(open("scripts/slugs.json", encoding="utf-8"))

por_dist = defaultdict(dict)
for c in creches:
    cs, dist = c.get("concelho_slug"), c.get("distrito")
    if not cs or c["id"] not in slugs:
        continue
    ds = DIST_SLUG.get(dist)
    if not ds:
        continue
    nome = c.get("concelho") or cs
    por_dist[ds].setdefault(cs, [nome, 0])
    por_dist[ds][cs][1] += 1

CSS = """<style>
  .conc-idx{max-width:780px;margin:24px auto;padding:20px 24px;background:rgba(255,255,255,.75);border-radius:var(--r-md)}
  .conc-idx h2{font-family:"Fredoka";font-size:19px;margin:0 0 4px;color:var(--ink)}
  .conc-idx p{font-size:13px;color:var(--ink-soft);margin:0 0 14px}
  .conc-idx ul{list-style:none;padding:0;margin:0;display:grid;
    grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px}
  .conc-idx a{display:flex;justify-content:space-between;align-items:center;gap:8px;
    background:#fff;border-radius:var(--r-md);padding:10px 14px;text-decoration:none;
    color:var(--ink);font-weight:600;font-size:14px;box-shadow:0 1px 2px rgba(60,40,90,.05);transition:all .15s}
  .conc-idx a:hover{box-shadow:var(--sh-1);transform:translateY(-1px);color:var(--c-coral)}
  .conc-idx a span{font-size:12px;color:var(--ink-soft);font-weight:700}
</style>"""

tot_pag = tot_links = 0
for f in sorted(glob.glob("creches/*.html")):
    ds = os.path.basename(f)[:-5]
    if ds == "index":
        continue
    concelhos = por_dist.get(ds)
    if not concelhos:
        continue
    lista = sorted(concelhos.items(), key=lambda kv: kv[1][0])
    itens = "".join(
        f'<li><a href="/creches/{ds}/{cs}">{esc(nome)} <span>{n}</span></a></li>'
        for cs, (nome, n) in lista)
    nome_dist = next((k for k, v in DIST_SLUG.items() if v == ds), ds)
    bloco = (f'{INI}\n{CSS}\n<section class="conc-idx">\n'
             f'  <h2>Creches por concelho em {esc(nome_dist)}</h2>\n'
             f'  <p>{len(lista)} concelhos · {sum(v[1] for v in concelhos.values())} '
             f'creches, jardins de infância e infantários.</p>\n'
             f'  <ul>{itens}</ul>\n</section>\n{FIM}')

    s = open(f, encoding="utf-8").read()
    if INI in s and FIM in s:
        novo = re.sub(re.escape(INI) + r".*?" + re.escape(FIM), lambda m: bloco, s, flags=re.S)
    else:
        # antes do footer, ou no fim do body
        m = re.search(r'<footer', s)
        pos = m.start() if m else s.rfind("</body>")
        novo = s[:pos] + bloco + "\n\n" + s[pos:]
    if novo != s:
        open(f, "w", encoding="utf-8").write(novo)
        tot_pag += 1
    tot_links += len(lista)

print(f"✓ {tot_pag} páginas de distrito atualizadas · {tot_links} ligações a concelhos")
