# Auditoria completa — creches.app · 21 ago 2026

Quatro auditorias em paralelo (dados, backend, frontend, produção), verificadas
por mim antes de reportar. **Nove correções já aplicadas**; o resto está listado
por ordem de gravidade.

---

## Já corrigido nesta sessão

| | O que era | Onde |
|---|---|---|
| 🔴 | Relay de spam: qualquer pessoa fazia o creches.app enviar emails ilimitados, com assunto à escolha, para qualquer endereço | `api/_lib/vaga-alert-notify.js` |
| 🔴 | `/dados/` servido publicamente — 6,7 MB de recolha interna | `.vercelignore` |
| 🔴 | Agente de enriquecimento inventou 3 emails em domínios inexistentes, por cima de decisões manuais | tarefa agendada + dataset |
| 🟠 | `leads_verificar_emails` rebentava sempre — duas variáveis inexistentes | `api/ops.js:743` |
| 🟠 | Os 75 gémeos apareciam no mapa em iPhones com iOS < 16.4 | `app.html` |
| 🟠 | A app morria em silêncio se o Leaflet não carregasse | `app.html` |
| 🟠 | Timer a acordar o CPU de 1,5 em 1,5 s, para sempre | `app.html` |
| 🟡 | Pesquisa principal fazia o iOS dar zoom (inputs < 16px) | `app.css` |
| 🟡 | Botões Ligar e Direções com 34px em telemóvel | `app.css` |

---

## 🔴 Grave — por resolver

### 1 · Os números públicos contradizem-se em sete sítios

| Onde | Diz |
|---|---|
| `<title>` da homepage | mais de **4.000** |
| Homepage e `/imprensa` | **4.150** |
| Dataset do mapa | **4.075** |
| meta-description de `/app` | mais de **2.500** |
| Botão no `/app` | Ver **2.591** creches |
| `/creches` (é o que o Google mostra) | **2591** |
| 6 guias, `/calculadora`, `/roadmap` | mais de **2.500** |

E `/creches/lisboa` diz 497 enquanto a homepage diz 853. A `/imprensa` diz 275
concelhos nas estatísticas e 292 na ficha técnica.

O número certo para o público é **4.075** — os 4.150 incluem os 75 gémeos que o
mapa não mostra. "4.075 creches" é um argumento de autoridade sobre "2.500", e é
o segundo que aparece hoje nos resultados do Google.

### 2 · O guia do Creche Feliz está factualmente desatualizado

A app Creche Feliz foi descontinuada em maio de 2026 — os pedidos passaram a ser
feitos só pelo portal da Segurança Social. O guia ainda diz "pede na app Creche
Feliz", em vários pontos, e está datado de 12 de junho.

É a página que queres posicionar para a pesquisa mais valiosa do teu mercado. E
é uma página que dá instruções a famílias sobre um apoio a que têm direito.

### 3 · A política de privacidade não corresponde ao código

Última atualização: 21 de maio. Declara Firebase, Vercel e OSM como
subcontratantes. Não declara o **Resend**, que trata emails de famílias e
creches em cinco endpoints. Não descreve os leads, o acompanhamento de
candidatura nem os alertas de vaga. É uma lacuna concreta, não teórica.

### 4 · 40 emails inválidos — o botão de contacto não funciona

38 têm dois ou três endereços colados com `;` num só campo. Um `mailto:` com
`;` quebra em quase todos os clientes. Dois têm acentos antes do `@`
(`associaçao@filadelfia.org`) e nenhum servidor os aceita.

O `lead-notify` safa-se porque faz `.split(";")[0]`. Quem carrega no link da
ficha, não.

---

## 🟠 Médio

**5 · Retenção de dados pára aos 400 leads.** A query do `weekly-digest.js:58`
apanha sempre os 400 mais antigos e salta os já anonimizados — a partir do
401.º, nunca ninguém é anonimizado. A `privacidade.html:133` promete que sim.
Ainda não morde; morde assim que houver volume.

**6 · 48 duplicados ainda visíveis.** O pior é o **Centro Social de Paços de
Brandão**, com 5 registos idênticos em 182 m. O Bairro do Armador tem 3. Seis
pares partilham email *e* telefone — prova inequívoca.

**7 · 228 creches empilhadas em coordenadas idênticas.** Guimarães tem 13 no
mesmo pino, Lisboa 12. São geocodificações ao centróide do código postal. No
mapa, doze markers sobrepostos significam que a mãe vê um e os outros onze não
existem para ela.

