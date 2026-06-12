#!/usr/bin/env python3
"""Injeta og:image, twitter:image e Vercel Analytics em todas as páginas públicas."""
import re, glob

PAGES = (["index.html","app.html","sobre.html","imprensa.html","para-creches.html",
          "privacidade.html","cookies.html","termos.html"]
         + sorted(glob.glob("guias/*.html")) + sorted(glob.glob("creches/*.html")))

OG = ('<meta property="og:image" content="https://creches.app/og-image.png">\n'
      '<meta property="og:image:width" content="1200">\n'
      '<meta property="og:image:height" content="630">\n'
      '<meta property="og:image:alt" content="Creches.app — todas as creches de Portugal num só mapa">\n'
      '<meta name="twitter:image" content="https://creches.app/og-image.png">')
VA = '<script defer src="/_vercel/insights/script.js"></script>'

for p in PAGES:
    s = open(p, encoding="utf-8").read(); orig = s
    if 'og:image' not in s:
        m = re.search(r'<meta property="og:url"[^>]*>', s)
        if m: s = s[:m.end()] + "\n" + OG + s[m.end():]
        else: s = s.replace("</head>", OG + "\n</head>", 1)
    if '/_vercel/insights' not in s:
        s = s.replace("</head>", VA + "\n</head>", 1)
    if s != orig:
        open(p, "w", encoding="utf-8").write(s)
        print("✓", p)
    else:
        print("=", p, "(sem alterações)")
