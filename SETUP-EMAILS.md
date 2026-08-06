# ⚠️ ATIVAR O CANAL DE RESPOSTA (novo — Jul 2026)

Sem estes passos tudo continua a funcionar como antes (a resposta da creche vai
direta para o pai) — mas **não conseguimos medir quantas creches respondem**.

**1. Subdomínio de resposta no Resend**
Resend → Domains → Add Domain → `resposta.creches.app`.
Adiciona os registos DNS que ele indicar — inclui **MX**, que é o que permite
*receber* email (o domínio principal só tem os registos de envio).

**2. Ativar o email de entrada**
Resend → Inbound / Receiving → ativar para `resposta.creches.app`, com a regra
a apanhar `lead-*@resposta.creches.app`.

**3. Webhook do inbound**
Resend → Webhooks → novo endpoint:
- URL: `https://creches.app/api/resposta-inbound`
- Evento: `email.received` (ou `inbound.email.received`)
- Copia o **Signing Secret**.

**4. Variáveis de ambiente no Vercel**
```
RESPOSTA_DOMINIO       = resposta.creches.app
RESEND_INBOUND_SECRET  = whsec_...   (o Signing Secret do passo 3)
```
⚠️ O `RESPOSTA_DOMINIO` é o interruptor: enquanto não existir, o `lead-notify`
usa o email do pai como reply-to, exatamente como antes. Configura-o **só depois**
de o MX e o webhook estarem a funcionar — senão as respostas das creches perdem-se.

**5. Testar antes de confiar**
Faz um pedido a uma creche tua, responde ao email que chegar, e confirma:
(a) a resposta chegou ao email do pai; (b) no `/admin` → Leads, o funil mostra
"Creches que responderam — medido por nós" a contar 1.

---

# Setup — Notificações por email (Vercel + Resend)

Quando aprovas um report de idade ou aprovas uma creche no `/admin`, o
utilizador que reportou (ou a creche que pediu para entrar) recebe um
email automaticamente.

**Setup total: ~10 minutos. Custo: 0 €.**

---

## Como funciona

```
Admin clica "Aprovar"
  ↓
admin.html guarda no Firestore (override / extra)
  ↓
admin.html pede um Firebase ID token e chama POST /api/notify
  ↓
Vercel Function verifica que o caller é admin (Firestore admins/{uid})
  ↓
Função chama Resend API
  ↓
Resend envia email com "De: Creches.app <onboarding@resend.dev>"
e "Reply-To: geral@creches.app"
```

Templates fixos no servidor (não pode haver injeção de conteúdo a partir do cliente).

---

## Passo 1 — Resend (3 min)

