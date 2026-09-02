import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

const colours = {
  cream: "#f4ecd7",
  forest: "#14271c",
  forestDeep: "#09170f",
  orange: "#f28a32",
  orangeLight: "#ffad68",
};

type TourScene = {
  clip: string;
  duration: number;
  kicker: string;
  title: string;
  accent: string;
  note?: string;
  align?: "left" | "right";
};

const scenes: TourScene[] = [
  {
    clip: "captures/01-home.webm",
    duration: 150,
    kicker: "ABANS DE SORTIR",
    title: "Llegeix el territori",
    accent: "abans de trepitjar-lo.",
  },
  {
    clip: "captures/06-avui.webm",
    duration: 210,
    kicker: "LA LECTURA D’AVUI",
    title: "Descobreix on comença",
    accent: "la millor oportunitat.",
    note: "Compara territoris i espècies amb les dades més recents.",
    align: "right",
  },
  {
    clip: "captures/04-catalogue.webm",
    duration: 180,
    kicker: "CATÀLEG VIU",
    title: "Explora 62 fitxes",
    accent: "per espècie i temporada.",
  },
  {
    clip: "captures/03-species.webm",
    duration: 180,
    kicker: "UNA MATEIXA ECOLOGIA",
    title: "Entén l’hàbitat",
    accent: "que necessita cada espècie.",
    align: "right",
  },
  {
    clip: "captures/07-guides.webm",
    duration: 180,
    kicker: "GUIES LOCALS",
    title: "Passa del mapa",
    accent: "al bosc concret.",
    note: "Context de bosc, temporada i espècie, sense publicar punts.",
  },
  {
    clip: "captures/02-map.webm",
    duration: 210,
    kicker: "CONDICIONS ACTUALS",
    title: "Compara espècies",
    accent: "cel·la per cel·la.",
    note: "La puntuació serveix per comparar: no confirma presència.",
    align: "right",
  },
  {
    clip: "captures/05-findings.webm",
    duration: 150,
    kicker: "EL TEU QUADERN DE CAMP",
    title: "Desa les troballes",
    accent: "fins i tot sense cobertura.",
    note: "El punt exacte és només teu.",
  },
];

const openingDuration = 90;
const closingDuration = 90;
const sceneStarts = scenes.map((_, sceneIndex) => scenes
  .slice(0, sceneIndex)
  .reduce((sum, scene) => sum + scene.duration, openingDuration));
const closingStart = scenes.reduce((sum, scene) => sum + scene.duration, openingDuration);
export const SHOWCASE_DURATION = closingStart + closingDuration;

const fontFamily = '"Avenir Next", "Nunito Sans", ui-sans-serif, system-ui, sans-serif';

function fadeForScene(frame: number, duration: number) {
  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const fadeOut = interpolate(frame, [duration - 12, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  return Math.min(fadeIn, fadeOut);
}

function Brand() {
  return (
    <div style={{
      position: "absolute",
      top: 54,
      left: 62,
      zIndex: 4,
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "11px 18px 11px 12px",
      border: "1px solid rgba(244, 236, 215, 0.34)",
      borderRadius: 999,
      color: colours.cream,
      background: "rgba(9, 23, 15, 0.72)",
      boxShadow: "0 12px 36px rgba(0, 0, 0, 0.18)",
      fontFamily,
      backdropFilter: "blur(16px)",
    }}>
      <span style={{
        display: "grid",
        placeItems: "center",
        width: 34,
        height: 34,
        borderRadius: 11,
        color: colours.forest,
        background: colours.orange,
        fontSize: 19,
        fontWeight: 900,
      }}>●</span>
      <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "0.14em" }}>
        BOLETS · ATLES · CATALUNYA
      </span>
    </div>
  );
}

