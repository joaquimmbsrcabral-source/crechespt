# Auditoria do Dataset Creches.app

**Data:** 22 Junho 2026
**Total de creches analisadas:** 2.591

> ⚠️ Este relatório só audita as **2591** creches do `creches_pt.json` (OSM).
> As **270 novas via Carta Social** estão no Firestore — auditar via /admin com mesmos critérios.

---

## 📊 Resumo

| Problema | Casos | % do total |
|---|---:|---:|
| 🏷 Nome suspeito | **20** | 0.8% |
| 📞 Telefone inválido | **101** | 3.9% |
| ✉ Email mal formatado | **58** | 2.2% |
| 📍 Coordenadas em falta | **0** | 0.0% |
| 🌍 Coordenadas fora PT | **0** | 0.0% |
| 🚫 Sem qualquer contacto | **575** | 22.2% |
| ❓ Tipo desconhecido | **569** | 22.0% |
| 🎂 Idades em falta | **0** | 0.0% |
| ⚠️ Idade fora 0-156 meses | **0** | 0.0% |
| 🔄 Idade min > max | **0** | 0.0% |
| 🗺 Distrito em falta | **1** | 0.0% |
| 🔠 Distrito em CAPS | **0** | 0.0% |
| 📮 Código postal inválido | **10** | 0.4% |
| ♊ Possíveis duplicados (mesmo nome+localidade) | **25** | 1.0% |

---

## 🏷 Nome suspeito (20)

| id | nome | razao | distrito |
| --- | --- | --- | --- |
| osm-node-1420826229 | Datacool | nome de teste | Lisboa |
| osm-node-1537328240 | ATL | muito curto (≤3 chars) | Lisboa |
| osm-node-2001156148 | ATL | muito curto (≤3 chars) | Coimbra |
| osm-node-2402924661 | Creche/J.I. (Inactivo) | marcador de encerrada | Lisboa |
| osm-node-10893744545 | Escola Basica E Jardim De Infancia De Vila Nova Da Rainha | Escola Básica (não creche) | Santarém |
| osm-way-130301771 | ATL | muito curto (≤3 chars) | Coimbra |
| osm-way-177238649 | Escola Básica do 1º Ciclo de Lijó | Escola Básica (não creche) | Braga |
| osm-way-190495100 | Antiga Escola básica do Vacalar | Escola Básica (não creche) | Vila Real |
| osm-way-246697644 | ATL | muito curto (≤3 chars) | Coimbra |
| osm-way-252189696 | Escola Básica do Outeirinho | Escola Básica (não creche) | Aveiro |
| osm-way-252636930 | Escola Básica do 1º Ciclo de Igreja (Banho e Carvalhosa) | Escola Básica (não creche) | Braga |
| osm-way-396121344 | Escola Básica de Matosinhos | Escola Básica (não creche) | Porto |
| osm-way-416981177 | Escola Básica de Tondela | Escola Básica (não creche) | Viseu |
| osm-way-900010468 | Escola Básica do 1º Ciclo e Jardim de Infância de Parada ... | Escola Básica (não creche) | Vila Real |
| osm-way-900945111 | Escola Básica do 1º Ciclo e Jardim de Infância de Vila Marim | Escola Básica (não creche) | Vila Real |
| osm-way-1263042766 | Escola Básica de Vila Fernando | Escola Básica (não creche) | Guarda |
| osm-way-1263042772 | Escola Básica do 1º Ciclo e Jardim de Infância de Castanh... | Escola Básica (não creche) | Guarda |
| osm-way-1268030449 | Escola Básica de Fermil | Escola Básica (não creche) | Viana do Castelo |
| osm-node-6436616566 | Sol | muito curto (≤3 chars) | Lisboa |
| osm-node-11210710338 | Ba | muito curto (≤3 chars) | Lisboa |

---

## 📞 Telefone inválido (101)

*Mostrando 20 de 101. Lista completa via export JSON.*


