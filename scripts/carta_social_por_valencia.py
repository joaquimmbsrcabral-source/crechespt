#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Última passagem: apanha as creches escondidas pelo limite de 10 resultados.

Depois de corrigir os códigos de freguesia (carta_social_completar.py) ainda
ficaram 250 equipamentos por identificar. Estão todos em freguesias que têm mais
de 10 creches — o limite de resultados por página da Carta Social, cuja paginação
é AJAX do PrimeFaces e não se deixa reproduzir por HTTP.

A ideia que resolve: **um estabelecimento com creche costuma ter mais respostas
sociais** — pré-escolar (tp=1104), CATL (tp=1105). Essas pesquisas devolvem outra
lista, com outra ordenação alfabética, e por isso outros dez primeiros. Um
equipamento que apareça aí e que ainda não conheçamos é candidato.

Candidato, não creche: a lista de pré-escolar traz jardins de infância que não
têm creche nenhuma. Por isso cada candidato é confirmado na sua ficha de
detalhe — só entra se lá constar mesmo a resposta "Creche". Sem esta
confirmação estaríamos a inventar creches a partir de jardins de infância, que é
exactamente o erro que este projecto já cometeu uma vez.

Uso:
  python3 scripts/carta_social_por_valencia.py --simular
  python3 scripts/carta_social_por_valencia.py [--so 15]

Escreve os candidatos confirmados em dados/carta-social-nacional.json.
"""
import json, os, re, subprocess, sys, time, html as _html

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)

NACIONAL = "dados/carta-social-nacional.json"
DETALHE = "dados/carta-social-detalhe.json"
COOKIES = "/tmp/cs_valencia_cookies.txt"
UA = "Mozilla/5.0 (compatible; creches.app data check; geral@creches.app)"
PAUSA = 0.4
VT = "11"
TP_OUTRAS = ["1104", "1105"]          # pré-escolar e CATL
PESQUISA = "https://www.cartasocial.pt/resultados-da-pesquisa?vt={}&tp={}&l={}"
FICHA = (
    "https://www.cartasocial.pt/resultados-da-pesquisa"
    "?p_p_id=SocialLetterPortlet_WAR_cartasocialportlet&p_p_lifecycle=0"
    "&p_p_state=normal&p_p_mode=view&p_p_col_id=column-1&p_p_col_count=1"
    "&_SocialLetterPortlet_WAR_cartasocialportlet__facesViewIdRender="
    "%2Fviews%2FsocialLetter%2Flist%2Fview%2Fequipment%2Fequipment_detail.xhtml"
    "&_SocialLetterPortlet_WAR_cartasocialportlet_idEquipment={}"
)


def gravar(dados, caminho):
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


def ids_e_nomes(h):
    saida, vistos = {}, set()
    for m in re.finditer(r'idEquipment=(\d+)[^>]*>(.{0,220}?)</a>', h, re.S):
        eid = m.group(1)
        if eid in vistos:
            continue
        vistos.add(eid)
        nome = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(2))).strip()
        if nome:
            saida[eid] = nome
    return saida


def tem_creche(bruto):
    """A ficha lista as respostas sociais. Só nos interessa se lá estiver creche.

    Procura-se na tabela de respostas, não na página toda: a palavra "creche"
    aparece no nome de muitos jardins de infância que não têm a valência.
    """
    sem = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", bruto, flags=re.S)
    t = re.sub(r"\s+", " ", _html.unescape(re.sub(r"<[^>]+>", " ", sem)))
    if "Resposta social" not in t:
        return False
    bloco = t[t.index("Resposta social"):]
    for fim in ("Última Atualização Certificações", "Última Atualização"):
        if fim in bloco:
            bloco = bloco[bloco.index(fim) + len(fim):]
            break
    for rodape in ("© DGSSS", "Desenvolvido por"):
        if rodape in bloco:
            bloco = bloco[:bloco.index(rodape)]
    # "Creche" isolada, não "Creche Familiar" nem parte de outro nome
    return bool(re.search(r"\bCreche\s+\d", bloco))


def main():
    argv = sys.argv[1:]
    simular = "--simular" in argv
    dados = json.load(open(NACIONAL, encoding="utf-8"))
    concelhos = dados["concelhos"]
    conhecidos = {e["id"] for c in concelhos.values() for e in c["equip"]}

    alvo = [(k, c) for k, c in concelhos.items()
            if c["equipamentos"] > len(c["equip"]) and not c.get("valencias_em")]
    alvo.sort(key=lambda kc: -(kc[1]["equipamentos"] - len(kc[1]["equip"])))
    if "--so" in argv:
        alvo = alvo[: int(argv[argv.index("--so") + 1])]

    print(f"{len(alvo)} concelhos neste lote · "
          f"{sum(c['equipamentos'] - len(c['equip']) for _, c in concelhos.items() if c['equipamentos'] > len(c['equip']))}"
          f" nomes em falta\n")
    if not alvo:
        return

    fetch("https://www.cartasocial.pt/inicio")
    ganhos = descartados = 0

    for i, (slug, c) in enumerate(alvo, 1):
        dico = c["dico"]
        # Só as freguesias que ficaram cortadas — as outras já estão completas.
        cortadas = [f["ff"] for f in (c.get("freguesias_reais") or []) if f["incompleto"]]
        if not cortadas:
            cortadas = [f"{n:02d}" for n in range(1, 41)]   # sem diagnóstico, tenta tudo

        candidatos = {}
        for ff in cortadas:
            if len(c["equip"]) >= c["equipamentos"]:
                break
            l = f"{dico[:2]}-{dico[2:]}-{ff}"
            for tp in TP_OUTRAS:
                for eid, nome in ids_e_nomes(fetch(PESQUISA.format(VT, tp, l))).items():
                    if eid not in conhecidos:
                        candidatos[eid] = (nome, ff)
                time.sleep(PAUSA)

        novos = 0
        for eid, (nome, ff) in candidatos.items():
            if len(c["equip"]) >= c["equipamentos"]:
                break
            if tem_creche(fetch(FICHA.format(eid))):
                c["equip"].append({"id": eid, "nome": nome, "ff": ff,
                                   "via": "valencia_alternativa"})
                conhecidos.add(eid)
                novos += 1
            else:
                descartados += 1
            time.sleep(PAUSA)

        c["valencias_em"] = time.strftime("%Y-%m-%d")
        ganhos += novos
        resta = c["equipamentos"] - len(c["equip"])
        print(f"  [{i}/{len(alvo)}] {c['concelho']:<24} +{novos:>3} creches "
              f"({len(c['equip'])}/{c['equipamentos']}) · {len(candidatos)} candidatos"
              + (f" · faltam {resta}" if resta > 0 else "  ✓ completo"))

        if not simular:
            gravar(dados, NACIONAL)

    tot = dados["concelhos"]
    print(f"\n✓ +{ganhos} creches confirmadas · {descartados} candidatos descartados "
          f"(não tinham a valência creche)")
    print(f"  identificados: {sum(len(v['equip']) for v in tot.values())}"
          f" / {sum(v['equipamentos'] for v in tot.values())}")
    if simular:
        print("  (simulação — nada foi escrito)")


if __name__ == "__main__":
    main()
