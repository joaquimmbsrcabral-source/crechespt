# 📖 Guia passo-a-passo: Deploy Backend Vagas em Tempo Real

**Tempo total:** ~30-45 minutos
**Pré-requisitos:** já tens projeto Firebase + Vercel funcionando

---

## 🎯 O que vais fazer (resumo)

1. **Deploy do código novo** (vagas.html, vagas.js, fichas) → 1 comando
2. **Configurar regras Firestore** (segurança) → 5 min
3. **Configurar TTL** (auto-eliminar vagas após 7 dias) → 2 min
4. **(Opcional) Cloud Function de email** → 15 min — podes saltar e
   validar manualmente no Firestore Console

⚠️ Se nunca usaste alguma destas coisas, **diz-me** que faço o
passo contigo em mais detalhe.

---

## 🚀 PASSO 1 — Deploy do código novo

**O que faz:** mete `vagas.html`, `vagas.js`, fichas regeneradas
online no Vercel.

### Abre o Terminal e cola exactamente:

```bash
cd ~/Documents/Claude/Projects/CrechesPT && ./deploy.sh "feat: Onda 29 vagas em tempo real (MVP UI dual-source)"
```

### O que vais ver:
```
✓ Commit feito
✓ Push para GitHub
✓ Vercel a deploy automaticamente
```

