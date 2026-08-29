#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Reescreve os números de /creches (index) a partir do dataset.

Porque existe: esta é a página que o Google mostra para "creches em Portugal" —
e estava a anunciar **2591 creches**, com a grelha de distritos ainda nos valores
de antes da integração da Carta Social (Lisboa 497 quando são 836, Aveiro em 7.º
lugar quando é o 4.º). Era o número mais visível do site inteiro e o único que
ninguém regenerava, porque a página foi escrita à mão.

Todos os pontos onde o número aparece passam a ser derivados: o H1, a barra de
estatísticas, a grelha de distritos, o parágrafo da distribuição, a tabela do
top 5, o bloco do horário alargado e as duas cópias da FAQ (HTML e JSON-LD).

Uso: python3 scripts/atualizar_creches_index.py
"""
import json, os, re, sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from horario import horario_da_creche

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)
ALVO = "creches/index.html"

DIST_SLUG = {
    "Lisboa": "lisboa", "Porto": "porto", "Braga": "braga", "Setúbal": "setubal",
    "Aveiro": "aveiro", "Leiria": "leiria", "Coimbra": "coimbra", "Faro": "faro",
    "Santarém": "santarem", "Viseu": "viseu",
    "Viana do Castelo": "viana-do-castelo", "Vila Real": "vila-real",
    "Bragança": "braganca", "Castelo Branco": "castelo-branco", "Guarda": "guarda",
    "Portalegre": "portalegre", "Évora": "evora", "Beja": "beja",
    "Região Autónoma dos Açores": "acores", "Região Autónoma da Madeira": "madeira",
    "Açores": "acores", "Madeira": "madeira",
}
# Como o nome aparece escrito na página (as regiões autónomas encurtam)
ROTULO = {"Região Autónoma dos Açores": "Açores", "Região Autónoma da Madeira": "Madeira"}


def main():
    dados = [c for c in json.load(open("creches_pt.json", encoding="utf-8"))
             if not c.get("oculto_duplicado")]
    total = len(dados)

    por_dist = Counter(c.get("distrito") for c in dados if c.get("distrito"))
    ordenados = [(ROTULO.get(d, d), DIST_SLUG.get(d), n)
                 for d, n in por_dist.most_common() if DIST_SLUG.get(d)]

    n_hor = sum(1 for c in dados
                if (horario_da_creche(c) or {}).get("alargado"))
    conc_hor = Counter(c.get("concelho_slug") for c in dados
                       if (horario_da_creche(c) or {}).get("alargado") and c.get("concelho_slug"))
    com_pagina = {k: v for k, v in conc_hor.items() if v >= 5}
    n_hor_pag = sum(com_pagina.values())

    h = open(ALVO, encoding="utf-8").read()
    original = h

    # ── H1 e intro ──────────────────────────────────────────────────────────
    h = re.sub(r"(<h1>Creches em Portugal: <span class=\"accent\">todas as )\d+",
               rf"\g<1>{total}", h)
    h = re.sub(r"(<strong>)\d+( creches</strong>, jardins de infância)", rf"\g<1>{total}\g<2>", h)

    # ── Barra de estatísticas ───────────────────────────────────────────────
    h = re.sub(r"(<div class=\"stat-card\"><b>)\d+(</b><span>Creches no total)",
               rf"\g<1>{total}\g<2>", h)
    h = re.sub(r"(<div class=\"stat-card\"><b>)\d+(</b><span>Distritos cobertos)",
               rf"\g<1>{len(ordenados)}\g<2>", h)

    # ── Grelha de distritos (reordenada, não só recontada) ──────────────────
    grelha = "\n".join(
        f'  <a class="dist-card" href="/creches/{slug}">'
        f'<span class="nm">{nome}</span><span class="ct">{n}</span></a>'
        for nome, slug, n in ordenados)
    h = re.sub(r'<div class="dist-grid">.*?</div>',
               f'<div class="dist-grid">\n{grelha}\n</div>', h, count=1, flags=re.S)

    # ── Parágrafo da distribuição + FAQ (HTML e JSON-LD) ────────────────────
    (d1, s1, n1), (d2, s2, n2), (d3, s3, n3), (d4, s4, n4) = ordenados[:4]
    quatro = n1 + n2 + n3 + n4
    prop = "representam mais de metade" if quatro > total / 2 else "representam quase metade"

    h = re.sub(
        r"O distrito de <a href=\"/creches/[a-z-]+\">\w+</a> lidera com \d+ creches, seguido pelo "
        r"<a href=\"/creches/[a-z-]+\">[^<]+</a> \(\d+\), <a href=\"/creches/[a-z-]+\">[^<]+</a> "
        r"\(\d+\) e <a href=\"/creches/[a-z-]+\">[^<]+</a> \(\d+\)\. Em conjunto, estes quatro "
        r"distritos representam (?:mais de metade|quase metade)",
        f'O distrito de <a href="/creches/{s1}">{d1}</a> lidera com {n1} creches, seguido pelo '
        f'<a href="/creches/{s2}">{d2}</a> ({n2}), <a href="/creches/{s3}">{d3}</a> ({n3}) e '
        f'<a href="/creches/{s4}">{d4}</a> ({n4}). Em conjunto, estes quatro distritos {prop}',
        h)

    # Frases da FAQ que repetem os mesmos números, em HTML e dentro do JSON-LD.
    # Substituímos a frase INTEIRA e não número a número: com regexes cirúrgicos
    # sobrava sempre uma parte da frase antiga e o resultado saía incoerente
    # ("Lisboa lidera com 836 creches, seguida do Porto (342)").
    menor = min(ordenados, key=lambda x: x[2])
    dois_menores = sorted(ordenados, key=lambda x: x[2])[:2]

    # As classes de caracteres excluem " < > { } de propósito: estas frases vivem
    # tanto em HTML como dentro de strings JSON-LD, e um [^.]*? guloso atravessa
    # as aspas e come a estrutura do JSON — foi exatamente o que aconteceu.
    TXT = r"[^.\"<>{}]*?"

    h = re.sub(
        r"O distrito de " + TXT + r" concentra o maior número \(\d+\)" + TXT + r"\.",
        f"O distrito de {d1} concentra o maior número ({n1}), seguido pelo {d2} ({n2}) "
        f"e {d3} ({n3}).", h)

    # A mesma frase existe em três sítios com finais diferentes: no JSON-LD
    # ("Em contrapartida, …") e na FAQ visível ("Estes quatro distritos
    # representam mais de 50% …"). Tratar só uma deixava a outra a mentir.
    pct4 = (n1 + n2 + n3 + n4) / total * 100
    h = re.sub(
        r"\b\w+ lidera com \d+ creches, seguida do " + TXT + r"\. "
        r"(?:Em contrapartida, |Estes quatro distritos )" + TXT + r"\.",
        lambda m: (
            f"{d1} lidera com {n1} creches, seguida do {d2} ({n2}), {d3} ({n3}) e {d4} ({n4}). "
            + (f"Em contrapartida, {dois_menores[0][0]} ({dois_menores[0][2]}) e "
               f"{dois_menores[1][0]} ({dois_menores[1][2]}) são os que têm menos."
               if "Em contrapartida" in m.group(0) else
               f"Estes quatro distritos representam {pct4:.0f}% das creches do país.")),
        h)

    h = re.sub(r"reúne todas as \d+ creches do país", f"reúne todas as {total} creches do país", h)
    h = re.sub(r"Em Portugal existem cerca de \d+ creches",
               f"Em Portugal existem cerca de {total} creches", h)

    # ── Top 5 ───────────────────────────────────────────────────────────────
    linhas = "\n".join(
        f'      <tr><td><a href="/creches/{slug}">{nome}</a></td><td>{n}</td>'
        f'<td>{n / total * 100:.1f}%</td></tr>'.replace(".", ",", 1)
        for nome, slug, n in ordenados[:5])
    h = re.sub(r"(<tbody>\n).*?(\n    </tbody>)", rf"\g<1>{linhas}\g<2>", h, count=1, flags=re.S)

    # ── Horário alargado ────────────────────────────────────────────────────
    # Honestidade: o que temos confirmado são n_hor; o que já tem página são
    # n_hor_pag. Dizer só o segundo subestimava-nos; dizer só o primeiro
    # prometia páginas que não existem.
    # Substituímos a frase INTEIRA, delimitada pelo "— dado do registo oficial"
    # que a fecha. A versão anterior parava em "…19h00 ou depois" e, como o texto
    # que injetava voltava a conter essa mesma expressão, cada execução colava
    # mais uma cópia da segunda metade. Correr o script três vezes dava três
    # cópias na página.
    h = re.sub(
        r"Temos o horário confirmado de <b>\d+ creches</b>.*?"
        r"(?= — dado do registo oficial)",
        f"Temos o horário confirmado de <b>{n_hor} creches</b> que abrem às 7h30 ou antes, "
        f"ou fecham às 19h00 ou depois — e <b>{n_hor_pag}</b> delas, nos {len(com_pagina)} "
        f"concelhos com mais oferta, já têm página própria",
        h, flags=re.S)

    # ── Restantes ocorrências do total ──────────────────────────────────────
    h = re.sub(r"todas as \d+ creches de Portugal", f"todas as {total} creches de Portugal", h)

    if h == original:
        print("· /creches já estava certo")
        return
    open(ALVO, "w", encoding="utf-8").write(h)
    print(f"✓ /creches actualizado — {total} creches, {len(ordenados)} distritos, "
          f"{n_hor} com horário alargado")


if __name__ == "__main__":
    main()
