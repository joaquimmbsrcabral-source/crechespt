# CrechesPT

Encontra a creche certa para o teu filho — mapa interativo com 2591 creches em Portugal, gestão de contactos e pipeline de processo.

Funcionalidades:
- Mapa Leaflet com clustering por região
- Filtros por distrito, localidade, tipo (Pública/IPSS/Privada) e faixa etária
- Desenho de área para selecionar creches numa zona específica
- Pipeline "Em processo" estilo kanban (contactada / lista espera / inscrita / aceite…)
- Login com Google (Firebase Auth)
- Dados sincronizados na cloud (Firestore) — todos os dispositivos vêem o mesmo

## Tech stack

- HTML/JS single-file — sem build step, sem framework
- [Leaflet](https://leafletjs.com) + [MarkerCluster](https://github.com/Leaflet/Leaflet.markercluster) + [Leaflet.draw](https://github.com/Leaflet/Leaflet.draw)
- [Firebase Auth + Firestore](https://firebase.google.com) (free tier)
- Hosting: [Vercel](https://vercel.com)
- Dataset: [OpenStreetMap](https://www.openstreetmap.org) via Overpass API (ODbL)

## Setup

Ver [`SETUP.md`](./SETUP.md).

## Estrutura

- `app.html` — a app completa (HTML + CSS + JS + dataset embebido)
- `creches_pt.json` — dataset em texto (referência, não usado em runtime)
- `firestore.rules` — regras de segurança Firestore
- `vercel.json` — config de deploy
- `SETUP.md` — guia passo-a-passo

## Licença

Código: MIT. Dados das creches: ODbL (OpenStreetMap).
