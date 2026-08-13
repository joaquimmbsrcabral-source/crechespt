#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dá coordenadas às creches oficiais da Carta Social.

A Carta Social publica morada e código postal, mas não coordenadas. Sem elas,
uma creche não entra no mapa.

Fonte: Nominatim (OpenStreetMap). O geoapi.pt seria mais directo mas a versão
gratuita corta ao fim de poucas centenas de pedidos — gastámos a quota e ficámos
com 225 respostas vazias, que este script ignora.

Três tentativas por creche, da mais precisa para a menos:
  1. morada + código postal + localidade   → porta ou rua
  2. código postal + localidade            → zona do código postal
  3. freguesia + concelho                  → centro da freguesia

O nível conseguido fica gravado em `geo_precisao`, para o mapa poder dizer com
que confiança sabe onde a creche está. Nunca fingimos precisão que não temos.

Respeita o limite de 1 pedido/segundo do Nominatim e guarda a cada 10.
Retoma onde ficou — pode ser corrido várias vezes.

Uso: python3 scripts/geocodificar_carta_social.py [--so 200]
"""
import json, os, re, subprocess, sys, time

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)

DETALHE = "dados/carta-social-detalhe.json"
OUT = "dados/carta-social-coordenadas.json"
UA = "creches.app/1.0 (mapa de creches de Portugal; geral@creches.app)"
PAUSA = 1.15          # política do Nominatim: máximo 1 pedido por segundo

# Caixas de Portugal, para apanhar resultados absurdos do geocodificador.
# A Madeira fica a 32,6°N — muito abaixo do continente. Faltava, e teria feito
# rejeitar silenciosamente qualquer creche madeirense.
LIMITES = [
    (36.8, 42.2, -9.6, -6.1),      # continente
    (36.9, 39.8, -31.4, -24.9),    # Açores
    (32.3, 33.2, -17.4, -16.2),    # Madeira e Porto Santo
    (30.0, 30.2, -15.9, -15.8),    # Selvagens
]


def em_portugal(lat, lon):
    return any(a <= lat <= b and c <= lon <= d for a, b, c, d in LIMITES)


def nominatim(query):
    try:
        r = subprocess.run(
            ["curl", "-s", "--max-time", "25", "-A", UA, "--get",
             "https://nominatim.openstreetmap.org/search",
             "--data-urlencode", f"q={query}",
             "-d", "format=json&limit=1&countrycodes=pt"],
            capture_output=True, text=True, timeout=30)
        d = json.loads(r.stdout or "[]")
        if d:
            lat, lon = float(d[0]["lat"]), float(d[0]["lon"])
            if em_portugal(lat, lon):
                return round(lat, 6), round(lon, 6)
    except Exception:
        pass
    return None


def limpar_morada(m):
    """Tira o que confunde o geocodificador: lotes, andares, urbanizações."""
    m = re.sub(r"\bN\.?º\s*", "", str(m or ""), flags=re.I)
    m = re.sub(r"\b(LOTE|LT|R/C|RC|ANDAR|ESQ|DTO|FRACÇÃO|FRACAO)\b.*", "", m, flags=re.I)
    m = re.sub(r"\s*,\s*$", "", m.strip(" ,-"))
    return re.sub(r"\s{2,}", " ", m)


def main():
    argv = sys.argv[1:]
    detalhe = json.load(open(DETALHE, encoding="utf-8"))["equipamentos"]
    feitos = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}

    pendentes = [(k, v) for k, v in detalhe.items() if k not in feitos]
    if "--so" in argv:
        pendentes = pendentes[: int(argv[argv.index("--so") + 1])]

    print(f"{len(feitos)} já geocodificados · {len(pendentes)} neste lote")
    if not pendentes:
        return

    contagem = {"morada": 0, "codigo_postal": 0, "freguesia": 0, "falhou": 0}

    for i, (cs_id, d) in enumerate(pendentes, 1):
        cp = d.get("codigo_postal") or ""
        loc = d.get("localidade") or d.get("freguesia") or ""
        morada = limpar_morada(d.get("morada"))
        conc = d.get("concelho") or ""

        tentativas = []
        if morada and cp:
            tentativas.append(("morada", f"{morada}, {cp} {loc}, Portugal"))
        elif morada:
            tentativas.append(("morada", f"{morada}, {loc}, Portugal"))
        if cp:
            tentativas.append(("codigo_postal", f"{cp} {loc}, Portugal"))
        if d.get("freguesia"):
            tentativas.append(("freguesia", f"{d['freguesia']}, {conc}, Portugal"))

        achou = None
        for precisao, q in tentativas:
            achou = nominatim(q)
            time.sleep(PAUSA)
            if achou:
                feitos[cs_id] = {"lat": achou[0], "lon": achou[1], "precisao": precisao}
                contagem[precisao] += 1
                break

        if not achou:
            feitos[cs_id] = None
            contagem["falhou"] += 1

        if i % 10 == 0 or i == len(pendentes):
            json.dump(feitos, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
            print(f"  {i}/{len(pendentes)} · morada {contagem['morada']} · "
                  f"CP {contagem['codigo_postal']} · freguesia {contagem['freguesia']} · "
                  f"falhou {contagem['falhou']}")

    json.dump(feitos, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    com = sum(1 for v in feitos.values() if v)
    print(f"\n✓ {com}/{len(feitos)} com coordenadas")
    for nivel in ("morada", "codigo_postal", "freguesia"):
        n = sum(1 for v in feitos.values() if v and v["precisao"] == nivel)
        print(f"   {nivel:<14} {n}")


if __name__ == "__main__":
    main()
