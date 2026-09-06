import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  InstagramProductWindow,
  InstagramPromoBrand,
  promoFontFamily as fontFamily,
  promoPalette as palette,
} from "./InstagramPromoFrame";

type PromoScene = {
  clip: string;
  eyebrow: string;
  title: string;
  body: string;
};

const reelScenes: PromoScene[] = [
  {
    clip: "captures/04-catalogue.webm",
    eyebrow: "62 ESPÈCIES",
    title: "Coneix cada bolet.",
    body: "Identificació, confusions, hàbitat i temporada.",
  },
  {
    clip: "captures/06-avui.webm",
    eyebrow: "CONDICIONS D’AVUI",
    title: "Compara el territori.",
    body: "Una lectura actualitzada per espècie i zona.",
  },
  {
    clip: "captures/07-guides.webm",
    eyebrow: "57 GUIES LOCALS",
    title: "Entén cada bosc.",
    body: "Context ecològic sense publicar punts de recol·lecció.",
  },
  {
    clip: "captures/05-findings.webm",
    eyebrow: "QUADERN DE CAMP",
    title: "Recorda les sortides.",
    body: "El punt exacte de cada troballa continua sent només teu.",
  },
];

const openingDuration = 60;
const reelSceneDuration = 75;
const closingDuration = 90;
const reelScenesStart = openingDuration;
const closingStart = openingDuration + reelScenes.length * reelSceneDuration;
export const INSTAGRAM_PROMO_REEL_DURATION = closingStart + closingDuration;

function ReelOpening() {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [5, 28], [54, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(frame, [0, 17, openingDuration - 12, openingDuration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: palette.forestDeep, color: palette.cream, opacity, fontFamily }}>
      <div style={{ position: "absolute", top: 72, left: 68 }}><InstagramPromoBrand /></div>
      <div style={{ position: "absolute", top: 330, left: 68, width: 930, transform: `translateY(${rise}px)` }}>
        <div style={{ width: 120, height: 12, marginBottom: 46, background: palette.orange }} />
        <div style={{ fontSize: 132, fontWeight: 900, letterSpacing: "-0.065em", lineHeight: 0.88 }}>
          No és només<br />un mapa.
        </div>
        <div style={{ marginTop: 54, color: palette.orangeLight, fontSize: 38, fontWeight: 750, lineHeight: 1.25 }}>
          És l’atles dels bolets de Catalunya.
        </div>
      </div>
      <div style={{ position: "absolute", right: 68, bottom: 86, color: palette.cream, fontSize: 24, fontWeight: 800, letterSpacing: "0.06em" }}>
        DESCOBREIX-LO ↓
      </div>
    </AbsoluteFill>
  );
}

