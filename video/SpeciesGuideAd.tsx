import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { instagramPalette as p, instagramType as t, INSTAGRAM_MOTION_FONT_FAMILY as font } from '../src/lib/instagram-design';
import { Atmosphere, Beats, Caption, ClosingOverlay, Footage, Lens, LensLabel, LightLeak, Soundtrack, clamp, easeOut } from './instagram-map-campaign/motion';
import { captures, stock } from './instagram-map-campaign/assets';

export const SPECIES_GUIDE_AD_DURATION = 240;

function Brand() {
  return <div style={{ position: 'absolute', left: 64, top: 56, zIndex: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
    <Img src={staticFile('brand/bolets-logo.svg')} style={{ width: 62, height: 62 }} />
    <span style={{ color: p.cream, fontSize: t.body, fontWeight: 900, textShadow: '0 4px 18px rgba(0,0,0,.6)' }}>bolets.app</span>
  </div>;
}

function GuideReveal({ source, label, pan = 0 }: { source: string; label: string; pan?: number }) {
  const frame = useCurrentFrame();
  const y = interpolate(frame, [15, 85], [0, -pan], { ...clamp, easing: easeOut });
  const opacity = interpolate(frame, [0, 10, 82, 90], [0, 1, 1, 0], clamp);
  return <div style={{ opacity }}>
    <Lens x={140} y={600} size={800} reveal={0}>
      <Img src={staticFile(source)} style={{ width: 800, transform: `translateY(${y}px)` }} />
    </Lens>
    <LensLabel label={label} x={140} y={600} size={800} delay={12} />
  </div>;
}

export function SpeciesGuideAd() {
  return <AbsoluteFill style={{ background: p.forestDeep, color: p.cream, fontFamily: font }}>
    <Soundtrack duration={SPECIES_GUIDE_AD_DURATION} startFrom={120} />
    <Footage clips={[
      { src: stock.cepDiscovery, from: 0, duration: 75, startFrom: 20 },
      { src: stock.floorMistLeaves, from: 60, duration: 105 },
      { src: stock.pathSunbeamsC, from: 150, duration: 90 },
    ]} />
    <Atmosphere salt={5} />
    <LightLeak from={0} duration={55} fromX={110} toX={-10} y={70} />
    <Beats beats={[
      { from: 0, duration: 60, text: 'Saps quin bolet és?', eyebrow: 'CONEIX ABANS DE COLLIR', size: t.cover },
      { from: 60, duration: 90, text: 'Cada bolet, una fitxa.', eyebrow: 'LA GUIA DE BOLETS', size: t.coverLong },
    ]} />
    <Sequence from={60} durationInFrames={90} layout="none">
      <GuideReveal source={captures.guideReconeixer} label="FITXA · CEP" pan={30} />
      <Caption text="Trets, confusions i temporada." top={1490} />
    </Sequence>
    <LightLeak from={60} duration={35} fromX={20} toX={80} y={45} />
    <Sequence from={150} durationInFrames={90} layout="none">
      <ClosingOverlay title="Obre la guia." body="Coneix abans de collir." path="bolets.app/bolets" duration={90} />
      <div style={{ position: 'absolute', left: 68, right: 110, top: 1450, fontSize: t.label, lineHeight: 1.35, textShadow: '0 4px 18px rgba(0,0,0,.6)' }}>Una guia no confirma la comestibilitat.<br />Si tens dubtes, no en mengis.</div>
    </Sequence>
    <Brand />
  </AbsoluteFill>;
}
