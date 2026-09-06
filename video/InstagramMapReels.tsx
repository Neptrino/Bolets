import {
  AbsoluteFill,
  Audio,
  Easing,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  InstagramProductWindow,
  InstagramPromoBrand,
  promoFontFamily,
  promoPalette,
} from "./InstagramPromoFrame";

const detailedOpeningDuration = 45;
const detailedMapDuration = 255;
const closingDuration = 60;
export const DETAILED_MAP_REEL_DURATION = detailedOpeningDuration + detailedMapDuration + closingDuration;

const evolutionOpeningDuration = 45;
const evolutionMapDuration = 390;
export const MAP_EVOLUTION_REEL_DURATION = evolutionOpeningDuration + evolutionMapDuration + closingDuration;

function Soundtrack({ duration, startFrom = 0 }: { duration: number; startFrom?: number }) {
  const frame = useCurrentFrame();
  const volume = interpolate(frame, [0, 12, duration - 28, duration - 1], [0, 0.72, 0.72, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <Audio src={staticFile("audio/instagram-promo-theme.mp3")} startFrom={startFrom} volume={volume} />;
}

function Opening({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [3, 22], [46, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(frame, [0, 10, 36, 45], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: promoPalette.forestDeep, color: promoPalette.cream, opacity, fontFamily: promoFontFamily }}>
      <div style={{ position: "absolute", top: 72, left: 68 }}><InstagramPromoBrand /></div>
      <div style={{ position: "absolute", top: 360, left: 68, width: 930, transform: `translateY(${rise}px)` }}>
        <div style={{ color: promoPalette.orangeLight, fontSize: 27, fontWeight: 900, letterSpacing: "0.15em" }}>{eyebrow}</div>
        <div style={{ marginTop: 28, fontSize: 112, fontWeight: 900, letterSpacing: "-0.064em", lineHeight: 0.9 }}>{title}</div>
        <div style={{ marginTop: 48, width: 850, color: "rgba(244, 236, 215, 0.84)", fontSize: 35, fontWeight: 650, lineHeight: 1.28 }}>{body}</div>
      </div>
    </AbsoluteFill>
  );
}

function stepLabel(frame: number, labels: string[]) {
  return labels[Math.min(Math.floor(frame / (255 / labels.length)), labels.length - 1)];
}

function DetailedMapScene() {
  const frame = useCurrentFrame();
  const label = stepLabel(frame, ["TRIA L’ESPÈCIE", "FES ZOOM", "OBRE EL DETALL"]);
  const rise = interpolate(frame, [0, 20], [34, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <AbsoluteFill style={{ background: promoPalette.clay, color: promoPalette.cream, fontFamily: promoFontFamily }}>
      <div style={{ position: "absolute", top: 72, left: 68 }}><InstagramPromoBrand /></div>
      <div style={{ position: "absolute", top: 315, left: 68, width: 944, transform: `translateY(${rise}px)` }}>
        <div style={{ color: promoPalette.orangeLight, fontSize: 27, fontWeight: 900, letterSpacing: "0.15em" }}>{label}</div>
        <div style={{ marginTop: 20, fontSize: 88, fontWeight: 900, letterSpacing: "-0.055em", lineHeight: 0.94 }}>Del mapa general al detall.</div>
        <div style={{ marginTop: 27, color: "rgba(244, 236, 215, 0.84)", fontSize: 33, fontWeight: 650 }}>Amplia, compara i consulta cada sector.</div>
      </div>
      <div style={{ position: "absolute", top: 805, left: 68, width: 944 }}>
        <InstagramProductWindow height={535}>
          <OffthreadVideo src={staticFile("captures/02-map.webm")} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </InstagramProductWindow>
      </div>
      <div style={{ position: "absolute", left: 68, right: 68, bottom: 88, display: "flex", justifyContent: "space-between", color: "rgba(244, 236, 215, 0.78)", fontSize: 24 }}>
        <span>Condicions i hàbitat compatible</span><strong style={{ color: promoPalette.cream }}>bolets.app</strong>
      </div>
    </AbsoluteFill>
  );
}

function EvolutionScene() {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [85, 350], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: promoPalette.forest, color: promoPalette.cream, fontFamily: promoFontFamily }}>
      <div style={{ position: "absolute", top: 72, left: 68 }}><InstagramPromoBrand /></div>
      <div style={{ position: "absolute", top: 280, left: 68, width: 944 }}>
        <div style={{ color: promoPalette.orangeLight, fontSize: 27, fontWeight: 900, letterSpacing: "0.15em" }}>EVOLUCIÓ I PREVISIÓ</div>
        <div style={{ marginTop: 20, fontSize: 86, fontWeight: 900, letterSpacing: "-0.055em", lineHeight: 0.94 }}>Mira com canvia el mapa.</div>
        <div style={{ marginTop: 27, color: "rgba(244, 236, 215, 0.84)", fontSize: 32, fontWeight: 650 }}>Del passat recent a la previsió dels pròxims dies.</div>
      </div>
      <div style={{ position: "absolute", top: 760, left: 68, width: 944 }}>
        <InstagramProductWindow height={535}>
          <OffthreadVideo src={staticFile("captures/08-avui-evolution.webm")} muted startFrom={55} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </InstagramProductWindow>
        <div style={{ display: "flex", alignItems: "center", gap: 15, marginTop: 31 }}>
          <span style={{ color: "rgba(244, 236, 215, 0.72)", fontSize: 21 }}>Fa 3 dies</span>
          <div style={{ position: "relative", height: 8, flex: 1, overflow: "hidden", borderRadius: 999, background: "rgba(244, 236, 215, 0.20)" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: promoPalette.orange }} />
          </div>
          <span style={{ color: promoPalette.orangeLight, fontSize: 21, fontWeight: 850 }}>+5 dies</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 68, right: 68, bottom: 88, display: "flex", justifyContent: "space-between", color: "rgba(244, 236, 215, 0.78)", fontSize: 24 }}>
        <span>Una lectura que evoluciona</span><strong style={{ color: promoPalette.cream }}>bolets.app/bolets-avui</strong>
      </div>
    </AbsoluteFill>
  );
}

