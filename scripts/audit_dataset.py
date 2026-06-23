#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Auditoria do dataset Creches.app — identifica problemas para correção no /admin.
Correr da raiz do projeto: python3 scripts/audit_dataset.py > audit-report.md
"""
import json, re, math, sys, unicodedata
from collections import Counter, defaultdict

# Caixa delimitadora aproximada de Portugal continental + ilhas
PT_BOUNDS = {
    "cont": dict(lat_min=36.9, lat_max=42.2, lon_min=-9.6, lon_max=-6.2),
    "acores": dict(lat_min=36.8, lat_max=39.8, lon_min=-31.4, lon_max=-25.0),
    "madeira": dict(lat_min=32.4, lat_max=33.2, lon_min=-17.4, lon_max=-16.2),
}

def is_in_pt(lat, lon):
    if lat is None or lon is None: return False
    for r in PT_BOUNDS.values():
        if r["lat_min"] <= lat <= r["lat_max"] and r["lon_min"] <= lon <= r["lon_max"]:
            return True
    return False

def norm(s):
    if not s: return ""
    s = unicodedata.normalize("NFKD", s).encode("ascii","ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "", s)

def clean_phone(p):
    if not p: return None
    digits = re.sub(r"\D", "", p)
    return digits

def is_valid_pt_phone(p):
    """Telefones PT: 9 dígitos começando 2 (fixo) ou 9 (móvel). Aceita +351 prefix."""
    if not p: return False
    digits = clean_phone(p)
    if digits.startswith("351"): digits = digits[3:]
    if len(digits) != 9: return False
    return digits[0] in ("2", "9")

def is_valid_email(e):
    if not e: return False
    return bool(re.match(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$", e.strip()))

# ============================================================
# Carregar dataset
# ============================================================
try:
    data = json.load(open("creches_pt.json", encoding="utf-8"))
except FileNotFoundError:
    print("ERRO: creches_pt.json não encontrado. Correr da raiz do projeto.")
    sys.exit(1)

total = len(data)

# ============================================================
# Checks
# ============================================================
issues = defaultdict(list)

# Heurísticas de nomes suspeitos
LIXO_PATTERNS = [
    (r"^\s*$", "nome vazio"),
    (r"^[\W_]+$", "só símbolos"),
    (r"\b(inactiv|inativ|encerrad|fechad|extinct)\w*\b", "marcador de encerrada"),
    (r"\b(datacool|test|teste|dummy|sample|xpto|aaa+)\b", "nome de teste"),
    (r"^\s*[a-z]{1,3}\s*$", "muito curto (≤3 chars)"),
    (r"^[0-9]+$", "só números"),
    (r"\b(escola\s*b[aá]sica|^eb\b|agrupamento\s*de\s*escolas)", "Escola Básica (não creche)"),
    (r"\b(ginas|cresc|barbe|cafe|caf[eé]\b)\b", "possivelmente não-creche"),
]

# Padrões de morada suspeitos
MORADA_LIXO = [
    (r"^\s*$", "morada vazia"),
    (r"^\s*[\W_]+\s*$", "morada só símbolos"),
    (r"^.{1,8}$", "morada muito curta"),
]

# ============================================================
# Iterar
# ============================================================
for c in data:
    cid = c.get("id", "?")
    nome = (c.get("nome") or "").strip()
    tel = c.get("telefone") or ""
    em = c.get("email") or ""
    morada = (c.get("morada") or "").strip()
    lat = c.get("lat")
    lon = c.get("lon")
    tipo = c.get("tipo") or "Desconhecido"
    distrito = c.get("distrito") or ""
    idade_min = c.get("idade_min_meses")
    idade_max = c.get("idade_max_meses")
    cp = (c.get("codigo_postal") or "").strip()

    # 1. Nome suspeito
    nome_l = nome.lower()
    for pattern, label in LIXO_PATTERNS:
        if re.search(pattern, nome_l):
            issues["nome_suspeito"].append({"id":cid,"nome":nome,"razao":label,"distrito":distrito})
            break

    # 2. Telefone inválido (mas presente)
    if tel and not is_valid_pt_phone(tel):
        issues["telefone_invalido"].append({"id":cid,"nome":nome,"tel":tel,"distrito":distrito})

    # 3. Email mal formatado
    if em and not is_valid_email(em):
        issues["email_invalido"].append({"id":cid,"nome":nome,"email":em,"distrito":distrito})

    # 4. Coordenadas fora de Portugal
    if lat is None or lon is None:
        issues["coordenadas_em_falta"].append({"id":cid,"nome":nome,"distrito":distrito})
    elif not is_in_pt(lat, lon):
        issues["coordenadas_fora_pt"].append({"id":cid,"nome":nome,"lat":lat,"lon":lon,"distrito":distrito})

    # 5. Sem qualquer contacto (tel + email + site vazios)
    if not tel and not em and not c.get("website"):
        issues["sem_contactos"].append({"id":cid,"nome":nome,"distrito":distrito})

    # 6. Tipo não classificado
    if tipo in ("Desconhecido", "", None, "?"):
        issues["tipo_desconhecido"].append({"id":cid,"nome":nome,"distrito":distrito})

    # 7. Idades em falta
    if idade_min is None and idade_max is None:
        issues["idades_em_falta"].append({"id":cid,"nome":nome,"distrito":distrito})

    # 8. Idade fora de range razoável (0-156 meses = 13 anos)
    for label, v in [("min", idade_min), ("max", idade_max)]:
        if v is not None and (v < 0 or v > 156):
            issues["idade_fora_range"].append({"id":cid,"nome":nome,"campo":label,"valor":v})

    # 9. Min > Max
    if idade_min is not None and idade_max is not None and idade_min > idade_max:
        issues["idades_invertidas"].append({"id":cid,"nome":nome,"min":idade_min,"max":idade_max})

    # 10. Distrito em falta ou ALL CAPS
    if not distrito:
        issues["distrito_em_falta"].append({"id":cid,"nome":nome})
    elif distrito.isupper() and len(distrito) > 3:
        issues["distrito_caps"].append({"id":cid,"nome":nome,"distrito":distrito})

    # 11. Código postal mal formatado (PT: XXXX-XXX)
    if cp and not re.match(r"^\d{4}-\d{3}$", cp):
        issues["cp_invalido"].append({"id":cid,"nome":nome,"cp":cp})

# ============================================================
# Duplicados (mesmo nome normalizado + mesmo concelho/distrito)
# ============================================================
dup_map = defaultdict(list)
for c in data:
    key = (norm(c.get("nome","")), c.get("distrito",""), c.get("localidade",""))
    if key[0]:  # ignorar nomes vazios
        dup_map[key].append({"id":c.get("id"),"nome":c.get("nome"),"distrito":c.get("distrito"),"localidade":c.get("localidade")})

for key, lst in dup_map.items():
    if len(lst) > 1:
        issues["duplicados"].append({"key":" / ".join(filter(None,key)),"count":len(lst),"creches":lst})

# ============================================================
# Output relatório markdown
# ============================================================
print(f"# Auditoria do Dataset Creches.app")
print(f"\n**Data:** 22 Junho 2026")
print(f"**Total de creches analisadas:** {total:,}".replace(",", "."))
print(f"\n> ⚠️ Este relatório só audita as **{total}** creches do `creches_pt.json` (OSM).")
print(f"> As **270 novas via Carta Social** estão no Firestore — auditar via /admin com mesmos critérios.")

# Resumo
print(f"\n---\n\n## 📊 Resumo")
print(f"\n| Problema | Casos | % do total |")
print(f"|---|---:|---:|")
order = [
    "nome_suspeito","telefone_invalido","email_invalido",
    "coordenadas_em_falta","coordenadas_fora_pt","sem_contactos",
    "tipo_desconhecido","idades_em_falta","idade_fora_range","idades_invertidas",
    "distrito_em_falta","distrito_caps","cp_invalido","duplicados"
]
LABELS = {
    "nome_suspeito":"🏷 Nome suspeito",
    "telefone_invalido":"📞 Telefone inválido",
    "email_invalido":"✉ Email mal formatado",
    "coordenadas_em_falta":"📍 Coordenadas em falta",
    "coordenadas_fora_pt":"🌍 Coordenadas fora PT",
    "sem_contactos":"🚫 Sem qualquer contacto",
    "tipo_desconhecido":"❓ Tipo desconhecido",
    "idades_em_falta":"🎂 Idades em falta",
    "idade_fora_range":"⚠️ Idade fora 0-156 meses",
    "idades_invertidas":"🔄 Idade min > max",
    "distrito_em_falta":"🗺 Distrito em falta",
    "distrito_caps":"🔠 Distrito em CAPS",
    "cp_invalido":"📮 Código postal inválido",
    "duplicados":"♊ Possíveis duplicados (mesmo nome+localidade)",
}
for k in order:
    n = len(issues[k])
    pct = (n / total * 100) if total else 0
    print(f"| {LABELS[k]} | **{n}** | {pct:.1f}% |")

# Detalhes por categoria (top 20 cada)
for k in order:
    lst = issues[k]
    if not lst: continue
    print(f"\n---\n\n## {LABELS[k]} ({len(lst)})")
    if len(lst) > 20:
        print(f"\n*Mostrando 20 de {len(lst)}. Lista completa via export JSON.*\n")
    if k == "duplicados":
        for d in lst[:20]:
            print(f"\n**{d['key']}** ({d['count']} creches):")
            for c in d['creches']:
                print(f"  - `{c['id']}` — {c['nome']} ({c.get('localidade','?')})")
    else:
        # tabela
        if not lst: continue
        sample = lst[0]
        cols = [c for c in ["id","nome","tel","email","lat","lon","cp","valor","campo","razao","min","max","distrito","localidade"] if c in sample]
        print(f"\n| {' | '.join(cols)} |")
        print(f"| {' | '.join(['---']*len(cols))} |")
        for item in lst[:20]:
            vals = []
            for c in cols:
                v = item.get(c, "")
                v = str(v).replace("|","\\|").replace("\n"," ")
                if len(v) > 60: v = v[:57] + "..."
                vals.append(v)
            print(f"| {' | '.join(vals)} |")

# Sugestões de acção
print(f"\n---\n\n## 🎯 Top 5 acções recomendadas\n")
recs = []
if len(issues["nome_suspeito"]) > 5:
    recs.append(("Esconder/remover creches com nomes suspeitos", "/admin → bulk delete por ID lista nome_suspeito"))
if len(issues["sem_contactos"]) > 10:
    recs.append(("Tentar enriquecer creches sem contactos via Google Search", "Script externo de geocoding/enrichment"))
if len(issues["tipo_desconhecido"]) > 50:
    recs.append(("Reclassificar tipo dos 'Desconhecido' via heurística do nome", "Reusar lógica de reclassificação"))
if len(issues["idades_em_falta"]) > 100:
    recs.append(("Inferir idades a partir da resposta/categoria_osm", "Algoritmo idades v5"))
if len(issues["duplicados"]) > 0:
    recs.append(("Fundir duplicados manualmente no /admin", f"{len(issues['duplicados'])} pares de duplicados detectados"))

for i, (rec, how) in enumerate(recs[:5], 1):
    print(f"{i}. **{rec}**\n   → {how}\n")
