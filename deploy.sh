#!/bin/bash
# deploy.sh — Creches.app
# Uso:  ./deploy.sh "mensagem do commit"
# Ex:   ./deploy.sh "rebrand creches.app"

set -e
cd "$(dirname "$0")"

# Mensagem por defeito
MSG="${1:-deploy: alterações automáticas}"

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
