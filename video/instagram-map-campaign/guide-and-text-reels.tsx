import { useCurrentFrame, interpolate, Easing, Img, staticFile, Sequence } from "remotion";
import { hash, clamp, easeOut, fill, Chip, Lens, LensLabel, Steps, ReelFrame, Soundtrack, Footage, Atmosphere, LightLeak, Caption, Beats, ClosingOverlay, FootageClip, Beat } from "./motion";
import { promoPalette as palette } from "../InstagramPromoFrame";
import { captures, stock, guide } from "./assets";
// --- Reel 5 · La guia --------------------------------------------------------------

export const MAP_REEL_GUIDE_DURATION = 450;
const guideGround = 1500;
const sprouts = [
  { src: "cep", label: "Cep", cx: 170, cy: 1180, size: 300, from: 40 },
  { src: "rovello", label: "Rovelló", cx: 385, cy: 1060, size: 320, from: 56 },
  { src: "trompeta", label: "Trompeta de la mort", cx: 600, cy: 1170, size: 340, from: 72 },
  { src: "apagallums", label: "Apagallums", cx: 840, cy: 990, size: 320, from: 88 },
  { src: "petDeLlop", label: "Pet de llop", cx: 940, cy: 1270, size: 270, from: 104 },
] as const;
const sproutsExitAt = 186;

function Puff({ from, cx, cy }: { from: number; cx: number; cy: number }) {
  const frame = useCurrentFrame();
  const t = frame - from;
  if (t < 0 || t > 26) return null;
  return (
    <>
      {Array.from({ length: 9 }, (_, index) => {
        const angle = -Math.PI * (0.15 + (index / 8) * 0.7);
        const distance = interpolate(t, [0, 26], [10, 120 + hash(index, 9) * 60], { ...clamp, easing: easeOut });
        const opacity = interpolate(t, [0, 6, 26], [0, 0.9, 0], clamp);
        const size = 6 + hash(index, 10) * 8;
        return <div key={index} style={{ position: "absolute", left: cx + Math.cos(angle) * distance - size / 2, top: cy + Math.sin(angle) * distance - size / 2, width: size, height: size, borderRadius: 999, background: "rgba(255, 224, 180, 0.9)", filter: "blur(1.5px)", opacity }} />;
      })}
    </>
  );
}

function Sprout({ src, label, cx, cy, size, from }: { src: string; label: string; cx: number; cy: number; size: number; from: number }) {
  const frame = useCurrentFrame();
  if (frame < from) return null;
  const t = frame - from;
  const buried = interpolate(t, [0, 30], [1, 0], { ...clamp, easing: Easing.out(Easing.back(1.5)) });
  const grow = interpolate(t, [0, 30], [0.25, 1], { ...clamp, easing: Easing.out(Easing.back(1.2)) });
  const exit = interpolate(frame, [sproutsExitAt, sproutsExitAt + 20], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const labelSpace = 70;
  const y = cy + buried * (guideGround + size / 2 - cy) + exit * (guideGround + size / 2 - cy);
  const top = y - size / 2;
  // Everything below the ground line stays hidden, so the photo and its label rise out of the soil.
  const hidden = Math.max(0, top + size + labelSpace - guideGround);
  const float = Math.sin((frame - from) / 20) * 4;
  return (
    <div style={{ position: "absolute", left: cx - size / 2, top: top + float, width: size, height: size + labelSpace, clipPath: `inset(0 0 ${hidden}px 0)`, WebkitClipPath: `inset(0 0 ${hidden}px 0)`, opacity: 1 - exit, transform: `scale(${grow})`, transformOrigin: "50% 100%" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: size, height: size, overflow: "hidden", borderRadius: 999, background: palette.creamSoft, boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }}>
        <Img src={staticFile(src)} style={{ ...fill, objectPosition: "center 55%" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: 999, boxShadow: "inset 0 0 60px 18px rgba(9, 23, 15, 0.55)" }} />
        <div style={{ position: "absolute", inset: 8, borderRadius: 999, border: "2px solid rgba(242, 138, 50, 0.85)" }} />
      </div>
      <div style={{ position: "absolute", top: size - 14, left: 0, width: size, display: "flex", justifyContent: "center" }}>
        <Chip label={label.toUpperCase()} top={0} left={0} accent small animate={false} />
      </div>
    </div>
  );
}

function GroundGlow() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [36, 50, sproutsExitAt + 10, sproutsExitAt + 30], [0, 0.55, 0.55, 0], clamp);
  return <div style={{ position: "absolute", left: 40, right: 40, top: guideGround - 2, height: 4, borderRadius: 999, background: `linear-gradient(90deg, rgba(242,138,50,0) 0%, ${palette.orange} 20%, ${palette.orangeLight} 50%, ${palette.orange} 80%, rgba(242,138,50,0) 100%)`, boxShadow: "0 0 30px 6px rgba(242, 138, 50, 0.35)", opacity }} />;
}

