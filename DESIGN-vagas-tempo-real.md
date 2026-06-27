# 🟢 Sistema de Vagas em Tempo Real — Design + Implementação

**Data:** 25 Junho 2026 · Onda 29 · MVP

---

## 🎯 Goal

Criar a **primeira fonte real de vagas live** em creches portuguesas
— combinando 2 fluxos:
1. **Creches** confirmam vagas (alta confiança, verificado por email)
2. **Pais** reportam vagas anonimamente (volume, distinguido visualmente)

Após 7 dias, vaga expira automaticamente (força refresh).

---

## 🏗 Arquitectura

```
┌─────────────────────────┐
│  /vagas (página landing)│  ← creches reportam aqui
│                          │
│  [form]                  │
│  Email + creche + idades │
└────────────┬─────────────┘
             │
             ▼
┌─────────────────────────┐
│  Firestore: vagas/{id}  │  ← collection
│                          │
│  - creche_id             │
│  - source: "creche"|"pai"│
│  - verificado: bool      │
│  - expires_at            │
└────────────┬─────────────┘
             │
             ▼
┌─────────────────────────┐
│  UI: badge "🟢 vaga"     │
│  - Fichas /creche/...    │
│  - Popup /app            │
│  - Filtro "Com vaga"     │
└─────────────────────────┘
```

---

## 📊 Schema Firestore

### Collection `vagas`

```js
{
  id: "auto-generated",
  creche_id: "osm-node-1234",  // FK para creche
  nome_creche: "Casa das Abelhinhas",  // cache para listagens
  source: "creche" | "pai" | "admin",
  verificado: true | false,
  idades: ["berçário", "creche"],  // opcional, lista de idades com vaga
  notas: "Vaga para entrada em Setembro",  // opcional, max 280 chars
  reportado_por: {
    email: "responsavel@creche.pt",  // se creche
    ip_hash: "sha256(...)",  // se pai, hash do IP para rate-limit
    nome: "Maria S.",  // se pai escolheu identificar-se (opcional)
  },
  reportado_em: serverTimestamp(),
  expires_at: timestamp,  // reportado_em + 7 dias
  validation_token: "uuid",  // se source=creche, usado para validar via email
  validated_at: timestamp,  // quando creche confirma o link
}
```

### Indexes necessários
- `creche_id ASC, expires_at DESC` (procurar vagas activas por creche)
- `expires_at ASC` (TTL cleanup)

### TTL (auto-delete após 7 dias)
- Configurar em Firestore Console: TTL field = `expires_at`

---

## 🔐 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Collection vagas
    match /vagas/{vagaId} {
      // QUALQUER pessoa pode LER vagas activas
      allow read: if true;

      // QUALQUER pessoa pode CRIAR vaga (anónima ou autenticada)
      allow create: if request.resource.data.keys().hasAll(['creche_id', 'source', 'reportado_em'])
                    && request.resource.data.source in ['creche', 'pai']
                    && request.resource.data.creche_id is string
                    && request.resource.data.creche_id.size() < 100
                    // Notas curtas
                    && (!request.resource.data.keys().hasAny(['notas']) ||
                        request.resource.data.notas.size() < 280);

      // Apenas admin pode UPDATE/DELETE
      allow update, delete: if request.auth != null
                            && request.auth.token.email == "joaquimmbsrcabral@gmail.com";

      // Validação via token: creche pode marcar verificado=true se tiver o token correcto
      // (fluxo: visita link no email com ?token=xxx, frontend faz update)
      // Mas como queremos zero-backend, fazemos isso via Cloud Function
    }

    // Rate limiting: collection auxiliar
    match /vagas_rate_limit/{ipHash} {
      allow read: if false;  // só servidor
      allow write: if false;  // só Cloud Function
    }
  }
}
```

---

## 🔑 Cloud Function — Email de verificação (para creches)

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
admin.initializeApp();

// Helper: envia email de verificação à creche
exports.sendVacancyVerification = functions
  .region('europe-west1')
  .firestore.document('vagas/{vagaId}')
  .onCreate(async (snap, ctx) => {
    const vaga = snap.data();
    if (vaga.source !== 'creche') return null;
    if (vaga.verificado) return null;

    const email = vaga.reportado_por?.email;
    if (!email) return null;

    // Verificar se este email está no dataset oficial da creche
    const crechesPt = await admin.firestore()
      .collection('creches_overrides')
      .doc(vaga.creche_id)
      .get();
    // Ou cross-check com creches_pt.json embebido como collection
    // const validEmails = ...

    const token = require('crypto').randomBytes(16).toString('hex');
    await snap.ref.update({ validation_token: token });

    const verifyUrl = `https://creches.app/vagas?confirm=${ctx.params.vagaId}&token=${token}`;

    // Envio do email via Gmail (Joaquim configura SMTP)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'geral@creches.app',
        pass: functions.config().gmail.password,  // app password
      },
    });

    await transporter.sendMail({
      from: '"Creches.app" <geral@creches.app>',
      to: email,
      subject: `Confirma vaga na ${vaga.nome_creche}`,
      text: `Olá,\n\nRecebemos um pedido de marcação de vaga aberta para a ${vaga.nome_creche}.\n\nSe foste tu, confirma aqui: ${verifyUrl}\n\nSe não foste tu, ignora este email.\n\nObrigado,\nCreches.app`,
    });

    return null;
  });

