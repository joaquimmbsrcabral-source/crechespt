#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Normalizador do horário de funcionamento — partilhado pelos geradores.

Porque existe em módulo próprio: o mesmo critério de "horário alargado" tem de
valer nas fichas, nas páginas de concelho e no mapa. Se cada gerador tivesse a
sua cópia, bastava um deles ficar para trás para prometermos ao pai uma coisa
na ficha e outra no mapa. O equivalente em JavaScript vive no app.html
(HorarioUtil) e tem de ser mudado ao mesmo tempo que este ficheiro.

O campo `horario` vem da Carta Social no formato "7:30 - 19:30". Nos 5.543
registos extraídos o formato é uniforme, mas isso é uma propriedade do
extractor de hoje, não uma garantia: quando o horário passar a ser editado
pelas creches no /painel vai chegar "7h30", "07:30-19:30" e espaços a mais.
Daí o parsing ser tolerante — e devolver None em vez de rebentar.
"""
import re

# ── Critério de "horário alargado" ───────────────────────────────────────────
# Fecho às 19:00 ou depois, OU abertura às 7:30 ou antes.
#
# Porquê estes limites, e porquê OR e não AND:
#
# · 19:00 no fecho — o caso que motivou a funcionalidade são os colaboradores do
#   retalho que fecham loja às 18h30. Uma creche que feche às 18h30 não lhes
#   serve: chegariam à porta à hora a que ela fecha. 19:00 é o primeiro degrau
#   que dá a essa família meia hora real de deslocação.
#
# · 7:30 na abertura — o turno da manhã do retalho entra às 8h/8h30. Quem tem de
#   deixar a criança e ainda chegar à loja precisa de portas abertas antes das
#   7h30; às 8:00 já está atrasado.
#
# · OR e não AND — uma família de turnos precisa de UMA das duas pontas, não das
#   duas. Quem faz turno da tarde precisa que feche tarde e não se importa que
#   abra às 8h30; quem faz turno da manhã precisa do contrário. Exigir as duas
#   pontas ao mesmo tempo esconderia creches que resolvem o problema real.
#
# Nota honesta sobre o que isto filtra: entre os 427 registos com horário
# confirmado, 374 (88%) cumprem o critério. Ou seja, o critério em si é
# permissivo — o que torna o filtro seletivo é a cobertura dos dados, não o
# limite escolhido. Na prática o chip responde a "creches em que SABEMOS que o
# horário é alargado" (374 de 2.952). Nunca marcar como alargada uma creche sem
# horário confirmado: seria enviar um pai de turnos a uma creche que fecha às 18h.
ABERTURA_CEDO_MAX = 7 * 60 + 30   # 7:30
FECHO_TARDE_MIN = 19 * 60         # 19:00

# Aceita "7:30", "07:30", "7h30", "7.30" e "7" (hora certa, sem minutos).
_RX_HORA = re.compile(r"(\d{1,2})\s*(?:[:hH.,]\s*(\d{1,2}))?")

# Rótulo da proveniência. Só afirmamos a fonte quando a conhecemos — sem isto,
# um horário editado pela creche apareceria como "confirmado na Carta Social".
FONTES = {
    "carta_social": "horário confirmado na Carta Social",
    "painel": "horário indicado pela creche",
    "creche": "horário indicado pela creche",
}


def _minutos(hora, minuto):
    """Minutos desde a meia-noite, ou None se a hora não fizer sentido."""
    try:
        h = int(hora)
        m = int(minuto) if minuto else 0
    except (TypeError, ValueError):
        return None
    if not (0 <= h <= 23) or not (0 <= m <= 59):
        return None
    return h * 60 + m


def normalizar_horario(bruto, fonte=None):
    """Devolve um dict com o horário normalizado, ou None se não der para ler.

    {"abertura": 450, "fecho": 1170, "texto": "7:30 – 19:30",
     "abre_cedo": True, "fecha_tarde": True, "alargado": True,
     "fonte_txt": "horário confirmado na Carta Social"}
    """
    if not bruto or not isinstance(bruto, str):
        return None
    pares = [p for p in _RX_HORA.findall(bruto) if p[0] != ""]
    if len(pares) < 2:
        return None
    abertura = _minutos(*pares[0])
    fecho = _minutos(*pares[1])
    if abertura is None or fecho is None:
        return None
    # Um fecho anterior à abertura significa que lemos mal a string (ou que o
    # registo está trocado). Preferimos não mostrar nada a mostrar disparate.
    if fecho <= abertura:
        return None
    abre_cedo = abertura <= ABERTURA_CEDO_MAX
    fecha_tarde = fecho >= FECHO_TARDE_MIN
    return {
        "abertura": abertura,
        "fecho": fecho,
        "texto": "{}:{:02d} – {}:{:02d}".format(
            abertura // 60, abertura % 60, fecho // 60, fecho % 60),
        "abre_cedo": abre_cedo,
        "fecha_tarde": fecha_tarde,
        "alargado": abre_cedo or fecha_tarde,
        "fonte_txt": FONTES.get(fonte or "", ""),
    }


def horario_da_creche(c):
    """Atalho para o formato do dataset (campos `horario` e `horario_fonte`)."""
    return normalizar_horario(c.get("horario"), c.get("horario_fonte"))


def tem_horario_alargado(c):
    h = horario_da_creche(c)
    return bool(h and h["alargado"])


def texto_selo(h):
    """Frase do selo, ajustada ao que os dados dizem mesmo.

    Uma creche que só fecha tarde não "abre cedo" — dizê-lo seria inventar.
    """
    if not h or not h["alargado"]:
        return ""
    fecho = "{}h{:02d}".format(h["fecho"] // 60, h["fecho"] % 60)
    abertura = "{}h{:02d}".format(h["abertura"] // 60, h["abertura"] % 60)
    if h["abre_cedo"] and h["fecha_tarde"]:
        return ("Abre às {} e fecha às {} — útil para quem trabalha por turnos "
                "e não consegue chegar antes das 18h30.".format(abertura, fecho))
    if h["fecha_tarde"]:
        return ("Fecha às {} — tarde o suficiente para quem sai do trabalho "
                "depois das 18h30.".format(fecho))
    return ("Abre às {} — cedo o suficiente para quem entra ao serviço às 8h."
            .format(abertura))
