# Recolha nacional da Carta Social — CONCLUÍDA

**Concluída em:** 14 de agosto de 2026
**Estado:** feito e verificado. Falta correr `./deploy.sh`.

---

## O que mudou

| | Antes | Depois |
|---|---:|---:|
| Estabelecimentos no mapa | 2.591 | **4.150** |
| Confirmados na Carta Social | 214 | **2.176** |
| Sem qualquer contacto | 22% | **12%** |
| Com horário oficial | 0 | **1.881** |
| Com horário alargado identificado | 0 | **1.725** |
| Fichas públicas | 2.578 | **4.137** |
| Páginas de concelho | 275 | **292** |
| Cobertura da AML face à Carta Social | 33% | **79%** |

## O universo oficial, agora conhecido

A Carta Social regista, para a resposta social Creche em todo o país:

* **2.618 equipamentos**
* **141.156 lugares**
* **122.339 crianças** — uma ocupação de **87%**

Estes números são completos: vêm da contagem oficial por concelho, nos 308.

## Como se chegou aqui

1. `cache_freguesias.py` — 3.232 freguesias em 307 concelhos (geoapi.pt)
2. `carta_social_nacional.py` — varrimento dos 308 concelhos, 2.269 equipamentos identificados pelo nome
3. `carta_social_detalhe.py` — 2.271 fichas com morada, contactos, natureza jurídica, capacidade e **horário**
4. `geocodificar_carta_social.py` — 2.069 coordenadas via Nominatim, com o nível de precisão registado em cada uma
5. `importar_carta_social.py` — 1.116 registos novos; 313 já existiam com outro nome e foram **enriquecidos, não duplicados**

## Limitação que fica declarada

**2.400 dos 2.618 equipamentos identificados — 92%.** Faltam 218 nomes em
42 concelhos, todos urbanos.

Foram precisas três passagens para lá chegar:

1. **Varrimento por freguesia** com os códigos DICOFRE do geoapi.pt → 2.269 (87%)
2. **Códigos de freguesia por força bruta** → 2.368 (90%). Descobriu-se que a
   Carta Social **não usa os códigos do geoapi**: em Matosinhos o geoapi dá
   130815..130824 e a Carta Social só aceita 130811..130814. E um código que ela
   não reconhece não dá erro — devolve o concelho inteiro, o que fazia o
   varrimento pensar que uma freguesia tinha 45 creches quando tinha 11.
3. **Pesquisa por outras valências** (pré-escolar, CATL) nas freguesias cortadas
   → 2.400 (92%). A mesma creche aparece noutras listas, com outra ordenação, e
   por isso outros dez primeiros. Cada candidato foi confirmado na sua ficha:
   **171 foram descartados por não terem mesmo a valência creche**.

O que resta são freguesias urbanas com mais de dez creches em todas as listas.
A paginação da Carta Social é AJAX do PrimeFaces com estado de sessão que não se
reproduz por HTTP.

Onde falta:

* Lisboa — 30
* Cascais — 20
* Oeiras — 17
* Porto — 16
* Odivelas — 13
* Almada — 9
* Sintra — 8
* Matosinhos — 8
* Santarém — 8
* Vila Nova de Famalicão — 7

**Os totais não são afectados** — os 2.618 equipamentos, os 141.156 lugares e os
122.339 utentes vêm da contagem oficial por concelho, que é completa. É a
identificação individual que está a 92%.

Para fechar os últimos: pedir os dados abertos à DGSSS por email, ou automatizar
um browser real (a paginação funciona no browser, só não por HTTP).

## O horário alargado deixou de ser promessa

A proposta à Fundação Jerónimo Martins dizia que este dado "não existe em nenhuma
fonte oficial — só se obtém a telefonar". Existe, e já o temos para 1.881
estabelecimentos. A proposta foi corrigida: passou a "já a funcionar", com o
número real.

Critério, documentado em `scripts/horario.py`: abre às **7h30 ou antes**, ou fecha
às **19h00 ou depois**. É OR e não AND porque uma família de turnos precisa de uma
das pontas, não das duas. Nunca é marcada como alargada uma creche sem horário
confirmado — seria mandar um pai de turnos a uma creche que fecha às 18h.

## O que falta

```bash
./deploy.sh "Carta Social nacional: 4.150 estabelecimentos, contactos e horários oficiais"
```

E, quando houver tempo:

* email à DGSSS a pedir os dados abertos, para fechar os 349
* `scripts/limpar_emails_vagas.js` (com a chave de serviço) — apaga os emails de
  gestores que ficaram em documentos de leitura pública
* rever o relatório da Mensagem com os números novos