| id | nome | tel | distrito |
| --- | --- | --- | --- |
| osm-node-1988149424 | Jardim de Infância "O Castelo" | +351 271 214 803;+351 271222943 | Guarda |
| osm-node-5863089539 | Jardim de Infância A Cidade da Brincadeira | +351 966631807;+351 212761823 | Setúbal |
| osm-node-11763629131 | Jardim de Infância do Samouco | +351 212321873;+351 913026586 | Setúbal |
| osm-node-11831664827 | Creche Planeta dos Traquinas | +351 214 031 369;+351 917 746 615;+351 935 270 453 | Lisboa |
| osm-node-11835234051 | Jardim de Infância Bolinha de Neve | +351 261 095 794;+351 918 178 388 | Leiria |
| osm-node-11835677801 | Colégio A Sandrinha | +351 214 785 124;+351 965 762 180;+351 961 585 737 | Lisboa |
| osm-node-11835677852 | Creche Colinas do Cruzeiro e Jardim de Infância | +351 219 313 170;+351 914 744 281 | Lisboa |
| osm-node-11879391589 | Colégio "Cantinho das Alfazemas" | +351 215 900 211;+351 918 225 051 | Lisboa |
| osm-node-11893446112 | Centro Social do Sagrado Coração de Jesus | +351 213902112;+351 938855204 | Lisboa |
| osm-node-11954714318 | Externato Senhora do Alívio | +351 255494758;+351 255137146 | Braga |
| osm-node-11954730322 | Creche e Jardim de Infância do Centro Social e Paroquial ... | +351 925 340 301;+351 255488574 | Braga |
| osm-node-11954763472 | Jardim de Infância Paços 2000 | +351 938 864 121;+351 255 880 290 | Porto |
| osm-node-11956149079 | Jardim de Infância do Centro Paroquial Social de Barbeita | +351 251534165;+351 926235118 | Viana do Castelo |
| osm-node-11959253163 | MutKids | +351 232724631;+351 925662519 | Castelo Branco |
| osm-node-11961365580 | Jardim de Infância de Olival Social | +351 227 652 206;+351 960 426 922 | Porto |
| osm-node-11970695439 | Infantário da Obra do Frei Gil | +351 234750146;+351 926260158 | Aveiro |
| osm-node-11974118499 | Creche de São Gregório | +351 284 321 257;+351 924 128 490 | Setúbal |
| osm-node-11984264593 | Jardim de Infância “Cantinho dos Avós” | +351 282422635;+351 927939540 | Faro |
| osm-node-12046594986 | Colégio Fragata | +351 218283498;+351 919881692 | Setúbal |
| osm-node-12046594999 | Colégio "Os Beicinhas" | +351 210 939 532;+351 964 153 089 | Setúbal |

---

## ✉ Email mal formatado (58)

*Mostrando 20 de 58. Lista completa via export JSON.*


