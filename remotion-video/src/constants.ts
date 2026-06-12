// ===== Constants-first design (edit everything here) =====
export const FPS = 30;
export const W = 1080;
export const H = 1920;

export const COLORS = {
  ink: '#2A2440',
  inkSoft: '#6E648C',
  pink: '#FF6B9D',
  orange: '#FF9F68',
  purple: '#B197FC',
  sky: '#6EC6F7',
  green: '#7DD389',
  yellow: '#FFC857',
  cream: '#FFF6EF',
  blush: '#FFE8F0',
  white: '#FFFFFF',
};

export const FONT_TITLE = 'Fredoka';
export const FONT_BODY = 'Nunito';

// Scene durations in frames (before transition overlap)
export const DUR = {
  hook: 115,
  mapa: 135,
  filtros: 135,
  detalhe: 135,
  pipeline: 135,
  cta: 130,
};
export const TRANS = 18; // 15-25 frames is the sweet spot

export const TOTAL =
  DUR.hook + DUR.mapa + DUR.filtros + DUR.detalhe + DUR.pipeline + DUR.cta - TRANS * 5;

export const COPY = {
  hookLine1: 'Encontrar creche',
  hookLine2: 'não devia ser difícil.',
  hookCounter: 2591,
  hookCounterLabel: 'creches em Portugal, num só sítio',
  scenes: {
    mapa: {
      title: 'Mapa interativo',
      sub: 'Vê todas as creches perto de ti',
      chips: ['📍 Perto de mim', '🗺 Desenhar área', '🚌 Direções'],
    },
    filtros: {
      title: 'Filtros à medida',
      sub: 'Encontra exatamente o que procuras',
      chips: ['Pública', 'IPSS', 'Privada', 'Berçário 0-1', 'Creche 1-3'],
    },
    detalhe: {
      title: 'Ficha completa',
      sub: 'Contactos, moradas e as tuas notas',
      chips: ['📞 Ligar', '✉️ Email', '⭐ Favorita', '📝 Notas'],
    },
    pipeline: {
      title: 'Acompanha o processo',
      sub: 'De contactada até aceite 🎉',
      chips: ['📞 Contactada', '⏰ Lista de espera', '📝 Inscrita', '🎉 Aceite'],
    },
  },
  cta: {
    title: 'Creches.app',
    sub: 'Grátis. Sem instalação.',
    button: 'creches.app',
  },
};
