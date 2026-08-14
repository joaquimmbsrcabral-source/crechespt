#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Guarda em disco os códigos DICOFRE das freguesias de cada concelho.

A recolha nacional da Carta Social pesquisa freguesia a freguesia (a pesquisa
por concelho só devolve os 10 primeiros resultados). Para isso são precisos os
códigos DICOFRE, que vêm do geoapi.pt.

O geoapi gratuito corta ao fim de algumas centenas de pedidos e devolve 429.
Este script guarda o que conseguir, distingue "sem freguesias" de "ainda não
tentei", e pode ser corrido as vezes que forem precisas até completar.

Uso: python3 scripts/cache_freguesias.py [--so 100]
"""
import json, os, subprocess, sys, time, urllib.parse

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)

CAOP = "dados/municipios.geojson"
OUT = "dados/freguesias-por-concelho.json"
PAUSA = 0.35


def freguesias_de(nome):
    """Devolve [(dicofre, nome)] ou None se o pedido falhar (para tentar outra vez)."""
    # Acentos têm de ser codificados: "Águeda" cru devolve resposta vazia.
    alvo = urllib.parse.quote(nome)
    try:
        r = subprocess.run(["curl", "-s", "--max-time", "20",
                            f"https://json.geoapi.pt/municipio/{alvo}/freguesias"],
                           capture_output=True, text=True, timeout=25)
        if "limit of free requests" in r.stdout:
            return "LIMITE"
        d = json.loads(r.stdout)
    except Exception:
        return None

    saida = []
    for f in (d.get("geojsons") or {}).get("freguesias") or []:
        p = f.get("properties") or {}
        # O geoapi devolve o código ora como "dtmnfr" ora como "Dicofre",
        # conforme o município. Aceitar as duas grafias.
        dic = str(p.get("dtmnfr") or p.get("Dicofre") or p.get("dicofre")
                  or p.get("DICOFRE") or "")
        fnome = p.get("Freguesia") or p.get("freguesia") or ""
        if len(dic) == 6:
            saida.append([dic, fnome])
    return saida



def gravar(dados, caminho):
    """Escrita atómica: grava num ficheiro temporário e só depois substitui.

    Sem isto, um Ctrl-C ou um timeout a meio do json.dump deixa o ficheiro
    truncado e ilegível — e perdem-se horas de recolha. Aconteceu uma vez.
    """
    tmp = caminho + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=1)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, caminho)


def main():
    municipios = [f["properties"] for f in json.load(open(CAOP, encoding="utf-8"))["features"]]
    cache = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}

    pendentes = [m for m in municipios if m["slug"] not in cache]
    if "--so" in sys.argv:
        pendentes = pendentes[: int(sys.argv[sys.argv.index("--so") + 1])]

    print(f"{len(cache)}/{len(municipios)} concelhos em cache · {len(pendentes)} neste lote")
    if not pendentes:
        print(f"✓ completo — {sum(len(v) for v in cache.values())} freguesias")
        return

    for i, m in enumerate(pendentes, 1):
        r = freguesias_de(m["concelho"])
        if r == "LIMITE":
            gravar(cache, OUT)
            print(f"\n⚠ geoapi atingiu o limite gratuito ao fim de {i - 1} pedidos.")
            print(f"  {len(cache)}/{len(municipios)} concelhos em cache. Volta a correr mais tarde.")
            return
        if r is None:
            continue                       # falha de rede: fica por tentar
        cache[m["slug"]] = r
        if i % 20 == 0 or i == len(pendentes):
            gravar(cache, OUT)
            print(f"  {i}/{len(pendentes)} · {len(cache)} concelhos · "
                  f"{sum(len(v) for v in cache.values())} freguesias")
        time.sleep(PAUSA)

    gravar(cache, OUT)
    vazios = [k for k, v in cache.items() if not v]
    print(f"\n✓ {len(cache)}/{len(municipios)} concelhos · "
          f"{sum(len(v) for v in cache.values())} freguesias")
    if vazios:
        print(f"  sem freguesias devolvidas: {len(vazios)} → {', '.join(vazios[:6])}")


if __name__ == "__main__":
    main()
