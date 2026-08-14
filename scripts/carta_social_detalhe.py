#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extrai a ficha completa de cada equipamento da Carta Social.

A pesquisa da Carta Social só dá nome e freguesia. A página de detalhe dá o
resto — e é o resto que vale:

  · morada e código postal  → permite geocodificar (json.geoapi.pt/cp/XXXX-XXX)
  · telefone e email        → 22% do nosso dataset não tem qualquer contacto
  · natureza jurídica       → classificação oficial, em vez da nossa heurística
  · horário por valência    → o dado que não existe em nenhuma fonte pública
                              e que prometemos mapear no programa de colaboradores
  · capacidade e utentes    → ocupação real, por resposta social

Guarda o progresso a cada equipamento e retoma onde ficou.

Uso:
  python3 scripts/carta_social_detalhe.py --nacional        # todo o país
  python3 scripts/carta_social_detalhe.py --em-falta        # os 444 da AML
  python3 scripts/carta_social_detalhe.py --cruzados        # os 214 já ligados
  python3 scripts/carta_social_detalhe.py --so 50           # limitar o lote
  python3 scripts/carta_social_detalhe.py --refazer

Saída: dados/carta-social-detalhe.json
"""
import json, os, re, subprocess, sys, time, html as _html

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)

OUT = "dados/carta-social-detalhe.json"
COOKIES = "/tmp/cs_detalhe_cookies.txt"
UA = "Mozilla/5.0 (compatible; creches.app data check; geral@creches.app)"
PAUSA = 0.5          # cortesia com um servidor público

DETALHE = (
    "https://www.cartasocial.pt/resultados-da-pesquisa"
    "?p_p_id=SocialLetterPortlet_WAR_cartasocialportlet&p_p_lifecycle=0"
    "&p_p_state=normal&p_p_mode=view&p_p_col_id=column-1&p_p_col_count=1"
    "&_SocialLetterPortlet_WAR_cartasocialportlet__facesViewIdRender="
    "%2Fviews%2FsocialLetter%2Flist%2Fview%2Fequipment%2Fequipment_detail.xhtml"
    "&_SocialLetterPortlet_WAR_cartasocialportlet_idEquipment={}"
)


def fetch(url, tentativas=3):
    for i in range(tentativas):
        try:
            r = subprocess.run(
                ["curl", "-sk", "--max-time", "25", "-b", COOKIES, "-c", COOKIES, "-A", UA, url],
                capture_output=True, text=True, timeout=30)
            if r.stdout and len(r.stdout) > 2000:
                return r.stdout
        except Exception:
            pass
        time.sleep(1.5 * (i + 1))
    return ""


def texto_limpo(bruto):
    sem = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", bruto, flags=re.S)
    return re.sub(r"\s+", " ", _html.unescape(re.sub(r"<[^>]+>", " ", sem)))


def entre(txt, inicio, fins):
    """Devolve o que está entre um rótulo e o rótulo seguinte."""
    i = txt.find(inicio)
    if i < 0:
        return ""
    resto = txt[i + len(inicio):]
    corte = len(resto)
    for f in fins:
        j = resto.find(f)
        if 0 <= j < corte:
            corte = j
    return resto[:corte].strip(" .:-")


ROTULOS = ["Contactos", "Morada", "Código Postal", "Telefone / Fax", "Email",
           "Dados institucionais", "Entidade proprietária", "Natureza Jurídica",
           "Ver no mapa", "Telefonar", "Enviar email", "Resposta social",
           "Capacidade", "Utentes", "Horário", "Última Atualização", "Certificações"]



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


def parse(bruto):
    t = texto_limpo(bruto)
    if "Não foi encontrada a página" in t or "Erro 404" in t:
        return None

    def campo(rot):
        return entre(t, rot, [r for r in ROTULOS if r != rot])

    cp = campo("Código Postal")
    m_cp = re.search(r"\b(\d{4}-\d{3})\b", cp)
    tel_fax = campo("Telefone / Fax")
    telefones = re.findall(r"\b(2\d{8}|9\d{8})\b", tel_fax)
    emails = re.findall(r"[\w.+-]+@[\w.-]+\.\w{2,}", campo("Email") or t)

    # Tabela das respostas sociais: nome, capacidade, utentes, horário, data.
    # É preciso cortar o cabeçalho antes de procurar linhas — senão a primeira
    # resposta fica com "Utentes Horário Última Atualização" colado ao nome.
    respostas = []
    bloco = ""
    if "Resposta social" in t:
        bloco = t[t.index("Resposta social"):]
        for fim in ("Última Atualização Certificações", "Última Atualização"):
            if fim in bloco:
                bloco = bloco[bloco.index(fim) + len(fim):]
                break
        for rodape in ("© DGSSS", "Desenvolvido por"):
            if rodape in bloco:
                bloco = bloco[:bloco.index(rodape)]

    # linha = NOME  CAPACIDADE  UTENTES  HORÁRIO(ou "-")  DATA
    padrao = re.compile(
        r"([A-ZÀ-ÚÇ][A-Za-zÀ-ÿ\s()/,.'’-]{2,70}?)\s+(\d{1,4})\s+(\d{1,4})\s+"
        r"(\d{1,2}[:h]\d{2}\s*-\s*\d{1,2}[:h]\d{2}|-|)\s*(\d{4}-\d{2}-\d{2})")
    for m in padrao.finditer(bloco):
        nome = re.sub(r"\s+", " ", m.group(1)).strip(" .:-")
        if len(nome) < 3:
            continue
        horario = (m.group(4) or "").strip()
        respostas.append({
            "resposta": nome,
            "capacidade": int(m.group(2)),
            "utentes": int(m.group(3)),
            "horario": horario if horario and horario != "-" else None,
            "atualizado": m.group(5),
        })

    return {
        "nome": campo("ui-button") or None,
        "morada": (campo("Morada") or "").strip() or None,
        "codigo_postal": m_cp.group(1) if m_cp else None,
        "localidade": re.sub(r"^\d{4}-\d{3}\s*", "", cp).strip() or None,
        "telefone": telefones[0] if telefones else None,
        "telefones": telefones or None,
        "email": emails[0].lower() if emails else None,
        "entidade": (campo("Entidade proprietária") or "").strip() or None,
        "natureza_juridica": (campo("Natureza Jurídica") or "").strip() or None,
        "respostas": respostas or None,
    }


def alvos(argv, dados):
    lista = []
    if "--cruzados" in argv:
        cruz = json.load(open("dados/carta-social-cruzamento-aml.json", encoding="utf-8"))
        itens = cruz if isinstance(cruz, list) else cruz.get("matches", [])
        for m in itens:
            cid = str(m.get("cs_id") or m.get("carta_social_id") or "")
            if cid:
                lista.append({"cs_id": cid, "cs_nome": m.get("cs_nome"),
                              "nosso_id": m.get("id") or m.get("nosso_id")})
    if "--nacional" in argv:
        # Todos os equipamentos identificados no varrimento nacional.
        nac = json.load(open("dados/carta-social-nacional.json", encoding="utf-8"))
        for slug, c in nac["concelhos"].items():
            for e in c.get("equip", []):
                lista.append({"cs_id": str(e["id"]), "cs_nome": e.get("nome"),
                              "concelho": c.get("concelho"),
                              "freguesia": e.get("freguesia"),
                              "distrito": c.get("distrito")})

    if "--em-falta" in argv or not lista:
        falta = json.load(open("dados/creches-oficiais-em-falta-aml.json", encoding="utf-8"))
        for m in falta["creches"]:
            lista.append({"cs_id": str(m["cs_id"]), "cs_nome": m.get("cs_nome"),
                          "concelho": m.get("concelho"), "freguesia": m.get("freguesia")})

    vistos, unicos = set(), []
    for m in lista:
        if m["cs_id"] in vistos or m["cs_id"] in dados["equipamentos"]:
            continue
        vistos.add(m["cs_id"])
        unicos.append(m)
    return unicos


def main():
    argv = sys.argv[1:]
    dados = {"fonte": "cartasocial.pt (DGSSS) — ficha de equipamento", "equipamentos": {}}
    if os.path.exists(OUT) and "--refazer" not in argv:
        dados = json.load(open(OUT, encoding="utf-8"))

    pendentes = alvos(argv, dados)
    if "--so" in argv:
        pendentes = pendentes[:int(argv[argv.index("--so") + 1])]

    print(f"{len(dados['equipamentos'])} já feitos · {len(pendentes)} neste lote")
    if not pendentes:
        return

    fetch("https://www.cartasocial.pt/inicio")      # abre sessão

    ok = falhas = 0
    for i, alvo in enumerate(pendentes, 1):
        cid = alvo["cs_id"]
        d = parse(fetch(DETALHE.format(cid)))
        if not d:
            falhas += 1
            print(f"  [{i}/{len(pendentes)}] {cid:>7} ✗ sem ficha")
        else:
            d.update({k: v for k, v in alvo.items() if k != "cs_id"})
            dados["equipamentos"][cid] = d
            ok += 1
            creche = next((r for r in (d.get("respostas") or []) if "creche" in r["resposta"].lower()), None)
            extras = []
            if d.get("telefone"): extras.append("tel")
            if d.get("email"): extras.append("email")
            if d.get("codigo_postal"): extras.append("CP")
            if creche and creche.get("horario"): extras.append("horário")
            print(f"  [{i}/{len(pendentes)}] {cid:>7} ✓ {str(d.get('cs_nome') or d.get('nome'))[:38]:<38} "
                  f"{'·'.join(extras)}")

        if i % 10 == 0 or i == len(pendentes):
            gravar(dados, OUT)
        time.sleep(PAUSA)

    gravar(dados, OUT)
    tot = dados["equipamentos"]
    print(f"\n✓ {ok} obtidos · {falhas} sem ficha · {len(tot)} no total")
    print(f"  com telefone : {sum(1 for v in tot.values() if v.get('telefone'))}")
    print(f"  com email    : {sum(1 for v in tot.values() if v.get('email'))}")
    print(f"  com CP       : {sum(1 for v in tot.values() if v.get('codigo_postal'))}")
    com_horario = sum(1 for v in tot.values()
                      if any(r.get("horario") for r in (v.get("respostas") or [])))
    print(f"  com horário  : {com_horario}")


if __name__ == "__main__":
    main()
