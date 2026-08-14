#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Varre a Carta Social (resposta social Creche) em todo o país.

Sucede ao piloto da Área Metropolitana de Lisboa. Diferenças:
 · percorre os 308 concelhos, não uma lista à mão;
 · lê as freguesias de dados/freguesias-por-concelho.json (o geoapi gratuito
   corta ao fim de algumas centenas de pedidos — por isso são recolhidas uma
   vez, à parte, por scripts/cache_freguesias.py);
 · guarda a cada concelho e RETOMA onde ficou: a recolha leva horas e uma
   interrupção não pode obrigar a recomeçar;
 · regista os totais por concelho (equipamentos, capacidade, utentes), que são
   os números usados nos relatórios de imprensa;
 · assinala as freguesias onde a listagem ficou incompleta — a pesquisa é
   paginada por JSF e a primeira página só traz 10 resultados.

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
FREGUESIAS = "dados/freguesias-por-concelho.json"
CAOP = "dados/municipios.geojson"
COOKIES = "/tmp/cs_nacional_cookies.txt"
UA = "Mozilla/5.0 (compatible; creches.app data check; geral@creches.app)"
PAUSA = 0.4            # cortesia com um servidor público
TP_CRECHE = "1103"     # tipo de resposta social "Creche"
VT = "11"              # área de intervenção: Infância e Juventude
PESQUISA = "https://www.cartasocial.pt/resultados-da-pesquisa?vt={}&tp={}&l={}"


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


def parse(h):
    def num(rotulo):
        m = re.search(rotulo + r"[^0-9]*([0-9]+)", h)
        return int(m.group(1)) if m else 0

    equipamentos = []
    vistos = set()
    for m in re.finditer(r'idEquipment=(\d+)[^>]*>(.{0,220}?)</a>', h, re.S):
        eid = m.group(1)
        if eid in vistos:
            continue
        vistos.add(eid)
        nome = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(2))).strip()
        if nome:
            equipamentos.append({"id": eid, "nome": nome})
    return num("Equipamentos"), num("Capacidade total"), num("Total de utentes"), equipamentos


def main():
    argv = sys.argv[1:]
    municipios = [f["properties"] for f in json.load(open(CAOP, encoding="utf-8"))["features"]]
    freg_cache = json.load(open(FREGUESIAS, encoding="utf-8"))

    dados = {"fonte": "cartasocial.pt (DGSSS) — resposta social Creche", "concelhos": {}}
    if os.path.exists(OUT) and "--refazer" not in argv:
        dados = json.load(open(OUT, encoding="utf-8"))

    pendentes = [m for m in municipios if m["slug"] not in dados["concelhos"]]
    if "--so" in argv:
        pendentes = pendentes[: int(argv[argv.index("--so") + 1])]

    print(f"{len(dados['concelhos'])}/{len(municipios)} concelhos feitos · "
          f"{len(pendentes)} neste lote")
    if not pendentes:
        total_eq = sum(v["equipamentos"] for v in dados["concelhos"].values())
        total_nm = sum(len(v["equip"]) for v in dados["concelhos"].values())
        print(f"✓ completo — {total_eq} equipamentos, {total_nm} identificados")
        return

    fetch("https://www.cartasocial.pt/inicio")      # abre sessão

    for i, m in enumerate(pendentes, 1):
        dico, slug, nome = m["dico"], m["slug"], m["concelho"]

        # Totais do concelho: a freguesia "99" devolve o concelho inteiro
        eq, cap, ut, primeiros = parse(fetch(PESQUISA.format(VT, TP_CRECHE, f"{dico[:2]}-{dico[2:]}-99")))
        time.sleep(PAUSA)

        registo = {"concelho": nome, "dico": dico, "distrito": m.get("distrito", ""),
                   "equipamentos": eq, "capacidade": cap, "utentes": ut,
                   "freguesias": [], "equip": []}

        vistos = set()
        for e in primeiros:                 # os 10 da primeira página já servem
            vistos.add(e["id"])
            registo["equip"].append(e)

        # Só vale a pena varrer freguesias se houver creches por identificar
        if eq > len(vistos):
            for fdic, fnome in freg_cache.get(slug, []):
                lf = f"{fdic[:2]}-{fdic[2:4]}-{fdic[4:]}"
                t, cp, u, lst = parse(fetch(PESQUISA.format(VT, TP_CRECHE, lf)))
                novos = [e for e in lst if e["id"] not in vistos]
                for e in novos:
                    e["freguesia"] = fnome
                    vistos.add(e["id"])
                registo["equip"] += novos
                registo["freguesias"].append(
                    {"dicofre": fdic, "freguesia": fnome, "equipamentos": t,
                     "capacidade": cp, "incompleto": t > len(lst)})
                time.sleep(PAUSA)
                if len(vistos) >= eq:       # já os temos todos
                    break

        dados["concelhos"][slug] = registo
        gravar(dados, OUT)
        falta = eq - len(registo["equip"])
        aviso = f"  ⚠ faltam {falta}" if falta > 0 else ""
        print(f"  [{i}/{len(pendentes)}] {nome:<26} {eq:>3} equip · {cap:>5} lug · "
              f"{len(registo['equip']):>3} nomes{aviso}")

    tot = dados["concelhos"]
    print(f"\n✓ {len(tot)}/{len(municipios)} concelhos")
    print(f"  equipamentos : {sum(v['equipamentos'] for v in tot.values())}")
    print(f"  lugares      : {sum(v['capacidade'] for v in tot.values())}")
    print(f"  utentes      : {sum(v['utentes'] for v in tot.values())}")
    print(f"  identificados: {sum(len(v['equip']) for v in tot.values())}")


if __name__ == "__main__":
    main()
