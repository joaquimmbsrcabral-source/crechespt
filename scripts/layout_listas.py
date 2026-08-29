#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Aspeto partilhado pelas páginas de lista (concelhos, horário alargado).

Estava tudo duplicado no gerar_concelhos.py. Assim que apareceu um segundo
gerador de listas, manter duas cópias do CSS e do cabeçalho significava que uma
delas ia ficar para trás — e o site passava a ter duas identidades visuais
conforme a página em que o pai caísse vindo do Google.
"""

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
