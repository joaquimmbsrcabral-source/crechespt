#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pergunta ao servidor do Ministério se cada caixa @escolas.min-edu.pt existe.

Porquê: 1.130 creches no dataset têm como único contacto um endereço
@escolas.min-edu.pt — alias antigos da altura em que havia protocolo com o
Ministério. A suspeita é que muitas destas creches criaram entretanto o seu
próprio email e a caixa do Ministério ficou abandonada, ou nunca existiu.

Como se verifica sem enviar nada: o protocolo SMTP tem um passo (RCPT TO) em
que o servidor diz se aceita o destinatário, antes de qualquer mensagem ser
transmitida. Confirmou-se que o servidor do min-edu (Google Workspace) responde
550 a contas inexistentes e 250 às reais — não é catch-all. Nenhum email é
enviado: a sessão é abortada antes do DATA.

O que isto prova e o que não prova:
  · 550 → a caixa NÃO existe. Tudo o que lá foi parar rebentou. É definitivo.
  · 250 → a caixa existe. NÃO diz que alguém a lê. É o limite deste método.

Cortesia: uma sondagem a cada 0,6s, ligação nova a cada 40, e paragem imediata
se o servidor começar a responder 421/450 (sinal de que está a limitar). É a
mesma quantidade de tráfego que teria enviar-lhes a todos um email — só que sem
lhes entupir as caixas.

Uso:
  python3 scripts/verificar_caixas_minedu.py --so 200   # lote
  python3 scripts/verificar_caixas_minedu.py            # continua até ao fim

Retoma onde ficou. Saída: dados/caixas-minedu.json
"""
import json, os, smtplib, subprocess, sys, time

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)

OUT = "dados/caixas-minedu.json"
DOMINIO = "escolas.min-edu.pt"
PAUSA = 0.6
POR_LIGACAO = 40
REMETENTE = "verificacao@creches.app"


def gravar(d):
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
        f.flush(); os.fsync(f.fileno())
    os.replace(tmp, OUT)


def servidor():
    r = subprocess.run(["dig", "+short", "MX", DOMINIO], capture_output=True, text=True)
    mx = sorted((int(l.split()[0]), l.split()[1].rstrip(".")) for l in r.stdout.strip().split("\n") if l)
    return mx[0][1]


def main():
    argv = sys.argv[1:]
    dados = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}

    bruto = json.load(open("creches_pt.json", encoding="utf-8"))
    lista = bruto if isinstance(bruto, list) else bruto["creches"]
    alvos = []
    for c in lista:
        e = str(c.get("email") or "").split(";")[0].strip().lower()
        if e.endswith("@" + DOMINIO) and e not in dados:
            alvos.append(e)
    alvos = sorted(set(alvos))
    if "--so" in argv:
        alvos = alvos[: int(argv[argv.index("--so") + 1])]

    print(f"{len(dados)} já verificadas · {len(alvos)} neste lote")
    if not alvos:
        n = sum(1 for v in dados.values() if v == "nao_existe")
        print(f"✓ completo — {n} de {len(dados)} caixas NÃO existem")
        return

    mx = servidor()
    s = None
    feitas = 0
    try:
        for i, e in enumerate(alvos, 1):
            if s is None or feitas % POR_LIGACAO == 0:
                if s:
                    try: s.quit()
                    except Exception: pass
                s = smtplib.SMTP(mx, 25, timeout=20)
                s.ehlo("creches.app"); s.mail(REMETENTE)
            try:
                cod, _ = s.rcpt(e)
            except Exception:
                s = None; feitas = 0; time.sleep(3); continue

            if cod == 250:
                dados[e] = "existe"
            elif cod in (550, 551, 553):
                dados[e] = "nao_existe"
            elif cod in (421, 450, 451, 452):
                print(f"  ⚠ servidor a limitar ({cod}) — a parar por hoje")
                break
            else:
                dados[e] = f"indeterminado_{cod}"

            feitas += 1
            if i % 25 == 0 or i == len(alvos):
                gravar(dados)
                mortas = sum(1 for v in dados.values() if v == "nao_existe")
                print(f"  [{i}/{len(alvos)}] {len(dados)} verificadas · {mortas} não existem")
            time.sleep(PAUSA)
    finally:
        gravar(dados)
        if s:
            try: s.quit()
            except Exception: pass

    mortas = sum(1 for v in dados.values() if v == "nao_existe")
    print(f"\n✓ {len(dados)} caixas verificadas · {mortas} não existem "
          f"({mortas * 100 // max(len(dados), 1)}%)")


if __name__ == "__main__":
    main()
