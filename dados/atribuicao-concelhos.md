# Atribuição de concelho por coordenadas

Gerado em 2026-07-25.

## Método

Point-in-polygon (shapely) das coordenadas `lat`/`lon` de cada creche contra os limites
oficiais dos 308 municípios da CAOP (Direção-Geral do Território).

- Fonte do GeoJSON: <https://github.com/nmota/caop_GeoJSON> — ficheiro `Portugal_Municipalities.geojson`
  (308 municípios, CRS84/WGS84, com código DICO, Continente + Açores + Madeira).
- A junção com `dados/populacao-concelhos.json` foi feita pelo código **DICO**, não pelo nome,
  o que garante correspondência exacta dos 308 concelhos (0 falhas em ambos os sentidos).
- O nome e o slug gravados em cada creche vêm de `dados/populacao-concelhos.json`, pelo que
  `concelho_slug` cruza sempre com o campo `slug` desse ficheiro.
- `dados/municipios.geojson` guarda uma versão simplificada (tolerância 0,0002° ≈ 22 m, 2,7 MB)
  para uso em mapas. A atribuição foi feita com a geometria à resolução total.

## Resultados

| Métrica | Valor |
|---|---|
| Creches no dataset | 2591 |
| Com `concelho` atribuído | 2591 (100.0%) |
| Atribuídas por **contenção** (ponto dentro do polígono) | 2591 (100.0%) |
| Atribuídas por **proximidade** (`concelho_aprox: true`) | 0 |
| Concelhos distintos representados | 275 de 308 |
| Concelhos sem nenhuma creche no dataset | 33 |

## Distribuição por distrito

| Distrito | Creches | % |
|---|---:|---:|
| Lisboa | 526 | 20.3% |
| Porto | 324 | 12.5% |
| Setúbal | 276 | 10.7% |
| Aveiro | 229 | 8.8% |
| Braga | 185 | 7.1% |
| Leiria | 153 | 5.9% |
| Faro | 137 | 5.3% |
| Coimbra | 126 | 4.9% |
| Viseu | 122 | 4.7% |
| Santarém | 103 | 4.0% |
| Vila Real | 64 | 2.5% |
| Castelo Branco | 57 | 2.2% |
| Évora | 54 | 2.1% |
| Guarda | 43 | 1.7% |
| Viana do Castelo | 39 | 1.5% |
| Beja | 38 | 1.5% |
| Bragança | 33 | 1.3% |
| Portalegre | 31 | 1.2% |
| Região Autónoma dos Açores | 28 | 1.1% |
| Região Autónoma da Madeira | 23 | 0.9% |
| **Total** | **2591** | **100%** |

## Top 15 concelhos

| Concelho | Creches |
|---|---:|
| Lisboa | 130 |
| Sintra | 81 |
| Almada | 65 |
| Leiria | 57 |
| Seixal | 54 |
| Porto | 54 |
| Santa Maria da Feira | 54 |
| Vila Nova de Gaia | 52 |
| Cascais | 48 |
| Braga | 47 |
| Oeiras | 47 |
| Loures | 41 |
| Coimbra | 41 |
| Gondomar | 40 |
| Montijo | 40 |

## Amostra: `localidade` antiga vs `concelho` novo

1646 creches (63.5%) tinham uma `localidade` diferente do concelho oficial.
Amostra dos 15 concelhos onde essa divergência é mais frequente:

| Creche | `localidade` (antiga) | `concelho` (novo) | Distrito |
|---|---|---|---|
| Jardim de Infância "As Quatro Estações" | Queluz | Sintra | Lisboa |
| Centro Infantil de Lourosa | — | Santa Maria da Feira | Aveiro |
| Jardim de Infância "Parque dos Sorrisos" | Amora | Seixal | Setúbal |
| Colégio Santiago | Carnaxide | Oeiras | Lisboa |
| Creche Gente Pequena | — | Lisboa | Lisboa |
| ATL | — | Cascais | Lisboa |
| Jardim de Infância "A Cidade da Brincadeira" | — | Almada | Setúbal |
| O Soutinho | — | Gondomar | Porto |
| Nuvem do Saber | — | Vila Nova de Gaia | Porto |
| Mimarte | Moscavide | Loures | Lisboa |
| Jardim de Infância da Associação Maconde | — | Braga | Braga |
| O Dominó | — | Leiria | Leiria |
| Jardim de Infância de Valdossos | — | Vila Nova de Famalicão | Braga |
| CATL | — | Viseu | Viseu |
| Jardim de Infância "Chuxinhas" | Póvoa de Santa Iria | Vila Franca de Xira | Lisboa |