**Aguarda ~30 segundos** depois abre [creches.app/vagas](https://creches.app/vagas) para confirmar que carrega.

---

## 🔐 PASSO 2 — Configurar regras Firestore (segurança)

**O que faz:** define quem pode escrever/ler vagas. Sem isto,
qualquer pessoa podia apagar vagas dos outros.

### 2.1 — Abrir Firebase Console

1. Vai a [console.firebase.google.com](https://console.firebase.google.com)
2. Faz login com `joaquimmbsrcabral@gmail.com`
3. Clica no projecto **"creches-pt"** (ou o nome que escolheste)

### 2.2 — Ir para regras Firestore

1. Menu lateral esquerdo → clica em **"Firestore Database"**
2. No topo, clica no separador **"Rules"** (Regras)
3. Vês um editor com regras existentes

### 2.3 — Adicionar regras das vagas

**Vais ADICIONAR** (não substituir tudo). Procura por algo tipo
`match /databases/{database}/documents {` — dentro das chavetas
desse bloco, antes do `}` final, **cola isto**:

```
    // ─── Vagas em tempo real (Onda 29) ───
    match /vagas/{vagaId} {
      // Toda a gente pode ler vagas (são públicas)
      allow read: if true;

      // Qualquer pessoa pode criar uma vaga (anónimo ou auth)
      allow create: if request.resource.data.keys().hasAll(['creche_id', 'source', 'reportado_em'])
                    && request.resource.data.source in ['creche', 'pai']
                    && request.resource.data.creche_id is string
                    && request.resource.data.creche_id.size() < 100
                    && (!request.resource.data.keys().hasAny(['notas']) ||
                        request.resource.data.notas.size() < 280);

      // Só admin pode actualizar ou apagar
      allow update, delete: if request.auth != null
                            && request.auth.token.email == "joaquimmbsrcabral@gmail.com";
    }
```

### 2.4 — Publicar

1. Clica no botão azul **"Publish"** (Publicar) no topo direito
2. Confirma na caixinha que aparece

✅ **Feito.** As vagas ficam protegidas: qualquer um pode criar,
mas só tu podes editar/apagar.

---

## ⏰ PASSO 3 — Configurar TTL (auto-apagar após 7 dias)

**O que faz:** o Firestore apaga automaticamente vagas com mais
de 7 dias. Sem isto, ias acumular vagas velhas para sempre.

### 3.1 — Ir para Firestore TTL

1. Mesmo Firebase Console, **Firestore Database**
2. No topo, separador **"Time-to-live (TTL)"**
   (se não vires logo, clica nos 3 pontinhos ⋯ para mais opções)

### 3.2 — Criar política TTL

1. Clica em **"Create policy"** (Criar política)
2. Preenche:
   - **Collection group ID:** `vagas` (escreve exactamente assim)
   - **Timestamp field:** `expires_at` (exactamente assim)
3. Clica em **"Create"**

⚠️ Pode demorar até 24h a começar a apagar — a primeira vez é
lenta. Depois é instantâneo.

✅ **Feito.** As vagas auto-eliminam-se 7 dias após criação.

---

## ✅ PASSO 4 — Testar o MVP (sem Cloud Function)

**Já podes usar o sistema** mesmo sem o envio automático de emails.
A diferença é que tens de validar manualmente.

### 4.1 — Testa o fluxo do pai (anónimo)

1. Abre [creches.app/creche/casa-das-abelhinhas-1234062283](https://creches.app/creche/casa-das-abelhinhas-1234062283)
   (ou qualquer outra ficha)
2. Deve aparecer um botão **"🟢 Sei que esta creche tem vaga — reporta"**
3. Clica → abre modal
4. Marca uma idade (ex: 🍼 Creche)
5. Escreve algo nas observações
6. Clica em **"🟢 Reportar vaga"**
7. Deve aparecer "✓ Obrigado!"
8. **Recarrega a página** — devias ver banner verde "🟢 Vaga aberta (agora mesmo) — ℹ Reportada por pai"

### 4.2 — Testa o fluxo da creche

1. Abre [creches.app/vagas](https://creches.app/vagas)
2. Procura uma creche (escreve nome)
3. Selecciona da lista
4. Marca idades, mete email teu
5. Submete → vês "Recebido!"
6. **Por enquanto não recebes email** (Passo 5 abaixo é opcional)

### 4.3 — Validar manualmente (sem Cloud Function)

1. Vai a [Firebase Console → Firestore → Data](https://console.firebase.google.com)
2. Clica na collection **`vagas`** (vai aparecer depois do primeiro report)
3. Vês a vaga que reportaste
4. Para marcar como **verificada**:
   - Clica no documento da vaga
   - Procura o campo `verificado` (deve ser `false`)
   - Clica em **edit** (lápis)
   - Muda para `true`
   - Save

✅ Vaga fica com badge "✓ Confirmada pela creche".

---

## 📧 PASSO 5 (OPCIONAL) — Cloud Function de email

Se quiseres **automatizar** o envio do email de confirmação às
creches, segue este passo. Senão, podes parar no Passo 4 e
validar manualmente no Firestore Console (~5 vagas/dia é
manageável).

⚠️ Este passo requer **Plano Blaze do Firebase** (paga-se por uso
mas é praticamente grátis para volumes pequenos — < 0.01€/mês para
100 vagas/dia).

### 5.1 — Activar Plano Blaze

1. Firebase Console → ⚙️ Configurações → Uso e faturação
2. Clica em **"Modificar plano"** → escolhe **Blaze**
3. Adiciona cartão (não te preocupes, vais gastar cêntimos)

### 5.2 — Criar app password Gmail

1. Vai a [myaccount.google.com/security](https://myaccount.google.com/security)
2. Activa **2-Step Verification** se ainda não tiveres
3. Procura **"App passwords"** (palavras-passe de apps)
4. Cria nova: "Creches.app Functions"
5. **Copia o código de 16 caracteres** (não vais ver outra vez)

### 5.3 — Inicializar Functions no projecto

No Terminal:
```bash
cd ~/Documents/Claude/Projects/CrechesPT
firebase init functions
```

Quando perguntar:
- "Language?" → **JavaScript**
- "ESLint?" → **No** (Não)
- "Install dependencies?" → **Yes** (Sim)

### 5.4 — Instalar nodemailer

```bash
cd functions
npm install nodemailer
```

### 5.5 — Substituir functions/index.js

Abre o ficheiro `functions/index.js` e **substitui tudo** por:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
admin.initializeApp();

// Envia email de verificação quando creche reporta vaga
exports.sendVacancyVerification = functions
  .region('europe-west1')
  .firestore.document('vagas/{vagaId}')
  .onCreate(async (snap, ctx) => {
    const vaga = snap.data();
    if (vaga.source !== 'creche') return null;
    if (vaga.verificado) return null;

    const email = vaga.reportado_por?.email;
    if (!email) return null;

    // Gerar token aleatório
    const token = require('crypto').randomBytes(16).toString('hex');
    await snap.ref.update({ validation_token: token });

    const verifyUrl = `https://creches.app/vagas?confirm=${ctx.params.vagaId}&token=${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'geral@creches.app',
        pass: functions.config().gmail.password,
      },
    });

    await transporter.sendMail({
      from: '"Creches.app" <geral@creches.app>',
      to: email,
      subject: `Confirma vaga aberta na ${vaga.nome_creche || 'tua creche'}`,
      text:
`Olá,

Recebemos um pedido de marcação de vaga aberta para a ${vaga.nome_creche || 'tua creche'} no creches.app.

Se foste tu, confirma aqui (link válido 7 dias):
${verifyUrl}

Se não foste tu, podes ignorar este email — a vaga não fica visível sem confirmação.

Obrigado,
Joaquim Cabral
Creches.app
geral@creches.app`,
    });

    console.log('Email enviado a', email, 'para vaga', ctx.params.vagaId);
    return null;
  });

// Endpoint HTTP para confirmar vaga via link
exports.confirmVacancy = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    const { confirm: vagaId, token } = req.query;
    if (!vagaId || !token) {
      return res.status(400).send('Parâmetros inválidos');
    }

    const vagaRef = admin.firestore().collection('vagas').doc(vagaId);
    const snap = await vagaRef.get();
    if (!snap.exists) return res.status(404).send('Vaga não encontrada');

    const vaga = snap.data();
    if (vaga.validation_token !== token) {
      return res.status(403).send('Token inválido');
    }

    await vagaRef.update({
      verificado: true,
      validated_at: admin.firestore.FieldValue.serverTimestamp(),
      validation_token: admin.firestore.FieldValue.delete(),
    });

    res.redirect('https://creches.app/vagas?ok=1');
  });
```

### 5.6 — Configurar a app password do Gmail

```bash
cd ~/Documents/Claude/Projects/CrechesPT
firebase functions:config:set gmail.password="COLA_AQUI_O_CODIGO_16_CHARS"
```

(substitui `COLA_AQUI_O_CODIGO_16_CHARS` pelo código que copiaste
no passo 5.2)

### 5.7 — Deploy das functions

```bash
firebase deploy --only functions
```

Espera ~3 minutos. Vai mostrar URL da Cloud Function — ignora.

### 5.8 — Testar

1. Vai a [creches.app/vagas](https://creches.app/vagas)
2. Submete uma vaga com **email teu** (que tu controles)
3. Em ~30s, recebes email com link
4. Clica → vaga fica verificada
5. Vê a ficha da creche — badge "✓ Confirmada pela creche"

✅ **Sistema 100% automatizado.**

---

## 🆘 Se algo correr mal

### "Não vejo a colecção `vagas` no Firestore"
→ Normal. Só aparece depois do primeiro report ser feito.

### "Modal de pai não abre"
→ Abre Console do browser (F12 → Console). Procura erros vermelhos.
Provavelmente Firebase não carregou — recarrega a página.

### "Email não chega"
→ Verifica spam. Se não estiver no spam:
- `firebase functions:log` no Terminal
- Procura erros nas últimas linhas

### "Vagas não aparecem na ficha"
→ Pode ser cache. Tenta:
- Hard refresh: Ctrl+Shift+R (Cmd+Shift+R no Mac)
- Modo incógnito
- Verificar no Firestore Console se a vaga foi mesmo criada

### "Estou perdido"
→ Diz-me em que passo estás e eu ajudo. 🍼

---

## 📊 Resumo do que vais ter depois

| Componente | Estado |
|---|---|
| `/vagas` landing creches | ✅ funciona |
| Botão pais em todas as fichas | ✅ funciona |
| Modal anónimo pais | ✅ funciona |
| Vagas guardadas no Firestore | ✅ funciona |
| Badge "vaga aberta" automático | ✅ funciona |
| Auto-expiração 7 dias | ✅ se fizeste Passo 3 |
| Email automático às creches | ✅ se fizeste Passo 5 |
| Validação manual fallback | ✅ sempre |

---

## 🎯 Sequência recomendada

**Hoje (15 min):**
- [x] Passo 1 (deploy)
- [x] Passo 2 (rules)
- [x] Passo 4.1 (testar como pai)

**Esta semana (10 min):**
- [ ] Passo 3 (TTL)
- [ ] Anunciar feature numa story Instagram

**Quando tiveres 30 min livre:**
- [ ] Passo 5 (Cloud Function — automatiza tudo)

---

**Diz-me em que passo estás e eu acompanho-te.** 🍼
