#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extrai a Carta Social (resposta social Creche) para TODOS os concelhos do país.

Sucede ao carta_social_freguesias.py, que fez o piloto da AML. Diferenças:
 - percorre os 308 concelhos, não uma lista à mão;
 - guarda o progresso a cada concelho e RETOMA onde ficou (a extração leva
   horas e uma interrupção não pode obrigar a recomeçar);
 - regista também os totais por concelho (equipamentos, capacidade, utentes),
   que é o dado usado nos relatórios de imprensa;
 - marca as freguesias com mais de 10 equipamentos como incompletas — a
   pesquisa da Carta Social é paginada por JSF e a 1.ª página só traz 10.

Uso:
  python3 scripts/carta_social_nacional.py            # corre/retoma tudo
  python3 scripts/carta_social_nacional.py --so 30    # só os próximos 30
  python3 scripts/carta_social_nacional.py --refazer  # ignora o progresso

Saída: dados/carta-social-nacional.json
"""
import json, os, re, subprocess, sys, time

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)
OUT = "dados/carta-social-nacional.json"
COOKIES = "/tmp/cs_nac_cookies.txt"
UA = "Mozilla/5.0 (compatible; creches.app data check; geral@creches.app)"
PAUSA = 0.45          # cortesia com o servidor público
TP_CRECHE = "1103"    # tipo de resposta social "Creche"
VT = "11"             # área de intervenção: Infância e Juventude

def fetch(url, tent=3):
    for i in range(tent):
        try:
            r = subprocess.run(["curl", "-sk", "--max-time", "25",
                                "-b", COOKIES, "-c", COOKIES, "-A", UA, url],
                               capture_output=True, text=True, timeout=30)
            if r.stdout:
                return r.stdout
        except Exception:
            pass
        time.sleep(1.5 * (i + 1))
    return ""

def geoapi_freguesias(nome_municipio):
    """[(dicofre, nome)] — o geoapi aceita o nome com espaços."""
    alvo = nome_municipio.replace(" ", "%20")
    try:
        d = json.loads(fetch(f"https://json.geoapi.pt/municipio/{alvo}/freguesias"))
    except Exception:
        return []
    out = []
    for f in (d.get("geojsons") or {}).get("freguesias") or []:
        p = f.get("properties") or {}
        dic = str(p.get("Dicofre") or p.get("dicofre") or p.get("DICOFRE") or "")
        nome = p.get("Freguesia") or p.get("freguesia") or ""
        if len(dic) == 6:
            out.append((dic, nome))
    return out

def parse(h):
    def num(rot):
        m = re.search(rot + r"[^0-9]*([0-9]+)", h)
        return int(m.group(1)) if m else 0
    equips = []
    for m in re.finditer(r'<a[^>]*idEquipment=(\d+)[^>]*>(.{0,220}?)</a>', h, re.S):
        nome = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(2))).strip()
        if nome:
            equips.append({"id": m.group(1), "nome": nome})
    return num("Equipamentos"), num("Capacidade total"), num("Total de utentes"), equips

def main():
    argv = sys.argv[1:]
    limite = None
    if "--so" in argv:
        limite = int(argv[argv.index("--so") + 1])

    pop = json.load(open("dados/populacao-concelhos.json", encoding="utf-8"))
    concelhos = pop if isinstance(pop, list) else pop.get("concelhos", [])

    dados = {"fonte": "cartasocial.pt (DGSSS) — resposta social Creche",
             "concelhos": {}}
    if os.path.exists(OUT) and "--refazer" not in argv:
        dados = json.load(open(OUT, encoding="utf-8"))

    feitos = set(dados["concelhos"])
    pendentes = [c for c in concelhos if c["slug"] not in feitos]
    print(f"{len(feitos)} concelhos já feitos · {len(pendentes)} por fazer")
    if limite:
        pendentes = pendentes[:limite]

    fetch("https://www.cartasocial.pt/inicio")   # abre sessão

    for i, c in enumerate(pendentes, 1):
        dico, slug, nome = c["dico"], c["slug"], c["concelho"]
        # Totais do concelho: freguesia "99" devolve o concelho inteiro
        l = f"{dico[:2]}-{dico[2:]}-99"
        eq, cap, ut, _ = parse(fetch(
            f"https://www.cartasocial.pt/resultados-da-pesquisa?vt={VT}&tp={TP_CRECHE}&l={l}"))
        time.sleep(PAUSA)

        registo = {"concelho": nome, "dico": dico, "distrito": c.get("distrito", ""),
                   "equipamentos": eq, "capacidade": cap, "utentes": ut,
                   "nascimentos_2024": c.get("nascimentos_ano"),
                   "criancas_0_3_est": c.get("criancas_0_3"),
                   "freguesias": [], "equip": []}

        if eq:   # só vale a pena varrer freguesias se houver creches
            vistos = set()
            for fdic, fnome in geoapi_freguesias(nome):
                lf = f"{fdic[:2]}-{fdic[2:4]}-{fdic[4:]}"
                t, cp, u, lst = parse(fetch(
                    f"https://www.cartasocial.pt/resultados-da-pesquisa?vt={VT}&tp={TP_CRECHE}&l={lf}"))
                novos = [e for e in lst if e["id"] not in vistos]
                for e in novos:
                    e["freguesia"] = fnome
                    vistos.add(e["id"])
                registo["equip"] += novos
                registo["freguesias"].append(
                    {"dicofre": fdic, "freguesia": fnome, "equipamentos": t,
                     "capacidade": cp, "incompleto": t > len(lst)})
                time.sleep(PAUSA)

        dados["concelhos"][slug] = registo
        json.dump(dados, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        falta = eq - len(registo["equip"])
        print(f"  [{i}/{len(pendentes)}] {nome:<28} {eq:>3} equip · {cap:>5} lug · "
              f"{len(registo['equip']):>3} nomes" + (f"  ⚠ -{falta}" if falta > 0 else ""))

    tot = dados["concelhos"]
    print(f"\n✓ {len(tot)}/{len(concelhos)} concelhos")
    print(f"  equipamentos: {sum(v['equipamentos'] for v in tot.values())}")
    print(f"  lugares     : {sum(v['capacidade'] for v in tot.values())}")
    print(f"  nomes obtidos: {sum(len(v['equip']) for v in tot.values())}")

if __name__ == "__main__":
    main()