1. Vai a [resend.com](https://resend.com) → **Sign up** (com a conta Google de geral@creches.app é mais rápido)
2. Confirma o email
3. Menu esquerdo → **API Keys** → **Create API Key**
   - Nome: `creches-app-prod`
   - Permission: **Sending access**
   - Domain: **All Domains**
4. **Copia a key** (começa por `re_...`) — só vais ver uma vez

Free tier: 100 emails/dia, 3.000/mês. Mais que suficiente.

---

## Passo 2 — Firebase Service Account (3 min)

A função no Vercel precisa de autenticar como admin no Firebase para
verificar o token do user.

1. Vai a [Firebase Console](https://console.firebase.google.com) → projeto **crechespt**
2. Engrenagem ⚙ (topo) → **Project settings**
3. Tab **Service accounts** → botão **Generate new private key**
4. Vai descarregar um ficheiro `.json` — guarda-o (não partilhar!)
5. No Terminal, base64-encode o ficheiro:
   ```bash
   base64 -i ~/Downloads/crechespt-firebase-adminsdk-XXXXX.json | tr -d '\n' | pbcopy
   ```
   (no macOS isto copia direto para o clipboard)

---

## Passo 3 — Variáveis de ambiente no Vercel (2 min)

1. [vercel.com](https://vercel.com) → projeto **creches-app** (ou similar)
2. **Settings** → **Environment Variables**
3. Adiciona estas duas:

   | Name | Value | Environment |
   |---|---|---|
   | `RESEND_API_KEY` | a key do passo 1 (`re_...`) | Production, Preview, Development |
   | `FIREBASE_SERVICE_ACCOUNT` | o base64 do passo 2 (cola do clipboard) | Production, Preview, Development |

4. Save

---

## Passo 4 — Deploy

```bash
cd ~/Documents/Claude/Projects/CrechesPT
./deploy.sh
```

O Vercel vai detetar o `api/notify.js` e o `package.json`, instalar
`firebase-admin` (já está nas deps), e deployar a função.

Aguarda 1-2 min até o deploy completar.

---

## Passo 5 — Testar

1. Abre `https://creches.app/admin`
2. Em "Idades reportadas como incorretas" (ou usa o `test-stats.html` para criar
   um report fake com o teu próprio email)
3. Carrega **✓ Aplicar**
4. Verifica o teu email — deves receber em 5-10 segundos

Se não chegar:
- Verifica spam (porque o `from:` é `onboarding@resend.dev`)
- Abre Vercel Dashboard → **Logs** → procura `/api/notify` para ver erros
- Abre Resend Dashboard → **Emails** → vê se o email foi enviado/bounced

---

## Templates

Há 2 templates definidos em `api/notify.js`:

1. **`report_applied`** — enviado quando aplicas uma correção de idade
2. **`creche_approved`** — enviado quando aprovas uma creche nova

Para editar o texto/HTML, edita o ficheiro `api/notify.js`, secção `TEMPLATES`,
e faz deploy outra vez.

---

## Quando upgrade-ar para "De: geral@creches.app"

O setup atual envia de `onboarding@resend.dev` (vai para spam mais facilmente).

Para enviar de `geral@creches.app`:

1. Resend → **Domains** → **Add Domain** → `creches.app`
2. Resend dá-te 3-4 registos DNS (SPF, DKIM, MX)
3. Vais ao teu provider de DNS (onde compraste o domínio) e adiciona os registos
4. Aguarda verificação (15min a 24h)
5. Em `api/notify.js`, muda:
   ```js
   from: "Creches.app <onboarding@resend.dev>",
   ```
   para:
   ```js
   from: "Creches.app <geral@creches.app>",
   ```
6. Deploy

---

## Custos

- **Resend**: 0 € até 3.000 emails/mês
- **Vercel Functions**: 0 € até 100h-CPU/mês (cada chamada gasta ~50ms)
- **Firebase Admin SDK**: 0 € (já incluído no free tier do Firebase)

Para teres custo, precisarias de aprovar >100 creches/dia ou >3000 reports/mês.

---

## Troubleshooting

**"RESEND_API_KEY missing"** → não definiste a env var no Vercel, ou está
só em Production e estás a testar Preview.

**"FIREBASE_SERVICE_ACCOUNT missing"** → idem, ou o JSON ficou mal base64-encoded.
Testa decodificar:
```bash
echo "TEU_BASE64_AQUI" | base64 -d | head -3
```
Deves ver `{ "type": "service_account", ...}`.

**"Invalid token"** → o admin não tem ID token válido. Tenta fazer logout/login
no `/admin`.

**"Not an admin"** → o teu UID não está em `admins/{uid}` no Firestore. Cria o doc.

**Email vai para spam** → é normal com `onboarding@resend.dev`. Faz o upgrade
para o teu domínio (secção acima).

---

## /api/daily-stats — briefing diário do fundador (18 jul 2026)

Endpoint que alimenta o briefing matinal do Cowork com as métricas completas
(utilizadores, leads, vagas, views, pendências).

- **Env vars necessárias:** `FIREBASE_SERVICE_ACCOUNT` (base64) + `CRON_SECRET`.
  NÃO precisa de RESEND_API_KEY (só lê dados).
- **CRON_SECRET:** usa o valor que o Joaquim guardou na tarefa agendada
  "briefing-diario-creches" do Cowork (o mesmo valor serve também o weekly-digest).
- **Teste manual:**
```bash
curl -s -H "Authorization: Bearer O_TEU_CRON_SECRET" https://creches.app/api/daily-stats | python3 -m json.tool
```
Deves ver JSON com utilizadores/leads/vagas/rede/views. `401` = secret errado;
`503` = falta FIREBASE_SERVICE_ACCOUNT.

---

## /api/resend-webhook — apanhar emails que não existem (bounces e spam)

Quando enviamos convites às creches, uma parte dos emails do dataset já não
existe (a creche mudou de endereço, o domínio expirou, etc.). O servidor de
destino devolve um **bounce** e nós nunca ficamos a saber — a creche fica sem
ser contactada e continuamos a gastar reputação a enviar para o vazio.

Este webhook resolve isso: o Resend avisa-nos sempre que um email bate no
vazio (`email.bounced`) ou é marcado como spam (`email.complained`), e nós
guardamos o endereço na coleção `emails_invalidos` do Firestore. O agente de
enriquecimento vai depois a essa lista procurar o email correto dessas creches.

**Setup: ~4 minutos. Custo: 0 €.** É preciso fazer isto uma vez.

### Passo 1 — Criar o webhook no Resend (2 min)

1. Vai a [resend.com](https://resend.com) → entra com a conta do creches.app
2. Menu esquerdo → **Webhooks** → botão **Add Webhook**
3. No campo **Endpoint URL** cola exatamente:
   ```
   https://creches.app/api/resend-webhook
   ```
4. Em **Events**, seleciona **apenas estes dois**:
   - `email.bounced`
   - `email.complained`

   (não marques os outros — só nos interessam os emails que falharam; se
   marcares todos, o endpoint responde na mesma mas ignora-os)
5. **Add** / **Create**

### Passo 2 — Copiar o Signing Secret (30 seg)

1. Ainda no Resend, clica no webhook que acabaste de criar
2. Procura **Signing Secret** e carrega em **Reveal** / no ícone de copiar
3. **Copia o valor** — começa por `whsec_...`
   (é este segredo que prova que o pedido vem mesmo do Resend e não de um
   impostor a inventar bounces)

### Passo 3 — Variável de ambiente no Vercel (1 min)

1. [vercel.com](https://vercel.com) → projeto **creches-app**
2. **Settings** → **Environment Variables**
3. Adiciona:

   | Name | Value | Environment |
   |---|---|---|
   | `RESEND_WEBHOOK_SECRET` | o secret do passo 2 (`whsec_...`) | Production, Preview, Development |

4. Save

⚠️ Só cola o secret — sem espaços à frente ou atrás, e **com** o `whsec_`
(o código trata do resto).

### Passo 4 — Deploy

```bash
cd ~/Documents/Claude/Projects/CrechesPT
./deploy.sh
```

Importante: as variáveis de ambiente só entram em vigor no **próximo deploy**.
Se adicionaste a variável e não fizeste deploy, o endpoint responde `503`.

### Passo 5 — Testar

1. No Resend → **Webhooks** → clica no webhook → **Send test event** (ou
   **Testing** → escolhe `email.bounced` → **Send**)
2. Deve aparecer resposta **200** com `{"ok":true,...}` no histórico do webhook
3. Se quiseres um teste a sério: envia um convite para um endereço que não
   existe (ex.: `naoexisteisto123@creches.app`) e ao fim de ~1 minuto o
   Firestore deve ter um doc novo em `emails_invalidos`

### O que fica guardado

Coleção **`emails_invalidos`** no Firestore, um documento por endereço:

| Campo | O que é |
|---|---|
| `email` | o endereço que falhou |
| `motivo` | `bounce` (não existe) ou `spam` (marcaram-nos como spam) |
| `detalhe` | a explicação que o servidor de destino deu |
| `ocorrencias` | quantas vezes já falhou |
| `primeira_em` / `ultima_em` | quando foi a primeira e a última vez |
| `creche_id` / `creche_nome` | a creche a que o email pertence (se a encontrarmos no mapa) |

Só o admin consegue ler esta coleção; ninguém consegue escrever nela a partir
do site (só o servidor).

### Troubleshooting

**`503 RESEND_WEBHOOK_SECRET não configurado`** → falta a variável no Vercel,
ou puseste-a só em Production, ou não fizeste deploy depois de a adicionar.

**`401 Assinatura inválida`** → o secret está errado (copiaste o de outro
webhook?), tem espaços, ou o relógio está muito fora do sítio. O webhook só
aceita eventos com menos de 5 minutos — se estiveres a reenviar um evento
antigo à mão, vai dar 401 e é normal.

**Resposta 200 mas nada aparece no Firestore** → o evento não era um bounce
permanente (bounces temporários, tipo caixa cheia, são ignorados de propósito
— o email pode estar bom), ou faltava `FIREBASE_SERVICE_ACCOUNT`. Vê os logs
em Vercel → **Logs** → procura `resend-webhook`.