## Notas de qualidade

- Nenhuma creche precisou de atribuição por proximidade: as 2591 coordenadas caem todas dentro
  de um município da CAOP.
- 530 creches (20,5%) tinham um campo `distrito` que não corresponde ao distrito do concelho
  agora atribuído. Destas, 50 são apenas diferença de nomenclatura (`Açores` / `Madeira` vs
  `Região Autónoma dos Açores` / `Região Autónoma da Madeira`); as restantes **480 são erros do
  campo `distrito` original**, quase sempre para um distrito vizinho — os pares mais frequentes
  são Porto→Aveiro (65), Braga→Porto (48), Guarda→Viseu (44), Leiria→Lisboa (42) e
  Viana do Castelo→Braga (34). Verificação manual: "Jardim-Escola de Tropeço" (Arouca),
  "Creche Jardim de Infância CATL" (Espinho) e "Centro Infantil de Lourosa"
  (Santa Maria da Feira) estavam marcadas como distrito Porto — os três concelhos são de Aveiro.
  Ou seja, o novo campo `concelho` é mais fiável do que o `distrito` existente.
  O campo `distrito` original **não foi alterado**.

| Creche | `distrito` antigo | Concelho novo | Distrito do concelho |
|---|---|---|---|
| Jardim Escola | Leiria | Figueira da Foz | Coimbra |
| Jardim Infantil da Santa Casa da Misericórdia de Cinfães | Vila Real | Cinfães | Viseu |
| Casa de Benificiência Dias Machado | Braga | Santo Tirso | Porto |
| Jardim de Infância da Santa Casa | Coimbra | Mealhada | Aveiro |
| Jardim-Escola de Tropeço | Porto | Arouca | Aveiro |
| Traquinas | Madeira | Funchal | Região Autónoma da Madeira |
| Batatinho | Santarém | Lourinhã | Lisboa |
| Bercário e Infantário São José | Braga | Felgueiras | Porto |
| Centro Paroquial da Benedita | Santarém | Alcobaça | Leiria |
| Centro Jovem | Braga | Arcos de Valdevez | Viana do Castelo |
| Refúgio do Bebé | Madeira | Funchal | Região Autónoma da Madeira |
| Toca do Trincas | Beja | Santiago do Cacém | Setúbal |
| Búzio | Madeira | Machico | Região Autónoma da Madeira |
| Infantário A Gaivota | Madeira | Machico | Região Autónoma da Madeira |
| Infantário O Barquinho | Madeira | Machico | Região Autónoma da Madeira |
| Infantário | Madeira | Machico | Região Autónoma da Madeira |
| Refúgio do Bebé | Madeira | Funchal | Região Autónoma da Madeira |
| Santa Casa da Misericórdia de Anadia | Coimbra | Anadia | Aveiro |
| ATL | Coimbra | Mealhada | Aveiro |
| Creche e Jardim de Infância O Golfinho | Açores | Angra do Heroísmo | Região Autónoma dos Açores |

- Validação cruzada: refazer o point-in-polygon com o GeoJSON simplificado devolve o mesmo
  concelho em 2590/2591 casos e 0 atribuições erradas (1 ponto costeiro cai fora do polígono
  simplificado). O ficheiro simplificado é seguro para visualização.
- Campos adicionados: `concelho`, `concelho_slug` (e `concelho_aprox` quando aplicável).
  Nenhum campo existente foi removido ou alterado. Cópia de segurança em `creches_pt.json.bak`.
