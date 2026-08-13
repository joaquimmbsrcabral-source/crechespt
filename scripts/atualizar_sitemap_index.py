#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Põe no índice de sitemaps a data real de cada sitemap filho.

Porquê: o sitemap.xml tinha todos os filhos com lastmod de 11 de julho, mesmo
depois de as 275 páginas de concelho terem sido reconstruídas a 6 de agosto.
O Google lê o índice primeiro; se o índice diz que nada mudou, adia o re-crawl
das páginas novas — e são precisamente essas que queremos que rankeiem.

A data usada é a maior <lastmod> dentro de cada sitemap filho; se não houver
nenhuma, usa a data de modificação do ficheiro.

Uso: python3 scripts/atualizar_sitemap_index.py
"""
import os, re, glob, datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)


def data_do_sitemap(caminho):
    try:
        conteudo = open(caminho, encoding="utf-8").read()
    except OSError:
        return None
    datas = re.findall(r"<lastmod>(\d{4}-\d{2}-\d{2})", conteudo)
    if datas:
        return max(datas)
    return datetime.date.fromtimestamp(os.path.getmtime(caminho)).isoformat()


def main():
    if not os.path.exists("sitemap.xml"):
        print("sitemap.xml não encontrado")
        return

    indice = open("sitemap.xml", encoding="utf-8").read()
    alterados = []

    def troca(m):
        bloco, url = m.group(0), m.group(1)
        ficheiro = url.rsplit("/", 1)[-1]
        nova = data_do_sitemap(ficheiro)
        if not nova:
            print(f"  ⚠ {ficheiro}: não existe — deixei como estava")
            return bloco
        antiga = re.search(r"<lastmod>([^<]*)</lastmod>", bloco)
        antiga = antiga.group(1) if antiga else "—"
        if antiga != nova:
            alterados.append((ficheiro, antiga, nova))
        if "<lastmod>" in bloco:
            return re.sub(r"<lastmod>[^<]*</lastmod>", f"<lastmod>{nova}</lastmod>", bloco)
        return bloco.replace("</loc>", f"</loc>\n    <lastmod>{nova}</lastmod>")

    indice = re.sub(
        r"<sitemap>\s*<loc>([^<]+)</loc>.*?</sitemap>", troca, indice, flags=re.S
    )
    open("sitemap.xml", "w", encoding="utf-8").write(indice)

    if alterados:
        for f, a, n in alterados:
            print(f"  ✓ {f:<26} {a} → {n}")
    print(f"\n✓ índice actualizado ({len(alterados)} datas corrigidas)")


if __name__ == "__main__":
    main()