function PanStill({ src, imageHeight, from, duration, rowFrom, rowTo, size, wipe }: { src: string; imageHeight: number; from: number; duration: number; rowFrom: number; rowTo: number; size: number; wipe: boolean }) {
  const frame = useCurrentFrame();
  if (frame < from) return null;
  const factor = size / 1080;
  const row = interpolate(frame, [from + 10, from + duration], [rowFrom, rowTo], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const circle = wipe ? interpolate(frame, [from, from + 18], [0, 150], { ...clamp, easing: easeOut }) : 150;
  return (
    <div style={{ position: "absolute", inset: 0, clipPath: `circle(${circle}% at 50% 50%)`, WebkitClipPath: `circle(${circle}% at 50% 50%)`, background: palette.creamSoft }}>
      <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 0, width: size, height: imageHeight * factor, transform: `translateY(${-row * factor}px)` }} />
    </div>
  );
}

const guideLens = { x: 140, y: 560, size: 800 };

function GuideLens() {
  const frame = useCurrentFrame();
  return (
    <>
      <Lens x={guideLens.x} y={guideLens.y} size={guideLens.size} reveal={196} revealAt={{ x: 50, y: 60 }}>
        <PanStill src={captures.guideCep} imageHeight={6000} from={196} duration={110} rowFrom={0} rowTo={2500} size={guideLens.size} wipe={false} />
        <PanStill src={captures.guideCatalogue} imageHeight={6000} from={306} duration={64} rowFrom={0} rowTo={1500} size={guideLens.size} wipe />
      </Lens>
      <LensLabel label={frame < 306 ? "FITXA · CEP" : "GUIA · 62 ESPÈCIES"} x={guideLens.x} y={guideLens.y} size={guideLens.size} delay={210} />
    </>
  );
}

function GuideSteps() {
  const frame = useCurrentFrame();
  return <Steps steps={["62 ESPÈCIES", "FITXA", "GUIA"]} active={frame < 196 ? 0 : frame < 306 ? 1 : 2} />;
}

export function InstagramMapReelGuide() {
  const closingFrom = 370;
  return (
    <ReelFrame>
      <Soundtrack duration={MAP_REEL_GUIDE_DURATION} startFrom={120} />
      <Footage clips={[
        { src: stock.floorPineNeedles, from: 0, duration: 200 },
        { src: stock.floorMistLeaves, from: 188, duration: 200 },
        { src: stock.rossinyolsCluster, from: 376, duration: 80 },
      ]} />
      <Atmosphere salt={5} />
      <LightLeak from={0} duration={70} fromX={110} toX={-10} y={70} />
      <Sequence from={0} durationInFrames={closingFrom} layout="none">
        <GroundGlow />
        {sprouts.map((sprout) => <Sprout key={sprout.label} src={guide[sprout.src]} label={sprout.label} cx={sprout.cx} cy={sprout.cy} size={sprout.size} from={sprout.from} />)}
        {sprouts.map((sprout) => <Puff key={`puff-${sprout.label}`} from={sprout.from + 2} cx={sprout.cx} cy={guideGround} />)}
        <GuideLens />
        <Sequence from={210} durationInFrames={96} layout="none"><Caption text="Com reconèixer-lo, espècies semblants, hàbitat, altitud i temporada, en una sola fitxa." top={1440} /></Sequence>
        <Sequence from={306} layout="none"><Caption text="Busca per nom, temporada o hàbitat. Comestibles i tòxics, amb les confusions habituals." top={1440} /></Sequence>
        <GuideSteps />
      </Sequence>
      <LightLeak from={190} duration={50} fromX={20} toX={80} y={45} />
      <LightLeak from={300} duration={44} fromX={80} toX={30} y={45} />
      <Beats beats={[
        { from: 0, duration: 40, text: "Sota les fulles…", size: 116 },
        { from: 40, duration: 80, text: "62 espècies…", eyebrow: "LA GUIA DE BOLETS" },
        { from: 120, duration: 76, text: "…cadascuna amb fitxa pròpia.", eyebrow: "LA GUIA DE BOLETS" },
        { from: 196, duration: 110, text: "Identificació, confusions, hàbitat i temporada.", eyebrow: "FITXA · CEP" },
        { from: 306, duration: 64, text: "Busca per nom, temporada o hàbitat.", eyebrow: "GUIA · 62 ESPÈCIES" },
      ]} />
      <Sequence from={closingFrom} durationInFrames={MAP_REEL_GUIDE_DURATION - closingFrom} layout="none">
        <ClosingOverlay title="Coneix cada bolet." body="62 espècies amb identificació, confusions, hàbitat i temporada." path="bolets.app/bolets" duration={MAP_REEL_GUIDE_DURATION - closingFrom} />
      </Sequence>
    </ReelFrame>
  );
}

