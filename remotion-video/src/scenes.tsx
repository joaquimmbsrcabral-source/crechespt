import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {COLORS, COPY, FONT_BODY, FONT_TITLE} from './constants';
import {Accent, Background, Chips, KineticTitle, Phone, Subtitle} from './shared';

// ===== Scene 1: Hook (problem → big number) =====
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const counterSpring = spring({frame: frame - 42, fps, config: {damping: 30, stiffness: 60}});
  const n = Math.round(counterSpring * COPY.hookCounter);
  const counterIn = spring({frame: frame - 38, fps, config: {damping: 13, stiffness: 110}});
  const pulse = 1 + Math.sin(Math.max(0, frame - 70) / 9) * 0.012;
  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 40, padding: 70}}
      >
        <KineticTitle text={COPY.hookLine1} delay={4} size={108} />
        <KineticTitle text={COPY.hookLine2} delay={14} size={108} color={COLORS.pink} />
        <div
          style={{
            marginTop: 70,
            opacity: counterIn,
            transform: `translateY(${interpolate(counterIn, [0, 1], [60, 0])}px) scale(${counterIn * pulse})`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              fontFamily: FONT_TITLE,
              fontVariationSettings: "'wght' 600",
              fontSize: 210,
              lineHeight: 1,
              background: `linear-gradient(90deg, ${COLORS.pink}, ${COLORS.orange})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {n.toLocaleString('pt-PT')}
          </div>
          <Subtitle text={COPY.hookCounterLabel} delay={48} size={48} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ===== Generic feature scene: title + sub + phone + chips =====
export const FeatureScene: React.FC<{
  title: string;
  sub: string;
  chips: string[];
  shot: string;
  seed: number;
  panY?: number;
}> = ({title, sub, chips, shot, seed, panY = 0}) => {
  return (
    <AbsoluteFill>
      <Background seed={seed} />
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 110}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 26, alignItems: 'center'}}>
          <Accent delay={2} />
          <KineticTitle text={title} delay={5} size={88} />
          <Subtitle text={sub} delay={16} />
        </div>
        <div style={{marginTop: 56}}>
          <Phone src={shot} enterAt={10} panY={panY} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 90}}>
        <Chips items={chips} delay={32} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ===== Scene 6: CTA =====
export const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const logo = spring({frame: frame - 4, fps, config: {damping: 11, mass: 0.8, stiffness: 110}});
  const btn = spring({frame: frame - 34, fps, config: {damping: 12, stiffness: 120}});
  const btnPulse = 1 + Math.sin(Math.max(0, frame - 55) / 11) * 0.025;
  const float = Math.sin(frame / 34) * 7;
  return (
    <AbsoluteFill>
      <Background seed={9} />
      <AbsoluteFill
        style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 44}}
      >
        <Img
          src={staticFile('icon-512.png')}
          style={{
            width: 330,
            height: 330,
            transform: `scale(${logo}) translateY(${float}px) rotate(${interpolate(
              logo,
              [0, 1],
              [-14, 0]
            )}deg)`,
            filter: 'drop-shadow(0 40px 70px rgba(60,40,80,0.3))',
          }}
        />
        <KineticTitle text={COPY.cta.title} delay={14} size={120} />
        <Subtitle text={COPY.cta.sub} delay={24} size={52} />
        <div
          style={{
            marginTop: 36,
            opacity: btn,
            transform: `scale(${btn * btnPulse})`,
            fontFamily: FONT_BODY,
            fontVariationSettings: "'wght' 800",
            fontSize: 58,
            color: COLORS.white,
            background: `linear-gradient(90deg, ${COLORS.pink}, ${COLORS.orange})`,
            padding: '30px 90px',
            borderRadius: 999,
            boxShadow: '0 30px 60px rgba(255,107,157,0.45)',
          }}
        >
          {COPY.cta.button}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
