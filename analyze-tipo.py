#!/usr/bin/env python3
"""
Análise: quantas creches mudariam de tipo se aplicássemos as regras
da Carta Social (IPSS markers).

Não modifica nada — só relata.
"""
import gzip, base64, json, re
from collections import Counter

with open('app.html') as f:
    html = f.read()

m = re.search(r'<script[^>]*id="dataset"[^>]*>(.*?)</script>', html, re.DOTALL)
data = json.loads(gzip.decompress(base64.b64decode(m.group(1).strip())))

print(f"Total creches: {len(data)}\n")

# ============ REGRAS DE CLASSIFICAÇÃO ============

# IPSS markers (alta confiança) — instituições particulares de solidariedade
IPSS_MARKERS = [
    'santa casa', 'misericórdia', 'misericordia',
    'centro social', 'centro paroquial', 'centro pastoral',
    'centro comunitário', 'centro comunitario',
    'centro de bem estar', 'centro de bem-estar',
    'centro infantil',
    'centro de apoio', 'centro de assistência', 'centro de assistencia',
    'centro de educação', 'centro de educacao',
    'centro educativo',
    'associação', 'associacao',
    'fundação', 'fundacao',
    'cooperativa',
    'cáritas', 'caritas',
    'casa do povo',
    'casa da criança', 'casa da crianca',
    'irmandade',
    'obra social',
    'patronato',
    'paroquial',
    ' ipss',
    'instituição particular', 'instituicao particular',
    'cruz vermelha',
    'cresc',  # cresce, crescer, etc usados em IPSS
    'lar de jesus',
    'congregação', 'congregacao',
    'soc filarmónica', 'sociedade filarmónica',
    'so casa', 'sociedade casa',
    'sociedade beneficência', 'sociedade beneficencia',
    'casa de saúde',
    'apexa',
]

# Pública markers (alta confiança) — estabelecimentos do Estado
PUBLICA_MARKERS = [
    'eb1/ji', 'eb1ji', 'eb-1/ji', 'eb 1/ji',
    'eb 1,2,3', 'eb1,2,3', 'eb2,3', 'eb 2,3',
    'agrupamento de escolas',
    'agrupamento vertical',
    'agrupamento horizontal',
    'ji n.º', 'ji nº', 'ji n. º',
    'jardim de infância n.º', 'jardim de infancia n.º',
    'jardim de infância n.', 'jardim de infancia n.',
    'jardim de infância nº', 'jardim de infancia nº',
    'escola básica', 'escola basica',
    ' eb1 ', ' eb 1 ',
    'pré-escolar público', 'pre-escolar publico',
    'creche municipal',
    'jardim municipal',
    'câmara municipal', 'camara municipal',
    'autarquia',
]

# Privada markers
PRIVADA_MARKERS = [
    'colégio', 'colegio',
    'externato',
    ' international ', ' internacional ',
    ' school ', ' kindergarten ',
    ' academy ',
    'bilingual',
    'baby development',
    'kinder',
    'pestalozzi',
    'montessori',
    'waldorf',
    'creche privada',
    'st.', 'saint ',
]


def classify(c):
    """Devolve novo tipo OU None se não houver match forte."""
    nome = (c.get('nome') or '').lower()
    operador = (c.get('operador') or '').lower()
    blob = f" {nome} {operador} "

    # Ordem importa — IPSS tem precedência se houver sinal forte
    for marker in IPSS_MARKERS:
        if marker in blob:
            return ('IPSS', marker)

    for marker in PUBLICA_MARKERS:
        if marker in blob:
            return ('Pública', marker)

    for marker in PRIVADA_MARKERS:
        if marker in blob:
            return ('Privada', marker)

    return (None, None)


# ============ ANÁLISE ============

before = Counter()
after = Counter()
changes = []
markers_hit = Counter()
no_match = []

for c in data:
    old = c.get('tipo', 'Desconhecido')
    before[old] += 1

    new, marker = classify(c)
    if new:
        markers_hit[marker] += 1
        if new != old:
            changes.append({
                'nome': c.get('nome', '(sem nome)'),
                'distrito': c.get('distrito', ''),
                'old': old,
                'new': new,
                'marker': marker,
            })
        after[new] += 1
    else:
        # Sem match — mantém o que estava
        after[old] += 1
        if old in ('Pública', 'Privada'):
            no_match.append(c.get('nome', '(sem nome)'))

# ============ RELATÓRIO ============

print("="*60)
print("ANTES vs DEPOIS")
print("="*60)
print(f"{'Tipo':<15} {'Antes':>8} {'Depois':>8} {'Δ':>8}")
print("-"*45)
for t in ['Pública', 'IPSS', 'Privada', 'Desconhecido']:
    b = before.get(t, 0)
    a = after.get(t, 0)
    delta = a - b
    arrow = '↑' if delta > 0 else ('↓' if delta < 0 else '·')
    print(f"{t:<15} {b:>8} {a:>8} {arrow}{abs(delta):>7}")

print(f"\nTotal mudanças: {len(changes)}")
print(f"Sem match (mantém tipo original): {len(data) - sum(markers_hit.values())}")

print("\n" + "="*60)
print("TOP 20 MARKERS MAIS USADOS")
print("="*60)
for marker, count in markers_hit.most_common(20):
    print(f"  {count:>4}  '{marker}'")

print("\n" + "="*60)
print("AMOSTRAS DE MUDANÇAS (primeiras 30)")
print("="*60)
for ch in changes[:30]:
    arrow = f"{ch['old']:<12} → {ch['new']:<10}"
    print(f"  [{ch['distrito'][:10]:<10}] {arrow}  {ch['nome'][:60]}  (marker: '{ch['marker']}')")

# Salvar lista completa de mudanças
with open('/tmp/changes.json', 'w') as f:
    json.dump(changes, f, ensure_ascii=False, indent=2)
print(f"\n✓ {len(changes)} mudanças salvas em /tmp/changes.json")
