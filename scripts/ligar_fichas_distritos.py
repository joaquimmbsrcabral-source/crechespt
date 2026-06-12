#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Aponta os nomes das listas de distrito para as fichas /creche/{slug} e acrescenta link 'mapa'."""
import re, json, glob
slugs = json.load(open("scripts/slugs.json"))

def fix_row(m):
    block = m.group(0)
    ids = re.findall(r'/app#creche-([\w.-]+)"', block)
    if not ids: return block
    cid = "osm-" + ids[0].split("osm-",1)[-1] if "osm-" in ids[0] else ids[0]
    # id no href vem completo: creche-osm-node-123 -> osm-node-123
    cid = ids[0]
    slug = slugs.get(cid)
    if not slug: return block
    block = block.replace(f'href="/app#creche-{cid}" class="nm"', f'href="/creche/{slug}" class="nm"')
    if "🗺" not in block:
        block = re.sub(r'(<div class="rc">)(.*?)(</div>)',
                       lambda r: r.group(1)+r.group(2)+f' · <a href="/app#creche-{cid}">🗺 mapa</a>'+r.group(3),
                       block, count=1, flags=re.S)
    return block

tot = 0
for f in sorted(glob.glob("creches/*.html")):
    if f.endswith("index.html"): continue
    s = open(f, encoding="utf-8").read()
    novo = re.sub(r'<li class="row">.*?</li>', fix_row, s, flags=re.S)
    n = novo.count('href="/creche/')
    open(f, "w", encoding="utf-8").write(novo)
    tot += n
    print(f"✓ {f}: {n} links para fichas")
print("total:", tot)