function Caption({ scene, frame }: { scene: TourScene; frame: number }) {
  const entrance = interpolate(frame, [8, 28], [42, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(frame, [7, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const isRight = scene.align === "right";

  const wrapper: CSSProperties = {
    position: "absolute",
    zIndex: 4,
    right: isRight ? 76 : undefined,
    bottom: 72,
    left: isRight ? undefined : 76,
    width: 930,
    padding: "32px 38px 34px",
    border: "1px solid rgba(244, 236, 215, 0.24)",
    borderRadius: 28,
    color: colours.cream,
    background: "rgba(9, 23, 15, 0.84)",
    boxShadow: "0 24px 72px rgba(0, 0, 0, 0.28)",
    fontFamily,
    opacity,
    transform: `translateY(${entrance}px)`,
    backdropFilter: "blur(18px)",
  };

  return (
    <div style={wrapper}>
      <div style={{
        marginBottom: 12,
        color: colours.orangeLight,
        fontSize: 19,
        fontWeight: 900,
        letterSpacing: "0.15em",
      }}>
        {scene.kicker}
      </div>
      <div style={{ fontSize: 64, fontWeight: 850, letterSpacing: "-0.045em", lineHeight: 0.98 }}>
        {scene.title}<br />
        <span style={{ color: colours.orangeLight, fontStyle: "italic", fontWeight: 600 }}>
          {scene.accent}
        </span>
      </div>
      {scene.note ? (
        <div style={{
          marginTop: 18,
          color: "rgba(244, 236, 215, 0.78)",
          fontSize: 22,
          fontWeight: 650,
          lineHeight: 1.35,
        }}>
          {scene.note}
        </div>
      ) : null}
    </div>
  );
}

function ProductScene({ scene }: { scene: TourScene }) {
  const frame = useCurrentFrame();
  const opacity = fadeForScene(frame, scene.duration);
  const scale = interpolate(frame, [0, scene.duration], [1.015, 1.045], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden", background: colours.forestDeep, opacity }}>
      <OffthreadVideo
        src={staticFile(scene.clip)}
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
          filter: "saturate(0.95) contrast(1.02)",
        }}
      />
      <AbsoluteFill style={{
        background: `
          linear-gradient(180deg, rgba(9, 23, 15, 0.22), transparent 28%),
          linear-gradient(0deg, rgba(9, 23, 15, 0.62), transparent 56%),
          linear-gradient(90deg, rgba(9, 23, 15, 0.2), transparent 32%, rgba(9, 23, 15, 0.1))
        `,
      }} />
      <Brand />
      <Caption scene={scene} frame={frame} />
    </AbsoluteFill>
  );
}

function OpeningScene() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 14, openingDuration - 12, openingDuration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rise = interpolate(frame, [6, 28], [34, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const scale = interpolate(frame, [0, openingDuration], [1.02, 1.05], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden", color: colours.cream, background: colours.forestDeep, opacity }}>
      <Img
        src={staticFile("captures/01-home-start.png")}
        style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(1px) saturate(0.82)", transform: `scale(${scale})` }}
      />
      <AbsoluteFill style={{
        background: "linear-gradient(110deg, rgba(9, 23, 15, 0.92) 0%, rgba(9, 23, 15, 0.76) 48%, rgba(9, 23, 15, 0.48) 100%)",
      }} />
      <div style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeContent: "center",
        justifyItems: "center",
        textAlign: "center",
        fontFamily,
        transform: `translateY(${rise}px)`,
      }}>
        <div style={{ color: colours.orangeLight, fontSize: 21, fontWeight: 900, letterSpacing: "0.18em" }}>
          BOLETS · ATLES · CATALUNYA
        </div>
        <div style={{ marginTop: 22, fontSize: 98, fontWeight: 850, letterSpacing: "-0.055em", lineHeight: 0.96 }}>
          Del bosc<br />
          <span style={{ color: colours.orangeLight, fontStyle: "italic", fontWeight: 600 }}>al mapa.</span>
        </div>
        <div style={{ marginTop: 30, color: "rgba(244, 236, 215, 0.82)", fontSize: 25, fontWeight: 700 }}>
          Espècies · guies · condicions d’avui
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ClosingScene() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18, closingDuration - 14, closingDuration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rise = interpolate(frame, [8, 30], [38, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden", color: colours.cream, background: colours.forestDeep, opacity }}>
      <Img
        src={staticFile("captures/01-home-start.png")}
        style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(2px) saturate(0.8)" }}
      />
      <AbsoluteFill style={{ background: "rgba(9, 23, 15, 0.78)" }} />
      <div style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeContent: "center",
        justifyItems: "center",
        textAlign: "center",
        fontFamily,
        transform: `translateY(${rise}px)`,
      }}>
        <div style={{ color: colours.orangeLight, fontSize: 21, fontWeight: 900, letterSpacing: "0.18em" }}>
          BOLETS · ATLES · CATALUNYA
        </div>
        <div style={{ marginTop: 22, fontSize: 92, fontWeight: 850, letterSpacing: "-0.055em", lineHeight: 0.96 }}>
          Una predicció,<br />
          <span style={{ color: colours.orangeLight, fontStyle: "italic", fontWeight: 600 }}>no una promesa.</span>
        </div>
        <div style={{
          marginTop: 38,
          padding: "16px 28px",
          borderRadius: 999,
          color: colours.forest,
          background: colours.cream,
          fontSize: 24,
          fontWeight: 900,
        }}>
          bolets.app
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Progress() {
  const frame = useCurrentFrame();
  const width = interpolate(frame, [0, SHOWCASE_DURATION - 1], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ position: "absolute", zIndex: 10, right: 0, bottom: 0, left: 0, height: 7, background: "rgba(244, 236, 215, 0.2)" }}>
      <div style={{ width: `${width}%`, height: "100%", background: colours.orange }} />
    </div>
  );
}

export function HomeShowcase() {
  return (
    <AbsoluteFill style={{ background: colours.forestDeep }}>
      <Sequence from={0} durationInFrames={openingDuration}>
        <OpeningScene />
      </Sequence>
      {scenes.map((scene, sceneIndex) => (
        <Sequence key={scene.clip} from={sceneStarts[sceneIndex]} durationInFrames={scene.duration}>
          <ProductScene scene={scene} />
        </Sequence>
      ))}
      <Sequence from={closingStart} durationInFrames={closingDuration}>
        <ClosingScene />
      </Sequence>
      <Progress />
    </AbsoluteFill>
  );
}
