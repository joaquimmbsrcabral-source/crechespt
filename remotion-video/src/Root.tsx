import React from 'react';
import {Audio, Composition, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {COPY, DUR, FPS, H, TOTAL, TRANS, W} from './constants';
import {useFonts} from './shared';
import {CtaScene, FeatureScene, HookScene} from './scenes';

const timing = linearTiming({durationInFrames: TRANS});

// Scene start frames (cumulative, minus transition overlap) — for the whooshes
const SCENE_STARTS = [
  DUR.hook - TRANS,
  DUR.hook + DUR.mapa - TRANS * 2,
  DUR.hook + DUR.mapa + DUR.filtros - TRANS * 3,
  DUR.hook + DUR.mapa + DUR.filtros + DUR.detalhe - TRANS * 4,
  DUR.hook + DUR.mapa + DUR.filtros + DUR.detalhe + DUR.pipeline - TRANS * 5,
];

const Sound: React.FC = () => {
  const frame = useCurrentFrame();
  const musicVolume =
    0.55 *
    interpolate(frame, [0, 18, TOTAL - 51, TOTAL], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  return (
    <>
      <Audio src={staticFile('music.mp3')} volume={musicVolume} />
      {/* pop no contador 2 591 */}
      <Sequence from={38}>
        <Audio src={staticFile('pop.wav')} volume={0.75} />
      </Sequence>
      {/* whoosh em cada transição de cena */}
      {SCENE_STARTS.map((f, i) => (
        <Sequence key={i} from={f - 5}>
          <Audio src={staticFile('whoosh.wav')} volume={0.7} />
        </Sequence>
      ))}
      {/* ding no botão CTA */}
      <Sequence from={SCENE_STARTS[4] + 34}>
        <Audio src={staticFile('ding.wav')} volume={0.8} />
      </Sequence>
    </>
  );
};

const Main: React.FC = () => {
  useFonts();
  return (
    <>
      <Sound />
      <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={DUR.hook}>
        <HookScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={DUR.mapa}>
        <FeatureScene
          title={COPY.scenes.mapa.title}
          sub={COPY.scenes.mapa.sub}
          chips={COPY.scenes.mapa.chips}
          shot="02-mapa.png"
          seed={1}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={DUR.filtros}>
        <FeatureScene
          title={COPY.scenes.filtros.title}
          sub={COPY.scenes.filtros.sub}
          chips={COPY.scenes.filtros.chips}
          shot="03-filtros.png"
          seed={2}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={DUR.detalhe}>
        <FeatureScene
          title={COPY.scenes.detalhe.title}
          sub={COPY.scenes.detalhe.sub}
          chips={COPY.scenes.detalhe.chips}
          shot="04-detalhe.png"
          seed={3}
          panY={420}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={DUR.pipeline}>
        <FeatureScene
          title={COPY.scenes.pipeline.title}
          sub={COPY.scenes.pipeline.sub}
          chips={COPY.scenes.pipeline.chips}
          shot="05-pipeline.png"
          seed={4}
          panY={300}
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={DUR.cta}>
        <CtaScene />
      </TransitionSeries.Sequence>
      </TransitionSeries>
    </>
  );
};

export const Root: React.FC = () => (
  <Composition
    id="CrechesDemo"
    component={Main}
    durationInFrames={TOTAL}
    fps={FPS}
    width={W}
    height={H}
  />
);