| id | nome | email | distrito |
| --- | --- | --- | --- |
| osm-node-1988149424 | Jardim de Infância "O Castelo" | jardimocastelo@gmail.com;ji.alfarazes@escolas.min-edu.pt | Guarda |
| osm-node-6147511273 | Jardim de Infância de Vila Nova de Milfontes | diretora.milfontes@gmail.com;secretariamilfontes@sapo.pt | Beja |
| osm-node-7208310227 | Jardim de Infância de Ermidas-Sado | executivo@aepal.pt;secretaria@aepal.pt | Beja |
| osm-node-11289627736 | Creche e Pré-Escolar da Guarda | infantario.guarda@misericordiadamaia.com;cs.jmslucindaasi... | Porto |
| osm-node-11733773536 | Jardim de Infância Academia dos Peixinhos | geral@academiadospeixinhos.pt;ji.academiadospeixinhos@esc... | Lisboa |
| osm-node-11768989061 | Jardim de Infância n.º 2 de Grândola | direcao@ae-grandola.pt;secretaria@ae-grandola.pt | Beja |
| osm-node-11835677801 | Colégio A Sandrinha | colegiosandrinha@gmail.com;ji.sandrinhapontinha@escolas.m... | Lisboa |
| osm-node-11954312512 | Jardim de Infância "Aldeia da Gente Pequena" | agpinterno@gmail.com;a.g.pequena@gmail.com | Braga |
| osm-node-11981109073 | Jardim de Infância "O Petiz" | ass.opetiz@escolas.min-edu.pt;direcao.petiz@gmail.com | Leiria |
| osm-node-12058101530 | Jardim Infantil "O Rei na Barriga" | info@oreinabarriga.pt;gsoares@oreinabarriga.pt | Lisboa |
| osm-node-12059168073 | Jardim de Infância da Belourinha | belourinha@escolas.min-edu.pt;secretaria@colegiodabeloura.pt | Lisboa |
| osm-node-12059868017 | Jardim de Infância "Os Meus Amigos" | colegioosamigos@gmail.com;margaridagomescolegio@gmail.com | Lisboa |
| osm-node-12064923060 | Escola Montessori São Lourenço | montessorischoolsl@gmail.com;oateliermontessori@gmail.com | Lisboa |
| osm-node-12083592505 | Jardim de Infância do Centro Cultural e Social de Santo A... | csc.staadriao@escolas.min-edu.pt;geral@santoadriao.com | Braga |
| osm-way-113695539 | Infantário A Borboleta da Santa Casa da Misericórdia de A... | ji.scmaljustrel@escolas.min-edu.pt;scmsecretaria5@gmail.com | Beja |
| osm-way-157100516 | Jardim De Infância Da Santa Casa Da Misericórdia De Ponte... | dora.cabeca@scmps.pt;jardimescolascmps@hotmail.com | Beja |
| osm-way-160219610 | Jardim de Infância da Quinta da Princesa | pedroeaneslobato@aepel.org;secretaria@aepel.org | Setúbal |
| osm-way-169257468 | Jardim de Infância "Magia de Crescer" | geral@scmtarouca.org;ji.scm.tarouca@escolas.min-edu.pt | Castelo Branco |
| osm-way-215528923 | Colégio Infantil "Os Ratinhos" | info@infantarioratinhos.com;cl.osratinhos@escolas.min-edu.pt | Porto |
| osm-way-285800059 | Creche/Pré-Escolar de Crestins | infantario.crestins@misericordiadamaia.com;ji.crestins@es... | Porto |

---

## 🚫 Sem qualquer contacto (575)

*Mostrando 20 de 575. Lista completa via export JSON.*


| id | nome | distrito |
| --- | --- | --- |
| osm-node-595655637 | Jardim de Infância Glória Leão | Porto |
| osm-node-1033327595 | Centro Infantil da Santa Casa da Misericórida de Cuba | Beja |
| osm-node-1126452530 | Shalom | Aveiro |
| osm-node-1159166515 | Jardim Escola | Leiria |
| osm-node-1205891541 | Jardim Escola | Santarém |
| osm-node-1225469967 | Jardim de Infância da Associação Maconde | Braga |
| osm-node-1238482887 | Jardim de Infância da Santa Casa da Misericórdia | Porto |
| osm-node-1240877911 | Jardim Infantil da Santa Casa da Misericórdia de Cinfães | Vila Real |
| osm-node-1243162055 | Casa de Benificiência Dias Machado | Braga |
| osm-node-1243615940 | Jardim de Infância Fonte dos Dois Amigos | Porto |
| osm-node-1257259826 | Jardim de Infância da Santa Casa | Coimbra |
| osm-node-1314685140 | Externato Nossa Senhora da Piedade | Évora |
| osm-node-1327754926 | Jardim-Escola de Tropeço | Porto |
| osm-node-1353920649 | Traquinas | Madeira |
| osm-node-1362965511 | Pequinitates e Companhia | Aveiro |
| osm-node-1370341822 | Infantário de Refóios do Lima | Viana do Castelo |
| osm-node-1385015885 | Jardim Infantil de Casconha | Porto |
| osm-node-1385015921 | Jardim Infantil de Castromil | Porto |
| osm-node-1393752220 | Casa da Criança | Coimbra |
| osm-node-1397633823 | Batatinho | Santarém |