function ReelProductScene({ scene, index }: { scene: PromoScene; index: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, reelSceneDuration - 10, reelSceneDuration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const rise = interpolate(frame, [4, 24], [38, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const videoScale = interpolate(frame, [0, reelSceneDuration], [1.01, 1.045], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: index % 2 === 0 ? palette.forest : palette.clay, color: palette.cream, opacity, fontFamily }}>
      <div style={{ position: "absolute", top: 72, left: 68 }}><InstagramPromoBrand /></div>
      <div style={{ position: "absolute", top: 305, left: 68, width: 944, transform: `translateY(${rise}px)` }}>
        <div style={{ color: palette.orangeLight, fontSize: 27, fontWeight: 900, letterSpacing: "0.16em" }}>{scene.eyebrow}</div>
        <div style={{ marginTop: 20, fontSize: 86, fontWeight: 900, letterSpacing: "-0.055em", lineHeight: 0.94 }}>{scene.title}</div>
        <div style={{ marginTop: 27, width: 850, color: "rgba(244, 236, 215, 0.84)", fontSize: 33, fontWeight: 650, lineHeight: 1.3 }}>{scene.body}</div>
      </div>
      <div style={{ position: "absolute", top: 885, left: 68, width: 944 }}>
        <InstagramProductWindow height={535}>
          <OffthreadVideo
            src={staticFile(scene.clip)}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${videoScale})` }}
          />
        </InstagramProductWindow>
      </div>
      <div style={{ position: "absolute", left: 68, right: 68, bottom: 86, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24 }}>
        <span style={{ color: "rgba(244, 236, 215, 0.72)" }}>Bolets Atles</span>
        <span style={{ fontWeight: 900 }}>{index + 1}/4</span>
      </div>
    </AbsoluteFill>
  );
}

function ReelClosing() {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [8, 34], [46, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const opacity = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: palette.cream, color: palette.forest, opacity, fontFamily }}>
      <div style={{ position: "absolute", top: 72, left: 68 }}><InstagramPromoBrand dark /></div>
      <div style={{ position: "absolute", top: 390, left: 68, width: 944, transform: `translateY(${rise}px)` }}>
        <div style={{ color: palette.orange, fontSize: 28, fontWeight: 900, letterSpacing: "0.16em" }}>TOT L’ATLES</div>
        <div style={{ marginTop: 26, fontSize: 122, fontWeight: 900, letterSpacing: "-0.065em", lineHeight: 0.9 }}>
          En un<br />sol lloc.
        </div>
        <div style={{ marginTop: 55, color: palette.moss, fontSize: 37, fontWeight: 700, lineHeight: 1.3 }}>
          Coneix els bolets.<br />Entén el bosc.
        </div>
        <div style={{ display: "inline-flex", marginTop: 72, padding: "24px 37px", borderRadius: 999, color: palette.cream, background: palette.forest, fontSize: 34, fontWeight: 900 }}>
          bolets.app
        </div>
      </div>
      <div style={{ position: "absolute", left: 68, right: 68, bottom: 110, height: 10, background: palette.orange }} />
    </AbsoluteFill>
  );
}

export function InstagramPromoReel() {
  const frame = useCurrentFrame();
  const soundtrackVolume = interpolate(
    frame,
    [0, 14, INSTAGRAM_PROMO_REEL_DURATION - 30, INSTAGRAM_PROMO_REEL_DURATION - 1],
    [0, 0.72, 0.72, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill style={{ background: palette.forestDeep }}>
      <Audio src={staticFile("audio/instagram-promo-theme.mp3")} volume={soundtrackVolume} />
      <Sequence from={0} durationInFrames={openingDuration}><ReelOpening /></Sequence>
      {reelScenes.map((scene, index) => (
        <Sequence key={scene.clip} from={reelScenesStart + index * reelSceneDuration} durationInFrames={reelSceneDuration}>
          <ReelProductScene scene={scene} index={index} />
        </Sequence>
      ))}
      <Sequence from={closingStart} durationInFrames={closingDuration}><ReelClosing /></Sequence>
    </AbsoluteFill>
  );
}

type CarouselSlide = {
  eyebrow: string;
  title: string;
  body: string;
  image?: string;
  imagePosition?: string;
  tone: "cream" | "forest" | "clay";
};

const weekendSlides: CarouselSlide[] = [
  { eyebrow: "ABANS DE SORTIR", title: "Aquest cap de setmana, no triïs el bosc a cegues.", body: "Compara espècies, territoris i condicions actuals amb Bolets Atles.", tone: "forest" },
  { eyebrow: "COMPARA EL TERRITORI", title: "Descobreix on destaca el senyal d’avui.", body: "Consulta la lectura territorial i mira quina espècie lidera cada zona.", image: "captures/06-avui.png", imagePosition: "center 52%", tone: "cream" },
  { eyebrow: "MIRA MÉS ENLLÀ DEL MÀXIM", title: "Comprova si el senyal és ampli o aïllat.", body: "L’extensió ajuda a interpretar millor una puntuació territorial.", image: "captures/02-map.png", imagePosition: "center 50%", tone: "clay" },
  { eyebrow: "ENTÉN L’ESPÈCIE", title: "Hàbitat, altitud i temporada també compten.", body: "Cada bolet respon de manera diferent. Consulta la seva fitxa abans de decidir.", image: "captures/03-species.png", imagePosition: "center 55%", tone: "cream" },
  { eyebrow: "CONSULTA ACTUALITZADA", title: "Prepara la sortida amb més context.", body: "La lectura estima condicions favorables: no confirma presència ni assenyala punts de recol·lecció.", tone: "forest" },
];

const privacySlides: CarouselSlide[] = [
  { eyebrow: "QUADERN DE CAMP PRIVAT", title: "Els teus racons continuen sent teus.", body: "Recorda cada sortida sense convertir-la en una localització pública.", tone: "clay" },
  { eyebrow: "PRIVACITAT PER DISSENY", title: "El punt exacte mai no és públic.", body: "La ubicació, l’hora, la quantitat i les notes es mantenen dins del teu quadern.", image: "captures/05-findings-start.png", imagePosition: "center 38%", tone: "cream" },
  { eyebrow: "FINS I TOT SENSE COBERTURA", title: "Comença la troballa al bosc. Completa-la a casa.", body: "La captura queda preparada al dispositiu fins que decideixes sincronitzar-la.", image: "captures/05-findings-start.png", imagePosition: "center 63%", tone: "forest" },
  { eyebrow: "SI LA FAS PÚBLICA", title: "Només mostrem el dia i una àrea de 10 × 10 km.", body: "Mai no publiquem les coordenades exactes, l’hora, la quantitat ni les notes privades.", image: "captures/05-findings.png", imagePosition: "center 45%", tone: "cream" },
  { eyebrow: "EL TEU HISTORIAL", title: "Aprèn del teu bosc, temporada rere temporada.", body: "Crea el teu quadern de camp privat a Bolets Atles.", tone: "forest" },
];

function CarouselCard({ slides }: { slides: CarouselSlide[] }) {
  const frame = useCurrentFrame();
  const index = Math.min(Math.floor(frame), slides.length - 1);
  const slide = slides[index];
  const dark = slide.tone === "cream";
  const background = slide.tone === "cream" ? palette.cream : slide.tone === "clay" ? palette.clay : palette.forest;
  const foreground = dark ? palette.ink : palette.cream;
  const secondary = dark ? "#63645d" : "rgba(244, 236, 215, 0.82)";
  const border = dark ? "rgba(20, 39, 28, 0.20)" : "rgba(244, 236, 215, 0.24)";
  const titleSize = slide.title.length > 57 ? 68 : 78;
  const imageStyle: CSSProperties = { width: "100%", height: "100%", objectFit: "cover", objectPosition: slide.imagePosition ?? "center" };

  return (
    <AbsoluteFill style={{ background, color: foreground, padding: "58px 58px 62px", fontFamily }}>
      <div style={{ position: "absolute", inset: 24, border: `1px solid ${border}`, borderRadius: 28 }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 25, borderBottom: `1px solid ${border}` }}>
        <InstagramPromoBrand dark={dark} />
        <span style={{ color: dark ? palette.clay : palette.orangeLight, fontSize: 23, fontWeight: 900 }}>{index + 1}/05</span>
      </div>
      <div style={{ position: "relative", display: "flex", height: 1110, flexDirection: "column", justifyContent: slide.image ? "flex-start" : "center", paddingTop: slide.image ? 60 : 0 }}>
        <div style={{ color: dark ? palette.clay : palette.orangeLight, fontSize: 23, fontWeight: 900, letterSpacing: "0.14em" }}>{slide.eyebrow}</div>
        <div style={{ maxWidth: 930, marginTop: 20, fontSize: titleSize, fontWeight: 900, letterSpacing: "-0.052em", lineHeight: 0.96 }}>{slide.title}</div>
        <div style={{ maxWidth: 880, marginTop: 27, color: secondary, fontSize: 28, fontWeight: 620, lineHeight: 1.34 }}>{slide.body}</div>
        {slide.image ? (
          <div style={{ marginTop: 45 }}>
            <InstagramProductWindow height={470}>
              <Img src={staticFile(slide.image)} style={imageStyle} />
            </InstagramProductWindow>
          </div>
        ) : (
          <div style={{ width: 120, height: 12, marginTop: 55, background: palette.orange }} />
        )}
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 24, borderTop: `1px solid ${border}`, color: secondary, fontSize: 22 }}>
        <span>{index === slides.length - 1 ? "Enllaç al perfil" : "Desplaça per continuar →"}</span>
        <span style={{ color: foreground, fontWeight: 900 }}>bolets.app</span>
      </div>
    </AbsoluteFill>
  );
}

export function InstagramWeekendCarousel() {
  return <CarouselCard slides={weekendSlides} />;
}

export function InstagramPrivacyCarousel() {
  return <CarouselCard slides={privacySlides} />;
}
