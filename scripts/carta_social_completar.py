#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fecha as lacunas do varrimento nacional da Carta Social.

O problema: a pesquisa devolve no máximo 10 resultados por página e a paginação
é AJAX do PrimeFaces, que não consegui reproduzir por HTTP. A saída foi pesquisar
freguesia a freguesia, usando os códigos DICOFRE do geoapi.pt.

A descoberta que motivou este script: **a Carta Social não usa os códigos de
freguesia do geoapi**. Em Matosinhos o geoapi dá 130815..130824 (numeração
pós-reforma de 2013) e a Carta Social só aceita 130811..130814. Um código que a
Carta Social não reconhece não dá erro — devolve o concelho inteiro, e o
varrimento fica a pensar que aquela freguesia tem 45 creches quando tem 11.
Resultado: 349 equipamentos por identificar em 64 concelhos.

A correcção é deixar de adivinhar: para cada concelho com lacuna, percorrem-se
os códigos FF de 01 a 40 e ficam os que devolverem MENOS do que o total do
concelho — esses filtraram mesmo.

Uso:
  python3 scripts/carta_social_completar.py --simular   # só diagnostica
  python3 scripts/carta_social_completar.py [--so 20]

Escreve no mesmo dados/carta-social-nacional.json, acrescentando aos `equip`
já conhecidos e registando em `freguesias_reais` os códigos que funcionam.
"""
import json, os, re, subprocess, sys, time

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)

OUT = "dados/carta-social-nacional.json"
COOKIES = "/tmp/cs_completar_cookies.txt"
UA = "Mozilla/5.0 (compatible; creches.app data check; geral@creches.app)"
PAUSA = 0.4
TP_CRECHE = "1103"
VT = "11"
FF_MAX = 40          # nenhum concelho português tem mais de 40 freguesias
PESQUISA = "https://www.cartasocial.pt/resultados-da-pesquisa?vt={}&tp={}&l={}"


def gravar(dados, caminho):
    """Escrita atómica — um timeout a meio do dump já custou horas de recolha."""
    tmp = caminho + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=1)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, caminho)


def fetch(url, tentativas=3):
    for i in range(tentativas):
        try:
            r = subprocess.run(
                ["curl", "-sk", "--max-time", "25", "-b", COOKIES, "-c", COOKIES, "-A", UA, url],
                capture_output=True, text=True, timeout=30)
            if r.stdout:
                return r.stdout
        except Exception:
            pass
        time.sleep(1.5 * (i + 1))
    return ""


def parse(h):
    m = re.search(r"Equipamentos[^0-9]*([0-9]+)", h)
    total = int(m.group(1)) if m else 0
    equipamentos, vistos = [], set()
    for mm in re.finditer(r'idEquipment=(\d+)[^>]*>(.{0,220}?)</a>', h, re.S):
        eid = mm.group(1)
        if eid in vistos:
            continue
        vistos.add(eid)
        nome = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", mm.group(2))).strip()
        if nome:
            equipamentos.append({"id": eid, "nome": nome})
    return total, equipamentos


def main():
    argv = sys.argv[1:]
    simular = "--simular" in argv
    dados = json.load(open(OUT, encoding="utf-8"))
    concelhos = dados["concelhos"]

    # Só interessam os concelhos onde ainda faltam nomes.
    alvo = [(k, c) for k, c in concelhos.items()
            if c["equipamentos"] > len(c["equip"]) and not c.get("completado_em")]
    alvo.sort(key=lambda kc: -(kc[1]["equipamentos"] - len(kc[1]["equip"])))
    if "--so" in argv:
        alvo = alvo[: int(argv[argv.index("--so") + 1])]

    falta_total = sum(c["equipamentos"] - len(c["equip"]) for _, c in concelhos.items())
    print(f"{len(alvo)} concelhos neste lote · {falta_total} nomes em falta no total\n")
    if not alvo:
        return

    fetch("https://www.cartasocial.pt/inicio")
    ganhos = 0

    for i, (slug, c) in enumerate(alvo, 1):
        dico = c["dico"]
        vistos = {e["id"] for e in c["equip"]}
        antes = len(vistos)
        reais = []

        for ff in range(1, FF_MAX + 1):
            if len(vistos) >= c["equipamentos"]:
                break                                   # já os temos todos
            l = f"{dico[:2]}-{dico[2:]}-{ff:02d}"
            total, lista = parse(fetch(PESQUISA.format(VT, TP_CRECHE, l)))
            time.sleep(PAUSA)
            # Um código inexistente devolve o concelho inteiro, sem avisar.
            # Só conta como freguesia real quando o total é menor.
            if total == 0 or total >= c["equipamentos"]:
                continue
            reais.append({"ff": f"{ff:02d}", "equipamentos": total,
                          "incompleto": total > len(lista)})
            for e in lista:
                if e["id"] not in vistos:
                    vistos.add(e["id"])
                    e["ff"] = f"{ff:02d}"
                    c["equip"].append(e)

        c["freguesias_reais"] = reais
        c["completado_em"] = time.strftime("%Y-%m-%d")
        novos = len(vistos) - antes
        ganhos += novos
        resta = c["equipamentos"] - len(c["equip"])
        marca = f"  ainda faltam {resta}" if resta > 0 else "  ✓ completo"
        print(f"  [{i}/{len(alvo)}] {c['concelho']:<24} +{novos:>3} nomes "
              f"({len(c['equip'])}/{c['equipamentos']}) · {len(reais)} freguesias reais{marca}")

        if not simular:
            gravar(dados, OUT)

    tot = dados["concelhos"]
    print(f"\n✓ +{ganhos} nomes neste lote")
    print(f"  identificados: {sum(len(v['equip']) for v in tot.values())}"
          f" / {sum(v['equipamentos'] for v in tot.values())}")
    if simular:
        print("  (simulação — nada foi escrito)")


if __name__ == "__main__":
    main()
