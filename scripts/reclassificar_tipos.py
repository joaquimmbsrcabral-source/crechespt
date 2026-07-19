#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Reclassifica o campo 'tipo' (natureza do operador) das creches 'Desconhecido'
usando heurísticas CONSERVADORAS sobre o nome e o operador.
Só aplica padrões inequívocos; na dúvida deixa 'Desconhecido'.

Uso:
  python3 scripts/reclassificar_tipos.py           # dry-run (só mostra)
  python3 scripts/reclassificar_tipos.py --aplicar # grava creches_pt.json
"""
import json, re, sys, unicodedata
from datetime import date

APLICAR = "--aplicar" in sys.argv

def norm(s):
    if not s: return ""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().lower()

# Padrões fortes — natureza social (IPSS e equiparadas)
IPSS_PAT = re.compile(
    r"misericordia|santa casa|centro social|centro paroquial|paroquial"
    r"|\bipss\b|caritas|patronato|cruz vermelha|casa do povo"
    r"|beneficencia|benificencia|mutualidade|mutualista|irmandade"
    r"|obra social|obra de assistencia|obra diocesana|vicentin|cerci\b"
    r"|associacao de solidariedade|associacao de socorros"
)
# Padrões fortes — rede pública
PUB_PAT = re.compile(
    r"agrupamento de escolas|escola basica|\beb1\b|\beb 1\b|camara municipal|municipio de"
)
# Padrões fortes — privado comercial
PRIV_PAT = re.compile(
    r"\blda\b|\bunipessoal\b|externato|colegio"
)

def classificar(c):
    nome = norm(c.get("nome"))
    oper = norm(c.get("operador"))
    texto = nome + " || " + oper
    # Ordem importa: público via operador é o sinal mais fiável
    if PUB_PAT.search(oper) or PUB_PAT.search(nome):
        return "Pública"
    if IPSS_PAT.search(texto):
        return "IPSS"
    if PRIV_PAT.search(texto):
        return "Privada"
    return None

def main():
    with open("creches_pt.json", encoding="utf-8") as f:
        creches = json.load(f)

    mudancas = []
    for c in creches:
        if c.get("tipo") not in ("Desconhecido", "", None, "?"):
            continue
        novo = classificar(c)
        if novo:
            mudancas.append((c["id"], c["nome"], novo))
            if APLICAR:
                c["tipo"] = novo
                c["tipo_inferido"] = True  # rastreável: veio de heurística, não de fonte oficial

    por_tipo = {}
    for _, _, t in mudancas:
        por_tipo[t] = por_tipo.get(t, 0) + 1

    total_desc = sum(1 for c in creches if c.get("tipo") in ("Desconhecido", "", None, "?"))
    print(f"{'A APLICAR' if APLICAR else 'DRY-RUN'} — {len(mudancas)} reclassificações: {por_tipo}")
    print(f"Ficam 'Desconhecido': {total_desc if APLICAR else total_desc - len(mudancas)}")
    for cid, nome, novo in mudancas[:25]:
        print(f"  {novo:8} ← {nome}")
    if len(mudancas) > 25:
        print(f"  … e mais {len(mudancas)-25}")

    if APLICAR:
        with open("creches_pt.json", "w", encoding="utf-8") as f:
            json.dump(creches, f, ensure_ascii=False, indent=1)
        with open(f"scripts/reclassificacao-{date.today().isoformat()}.log", "w", encoding="utf-8") as f:
            for cid, nome, novo in mudancas:
                f.write(f"{cid}\t{novo}\t{nome}\n")
        print("Gravado creches_pt.json + log em scripts/.")

if __name__ == "__main__":
    main()
