import React, {useEffect, useState} from 'react';
import {
  AbsoluteFill,
  Img,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {COLORS, FONT_BODY, FONT_TITLE} from './constants';

// ===== Fonts =====
let fontsLoaded = false;
export const useFonts = () => {
  const [handle] = useState(() => (fontsLoaded ? null : delayRender('fonts')));
  useEffect(() => {
    if (fontsLoaded || handle === null) return;
    Promise.all([
      new FontFace(FONT_TITLE, `url(${staticFile('Fredoka.ttf')})`).load(),
      new FontFace(FONT_BODY, `url(${staticFile('Nunito.ttf')})`).load(),
    ]).then((faces) => {
      faces.forEach((f) => document.fonts.add(f));
      fontsLoaded = true;
      continueRender(handle);
    });
  }, [handle]);
};

// ===== Animated pastel background =====
export const Background: React.FC<{seed?: number}> = ({seed = 0}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const blob = (i: number) => ({
    x: Math.sin(t * 0.25 + i * 2.1 + seed) * 60,
    y: Math.cos(t * 0.2 + i * 1.7 + seed) * 50,
  });
  const b0 = blob(0);
  const b1 = blob(1);
  const b2 = blob(2);
  return (
    <AbsoluteFill
      style={{background: `linear-gradient(180deg, ${COLORS.cream} 0%, ${COLORS.blush} 100%)`}}
    >
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          borderRadius: '50%',
          background: 'rgba(255,214,228,0.7)',
          filter: 'blur(120px)',
          left: -300 + b0.x,
          top: -250 + b0.y,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: 'rgba(225,214,255,0.65)',
          filter: 'blur(120px)',
          right: -280 + b1.x,
          top: 500 + b1.y,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 850,
          height: 850,
          borderRadius: '50%',
          background: 'rgba(209,235,255,0.6)',
          filter: 'blur(120px)',
          left: -200 + b2.x,
          bottom: -350 + b2.y,
        }}
      />
    </AbsoluteFill>
  );
};

// ===== Phone mockup with spring entrance + idle float =====
export const Phone: React.FC<{
  src: string;
  enterAt?: number;
  width?: number;
  panY?: number; // slow vertical pan of the screenshot inside (px)
}> = ({src, enterAt = 0, width = 760, panY = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({
    frame: frame - enterAt,
    fps,
    config: {damping: 16, mass: 0.9, stiffness: 90},
  });
  const float = Math.sin(frame / 38) * 8;
  const bezel = 17;
  const radius = 88;
  const imgH = (width * 2532) / 1170;
  const pan = interpolate(frame, [enterAt, enterAt + 120], [0, panY], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        transform: `translateY(${interpolate(enter, [0, 1], [620, 0]) + float}px) scale(${interpolate(
          enter,
          [0, 1],
          [0.92, 1]
        )})`,
        width: width + bezel * 2,
        borderRadius: radius,
        background: '#1E1B2E',
        padding: bezel,
        boxShadow: '0 60px 120px rgba(60,40,80,0.35)',
        position: 'relative',
      }}
    >
      <div
        style={{
          borderRadius: radius - bezel,
          overflow: 'hidden',
          width,
          height: Math.min(imgH, 1560),
          position: 'relative',
        }}
      >
        <Img
          src={staticFile(src)}
          style={{width, height: imgH, display: 'block', transform: `translateY(${-pan}px)`}}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          top: bezel + 16,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 190,
          height: 46,
          borderRadius: 26,
          background: '#0F0D1A',
        }}
      />
    </div>
  );
};

// ===== Kinetic title: words slam in with spring =====
export const KineticTitle: React.FC<{
  text: string;
  delay?: number;
  size?: number;
  color?: string;
  stagger?: number;
}> = ({text, delay = 0, size = 92, color = COLORS.ink, stagger = 4}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = text.split(' ');
  return (
    <div
      style={{
        display: 'flex',
        gap: '0.28em',
        justifyContent: 'center',
        flexWrap: 'wrap',
        fontFamily: FONT_TITLE,
        fontVariationSettings: "'wght' 600",
        fontSize: size,
        color,
        lineHeight: 1.1,
      }}
    >
      {words.map((w, i) => {
        const s = spring({
          frame: frame - delay - i * stagger,
          fps,
          config: {damping: 12, mass: 0.6, stiffness: 130},
        });
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [46, 0])}px) scale(${interpolate(
                s,
                [0, 1],
                [1.25, 1]
              )})`,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Subtitle: React.FC<{text: string; delay?: number; size?: number}> = ({
  text,
  delay = 0,
  size = 44,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 15, stiffness: 100}});
  return (
    <div
      style={{
        fontFamily: FONT_BODY,
        fontVariationSettings: "'wght' 700",
        fontSize: size,
        color: COLORS.inkSoft,
        textAlign: 'center',
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [26, 0])}px)`,
      }}
    >
      {text}
    </div>
  );
};

// ===== Staggered floating chips =====
const CHIP_BG = [COLORS.pink, COLORS.purple, COLORS.sky, COLORS.orange, COLORS.green];
export const Chips: React.FC<{items: string[]; delay?: number}> = ({items, delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 940}}>
      {items.map((c, i) => {
        const s = spring({
          frame: frame - delay - i * 5,
          fps,
          config: {damping: 11, mass: 0.5, stiffness: 140},
        });
        const float = Math.sin(frame / 30 + i * 1.4) * 4;
        return (
          <div
            key={i}
            style={{
              fontFamily: FONT_BODY,
              fontVariationSettings: "'wght' 800",
              fontSize: 34,
              color: COLORS.white,
              background: CHIP_BG[i % CHIP_BG.length],
              padding: '14px 30px',
              borderRadius: 999,
              boxShadow: '0 12px 30px rgba(60,40,80,0.18)',
              opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [40, 0]) + float}px) scale(${s})`,
            }}
          >
            {c}
          </div>
        );
      })}
    </div>
  );
};

// ===== Accent bar above titles =====
export const Accent: React.FC<{delay?: number}> = ({delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 14, stiffness: 120}});
  return (
    <div
      style={{
        width: 130 * s,
        height: 18,
        borderRadius: 10,
        background: `linear-gradient(90deg, ${COLORS.pink}, ${COLORS.orange})`,
        margin: '0 auto',
      }}
    />
  );
};
