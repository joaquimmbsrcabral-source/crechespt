# CrechesPT — guia de deploy (Firebase + Vercel)

Tempo total ≈ 30-45 minutos.
Custo: **0€** até teres milhares de utilizadores ativos por mês.

---

## 1. Criar projeto Firebase (≈ 5 min)

1. Vai a [console.firebase.google.com](https://console.firebase.google.com) e faz login com a tua conta Google.
2. Clica **"Add project"** (Adicionar projeto).
3. Nome do projeto: `crechespt` (vai gerar um ID tipo `crechespt-a1b2c`).
4. Google Analytics: podes **desativar** (não precisamos por agora).
5. Clica **"Create project"** e espera o spinner.

---

## 2. Ativar o Google Sign-In (≈ 2 min)

1. No menu lateral esquerdo, clica **"Build" → "Authentication"**.
2. Clica **"Get started"**.
3. Na lista de providers, clica **"Google"**.
4. Toggle **Enable**.
5. Em **Project support email**, escolhe o teu email.
6. Clica **"Save"**.

✓ A partir de agora qualquer pessoa com conta Google pode fazer login.

---

## 3. Criar a base de dados Firestore (≈ 2 min)

1. No menu lateral, **"Build" → "Firestore Database"**.
2. Clica **"Create database"**.
3. **Location**: escolhe `eur3 (europe-west)` (mais próximo de Portugal, melhor latência).
4. **Security rules**: começa em **"Start in production mode"** (vamos colocar as regras certas a seguir).
5. Clica **"Create"** e espera 30 segundos.

### Definir as regras de segurança (importante)

1. Dentro do Firestore, abre o separador **"Rules"** no topo.
2. Apaga tudo o que estiver lá e cola **exatamente** o conteúdo do ficheiro `firestore.rules` (que está na pasta do projeto).
3. Clica **"Publish"**.

Estas regras garantem que **cada utilizador só vê os seus próprios dados** e ninguém mais pode ler/escrever.

---

## 4. Copiar as credenciais Web (≈ 3 min)

1. No menu, **⚙ Settings → "Project settings"**.
2. No separador **"General"**, desce até **"Your apps"**.
3. Clica no ícone **`</>`** (Web).
4. **App nickname**: `CrechesPT Web`.
5. **NÃO** marques "Also set up Firebase Hosting" (vamos usar Vercel).
6. Clica **"Register app"**.
7. Vais ver um snippet de código tipo:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "crechespt-a1b2c.firebaseapp.com",
  projectId: "crechespt-a1b2c",
  storageBucket: "crechespt-a1b2c.appspot.com",
  messagingSenderId: "...",
  appId: "1:..."
};
```

8. **Copia o objeto `firebaseConfig` inteiro** e cola-o aqui no chat. Eu insiro-o na app por ti.

---

## 5. Autorizar o domínio do Vercel (≈ 1 min, faz depois do deploy)

Quando tiveres a app no Vercel, vais ter um URL tipo `crechespt.vercel.app`. Volta ao Firebase:

1. **Authentication → Settings → Authorized domains**.
2. Clica **"Add domain"** e adiciona `crechespt.vercel.app` (ou o teu domínio personalizado, se vieres a comprar).

---

## 6. Criar repositório GitHub (≈ 3 min)

1. Em [github.com/new](https://github.com/new), cria repo `crechespt`.
2. **Private** ou **Public** — à tua escolha (sem credenciais sensíveis no código, podes deixar público).
3. **NÃO** crias README/gitignore/license — vamos puxar tudo do disco.
4. Na pasta `/Users/macbookpro/Documents/Claude/Projects/CrechesPT`, abre o Terminal e corre:

```bash
cd "/Users/macbookpro/Documents/Claude/Projects/CrechesPT"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<TEU-USER>/crechespt.git
git push -u origin main
```

---

## 7. Deploy no Vercel (≈ 5 min)

1. Em [vercel.com](https://vercel.com), faz login com **GitHub**.
2. Clica **"Add New… → Project"**.
3. Escolhe o repo `crechespt` da lista.
4. **Framework Preset**: `Other` (é só HTML/JS).
5. **Build settings**: deixa tudo no default (não há build).
6. Clica **"Deploy"**.
7. Após ≈ 1 minuto, vais ter um URL tipo `https://crechespt.vercel.app` 🎉

A partir daqui, cada `git push` faz redeploy automático.

---

## 8. Voltar ao Firebase e autorizar o domínio Vercel

Refere passo 5 acima — adicionar `crechespt.vercel.app` aos Authorized domains. Sem isto, o Google sign-in não funciona em produção.

---

## Pronto. Como continuar?

- **Para correr localmente**: abre o `app.html` no browser. O login Google só funciona quando estiver hospedado (Firebase exige domínio autorizado).
- **Para alterar a app**: edita `app.html`, faz `git commit && git push` → Vercel redeploy automático.
- **Para ver utilizadores**: Firebase Console → Authentication → Users.
- **Para ver dados**: Firebase Console → Firestore Database.

## Próximos passos opcionais

- **Domínio próprio**: comprar `crechespt.pt` (DNS.pt, ~15€/ano) ou `.app` (Namecheap, ~12€/ano). No Vercel, **Settings → Domains → Add**. Eles dão DNS para configurar.
- **Permitir contribuições**: passar as 2591 creches do ficheiro embebido para o Firestore, e adicionar UI de "Sugerir correção" / "Adicionar creche em falta".
- **Notificações**: lembrete por email das próximas ações (Firebase Cloud Functions + Resend/SendGrid).
- **App nativa**: PWA já funciona, mas se quiseres apps nativas iOS/Android, usar Capacitor sobre a mesma codebase.