---

## ❓ Tipo desconhecido (569)

*Mostrando 20 de 569. Lista completa via export JSON.*


| id | nome | distrito |
| --- | --- | --- |
| osm-node-595655637 | Jardim de Infância Glória Leão | Porto |
| osm-node-1126452530 | Shalom | Aveiro |
| osm-node-1159166515 | Jardim Escola | Leiria |
| osm-node-1205891541 | Jardim Escola | Santarém |
| osm-node-1243162055 | Casa de Benificiência Dias Machado | Braga |
| osm-node-1243615940 | Jardim de Infância Fonte dos Dois Amigos | Porto |
| osm-node-1314685140 | Externato Nossa Senhora da Piedade | Évora |
| osm-node-1327754926 | Jardim-Escola de Tropeço | Porto |
| osm-node-1353920649 | Traquinas | Madeira |
| osm-node-1362965511 | Pequinitates e Companhia | Aveiro |
| osm-node-1370341822 | Infantário de Refóios do Lima | Viana do Castelo |
| osm-node-1385015885 | Jardim Infantil de Casconha | Porto |
| osm-node-1385015921 | Jardim Infantil de Castromil | Porto |
| osm-node-1393752220 | Casa da Criança | Coimbra |
| osm-node-1397633823 | Batatinho | Santarém |
| osm-node-1420826229 | Datacool | Lisboa |
| osm-node-1434529887 | Bercário e Infantário São José | Braga |
| osm-node-1482845545 | Jardim de Infância | Leiria |
| osm-node-1491899838 | Infantário das Dominicas | Braga |
| osm-node-1494161456 | Centro Jovem | Braga |

---

## 🗺 Distrito em falta (1)

| id | nome |
| --- | --- |
| osm-way-1508203306 | Creche e Jardim de Infância O Balão |

---

## 📮 Código postal inválido (10)

| id | nome | cp |
| --- | --- | --- |
| osm-node-5614011685 | O Cantinho da Cegonha | 2685 |
| osm-node-5863089535 | Jardim de Infância João Pestana | 2825 |
| osm-node-11974118499 | Creche de São Gregório | 7800 |
| osm-node-13026287620 | Ouriços do Saber | 2620288 |
| osm-way-93987305 | Bela Vista | 3750 |
| osm-way-280769313 | Jardim de Infância | 2560 |
| osm-way-430995350 | Centro Paroquial de Caldas da Rainha | 2500 |
| osm-way-872715645 | Creche e Jardim de Infância da Biquinha | 4450 |
| osm-way-1214952584 | Centro de Bem Estar Social da Sagrada Família | 3000 - 324 |
| osm-way-1291587209 | Creche do Bairro da Apariça | 7800 |

---

## ♊ Possíveis duplicados (mesmo nome+localidade) (25)

*Mostrando 20 de 25. Lista completa via export JSON.*


**jardimescola / Leiria** (2 creches):
  - `osm-node-1159166515` — Jardim Escola (None)
  - `osm-way-135195557` — Jardim Escola (None)

**casadacrianca / Coimbra** (2 creches):
  - `osm-node-1393752220` — Casa da Criança (None)
  - `osm-way-1087544462` — Casa da Criança (None)

**refugiodobebe / Madeira** (2 creches):
  - `osm-node-1494332433` — Refúgio do Bebé (None)
  - `osm-node-1816089757` — Refúgio do Bebé (None)

**crechecruzvermelha / Braga** (2 creches):
  - `osm-node-1988288505` — Creche Cruz Vermelha (None)
  - `osm-way-311434170` — Creche Cruz Vermelha (None)

**atl / Coimbra** (3 creches):
  - `osm-node-2001156148` — ATL (None)
  - `osm-way-130301771` — ATL (None)
  - `osm-way-246697644` — ATL (None)

**ogolfinho / Madeira** (2 creches):
  - `osm-node-4283161658` — O Golfinho (None)
  - `osm-node-4318631554` — O Golfinho (None)

