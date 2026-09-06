import { useCurrentFrame, interpolate, Img, staticFile, Sequence, OffthreadVideo, Easing } from "remotion";
import { clamp, easeOut, Glass, Bar, Lens, fill, Ripple, LensLabel, Steps, ReelFrame, Soundtrack, Footage, Atmosphere, LightLeak, Beats, ClosingOverlay, Caption, focusFor, lensScale, lensDim } from "./motion";
import { promoPalette as palette, promoFontFamily as fontFamily } from "../InstagramPromoFrame";
import { captures, stock } from "./assets";
import type { CSSProperties } from "react";
// --- Reel 1 · On miraries avui? -----------------------------------------------

export const MAP_REEL_WHERE_DURATION = 420;
// One lens, off-centre to the right so the footage keeps breathing. The capture
// (1080 × 1920) is fitted to the lens width and shows rows 200–1280.
const whereLens = { x: 300, y: 600, size: 760, rowOffset: 200 };
const whereScaleFactor = whereLens.size / 1080;
const wherePosition = `center ${(whereLens.rowOffset / (1920 - whereLens.size / whereScaleFactor)) * 100}%`;
// Setcases in the Catalonia view (CSS 340 × 318 → capture 680 × 636).
const whereReveal = { x: (680 * whereScaleFactor / whereLens.size) * 100, y: ((636 - whereLens.rowOffset) * whereScaleFactor / whereLens.size) * 100 };
// The 13.07 s capture is played in two segments: the zoom (0–7.2 s) at 2× and the
// two taps (7.2 s to the end) at 1.2×. Taps happen at 7.40 s and 9.36 s of the capture.
const whereVideoStart = 30;
const whereSegmentA = { frames: 108, rate: 2 };
const whereSegmentB = { startFrom: 216, frames: 147, rate: 1.2 };
const whereTapA = { frame: whereVideoStart + whereSegmentA.frames + 5, x: 760 * whereScaleFactor, y: (760 - whereLens.rowOffset) * whereScaleFactor };
const whereTapB = { frame: whereVideoStart + whereSegmentA.frames + 54, x: 660 * whereScaleFactor, y: (760 - whereLens.rowOffset) * whereScaleFactor };
const whereScoreA = { sector: "SECTOR A · VALL DE CAMPRODON", score: 46, level: "MITJANA", conditions: 55, terrain: 64 };
const whereScoreB = { sector: "SECTOR B · VEÍ DE L’OEST", score: 27, level: "BAIXA", conditions: 82, terrain: 6 };

function ScoreCard({ from, x, width, compact, sector, score, level, conditions, terrain }: { from: number; x: number; width: number; compact: boolean; sector: string; score: number; level: string; conditions: number; terrain: number }) {
  const frame = useCurrentFrame();
  const t = frame - from;
  if (t < 0) return null;
  const shownScore = Math.round(interpolate(t, [6, 34], [0, score], { ...clamp, easing: easeOut }));
  const shownConditions = interpolate(t, [12, 44], [0, conditions], { ...clamp, easing: easeOut });
  const shownTerrain = interpolate(t, [18, 50], [0, terrain], { ...clamp, easing: easeOut });
  return (
    <Glass x={x} y={1420} width={width} delay={from} padding={compact ? "20px 24px 22px" : "26px 30px"}>
      <div style={{ color: palette.orangeLight, fontSize: compact ? 19 : 24, fontWeight: 900, letterSpacing: "0.14em", whiteSpace: "nowrap", overflow: "hidden" }}>{sector}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: compact ? 10 : 18, marginTop: 6 }}>
        <span style={{ fontSize: compact ? 84 : 118, fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 1 }}>{shownScore}</span>
        <span style={{ fontSize: compact ? 28 : 40, fontWeight: 800, color: "rgba(244, 236, 215, 0.7)" }}>/100</span>
        <span style={{ marginLeft: 6, padding: compact ? "7px 12px" : "10px 18px", borderRadius: 999, background: palette.orange, color: palette.forestDeep, fontSize: compact ? 19 : 26, fontWeight: 900, letterSpacing: "0.06em" }}>{level}</span>
      </div>
      <div style={{ display: "flex", flexDirection: compact ? "column" : "row", gap: compact ? 12 : 30, marginTop: compact ? 14 : 22 }}>
        <Bar label="Condicions" value={conditions} shown={shownConditions} />
        <Bar label="Terreny" value={terrain} shown={shownTerrain} unit="%" />
      </div>
    </Glass>
  );
}