// Endpoint para confirmar via link
exports.confirmVacancy = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    const { vagaId, token } = req.query;
    if (!vagaId || !token) return res.status(400).send('Parâmetros inválidos');

    const vagaRef = admin.firestore().collection('vagas').doc(vagaId);
    const vaga = (await vagaRef.get()).data();
    if (!vaga) return res.status(404).send('Vaga não encontrada');
    if (vaga.validation_token !== token) return res.status(403).send('Token inválido');

    await vagaRef.update({
      verificado: true,
      validated_at: admin.firestore.FieldValue.serverTimestamp(),
      validation_token: admin.firestore.FieldValue.delete(),
    });

    res.redirect('https://creches.app/vagas?ok=1');
  });
```

**Configurar** (uma vez):
```bash
firebase functions:config:set gmail.password="APP_PASSWORD_GMAIL"
firebase deploy --only functions
```

---

## 🎨 UI Components

### 1. Página `/vagas` — landing para CRECHES

Headline: "🟢 Estás a oferecer uma vaga?"
Sub: "Diz-nos. Aparece destacada para os pais em segundos."

Form:
- Procurar a tua creche (autocomplete sobre `creches_pt.json`)
- Email da creche (verificamos que está no dataset oficial)
- Idades com vaga (multi-select)
- Notas opcionais
- Submeter

Após submit: "Enviámos email para verificares. Depois de confirmares, a vaga fica visível para os pais."

### 2. Botão na ficha `/creche/{slug}.html`

Card destacado verde no topo da ficha:

```html
<div class="vaga-card">
  <div class="vaga-status">
    <!-- Se HÁ vaga activa: -->
    🟢 <b>Vaga aberta</b> (reportada há 2 dias)
    [Verificada pela creche] ou [Reportada por pai]
    [Botão: Ligar para confirmar →]

    <!-- Se NÃO há vaga: -->
    ❓ Sem informação de vagas
    [Botão: 🟢 Sei de uma vaga aqui — reporta]
  </div>
</div>
```

### 3. Modal "Reportar vaga" (pai anónimo)

Aberto a partir do botão. Form simples:
- Idade(s) que sabes que tem vaga (chips)
- Como soubeste? (opcional: "Liguei e disseram-me" / "Fui visitar")
- Notas opcionais
- Submeter (sem login)

Rate limit client-side: max 5 reports/dia por browser (localStorage).
Backend: hash IP + rate limit Firestore.

### 4. Popup `/app` — badge

Quando há vaga activa, o popup mostra:
```
🟢 Vaga aberta (há 2 dias) ← pill verde no topo
[resto do popup normal]
```

### 5. Filtro `/app` — "🟢 Com vaga"

Já existe o chip. Agora vai ter dados reais:
- Mostra só creches com `vaga.expires_at > now`
- Pinos do mapa: verdes brilhantes com halo pulsante

### 6. `/admin/vagas` — queue de admin

Lista de vagas pendentes/reportadas:
- Filtro por source (pai vs creche)
- Botão "Validar manualmente" (override email)
- Botão "Eliminar" (false positive)
- Stats: total activas, por distrito, por idade

---

## 📅 Ciclo de vida da vaga

```
Dia 0  → Reportada (verde brilhante 🟢)
Dia 3  → Verde normal
Dia 5  → Amarelo "🟡 reportada há 5 dias — confirma se ainda existe"
Dia 7  → Expira (cinza, "última vaga conhecida há 1 semana")
Dia 14 → Removida do Firestore (TTL)
```

---

## ⚠️ Anti-abuso

### Para pais anónimos:
1. **Rate limit por IP** (Cloud Function valida hash IP, max 5 reports/dia)
2. **Rate limit localStorage** (max 5/dia mesmo browser)
3. **Vaga reportada por pai** aparece marcada "⚠️ Reportada por pai — não verificada" — pai utilizador percebe que tem de ligar para confirmar
4. **Botão "Foi falsa?"** em cada vaga — 3+ flags = auto-remove
5. **Captcha invisível Cloudflare Turnstile** se notarmos abuso

### Para creches:
1. **Verificação por email** (só se email == email do dataset)
2. **Se email não bate**: vai para queue admin
3. **Override admin** para casos especiais

---

## 🚀 Plano de implementação faseado

### Fase 1 — MVP UI (hoje, 1 dia)
- [x] Doc de design
- [ ] Página `/vagas` com form
- [ ] Botão "Reportar vaga" nas fichas
- [ ] Modal anónimo pais
- [ ] vagas.js — lib de leitura/escrita Firestore
- [ ] Mostrar badge "🟢 Vaga aberta" na ficha + popup
- [ ] Activar filtro "Com vaga" no /app

### Fase 2 — Backend (próxima semana)
- [ ] Firestore rules deployed
- [ ] Cloud Function de email verificação
- [ ] TTL configurado no Firestore Console
- [ ] Admin queue `/admin/vagas`

### Fase 3 — Polish (depois)
- [ ] Rate limit server-side
- [ ] Captcha Cloudflare Turnstile
- [ ] Stats dashboard admin
- [ ] Notificações push "vaga apareceu em X" (premium)

---

## 📨 Comms

### Anúncio para pais (quando estiver live):
"🟢 As vagas em tempo real chegaram! Agora podes ver — e dizer — quais
creches têm vaga aberta. Sem listas de espera fantasma."

### Email para creches (já no draft Wave 4 — adicionar)
"Podes agora marcar vagas em creches.app/vagas em 30 segundos.
Aparece destacado para os pais."

---

## 💡 Lições de produto

1. **Confiança graduada**: vaga "verificada" vs "reportada" é melhor
   que tudo-ou-nada
2. **Decay automático**: 7 dias força frescor (não vira lista
   morta)
3. **Multi-source resolve cold start**: pais reportam mesmo se
   creches não usarem
4. **UI honesta**: badge "reportada por pai" reduz dano se for
   errado
5. **Email validation light**: o email-do-dataset é uma checksum
   simples mas eficaz contra concorrência reportar vagas falsas