**jardimdeinfanciaonossojardim / Setúbal / Fernão Ferro** (2 creches):
  - `osm-node-5871309341` — Jardim de Infância O Nosso Jardim (Fernão Ferro)
  - `osm-way-1300199584` — Jardim de Infância "O Nosso Jardim" (Fernão Ferro)

**navozinha / Lisboa** (2 creches):
  - `osm-node-9730189235` — N´Avozinha (None)
  - `osm-node-9730189237` — N´Avozinha (None)

**jardimdeinfanciajoaopedefeijao / Porto / Santa Maria da Feira** (2 creches):
  - `osm-node-11453860481` — Jardim de Infância "João Pé-de-Feijão" (Santa Maria da Feira)
  - `osm-way-917216509` — Jardim de infância "João Pé-de-Feijão" (Santa Maria da Feira)

**jardimdeinfanciadealdeianova / Braga / Ribeirão** (2 creches):
  - `osm-node-11770206502` — Jardim de Infância de Aldeia Nova (Ribeirão)
  - `osm-way-107492398` — Jardim de Infância de Aldeia Nova (Ribeirão)

**jardimdeinfanciadocentrodeapoioacrianca / Lisboa / Agualva-Cacém** (2 creches):
  - `osm-node-12060004677` — Jardim de Infância do Centro de Apoio à Criança (Agualva-Cacém)
  - `osm-node-12060004678` — Jardim de Infância do Centro de Apoio à Criança (Agualva-Cacém)

**creche / Setúbal** (2 creches):
  - `osm-node-13153880050` — Creche (None)
  - `osm-node-13153880051` — Creche (None)

**crechedobairrodoarmador / Lisboa** (2 creches):
  - `osm-way-99635186` — Creche do Bairro do Armador (None)
  - `osm-way-150618628` — Creche do Bairro do Armador (None)

**casadopovo / Braga** (2 creches):
  - `osm-way-134659907` — Casa do Povo (None)
  - `osm-way-274692944` — Casa do Povo (None)

**jardimdeinfanciamisericordia / Braga** (2 creches):
  - `osm-way-188335907` — Jardim de Infância Misericórdia (None)
  - `osm-way-194280824` — Jardim de Infância Misericórdia (None)

**creche / Aveiro** (2 creches):
  - `osm-way-198190799` — Creche (None)
  - `osm-way-436761418` — Creche (None)

**centrosocialdocoutomineirodopejao / Porto** (2 creches):
  - `osm-way-386689788` — Centro Social do Couto Mineiro do Pejão (None)
  - `osm-node-12927908570` — Centro Social do Couto Mineiro do Pejão (None)

**jardimdeinfanciadepechao / Faro / Olhão** (2 creches):
  - `osm-way-634389772` — Jardim de Infância de Pechão (Olhão)
  - `osm-way-1293493529` — Jardim de Infância de Pechão (Olhão)

**centrosocialdepacosdebrandao / Porto** (4 creches):
  - `osm-way-761579566` — Centro Social de Paços de Brandão (None)
  - `osm-way-761579567` — Centro Social de Paços de Brandão (None)
  - `osm-way-964390650` — Centro Social de Paços de Brandão (None)
  - `osm-node-8920333307` — Centro Social de Paços de Brandão (None)

**jardimdeinfanciadeaguda / Coimbra / Aguda** (2 creches):
  - `osm-way-900531201` — Jardim de Infância de Aguda (Aguda)
  - `osm-way-1274251889` — Jardim de Infância de Aguda (Aguda)

---

## 🎯 Top 5 acções recomendadas

1. **Esconder/remover creches com nomes suspeitos**
   → /admin → bulk delete por ID lista nome_suspeito

2. **Tentar enriquecer creches sem contactos via Google Search**
   → Script externo de geocoding/enrichment

3. **Reclassificar tipo dos 'Desconhecido' via heurística do nome**
   → Reusar lógica de reclassificação

4. **Fundir duplicados manualmente no /admin**
   → 25 pares de duplicados detectados