**8 · O filtro de localidade ignora 512 creches.** O dropdown é construído a
partir de `c.localidade`, que 512 registos não têm — mas **todos** têm
`concelho`, correto e verificado contra a CAOP. Trocar o campo recupera-as.

**9 · HTML da creche reencaminhado à família sem sanitizar**
(`resposta-inbound.js:230`). Exige a assinatura do Resend e o token, portanto
não é aberto ao mundo — mas quem lá chegar faz phishing com a autoridade da
marca.

**10 · Leituras sem `limit()`** em `daily-stats.js` e `geo-stats.js`: seis
coleções inteiras. Vai dar 504 em silêncio à medida que a base cresce.

**11 · Extras não são deduplicados nem podem ser removidos.** Uma creche que
crie a própria página e já esteja no dataset fica duas vezes no mapa. E o bloco
de remoções compara ids sem o prefixo `extra_`, por isso um pedido de remoção
de uma página extra nunca funciona.

**12 · O email da conta de admin é legível por qualquer anónimo** — os campos
`added_by`/`edited_by` que o `admin.html` grava em `creche_extras`, que é
pública por desenho.

**13 · `/app` sem `og:title` nem `og:description`.** Partilhar o mapa no
WhatsApp cai para o título.

---

## 🟡 Cosmético

- Comentários que contradizem o código (já corrigi o dos 3 s).
- `alert("Erro: " + err.message)` em dois fluxos de pais — mostra
  "Missing or insufficient permissions" a uma mãe.
- Contrastes abaixo de AA: branco sobre coral `#FF6B9D` dá 2,68:1 no botão
  principal da app. O mínimo é 4,5:1.
- Doze alvos de toque entre 22 e 38px (limpar pesquisa: 22×22).
- Cinco diálogos sem `aria-labelledby`.
- 13 creches no mapa sem ficha (são escolas básicas, excluídas de propósito).

---

## O que está sólido

Vale registar, porque é onde não é preciso voltar:

- **Geografia:** point-in-polygon dos 4.150 registos contra os 308 municípios —
  **zero divergências** de concelho e distrito.
- **Idades:** zero `min > max`, zero em anos disfarçados de meses.
- **Horário alargado:** zero creches marcadas como alargadas sem horário
  confirmado. A lógica JS é espelho exato do `scripts/horario.py`, e ambas
  derivam o valor em vez de o guardar — o erro é estruturalmente impossível.
- **Autenticação:** todos os endpoints que escrevem ou enviam email exigem
  auth, sem exceção. As quatro ações novas do `ops.js` estão depois do bloco de
  auth e nenhuma aceita destinatário vindo do pedido.
- **Assinatura Svix** nos dois webhooks: janela anti-replay, `timingSafeEqual`,
  corpo cru. É a melhor parte do backend.
- **Segredos:** zero chaves privadas no repositório.
- **RGPD:** não há nenhuma via pela qual o email, telefone ou data de nascimento
  de uma família apareça publicamente.
- **A correção dos extras de ontem** foi verificada por simulação em 6 cenários:
  não há ciclo infinito e não há duplicação. Máximo de duas execuções.
- **Fichas:** 4.062 = 4.062 no sitemap, zero órfãs, zero links partidos.

---

## Duas coisas fora do código

**O `CRON_SECRET` está em texto simples** no `SKILL.md` da tarefa de
enriquecimento, no teu Mac. Não está no repositório, mas é a chave que autoriza
o `/api/ops` e o reenvio de emails. Vale rodá-la no Vercel e atualizar as
tarefas.

**O repositório tem refs partidos** — `refs/heads/main 2`,
`refs/remotes/origin/main 2`, `origin/main 3` — e pelo menos um objeto ilegível.
O `git gc` falha. Provavelmente sincronização de pastas a duplicar ficheiros.
Trata antes que morda.

---

## Ordem sugerida

1. Uniformizar o número de creches para **4.075** em todo o lado
2. Corrigir o guia do Creche Feliz (a app já não existe)
3. Declarar o Resend e os leads na política de privacidade
4. Separar os 40 emails com `;` e corrigir os 2 acentuados
5. Corrigir a query de retenção do `weekly-digest.js`
6. Fundir os 48 duplicados, a começar por Paços de Brandão
7. Trocar o filtro do mapa de `localidade` para `concelho`