function WhereLens() {
  const frame = useCurrentFrame();
  const push = interpolate(frame, [300, 340], [1, 1.45], { ...clamp, easing: easeOut });
  const pushOpacity = interpolate(frame, [300, 312], [0, 1], clamp);
  const origin = `${((whereTapA.x + whereTapB.x) / 2 / whereLens.size) * 100}% ${(whereTapA.y / whereLens.size) * 100}%`;
  const cardAWidth = interpolate(frame, [whereTapB.frame + 6, whereTapB.frame + 20], [952, 460], { ...clamp, easing: easeOut });
  return (
    <>
      <Lens x={whereLens.x} y={whereLens.y} size={whereLens.size} reveal={30} revealAt={whereReveal}>
        <Img src={staticFile(captures.cataloniaEnd)} style={{ ...fill, objectPosition: wherePosition }} />
        <Sequence from={whereVideoStart} durationInFrames={whereSegmentA.frames} layout="none">
          <OffthreadVideo src={staticFile(captures.cataloniaVideo)} muted playbackRate={whereSegmentA.rate} style={{ ...fill, objectPosition: wherePosition }} />
        </Sequence>
        <Sequence from={whereVideoStart + whereSegmentA.frames} durationInFrames={whereSegmentB.frames} layout="none">
          <OffthreadVideo src={staticFile(captures.cataloniaVideo)} muted playbackRate={whereSegmentB.rate} startFrom={whereSegmentB.startFrom} style={{ ...fill, objectPosition: wherePosition }} />
        </Sequence>
        <Img src={staticFile(captures.cataloniaEnd)} style={{ ...fill, objectPosition: wherePosition, opacity: pushOpacity, transform: `scale(${push})`, transformOrigin: origin }} />
        <Ripple at={whereTapA.frame} x={whereTapA.x} y={whereTapA.y} />
        <Ripple at={whereTapB.frame} x={whereTapB.x} y={whereTapB.y} />
      </Lens>
      <LensLabel label={frame < 80 ? "CEP · CATALUNYA" : "CEP · SETCASES"} x={whereLens.x} y={whereLens.y} size={whereLens.size} delay={48} />
      <ScoreCard from={whereTapA.frame + 6} x={64} width={cardAWidth} compact={frame >= whereTapB.frame + 6} {...whereScoreA} />
      <ScoreCard from={whereTapB.frame + 6} x={556} width={460} compact {...whereScoreB} />
      <Steps steps={["MAPA DEL CEP", "AMPLIA", "TOCA DOS SECTORS"]} active={frame < 80 ? 0 : frame < whereTapA.frame ? 1 : 2} />
    </>
  );
}

