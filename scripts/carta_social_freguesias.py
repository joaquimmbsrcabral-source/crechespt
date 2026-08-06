#!/usr/bin/env python3
"""Extrai da Carta Social os equipamentos com resposta de Creche, freguesia a
freguesia, para os concelhos indicados. A pesquisa por concelho é paginada
(JSF, difícil de automatizar); a pesquisa por freguesia quase nunca passa de
10 resultados, pelo que a primeira página chega. Onde uma freguesia tem >10,
fica registado `incompleto: true` para tratamento manual.

Uso: python3 carta_social_freguesias.py <slug1> <slug2> ...
Acrescenta a dados/carta-social-equip-aml.json (merge por concelho).

Códigos de freguesia (DICOFRE) vêm do geoapi.pt (geojson das freguesias).
"""
import json, re, subprocess, sys, time, unicodedata
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
OUT = BASE / "dados" / "carta-social-equip-aml.json"
UA = "Mozilla/5.0 (compatible; creches.app data check; geral@creches.app)"

def fetch(url, cookies="/tmp/cs_cookies.txt"):
    r = subprocess.run(["curl", "-sk", "-b", cookies, "-c", cookies, "-A", UA, url],
                       capture_output=True, text=True, timeout=30)
    return r.stdout

def geoapi_freguesias(slug):
    """Devolve [(dicofre, nome)] das freguesias do município."""
    # o geoapi quer o nome com espaços ("vila franca de xira"), não o slug
    nome_url = slug.replace("-", "%20")
    d = None
    for tent in (slug, nome_url):
        h = fetch(f"https://json.geoapi.pt/municipio/{tent}/freguesias")
        try:
            d = json.loads(h)
            if d.get("freguesias"):
                break
        except Exception:
            d = None
    if not d:
        return []
    out = []
    gj = (d.get("geojsons") or {}).get("freguesias") or []
    for f in gj:
        p = f.get("properties") or {}
        dic = str(p.get("Dicofre") or p.get("dicofre") or p.get("DICOFRE") or "")
        nome = p.get("Freguesia") or p.get("freguesia") or ""
        if len(dic) == 6:
            out.append((dic, nome))
    return out

def parse_page(h):
    tot = re.search(r"Equipamentos[^0-9]*([0-9]+)", h)
    tot = int(tot.group(1)) if tot else 0
    cap = re.search(r"Capacidade total[^0-9]*([0-9]+)", h)
    cap = int(cap.group(1)) if cap else 0
    equips = []
    for m in re.finditer(r'<a[^>]*idEquipment=(\d+)[^>]*>(.{0,220}?)</a>', h, re.S):
        nome = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(2))).strip()
        if nome:
            equips.append({"id": m.group(1), "nome": nome})
    return tot, cap, equips

def main(slugs):
    data = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {"concelhos": {}}
    fetch("https://www.cartasocial.pt/inicio")  # sessão
    for slug in slugs:
        fregs = geoapi_freguesias(slug)
        if not fregs:
            print(f"!! {slug}: geoapi sem freguesias"); continue
        cdata = {"freguesias": [], "equipamentos": []}
        vistos = set()
        for dic, fnome in fregs:
            l = f"{dic[:2]}-{dic[2:4]}-{dic[4:]}"
            h = fetch(f"https://www.cartasocial.pt/resultados-da-pesquisa?vt=11&tp=1103&l={l}")
            tot, cap, eq = parse_page(h)
            novos = [e for e in eq if e["id"] not in vistos]
            for e in novos:
                e["freguesia"] = fnome
                vistos.add(e["id"])
            cdata["equipamentos"] += novos
            cdata["freguesias"].append({"dicofre": dic, "freguesia": fnome,
                "equipamentos": tot, "capacidade": cap,
                "incompleto": tot > len(eq)})
            print(f"  {slug} · {fnome[:38]:<38} {tot:>3} equip {cap:>6} lug" +
                  ("  ⚠ >10" if tot > len(eq) else ""))
            time.sleep(0.5)
        data["concelhos"][slug] = cdata
        OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"✓ {slug}: {len(cdata['equipamentos'])} equipamentos únicos gravados")

if __name__ == "__main__":
    main(sys.argv[1:])
