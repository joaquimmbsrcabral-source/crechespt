# Plano de desenvolvimento — Painel das Creches
*Julho 2026 · creches.app/painel*

## A. Estado atual (auditoria de 10 Jul 2026)

### O que está live e a funcionar ✅
- **/painel deployed** — código local = código live (hash igual)
- **Login** Google + email/password (ativo no Firebase), recuperação de password, erros em PT
- **Regras Firestore novas deployed** (verificado por probe: `creche_profiles` já tem leitura pública)
- **Fluxo de claim**: pesquisa nas 2.800+ creches (dataset + extras com prefixo `extra_`), bloqueio de pedidos duplicados, verificação manual por telefone
- **Ecrã pendente** + ecrã de erro com retry
- **Dashboard**: estatísticas 7 dias (visualizações da ficha), vagas por sala (berçário/1-2/2-3), Creche Feliz (sim/não/em processo), perfil editável (descrição, horário, website, mensalidades com clamp 0-3000€, contactos), gravação com `FieldValue.delete()` para limpar campos
- **Moderação**: fotos e claims aprovados no /admin, escrita batch atómica
- **Perfil verificado visível** nas fichas públicas (perfil-creche.js live)

### O que está partido ou em risco ⚠️
1. **Firebase Storage não está ativado** (bucket 404 nos dois nomes) — o upload de fotos falha. O painel mostra mensagem simpática, mas é a primeira coisa a resolver: consola Firebase → Storage → Começar → publicar `storage.rules`.
2. **Duas fontes de "vagas"**: o painel grava em `creche_profiles.vagas` (sem expiração), mas os badges da app/fichas vêm da coleção `vagas` (reports de pais, expiram em 7 dias). Risco: creche marca vaga no painel e não aparece o badge no mapa. **Unificar antes de a campanha trazer creches.**
3. **Aprovação sem email automático**: o ecrã pendente promete "Recebes email quando estiver aprovado" — hoje isso é manual. Com 15 emails + Instagram a chegar, automatizar já.
4. **Aprovado só com reload**: quem está no ecrã "pendente" quando é aprovado não vê nada mudar (sem listener realtime).

---

## B. Roadmap

### Fase 0 — Destravar (esta semana, antes da campanha)
Objetivo: nenhuma creche que chegue via emails/Instagram bate numa parede.

| # | Item | Esforço |
|---|------|---------|
| 0.1 | Ativar Storage + publicar storage.rules (manual, consola) | 15 min |
| 0.2 | Unificar vagas: painel passa a escrever TAMBÉM na coleção `vagas` com `source:"painel"`, `verificado:true` (regras: permitir a managers), badge da app prioriza vagas da creche sobre reports de pais | ½ dia |
| 0.3 | Email automático na aprovação do claim (via api/notify.js/Resend): "Já tens acesso + 3 passos" | ½ dia |
| 0.4 | Listener realtime no ecrã pendente (onSnapshot no claim → salta para o dashboard) | 1h |
| 0.5 | Testes ponta-a-ponta com uma creche fictícia (claim → aprovar → editar → ver na ficha) | 1h |

### Fase 1 — Retenção (semanas 2-6)
Objetivo: a creche volta ao painel sem ser preciso pedir. Métrica: % de creches ativas que voltam em 30 dias.

- **Estatísticas a sério**: 30 dias + comparação com o período anterior; "a vossa ficha apareceu em X pesquisas no concelho" (agregado do mapa)
- **Resumo semanal por email** (opt-out): "Esta semana: N visualizações, M favoritos" — é o gancho de retorno mais barato que existe
- **Perfil mais rico**: idades aceites, capacidade/n.º de salas, valências (berçário, ATL…), línguas, refeições — campos que os pais filtram
- **Multi-gestor**: 2+ contas por creche (direção + secretaria); hoje é 1:1
- **Nudge de frescura**: "As vossas vagas foram atualizadas há 30 dias — ainda estão certas?" no painel e por email

### Fase 2 — As promessas do carrossel (meses 2-4)
Objetivo: cumprir o que anunciámos no Instagram, pela ordem de valor.

- **Famílias interessadas (leads)**: botão "Tenho interesse 💌" na ficha pública → formulário curto (nome, email, idade da criança, mês de entrada) → aparece no painel + email à creche. Coleção `creche_leads`, RGPD: consentimento explícito, a creche só vê o que a família submeteu
- **Selo de perfil verificado no mapa**: critério objetivo e gratuito — dados confirmados pela creche + atualização há <60 dias. Pin/badge distinto na app. (Nunca pago: coerente com "sem anúncios")
- **Candidaturas simples**: evolução dos leads — estado por família (recebida → em análise → lista de espera → aceite), notas privadas da creche. Ainda sem documentos, só o fluxo
- **Dashboard admin de rede**: quantas creches ativas, % perfis completos, tempo médio de aprovação — para gerir a operação (e mostrar à FJM)

### Fase 3 — Plataforma (meses 4-12, já com equipa)
- **Mensagens bidirecionais** creche ↔ família dentro da app (substitui email/telefone)
- **Lista de espera completa**: posição visível para a família, documentos, confirmação anual
- **Benchmark anónimo**: "creches como a vossa no vosso concelho têm mensalidade média de X€" (dados agregados, nunca individuais)
- **Integração Creche Feliz**: estado oficial de adesão + vagas do programa, se o protocolo com a Segurança Social avançar
- **App nativa / notificações push** para as creches (vaga preenchida, novo lead)

---

## C. Princípios (não mudam)
- Gratuito para creches e famílias; sem anúncios; sem pay-to-rank — o selo verificado ganha-se com dados, não com dinheiro
- Dados pessoais das famílias só com consentimento e nunca vendidos; agregados sempre anónimos
- Moderação humana em tudo o que é público (fotos, perfis) enquanto a escala o permitir

## D. Métricas por fase
- **F0**: 0 falhas no fluxo claim→edição; tempo de aprovação <24h
- **F1**: ≥40% das creches ativas voltam ao painel em 30 dias; ≥60% dos perfis com descrição+mensalidade preenchidas
- **F2**: ≥1 lead entregue por creche ativa/mês nas zonas urbanas; ≥25 creches com selo verificado
- **F3**: 500 creches ativas; candidaturas a substituir telefonemas nas creches aderentes

## E. Dependências técnicas a não esquecer
- Regras: nova coleção `creche_leads` (create público validado + read só manager/admin), alteração em `vagas` para managers
- App Check / rate-limiting antes de abrir leads ao público (spam)
- Resend: verificar o domínio creches.app (hoje envia de onboarding@resend.dev — mata a entregabilidade dos emails de aprovação e resumos)
- `creche_views` agregação: para estatísticas de 30 dias considerar doc mensal agregado (menos leituras = menos custo)
