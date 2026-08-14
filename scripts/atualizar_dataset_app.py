#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Reescreve o dataset embutido no app.html a partir do creches_pt.json.

O mapa não lê o ficheiro: traz os dados embutidos e comprimidos dentro do
próprio app.html, para abrir depressa. Se os dois divergirem, o site mostra
dados que já corrigimos — e ninguém dá por isso. Já aconteceu: o mapa esteve
18 dias desactualizado e escondeu 171 creches.

Gémeos: registos com `oculto_duplicado` são a mesma creche que outro registo,
importados da Carta Social com nome diferente. Ficam no creches_pt.json porque
o /api/lead-notify precisa deles para resolver pedidos que já lhes apontam,
mas não vão para o mapa — dois pinos no mesmo sítio fazem a cópia tapar o
original, que é o que tem o perfil e o selo da creche.

Uso: python3 scripts/atualizar_dataset_app.py
"""
import base64, gzip, io, json, os, re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)


def visiveis(lista):
    return [c for c in lista if not c.get("oculto_duplicado")]


def main():
    bruto = json.load(io.open("creches_pt.json", encoding="utf-8"))
    lista = bruto if isinstance(bruto, list) else bruto["creches"]
    vis = visiveis(lista)

    h = io.open("app.html", encoding="utf-8").read()
    m = re.search(r'(<script[^>]*id=["\']dataset["\'][^>]*>)(.*?)(</script>)', h, re.S)
    if not m:
        raise SystemExit("✗ não encontrei o <script id=\"dataset\"> no app.html")

    dados = json.dumps(vis, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    b64 = base64.b64encode(gzip.compress(dados, 9)).decode("ascii")

    tmp = "app.html.tmp"
    with io.open(tmp, "w", encoding="utf-8") as f:
        f.write(h[:m.start(2)] + b64 + h[m.end(2):])
        f.flush(); os.fsync(f.fileno())
    os.replace(tmp, "app.html")

    escondidos = len(lista) - len(vis)
    print(f"  ✓ mapa: {len(vis)} creches"
          + (f" ({escondidos} gémeos fora)" if escondidos else ""))


if __name__ == "__main__":
    main()