// --- Text Reels · footage first, kinetic text, closing card ----------------------
// No lens, no chips: the footage carries the piece. Built from the first Magnific
// batch plus spares of the second, so they never repeat the five map Reels.

export const TEXT_REEL_DURATION = 360;
const textReelClosingFrom = 280;

function TextReel({ clips, beats, closing, salt, soundtrackStart = 0 }: { clips: FootageClip[]; beats: Beat[]; closing: { title: string; body: string; path: string }; salt: number; soundtrackStart?: number }) {
  return (
    <ReelFrame>
      <Soundtrack duration={TEXT_REEL_DURATION} startFrom={soundtrackStart} />
      <Footage clips={clips} />
      <Atmosphere salt={salt} />
      <LightLeak from={0} duration={70} fromX={-10} toX={110} />
      <LightLeak from={130} duration={60} fromX={90} toX={30} y={60} />
      <Beats beats={beats} />
      <Sequence from={textReelClosingFrom} durationInFrames={TEXT_REEL_DURATION - textReelClosingFrom} layout="none">
        <ClosingOverlay {...closing} duration={TEXT_REEL_DURATION - textReelClosingFrom} />
      </Sequence>
    </ReelFrame>
  );
}

export function InstagramTextReelWeekend() {
  return (
    <TextReel
      salt={6}
      soundtrackStart={150}
      clips={[
        { src: stock.harvestVertical, from: 0, duration: 150 },
        { src: stock.pickingFresh, from: 140, duration: 200, startFrom: 60 },
        { src: stock.activeAdventure, from: 330, duration: 40, startFrom: 300 },
      ]}
      beats={[
        { from: 0, duration: 50, text: "Dissabte.", size: 124, place: "bottom" },
        { from: 50, duration: 60, text: "Abans de sortir,", eyebrow: "EL RITUAL" },
        { from: 110, duration: 60, text: "mira les condicions.", place: "bottom" },
        { from: 170, duration: 60, text: "Tria l’espècie.", eyebrow: "EL RITUAL" },
        { from: 230, duration: 50, text: "Compara el territori.", place: "bottom" },
      ]}
      closing={{ title: "Bolets avui.", body: "La lectura de cada matí, per espècie i territori.", path: "bolets.app/bolets-avui" }}
    />
  );
}

export function InstagramTextReelRespect() {
  return (
    <TextReel
      salt={7}
      soundtrackStart={200}
      clips={[
        { src: stock.rovelloPine, from: 0, duration: 151 },
        { src: stock.forestVertical, from: 140, duration: 151 },
        { src: stock.pathSunbeamsC, from: 280, duration: 90 },
      ]}
      beats={[
        { from: 0, duration: 50, text: "Abans de collir,", size: 110, place: "bottom" },
        { from: 50, duration: 60, text: "identifica.", size: 124, eyebrow: "SORTIR AMB CRITERI" },
        { from: 110, duration: 60, text: "Respecta els límits de cada lloc.", place: "bottom" },
        { from: 170, duration: 60, text: "Deixa el bosc com l’has trobat.", eyebrow: "SORTIR AMB CRITERI" },
        { from: 230, duration: 50, text: "I guarda’t els teus racons.", place: "bottom" },
      ]}
      closing={{ title: "Surt amb criteri.", body: "Identificació segura, normativa local i respecte per l’hàbitat.", path: "bolets.app/normativa-bolets" }}
    />
  );
}

export function InstagramTextReelWhere() {
  return (
    <TextReel
      salt={8}
      soundtrackStart={90}
      clips={[
        { src: stock.cepDiscovery, from: 0, duration: 130, startFrom: 20 },
        { src: stock.lactariusHands, from: 120, duration: 180, startFrom: 300 },
        { src: stock.activeAdventure, from: 290, duration: 80, startFrom: 500 },
      ]}
      beats={[
        { from: 0, duration: 50, text: "On són els bolets?", size: 110, eyebrow: "LA PREGUNTA" },
        { from: 50, duration: 60, text: "No t’ho direm.", size: 124, place: "bottom" },
        { from: 110, duration: 60, text: "Però sí on val la pena mirar.", eyebrow: "LA RESPOSTA" },
        { from: 170, duration: 60, text: "Condicions, hàbitat i temporada,", place: "bottom" },
        { from: 230, duration: 50, text: "cada dia.", size: 124, eyebrow: "LA RESPOSTA" },
      ]}
      closing={{ title: "Obre el mapa.", body: "La lectura orienta: no confirma presència ni revela troballes.", path: "bolets.app/map" }}
    />
  );
}
