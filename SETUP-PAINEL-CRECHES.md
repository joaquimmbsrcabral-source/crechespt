# Painel das Creches — o que foi construído + passos manuais

**Data:** Julho 2026 · Onda 34

## O que existe agora

**`/painel`** — área reservada das creches (nova página):
1. **Login** — Google ou email+password (com criar conta e recuperar password)
2. **Reclamar creche** — pesquisa no dataset, escolhe a sua, pede acesso
   (nome, cargo, telefone) → fica *pendente*
3. **Dashboard** (após aprovares no /admin):
   - 🟢 **Vagas em tempo real** — 3 toggles (berçário, 1-2, 2-3 anos)
   - 🍼 **Creche Feliz** — sim / não / em processo
   - 📝 **Perfil** — descrição, horário, mensalidades, contactos, website
   - 📷 **Fotografias** — upload (máx. 5MB), ficam pendentes até aprovares

**`/admin`** — duas secções novas:
- 🏫 **Pedidos de acesso** — aprovar/rejeitar (aprova = creche ganha o painel)
- 📷 **Fotos por rever** — aprovar publica na ficha; rejeitar esconde

**Fichas públicas (2.578)** — novo cartão verde "✓ INFORMAÇÃO DA CRECHE"
com vagas, Creche Feliz, mensalidade, descrição, fotos e contactos —
aparece automaticamente assim que a creche preenche algo.

**`/para-creches`** — banner novo a apontar para o /painel.

## Modelo de dados (Firestore)

| Coleção | Quem escreve | Quem lê |
|---|---|---|
| `creche_claims` | creche (create) | própria + admin |
| `creche_managers/{uid}` | **só admin** (ao aprovar) | próprio + admin |
| `creche_profiles/{creche_id}` | gestor aprovado + admin | **público** |
| `creche_fotos` | gestor (status=pending) | próprio + admin |

Campo `fotos` do perfil: **só o admin** escreve (ao aprovar uma foto).

## ⚠️ PASSOS MANUAIS OBRIGATÓRIOS (antes de funcionar)

1. **Deploy das regras Firestore** — no terminal:
   ```
   firebase deploy --only firestore:rules
   ```
   (ou copiar o conteúdo de `firestore.rules` para a consola Firebase
   → Firestore → Rules → Publish)

2. **Ativar Email/Password no Firebase Auth**:
   Consola Firebase → Authentication → Sign-in method →
   **Email/Palavra-passe → Ativar** (o Google já está ativo)

3. **Ativar Firebase Storage** (para as fotos):
   Consola Firebase → Storage → Get Started (região europe-west) →
   depois colar o conteúdo de `storage.rules` em Storage → Rules → Publish
   > Sem este passo, tudo funciona exceto o upload de fotos
   > (o painel mostra um erro amigável).

4. **Deploy do site**: `./deploy.sh "feat: painel das creches (Onda 34)"`

## Fluxo completo (para testares)

1. Abre `creches.app/painel` em modo anónimo → cria conta de teste
2. Pesquisa uma creche → pede acesso
3. No `/admin` → secção 🏫 → **Aprovar**
4. Volta ao `/painel` (refresh) → dashboard aberto
5. Marca uma vaga + escreve descrição → **Guardar**
6. Abre a ficha pública dessa creche → cartão verde aparece 🎉

## Próximos passos naturais (não feitos)

- Mostrar o perfil também no popup do `/app` (mexer no app.html — combinar contigo)
- Email automático à creche quando o acesso é aprovado (via api/notify.js)
- Notificação push aos pais quando abre vaga perto ("o sonho")
- Estatísticas para a creche (visualizações da ficha)