function Closing({ title, body, path }: { title: string; body: string; path: string }) {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [5, 25], [38, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <AbsoluteFill style={{ background: promoPalette.cream, color: promoPalette.forest, fontFamily: promoFontFamily }}>
      <div style={{ position: "absolute", top: 72, left: 68 }}><InstagramPromoBrand dark /></div>
      <div style={{ position: "absolute", top: 430, left: 68, width: 930, transform: `translateY(${rise}px)` }}>
        <div style={{ color: promoPalette.clay, fontSize: 27, fontWeight: 900, letterSpacing: "0.15em" }}>BOLETS ATLES</div>
        <div style={{ marginTop: 26, fontSize: 104, fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 0.91 }}>{title}</div>
        <div style={{ marginTop: 45, width: 850, color: promoPalette.moss, fontSize: 35, fontWeight: 680, lineHeight: 1.3 }}>{body}</div>
        <div style={{ display: "inline-flex", marginTop: 66, padding: "23px 34px", borderRadius: 999, color: promoPalette.cream, background: promoPalette.forest, fontSize: 31, fontWeight: 900 }}>{path}</div>
      </div>
      <div style={{ position: "absolute", left: 68, right: 68, bottom: 110, height: 10, background: promoPalette.orange }} />
    </AbsoluteFill>
  );
}

export function InstagramDetailedMapReel() {
  return (
    <AbsoluteFill style={{ background: promoPalette.forestDeep }}>
      <Soundtrack duration={DETAILED_MAP_REEL_DURATION} />
      <Sequence from={0} durationInFrames={detailedOpeningDuration}>
        <Opening eyebrow="MAPA DETALLAT" title="Fes zoom al territori." body="Consulta les condicions de l’espècie que busques, sector a sector." />
      </Sequence>
      <Sequence from={detailedOpeningDuration} durationInFrames={detailedMapDuration}><DetailedMapScene /></Sequence>
      <Sequence from={detailedOpeningDuration + detailedMapDuration} durationInFrames={closingDuration}>
        <Closing title="Explora amb més criteri." body="La predicció orienta: no confirma presència ni revela troballes." path="bolets.app/map" />
      </Sequence>
    </AbsoluteFill>
  );
}

export function InstagramMapEvolutionReel() {
  return (
    <AbsoluteFill style={{ background: promoPalette.forestDeep }}>
      <Soundtrack duration={MAP_EVOLUTION_REEL_DURATION} startFrom={30} />
      <Sequence from={0} durationInFrames={evolutionOpeningDuration}>
        <Opening eyebrow="BOLETS AVUI" title="El bosc canvia cada dia." body="Segueix l’evolució recent i la previsió sobre el territori." />
      </Sequence>
      <Sequence from={evolutionOpeningDuration} durationInFrames={evolutionMapDuration}><EvolutionScene /></Sequence>
      <Sequence from={evolutionOpeningDuration + evolutionMapDuration} durationInFrames={closingDuration}>
        <Closing title="Consulta la lectura d’avui." body="Dades actualitzades per comparar espècies i territoris." path="bolets.app/bolets-avui" />
      </Sequence>
    </AbsoluteFill>
  );
}
