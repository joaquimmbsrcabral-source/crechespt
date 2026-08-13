#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Repõe nas páginas de distrito os dados actuais do dataset.

Porquê: as 20 páginas em creches/*.html nunca foram regeneradas depois da
correcção de distritos de Junho. Ficaram com contagens antigas no título, na
descrição e no herói — e, pior, a listar creches de outros distritos
(creches/guarda.html tinha 25 estabelecimentos de Viseu em 60).

São as páginas mais linkadas do site: 2.529 das 2.578 fichas apontam para elas.

O que este script faz, sem tocar no desenho:
  1. recalcula a contagem real por distrito e reescreve-a onde aparecer;
  2. substitui a lista <li class="row"> pelos estabelecimentos que pertencem
     mesmo àquele distrito, ordenados por concelho e nome;
  3. mostra só o primeiro telefone/email quando o OSM traz vários separados
     por ';' (um href com dois números não é clicável).

Uso: python3 scripts/atualizar_distritos.py
"""
import json, re, os, glob, html, collections

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)

MAX_LISTA = 60          # o mesmo que as páginas já mostravam
esc = lambda t: html.escape(str(t or ""), quote=True)


def primeiro(valor):
    """O OSM junta vários contactos com ';' — para um href só serve o primeiro."""
    return (str(valor or "").split(";")[0]).strip()


# As regiões autónomas têm ficheiro com nome curto, não com o nome oficial.
# Foi este desencontro que já uma vez apagou as páginas dos Açores e da Madeira.
ESPECIAIS = {
    "Região Autónoma dos Açores": "acores",
    "Região Autónoma da Madeira": "madeira",
}


def slug_distrito(nome):
    if nome in ESPECIAIS:
        return ESPECIAIS[nome]
    import unicodedata
    s = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def main():
    dados = json.load(open("creches_pt.json", encoding="utf-8"))
    lista = dados if isinstance(dados, list) else dados["creches"]
    slugs = json.load(open("scripts/slugs.json", encoding="utf-8"))

    por_distrito = collections.defaultdict(list)
    for c in lista:
        if c.get("distrito"):
            por_distrito[slug_distrito(c["distrito"])].append(c)

    alterados = 0
    for ficheiro in sorted(glob.glob("creches/*.html")):
        nome_f = os.path.basename(ficheiro)
        if nome_f == "index.html":
            continue
        dslug = nome_f[:-5]
        creches = por_distrito.get(dslug)
        if not creches:
            print(f"  ⚠ {dslug}: sem creches no dataset — não mexi")
            continue

        s = open(ficheiro, encoding="utf-8").read()
        total = len(creches)

        # ── contagem antiga, tal como aparece hoje na página ──
        m = re.search(r"<title>Creches em ([^(]+)\((\d+)\)", s)
        if not m:
            print(f"  ⚠ {dslug}: título fora do formato — não mexi")
            continue
        rotulo, antigo = m.group(1).strip(), int(m.group(2))

        # ── 1 · contagens ──
        s = s.replace(f"Creches em {rotulo} ({antigo})", f"Creches em {rotulo} ({total})")
        s = s.replace(f"Lista atualizada de {antigo} creches", f"Lista atualizada de {total} creches")
        s = re.sub(rf"\b{antigo}\b(?=\s*(creches|estabelecimentos))", str(total), s)

        # ── 2 · lista, só com quem pertence mesmo a este distrito ──
        creches.sort(key=lambda c: ((c.get("concelho") or ""), (c.get("nome") or "")))
        linhas = []
        for c in creches[:MAX_LISTA]:
            cid = c["id"]
            slug = slugs.get(cid)
            if not slug:
                continue
            meta = " · ".join(x for x in (c.get("tipo"), c.get("resposta"), c.get("concelho")) if x)
            tel, mail = primeiro(c.get("telefone")), primeiro(c.get("email"))
            contactos = []
            if tel:
                contactos.append(f'<a href="tel:{esc(tel)}">📞 {esc(tel)}</a>')
            if mail:
                contactos.append(f'<a href="mailto:{esc(mail)}">✉ {esc(mail)}</a>')
            contactos.append(f'<a href="/app#creche-{esc(cid)}">🗺 mapa</a>')
            linhas.append(
                '<li class="row">\n'
                f'  <div class="rh"><a href="/creche/{slug}" class="nm">{esc(c.get("nome"))}</a></div>\n'
                f'  <div class="rmeta">{esc(meta)}</div>\n'
                f'  <div class="rc">{" · ".join(contactos)}</div>\n'
                '</li>'
            )

        bloco = "\n".join(linhas)
        antigas = list(re.finditer(r'<li class="row">.*?</li>', s, re.S))
        if antigas:
            s = s[:antigas[0].start()] + bloco + s[antigas[-1].end():]

        open(ficheiro, "w", encoding="utf-8").write(s)
        marca = "" if antigo == total else f"  (era {antigo})"
        print(f"  ✓ {dslug:<22} {total:>4} creches · {len(linhas)} na lista{marca}")
        alterados += 1

    print(f"\n✓ {alterados} páginas de distrito actualizadas")

    # ── contagens da homepage, que vinham das mesmas páginas ──
    if os.path.exists("index.html"):
        idx = open("index.html", encoding="utf-8").read()
        original = idx
        for dslug, cs in por_distrito.items():
            rot = cs[0]["distrito"]
            idx = re.sub(rf'(>{re.escape(rot)}\s*</?[^>]*>?\s*)\b\d+\b', rf"\g<1>{len(cs)}", idx)
            idx = re.sub(rf"\b{re.escape(rot)} (\d+)\b", f"{rot} {len(cs)}", idx)
        if idx != original:
            open("index.html", "w", encoding="utf-8").write(idx)
            print("✓ contagens da homepage actualizadas")
        else:
            print("· homepage sem contagens no formato esperado — verificar à mão")


if __name__ == "__main__":
    main()