export function InstagramMapReelWhere() {
  const closingFrom = 340;
  return (
    <ReelFrame>
      <Soundtrack duration={MAP_REEL_WHERE_DURATION} />
      <Footage clips={[
        { src: stock.cepDiscovery, from: 0, duration: 151 },
        { src: stock.cepLeaves, from: 140, duration: 240 },
        { src: stock.handsBasket, from: 368, duration: 60 },
      ]} />
      <Atmosphere salt={1} />
      <LightLeak from={0} duration={70} fromX={-10} toX={110} />
      <Sequence from={0} durationInFrames={closingFrom} layout="none"><WhereLens /></Sequence>
      <LightLeak from={whereTapA.frame - 6} duration={44} fromX={80} toX={30} y={55} />
      <LightLeak from={whereTapB.frame - 6} duration={44} fromX={30} toX={80} y={55} />
      <Beats beats={[
        { from: 0, duration: 40, text: "Dos boscos.", size: 124 },
        { from: 40, duration: 40, text: "Per on començaries?", eyebrow: "MAPA DEL CEP · CATALUNYA" },
        { from: 80, duration: whereTapA.frame - 80, text: "Amplia el territori.", eyebrow: "SETCASES · RIPOLLÈS" },
        { from: whereTapA.frame, duration: whereTapB.frame - whereTapA.frame, text: "Toca un sector.", eyebrow: "46/100 · MITJANA" },
        { from: whereTapB.frame, duration: 260 - whereTapB.frame, text: "I el del costat.", eyebrow: "27/100 · BAIXA" },
        { from: 260, duration: 80, text: "Millors condicions, pitjor terreny.", eyebrow: "EL TERRENY TAMBÉ COMPTA" },
      ]} />
      <Sequence from={closingFrom} durationInFrames={MAP_REEL_WHERE_DURATION - closingFrom} layout="none">
        <ClosingOverlay title="Obre el mapa." body="La lectura orienta: no confirma presència ni revela troballes." path="bolets.app/map" duration={MAP_REEL_WHERE_DURATION - closingFrom} />
      </Sequence>
    </ReelFrame>
  );
}

// --- Reel 2 · El mapa també canvia --------------------------------------------

export const MAP_REEL_EVOLUTION_DURATION = 420;
// Frames where the capture's own timeline label changes (measured on m02-avui-evolution.mp4 at 1.15× from 1.5 s).
const evolutionSwitches = [89, 128, 167, 194, 209, 235, 261, 298];
const evolutionLabels = ["−3", "−2", "−1", "Avui", "+1", "+2", "+3", "+4", "+5"];
const evolutionLens = { x: 100, y: 500, size: 880 };

