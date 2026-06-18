#!/usr/bin/env python3
"""
Gera sitemap completo (sitemap-index + sitemap por categoria).

Outputs:
  sitemap.xml            (index)
  sitemap-main.xml       (páginas principais)
  sitemap-guias.xml      (guias)
  sitemap-distritos.xml  (páginas de distrito)
  sitemap-creches-1.xml  (primeiras 50k creches)
  sitemap-creches-2.xml  (resto, se necessário)

Uso:
  cd ~/Documents/Claude/Projects/CrechesPT
  python3 generate-sitemap.py
"""

import os
import glob
from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = "https://creches.app"
TODAY = datetime.now().strftime("%Y-%m-%d")

def write_sitemap(filename, urls):
    """Escreve um sitemap XML com a lista de URLs."""
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        loc = u["loc"]
        lastmod = u.get("lastmod", TODAY)
        changefreq = u.get("changefreq", "weekly")
        priority = u.get("priority", "0.5")
        lines.append("  <url>")
        lines.append(f"    <loc>{loc}</loc>")
        lines.append(f"    <lastmod>{lastmod}</lastmod>")
        lines.append(f"    <changefreq>{changefreq}</changefreq>")
        lines.append(f"    <priority>{priority}</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")
    with open(os.path.join(ROOT, filename), "w") as f:
        f.write("\n".join(lines))
    print(f"  ✓ {filename}: {len(urls)} URLs")


def main():
    print("=== Sitemap generator ===\n")

    # 1. Páginas principais
    main_urls = [
        {"loc": f"{BASE}/",              "priority": "1.0", "changefreq": "weekly"},
        {"loc": f"{BASE}/app",           "priority": "1.0", "changefreq": "weekly"},
        {"loc": f"{BASE}/para-creches",  "priority": "0.7", "changefreq": "monthly"},
        {"loc": f"{BASE}/sobre",         "priority": "0.7", "changefreq": "monthly"},
        {"loc": f"{BASE}/imprensa",      "priority": "0.6", "changefreq": "monthly"},
        {"loc": f"{BASE}/creches",       "priority": "1.0", "changefreq": "daily"},
        {"loc": f"{BASE}/guias",         "priority": "0.9", "changefreq": "weekly"},
        {"loc": f"{BASE}/privacidade",   "priority": "0.3", "changefreq": "yearly"},
        {"loc": f"{BASE}/cookies",       "priority": "0.3", "changefreq": "yearly"},
        {"loc": f"{BASE}/termos",        "priority": "0.3", "changefreq": "yearly"},
    ]
    write_sitemap("sitemap-main.xml", main_urls)

    # 2. Guias
    guias_dir = os.path.join(ROOT, "guias")
    guias_urls = []
    if os.path.isdir(guias_dir):
        for f in sorted(os.listdir(guias_dir)):
            if f.endswith(".html") and f != "index.html":
                slug = f[:-5]
                guias_urls.append({
                    "loc": f"{BASE}/guias/{slug}",
                    "priority": "0.9",
                    "changefreq": "monthly"
                })
    write_sitemap("sitemap-guias.xml", guias_urls)

    # 3. Distritos
    creches_dir = os.path.join(ROOT, "creches")
    distritos_urls = []
    if os.path.isdir(creches_dir):
        for f in sorted(os.listdir(creches_dir)):
            if f.endswith(".html") and f != "index.html":
                slug = f[:-5]
                distritos_urls.append({
                    "loc": f"{BASE}/creches/{slug}",
                    "priority": "0.8",
                    "changefreq": "weekly"
                })
    write_sitemap("sitemap-distritos.xml", distritos_urls)

    # 4. Creches individuais — particionar (Google limit: 50k URLs / 50MB por sitemap)
    creche_dir = os.path.join(ROOT, "creche")
    creche_files = []
    if os.path.isdir(creche_dir):
        creche_files = sorted([f for f in os.listdir(creche_dir) if f.endswith(".html")])

    CHUNK = 50000
    sitemap_creches_files = []
    if creche_files:
        chunks = [creche_files[i:i+CHUNK] for i in range(0, len(creche_files), CHUNK)]
        for idx, chunk in enumerate(chunks, 1):
            urls = []
            for f in chunk:
                slug = f[:-5]
                urls.append({
                    "loc": f"{BASE}/creche/{slug}",
                    "priority": "0.6",
                    "changefreq": "monthly"
                })
            fname = f"sitemap-creches-{idx}.xml"
            write_sitemap(fname, urls)
            sitemap_creches_files.append(fname)
    else:
        print("  ⚠ Sem ficheiros em /creche/")

    # 5. Sitemap INDEX
    index_lines = ['<?xml version="1.0" encoding="UTF-8"?>',
                   '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for fname in ["sitemap-main.xml", "sitemap-guias.xml", "sitemap-distritos.xml"] + sitemap_creches_files:
        index_lines.append("  <sitemap>")
        index_lines.append(f"    <loc>{BASE}/{fname}</loc>")
        index_lines.append(f"    <lastmod>{TODAY}</lastmod>")
        index_lines.append("  </sitemap>")
    index_lines.append("</sitemapindex>")
    with open(os.path.join(ROOT, "sitemap.xml"), "w") as f:
        f.write("\n".join(index_lines))
    print(f"  ✓ sitemap.xml (index): {len(['main','guias','distritos']) + len(sitemap_creches_files)} sub-sitemaps")

    total = (len(main_urls) + len(guias_urls) + len(distritos_urls) + len(creche_files))
    print(f"\n=== Total URLs incluídos: {total} ===")
    print("\nPróximo passo:")
    print("  1. ./deploy.sh 'feat: sitemap completo (2.6k URLs)'")
    print("  2. Google Search Console → Sitemaps → submeter sitemap.xml")


if __name__ == "__main__":
    main()
