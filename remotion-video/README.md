# Creches.app — vídeo demo (Remotion)

Vídeo 9:16 (1080×1920, 30fps, ~23s) gerado programaticamente com Remotion.

- `npm install` e depois `npm run dev` para abrir o Remotion Studio e editar ao vivo
- `npm run render` para renderizar o MP4
- Todo o texto, cores e timings estão em `src/constants.ts` (constants-first)
- Screenshots reais da app em `public/` — para atualizar, basta substituí-los

## Áudio

- `public/music.mp3` — "Llama in Pajama" (FreePD/Internet Archive, CC0, uso comercial livre)
- `public/whoosh.wav`, `pop.wav`, `ding.wav` — efeitos gerados proceduralmente (sem direitos)
- Música e efeitos estão no componente `Sound` em `src/Root.tsx`, sincronizados com as transições