function EvolutionTimeline() {
  const frame = useCurrentFrame();
  const active = evolutionSwitches.filter((switchFrame) => frame >= switchFrame).length;
  const progress = interpolate(frame, [30, 298], [0, 100], clamp);
  return (
    <Glass x={64} y={1420} width={952} delay={30} padding="22px 30px 24px">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {evolutionLabels.map((label, index) => {
          const isActive = index === active;
          const done = index < active;
          return (
            <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: 74 }}>
              <div style={{ width: isActive ? 26 : 14, height: isActive ? 26 : 14, borderRadius: 999, background: isActive || done ? palette.orange : "rgba(244, 236, 215, 0.3)", boxShadow: isActive ? "0 0 0 8px rgba(242, 138, 50, 0.28)" : "none" }} />
              <span style={{ fontSize: isActive ? 26 : 20, fontWeight: 900, color: isActive ? palette.orangeLight : "rgba(244, 236, 215, 0.72)" }}>{label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ position: "relative", height: 8, marginTop: 16, overflow: "hidden", borderRadius: 999, background: "rgba(244, 236, 215, 0.22)" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: palette.orange }} />
      </div>
    </Glass>
  );
}

function EvolutionLens() {
  const frame = useCurrentFrame();
  // Scaled 1.36× around the upper map so the app's own slider box (capture row 870+) stays outside the circle.
  const inner: CSSProperties = { ...fill, transform: "scale(1.46)", transformOrigin: "50% 38%" };
  return (
    <>
      <Lens x={evolutionLens.x} y={evolutionLens.y} size={evolutionLens.size} reveal={24} revealAt={{ x: 50, y: 45 }}>
        <Img src={staticFile(captures.evolutionEnd)} style={inner} />
        <Sequence from={24} durationInFrames={336} layout="none">
          <OffthreadVideo src={staticFile(captures.evolutionVideo)} muted playbackRate={1.15} startFrom={45} style={inner} />
        </Sequence>
      </Lens>
      <LensLabel label={frame < 167 ? "OBSERVAT · CATALUNYA" : frame < 194 ? "AVUI · CATALUNYA" : "PREVISIÓ · CATALUNYA"} x={evolutionLens.x} y={evolutionLens.y} size={evolutionLens.size} delay={40} />
      <Steps steps={["FA 3 DIES", "AVUI", "+5 DIES"]} active={frame < 128 ? 0 : frame < 194 ? 1 : 2} />
    </>
  );
}

export function InstagramMapReelEvolution() {
  const closingFrom = 360;
  return (
    <ReelFrame>
      <Soundtrack duration={MAP_REEL_EVOLUTION_DURATION} startFrom={30} />
      <Footage clips={[
        { src: stock.rainLeaves, from: 0, duration: 240 },
        { src: stock.valleyDawn, from: 228, duration: 200, startFrom: 40 },
      ]} />
      <Atmosphere salt={2} />
      <LightLeak from={0} duration={64} fromX={110} toX={-10} />
      <Sequence from={0} durationInFrames={closingFrom} layout="none">
        <EvolutionLens />
        <EvolutionTimeline />
        <Sequence from={40} durationInFrames={127} layout="none"><Caption text="Condicions observades: el que ha passat al bosc els últims tres dies." top={1610} /></Sequence>
        <Sequence from={167} durationInFrames={131} layout="none"><Caption text="Previsió: cap on evolucionen les condicions els pròxims cinc dies, sector a sector." top={1610} /></Sequence>
        <Sequence from={298} layout="none"><Caption text="Compara el senyal d’avui amb el de cap de setmana abans de triar el bosc." top={1610} /></Sequence>
      </Sequence>
      <LightLeak from={160} duration={50} fromX={20} toX={80} y={30} />
      <LightLeak from={292} duration={50} fromX={80} toX={30} y={30} />
      <Beats beats={[
        { from: 0, duration: 36, text: "Avui no és ahir.", size: 116 },
        { from: 36, duration: 53, text: "Mira d’on venim.", eyebrow: "BOLETS AVUI · FA 3 DIES" },
        { from: 89, duration: 78, text: "Dia a dia, fins avui.", eyebrow: "BOLETS AVUI · OBSERVAT" },
        { from: 167, duration: 131, text: "I la previsió, fins a +5 dies.", eyebrow: "BOLETS AVUI · PREVISIÓ" },
        { from: 298, duration: 62, text: "Compara abans de sortir.", eyebrow: "BOLETS AVUI" },
      ]} />
      <Sequence from={closingFrom} durationInFrames={MAP_REEL_EVOLUTION_DURATION - closingFrom} layout="none">
        <ClosingOverlay title="Bolets avui." body="Consulta l’evolució recent i la previsió abans de sortir." path="bolets.app/bolets-avui" duration={MAP_REEL_EVOLUTION_DURATION - closingFrom} />
      </Sequence>
    </ReelFrame>
  );
}

// --- Reel 3 · El mapa canvia amb l’espècie ------------------------------------

export const MAP_REEL_SPECIES_DURATION = 450;
const speciesLensSize = 620;
const speciesLensA = { x: 30, y: 560 };
const speciesLensB = { x: 430, y: 980 };
const speciesPair = { a: "Cep", b: "Trompeta de la mort" };

function WipeStill({ src, from, first }: { src: string; from: number; first: boolean }) {
  const frame = useCurrentFrame();
  if (frame < from) return null;
  const circle = first ? 150 : interpolate(frame, [from, from + 16], [0, 150], { ...clamp, easing: easeOut });
  // Window captures carry a bounds rectangle; zooming 1.58× around the rectangle's centre keeps its edges out of the lens.
  const zoom = interpolate(frame, [from, from + 160], [1.76, 1.84], clamp);
  return <Img src={staticFile(src)} style={{ ...fill, objectPosition: "center 30%", clipPath: `circle(${circle}% at 50% 50%)`, WebkitClipPath: `circle(${circle}% at 50% 50%)`, transform: `scale(${zoom})`, transformOrigin: "50% 55%" }} />;
}

function SpeciesPicker({ active }: { active: string[] }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [30, 44], [0, 1], clamp);
  const items = ["Cep", "Pinetell", "Trompeta de la mort", "Rossinyol"];
  return (
    <div style={{ position: "absolute", top: 452, left: 64, display: "flex", gap: 10, opacity, fontFamily }}>
      {items.map((item) => {
        const isActive = active.includes(item);
        return (
          <span key={item} style={{ padding: "12px 20px", borderRadius: 999, fontSize: 24, fontWeight: 900, color: isActive ? palette.forestDeep : palette.cream, background: isActive ? palette.orange : "rgba(12, 28, 18, 0.5)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: `1px solid ${isActive ? palette.orange : "rgba(244, 236, 215, 0.3)"}`, transform: isActive ? "scale(1.06)" : "scale(1)" }}>{item}</span>
        );
      })}
    </div>
  );
}

function ModeToggle({ habitat }: { habitat: boolean }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [30, 44], [0, 1], clamp);
  const options = [{ key: false, label: "CONDICIONS ACTUALS" }, { key: true, label: "TERRENY ADEQUAT" }];
  return (
    <div style={{ position: "absolute", left: 40, right: 40, bottom: 40, display: "flex", alignItems: "center", justifyContent: "space-between", opacity, fontFamily }}>
      <div style={{ display: "flex", gap: 8, padding: 6, borderRadius: 999, background: "rgba(12, 28, 18, 0.5)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(244, 236, 215, 0.25)" }}>
        {options.map((option) => (
          <span key={option.label} style={{ padding: "10px 18px", borderRadius: 999, fontSize: 21, fontWeight: 900, letterSpacing: "0.08em", color: option.key === habitat ? palette.forestDeep : "rgba(244, 236, 215, 0.75)", background: option.key === habitat ? palette.orange : "transparent" }}>{option.label}</span>
        ))}
      </div>
      <span style={{ color: palette.cream, fontSize: 24, fontWeight: 900, textShadow: "0 4px 18px rgba(0,0,0,0.5)" }}>bolets.app</span>
    </div>
  );
}

function VersusBadge({ x, y, at = 70 }: { x: number; y: number; at?: number }) {
  const frame = useCurrentFrame();
  const pop = interpolate(frame, [at, at + 14], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
  return (
    <div style={{ position: "absolute", top: y - 58, left: x - 58, width: 116, height: 116, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: palette.cream, color: palette.forest, fontFamily, fontSize: 40, fontWeight: 900, boxShadow: "0 18px 40px rgba(0,0,0,0.45)", transform: `scale(${pop})` }}>
      vs
    </div>
  );
}

function SpeciesLenses() {
  const frame = useCurrentFrame();
  const habitat = frame >= 270;
  const focusA = focusFor(frame, [[60, 150, 1], [150, 270, -1], [270, 330, -1], [330, 390, 1]]);
  const focusB = -focusA;
  return (
    <>
      <SpeciesPicker active={[speciesPair.a, speciesPair.b]} />
      <Lens x={speciesLensA.x} y={speciesLensA.y} size={speciesLensSize} reveal={24} scale={lensScale(focusA)} dim={lensDim(focusA)}>
        <WipeStill src={captures.speciesAPrediction} from={0} first />
        <WipeStill src={captures.speciesAHabitat} from={270} first={false} />
      </Lens>
      <Lens x={speciesLensB.x} y={speciesLensB.y} size={speciesLensSize} reveal={44} scale={lensScale(focusB)} dim={lensDim(focusB)}>
        <WipeStill src={captures.speciesBPrediction} from={0} first />
        <WipeStill src={captures.speciesBHabitat} from={278} first={false} />
      </Lens>
      <VersusBadge x={540} y={1080} />
      <LensLabel label={`${speciesPair.a.toUpperCase()}${habitat ? " · TERRENY" : ""}`} x={speciesLensA.x} y={speciesLensA.y} size={speciesLensSize} delay={40} />
      <LensLabel label={`${speciesPair.b.toUpperCase()}${habitat ? " · TERRENY" : ""}`} x={speciesLensB.x} y={speciesLensB.y} size={speciesLensSize} delay={60} />
      <Sequence from={36} durationInFrames={114} layout="none"><Caption text={`${captures.speciesPlace} · avui · dues espècies, el mateix territori i el mateix dia.`} top={1700} /></Sequence>
      <Sequence from={150} durationInFrames={120} layout="none"><Caption text="Cada espècie llegeix el bosc a la seva manera: el color i l’extensió del senyal no coincideixen." top={1700} /></Sequence>
      <Sequence from={270} layout="none"><Caption text="Terreny adequat: on l’hàbitat encaixa amb cada espècie, més enllà del temps que ha fet." top={1700} /></Sequence>
      <ModeToggle habitat={habitat} />
    </>
  );
}

export function InstagramMapReelSpecies() {
  const closingFrom = 390;
  return (
    <ReelFrame>
      <Soundtrack duration={MAP_REEL_SPECIES_DURATION} startFrom={60} />
      <Footage clips={[
        { src: stock.floorHolmOak, from: 0, duration: 200 },
        { src: stock.trompetesLeaves, from: 188, duration: 200 },
        { src: stock.camagrocsMoss, from: 376, duration: 80 },
      ]} />
      <Atmosphere salt={3} />
      <LightLeak from={0} duration={64} fromX={-10} toX={110} />
      <Sequence from={0} durationInFrames={closingFrom} layout="none"><SpeciesLenses /></Sequence>
      <LightLeak from={144} duration={40} fromX={30} toX={70} y={45} />
      <LightLeak from={264} duration={40} fromX={70} toX={30} y={45} />
      <Beats beats={[
        { from: 0, duration: 36, text: "El mateix bosc…", size: 112 },
        { from: 36, duration: 114, text: "…no serveix igual per a tots els bolets.", eyebrow: `${captures.speciesPlace.toUpperCase()} · CEP` },
        { from: 150, duration: 120, text: "Canvia l’espècie. Canvia el senyal.", eyebrow: `${captures.speciesPlace.toUpperCase()} · TROMPETA DE LA MORT` },
        { from: 270, duration: 60, text: "I el terreny adequat?", eyebrow: "HÀBITAT COMPATIBLE" },
        { from: 330, duration: 60, text: "També canvia.", eyebrow: "HÀBITAT COMPATIBLE" },
      ]} />
      <Sequence from={closingFrom} durationInFrames={MAP_REEL_SPECIES_DURATION - closingFrom} layout="none">
        <ClosingOverlay title="Tria l’espècie." body="Cada bolet respon a condicions i hàbitats diferents. Compara abans de decidir." path="bolets.app/map" duration={MAP_REEL_SPECIES_DURATION - closingFrom} />
      </Sequence>
    </ReelFrame>
  );
}

// --- Reel 4 · Dos territoris, dos senyals -------------------------------------

export const MAP_REEL_TERRITORIES_DURATION = 390;
const territoryLensSize = 640;
// Centre sectors read on 4 September: Ripollès (vall de Camprodon) 46/100, Cerdanya 9/100.
const territoryA = { x: 30, y: 560, src: "windowRipolles" as const, label: "RIPOLLÈS · 46/100" };
const territoryB = { x: 410, y: 980, src: "windowCerdanya" as const, label: "CERDANYA · 9/100" };

function TerritoryLenses() {
  const frame = useCurrentFrame();
  const focusA = focusFor(frame, [[120, 200, 1], [200, 330, -1]]);
  const focusB = -focusA;
  // Window captures carry a bounds rectangle; zooming 1.58× around the rectangle's centre keeps its edges out of the lens.
  const inner: CSSProperties = { ...fill, objectPosition: "center 30%", transform: "scale(1.76)", transformOrigin: "50% 55%" };
  return (
    <>
      <Lens x={territoryA.x} y={territoryA.y} size={territoryLensSize} reveal={28} scale={lensScale(focusA)} dim={lensDim(focusA)}>
        <Img src={staticFile(captures[territoryA.src])} style={inner} />
      </Lens>
      <Lens x={territoryB.x} y={territoryB.y} size={territoryLensSize} reveal={48} scale={lensScale(focusB)} dim={lensDim(focusB)}>
        <Img src={staticFile(captures[territoryB.src])} style={inner} />
      </Lens>
      <VersusBadge x={540} y={1060} />
      <LensLabel label={territoryA.label} x={territoryA.x} y={territoryA.y} size={territoryLensSize} delay={38} />
      <LensLabel label={territoryB.label} x={territoryB.x} y={territoryB.y} size={territoryLensSize} delay={58} />
      <Sequence from={36} durationInFrames={84} layout="none"><Caption text="Dues valls veïnes del Pirineu. Mateixa espècie: cep. Mateix dia: avui." top={1700} /></Sequence>
      <Sequence from={120} durationInFrames={80} layout="none"><Caption text="Al Ripollès, la vall de Camprodon marca 46/100; a la Cerdanya, avui, 9/100." top={1700} /></Sequence>
      <Sequence from={200} layout="none"><Caption text="Compara territoris al mapa abans de triar. Sense revelar cap punt de recol·lecció." top={1700} /></Sequence>
      <Steps steps={["RIPOLLÈS", "CERDANYA", "COMPARA"]} active={frame < 120 ? 0 : frame < 200 ? 1 : 2} />
    </>
  );
}

export function InstagramMapReelTerritories() {
  const closingFrom = 330;
  return (
    <ReelFrame>
      <Soundtrack duration={MAP_REEL_TERRITORIES_DURATION} startFrom={90} />
      <Footage clips={[
        { src: stock.valleyDawn, from: 0, duration: 200 },
        { src: stock.pathSunbeamsB, from: 188, duration: 210 },
      ]} />
      <Atmosphere salt={4} />
      <LightLeak from={0} duration={64} fromX={110} toX={-10} />
      <Sequence from={0} durationInFrames={closingFrom} layout="none"><TerritoryLenses /></Sequence>
      <LightLeak from={114} duration={44} fromX={80} toX={20} y={40} />
      <LightLeak from={194} duration={44} fromX={20} toX={80} y={60} />
      <Beats beats={[
        { from: 0, duration: 36, text: "Són a prop.", size: 124 },
        { from: 36, duration: 84, text: "Ripollès i Cerdanya.", eyebrow: "DOS TERRITORIS · CEP" },
        { from: 120, duration: 80, text: "Però avui no tenen el mateix senyal.", eyebrow: "DOS SENYALS" },
        { from: 200, duration: 130, text: "Compara abans de triar el bosc.", eyebrow: "COMPARA TERRITORIS" },
      ]} />
      <Sequence from={closingFrom} durationInFrames={MAP_REEL_TERRITORIES_DURATION - closingFrom} layout="none">
        <ClosingOverlay title="Compara territoris." body="Mateixa espècie, mateix dia, senyal diferent. Sense revelar punts de recol·lecció." path="bolets.app/map" duration={MAP_REEL_TERRITORIES_DURATION - closingFrom} />
      </Sequence>
    </ReelFrame>
  );
}
