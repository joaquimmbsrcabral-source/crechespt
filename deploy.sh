#!/bin/bash
# deploy.sh — Creches.app
# Uso:  ./deploy.sh "mensagem do commit"
# Ex:   ./deploy.sh "rebrand creches.app"

set -e
cd "$(dirname "$0")"

# Mensagem por defeito
MSG="${1:-deploy: alterações automáticas}"

# ── Regenerar o que depende do dataset ─────────────────────────────────────
# Sem isto, o mapa, as fichas e as páginas de concelho ficam a servir dados
# antigos sem ninguém dar por isso — já aconteceu (o mapa esteve 18 dias
# desactualizado e escondeu 171 creches confirmadas na Carta Social).
# Para saltar num deploy rápido só de texto: ./deploy.sh "msg" --sem-gerar
if [ "$2" != "--sem-gerar" ]; then
  echo "🔄 A regenerar a partir do dataset..."
  python3 scripts/gerar_fichas.py           > /dev/null && echo "  ✓ fichas"
  python3 scripts/gerar_concelhos.py        > /dev/null && echo "  ✓ concelhos"
  python3 scripts/gerar_horario_alargado.py --limpar-orfas > /dev/null && echo "  ✓ horário alargado"
  python3 scripts/atualizar_distritos.py    > /dev/null && echo "  ✓ distritos"
  python3 scripts/atualizar_creches_index.py > /dev/null && echo "  ✓ /creches (números)"
  python3 scripts/atualizar_sitemap_index.py> /dev/null && echo "  ✓ sitemaps"
  python3 scripts/atualizar_dataset_app.py   || exit 1

  # O mapa lê um dataset embutido no app.html. Se divergir do ficheiro, o site
  # mostra dados que já corrigimos — o erro mais caro e mais silencioso que houve.
  python3 - <<'EOF' || { echo "❌ app.html desactualizado — corre a regeneração do dataset embutido"; exit 1; }
import re, io, json, gzip, base64, sys
h = io.open("app.html", encoding="utf-8").read()
m = re.search(r'<script[^>]*id=["\']dataset["\'][^>]*>(.*?)</script>', h, re.S)
emb = json.loads(gzip.decompress(base64.b64decode(m.group(1).strip())))
cur = json.load(io.open("creches_pt.json", encoding="utf-8"))
cur = cur if isinstance(cur, list) else cur["creches"]
cur = [c for c in cur if not c.get("oculto_duplicado")]   # gémeos não são pinos
ci = {c["id"]: c for c in cur}
dif = sum(1 for e in emb for k in ("idade_min_meses","tipo","concelho","email","telefone")
          if ci.get(e["id"]) and e.get(k) != ci[e["id"]].get(k))
if dif or len(emb) != len(cur):
    print("  ✗ mapa difere do dataset em %d campos" % dif); sys.exit(1)
print("  ✓ mapa coerente com o dataset")
EOF
fi

# Remove lock se ficou pendurado
rm -f .git/index.lock 2>/dev/null || true

# Stage tudo
git add -A

# Verifica se há mudanças para commitar
if git diff --staged --quiet; then
  echo "ℹ️  Nada para commitar."
else
  git commit -m "$MSG"
  echo "✅ Commit feito: $MSG"
fi

# Push para o GitHub (Vercel deteta e faz auto-deploy em ~30s)
echo "📤 A enviar para o GitHub..."
git push

echo ""
echo "✅ Pronto. A Vercel vai re-deployar em ~30 segundos."
echo "🔗 https://creches.app"
