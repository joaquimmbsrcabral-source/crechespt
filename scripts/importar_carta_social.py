#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Traz para o mapa as creches oficiais que a Carta Social conhece e nós não.

Na Área Metropolitana de Lisboa — a região melhor mapeada do OpenStreetMap em
Portugal — tínhamos 33% das creches que constam da Carta Social. Faltavam 444.
Este script importa-as, com dados que valem mais do que os do OSM porque vêm da
fonte oficial: morada, contactos, natureza jurídica, capacidade e horário.

Coordenadas: obtidas do código postal via json.geoapi.pt. É o centróide do CP,
não a porta exacta — por isso cada registo importado fica marcado com
`geo_precisao: "codigo_postal"`, para nunca dizermos que sabemos mais do que
sabemos.

Uso:
  python3 scripts/importar_carta_social.py --simular    # mostra sem escrever
  python3 scripts/importar_carta_social.py
"""
import json, os, re, sys, unicodedata, datetime, collections

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)

DETALHE = "dados/carta-social-detalhe.json"
DATASET = "creches_pt.json"
COORDS = "dados/carta-social-coordenadas.json"
CAOP = "dados/municipios.geojson"
HOJE = datetime.date.today().isoformat()

# Natureza jurídica oficial → o nosso campo `tipo`. Acaba com a heurística de
# adivinhar pelo nome, que punha Misericórdias como "Privada".
NATUREZA = {
    "entidade privada lucrativa": "Privada",
    "sociedade": "Privada",
    "empresário em nome individual": "Privada",
    "cooperativa": "IPSS",
    "associação de solidariedade social": "IPSS",
    "centro social paroquial": "IPSS",
    "irmandade da misericórdia": "IPSS",
    "santa casa da misericórdia": "IPSS",
    "fundação": "IPSS",
    "associação mutualista": "IPSS",
    "casa do povo": "IPSS",
    "instituto": "IPSS",
    "serviços sociais": "Pública",
    "administração pública": "Pública",
    "autarquia": "Pública",
    "município": "Pública",
}


def tipo_de(natureza):
    n = (natureza or "").lower().strip()
    for chave, valor in NATUREZA.items():
        if chave in n:
            return valor
    return "IPSS" if ("social" in n or "solidar" in n) else None


# ── Concelho pelas fronteiras oficiais (CAOP) ───────────────────────────────
# É assim que o resto do dataset é atribuído, com 100% de concordância. Confiar
# no concelho que vem no endereço seria pior: as moradas trazem freguesias,
# antigas designações e erros de escrita.
def carregar_municipios():
    g = json.load(open(CAOP, encoding="utf-8"))
    saida = []
    for f in g["features"]:
        geo, props = f["geometry"], f["properties"]
        aneis = [geo["coordinates"][0]] if geo["type"] == "Polygon" else \
                [poly[0] for poly in geo["coordinates"]]
        xs = [x for a in aneis for x, _ in a]
        ys = [y for a in aneis for _, y in a]
        saida.append((props, aneis, min(xs), max(xs), min(ys), max(ys)))
    return saida


def dentro(anel, lon, lat):
    dentro_ = False
    n = len(anel)
    for i in range(n):
        x1, y1 = anel[i]
        x2, y2 = anel[(i + 1) % n]
        if (y1 > lat) != (y2 > lat):
            xint = (x2 - x1) * (lat - y1) / (y2 - y1) + x1
            if lon < xint:
                dentro_ = not dentro_
    return dentro_


def concelho_de(lat, lon, municipios):
    for props, aneis, x0, x1, y0, y1 in municipios:
        if not (x0 <= lon <= x1 and y0 <= lat <= y1):
            continue
        if any(dentro(a, lon, lat) for a in aneis):
            return props
    return None


def distancia_km(a_lat, a_lon, b_lat, b_lon):
    import math
    dlat = (b_lat - a_lat) * 111.32
    dlon = (b_lon - a_lon) * 111.32 * math.cos(math.radians((a_lat + b_lat) / 2))
    return math.hypot(dlat, dlon)


def normalizar(nome):
    s = unicodedata.normalize("NFKD", str(nome or "")).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\b(creche|jardim|de|da|do|dos|das|infancia|infantil|centro|social|e|o|a)\b", " ", s)
    return set(w for w in re.split(r"[^a-z0-9]+", s) if len(w) > 2)


# A Carta Social escreve tudo em maiúsculas. O .title() do Python devolveria
# "Colégio Da Villa" e "Centro Social E Paroquial" — em português as
# preposições e artigos ficam em minúscula no meio do nome.
MINUSCULAS = {"de", "da", "do", "das", "dos", "e", "a", "o", "as", "os",
              "em", "no", "na", "nos", "nas", "para", "com", "à", "ao"}


def capitalizar(nome):
    if not nome.isupper():
        return nome
    palavras = nome.lower().split()
    saida = []
    for i, w in enumerate(palavras):
        if i > 0 and w in MINUSCULAS:
            saida.append(w)
        elif "-" in w:
            saida.append("-".join(p.capitalize() for p in w.split("-")))
        else:
            saida.append(w.capitalize())
    return " ".join(saida)


def slugify(txt):
    s = unicodedata.normalize("NFKD", str(txt or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


# A geocodificação vive no seu próprio script (geocodificar_carta_social.py),
# que respeita o limite de 1 pedido/segundo do Nominatim e pode ser retomado.
# Aqui só se leem as coordenadas já apuradas.

def main():
    simular = "--simular" in sys.argv

    detalhe = json.load(open(DETALHE, encoding="utf-8"))["equipamentos"]
    dados = json.load(open(DATASET, encoding="utf-8"))
    lista = dados if isinstance(dados, list) else dados["creches"]
    coords = json.load(open(COORDS, encoding="utf-8"))
    municipios = carregar_municipios()

    ja_temos = {str(c.get("carta_social_id")) for c in lista if c.get("carta_social_id")}
    novos, sem_coords, ja_la, duplicados = [], [], 0, []

    for cs_id, d in detalhe.items():
        if cs_id in ja_temos:
            ja_la += 1
            continue

        creche = next((r for r in (d.get("respostas") or [])
                       if "creche" in r["resposta"].lower()), None)

        cp = d.get("codigo_postal")
        geo = coords.get(cs_id)
        if not geo:
            sem_coords.append(d.get("cs_nome") or d.get("nome"))
            continue

        # Já lá está com outro nome? O cruzamento original foi por nome e falha
        # com abreviaturas. Antes de criar um registo novo, procurar um nosso a
        # menos de 250 m com nome parecido.
        nome_bruto = d.get("nome") or d.get("cs_nome") or ""
        palavras = normalizar(nome_bruto)
        gemeo = None
        for c in lista:
            if not (c.get("lat") and c.get("lon")):
                continue
            if abs(c["lat"] - geo["lat"]) > 0.004 or abs(c["lon"] - geo["lon"]) > 0.005:
                continue
            if distancia_km(geo["lat"], geo["lon"], c["lat"], c["lon"]) > 0.25:
                continue
            comuns = palavras & normalizar(c.get("nome"))
            if comuns and len(comuns) >= min(2, len(palavras)):
                gemeo = c
                break
        if gemeo is not None:
            # Não duplicamos: enriquecemos o que já existe com a fonte oficial.
            gemeo.setdefault("carta_social_id", cs_id)
            gemeo["valencia_creche_fonte"] = "carta_social"
            if not gemeo.get("telefone") and d.get("telefone"):
                gemeo["telefone"] = d["telefone"]
            if not gemeo.get("email") and d.get("email"):
                gemeo["email"] = d["email"]
            if creche and creche.get("horario"):
                gemeo["horario"] = creche["horario"]
                gemeo["horario_fonte"] = "carta_social"
            if d.get("natureza_juridica"):
                gemeo["natureza_juridica"] = d["natureza_juridica"]
                t = tipo_de(d["natureza_juridica"])
                if t:
                    gemeo["tipo"] = t
                    gemeo["tipo_fonte"] = "carta_social"
            duplicados.append(gemeo.get("nome"))
            continue

        nome = re.sub(r"\s+", " ", nome_bruto).strip()
        if not nome:
            continue
        # A pesquisa devolve "NOME Freguesia" — tirar a freguesia colada ao fim.
        freg = d.get("freguesia")
        if freg and nome.lower().endswith(freg.lower()):
            nome = nome[: -len(freg)].strip(" -,")

        mun = concelho_de(geo["lat"], geo["lon"], municipios)

        registo = {
            "id": f"cs-{cs_id}",
            "nome": capitalizar(nome),
            "lat": geo["lat"],
            "lon": geo["lon"],
            "morada": d.get("morada"),
            "codigo_postal": cp,
            "localidade": d.get("localidade"),
            "telefone": d.get("telefone"),
            "email": d.get("email"),
            "operador": d.get("entidade"),
            "concelho": (mun or {}).get("concelho"),
            "concelho_slug": (mun or {}).get("slug"),
            "distrito": (mun or {}).get("distrito"),
            "categoria_osm": None,
            "osm_url": None,
            "resposta": "Creche",
            "tipo": tipo_de(d.get("natureza_juridica")) or "Desconhecido",
            "natureza_juridica": d.get("natureza_juridica"),
            "idade_min_meses": 4,
            "idade_max_meses": 36,
            "carta_social_id": cs_id,
            "valencia_creche_fonte": "carta_social",
            "geo_precisao": geo.get("precisao"),
            "fonte": "carta_social",
            "importado_em": HOJE,
        }
        if creche:
            registo["capacidade_oficial"] = creche.get("capacidade")
            registo["utentes_oficial"] = creche.get("utentes")
            if creche.get("horario"):
                registo["horario"] = creche["horario"]
                registo["horario_fonte"] = "carta_social"
        novos.append(registo)

    print(f"detalhe da Carta Social : {len(detalhe)}")
    print(f"já no dataset           : {ja_la}")
    print(f"sem coordenadas         : {len(sem_coords)}")
    print(f"já existiam com outro nome (enriquecidos, não duplicados): {len(duplicados)}")
    print(f"a importar              : {len(novos)}")
    if novos:
        com_tel = sum(1 for n in novos if n.get("telefone"))
        com_mail = sum(1 for n in novos if n.get("email"))
        com_hor = sum(1 for n in novos if n.get("horario"))
        print(f"   com telefone : {com_tel}\n   com email    : {com_mail}\n   com horário  : {com_hor}")
        print("   por tipo     :", dict(collections.Counter(n["tipo"] for n in novos)))
        print("\n   exemplos:")
        for n in novos[:3]:
            print(f"     {n['nome'][:44]:<44} {n['concelho']} · {n['tipo']} · {n.get('horario') or '—'}")
    if sem_coords[:5]:
        print("\n   sem código postal utilizável:", ", ".join(str(x)[:30] for x in sem_coords[:5]))

    if simular:
        print("\n(simulação — nada foi escrito)")
        return

    lista.extend(novos)
    json.dump(dados, open(DATASET, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\n✓ dataset passa de {len(lista) - len(novos)} para {len(lista)} registos")


if __name__ == "__main__":
    main()
