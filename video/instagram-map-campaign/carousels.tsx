import { stock, captures } from "./assets";
import { useCurrentFrame, AbsoluteFill, Img, staticFile } from "remotion";
import { promoPalette as palette, promoFontFamily as fontFamily, InstagramPromoBrand } from "../InstagramPromoFrame";
import type { CSSProperties } from "react";
// --- Carousels (1080 × 1350, one frame per slide) ------------------------------

type CampaignSlide = {
  eyebrow: string;
  title: string;
  body?: string;
  tone: "cream" | "forest" | "clay";
  cover?: string;
  coverPosition?: string;
  image?: string;
  imagePosition?: string;
  imageHeight?: number;
  imagePair?: [{ src: string; label: string }, { src: string; label: string }];
  footer?: string;
};

const readMapSlides: CampaignSlide[] = [
  { eyebrow: "COM LLEGIR EL MAPA", title: "Abans d’anar al bosc, mira aquestes 3 coses.", tone: "forest", cover: stock.photoHand, coverPosition: "center 40%" },
  { eyebrow: "1 · L’ESPÈCIE", title: "Cada bolet respon de manera diferent.", body: "La mateixa vall, el mateix dia: a la Val d’Aran el cep mostrava un mosaic de sectors verds i la trompeta de la mort, gairebé cap.", tone: "cream", imagePair: [{ src: captures.aranCep, label: "Cep" }, { src: captures.aranTrompeta, label: "Trompeta de la mort" }] },
  { eyebrow: "2 · LA INTENSITAT", title: "Compara les condicions del mateix dia.", body: "La puntuació d’un sector serveix per comparar-lo amb els altres, no per confirmar que hi ha bolets.", tone: "clay", image: captures.windowRipolles, imagePosition: "center 100%", imageHeight: 640 },
  { eyebrow: "3 · L’EXTENSIÓ", title: "Un senyal ampli pesa més que una cel·la aïllada.", body: "Mira si el color s’estén per tota una vall o si només és un punt solitari.", tone: "cream", image: captures.cepPirineus, imagePosition: "center 62%", imageHeight: 600 },
  { eyebrow: "EL MAPA ORIENTA", title: "El bosc sempre decideix.", body: "Condicions favorables no equivalen a presència confirmada. Consulta la lectura d’avui i surt amb criteri.", tone: "forest", footer: "bolets.app/map" },
];

const notGpsSlides: CampaignSlide[] = [
  { eyebrow: "QUÈ T’EXPLICA EL MAPA — I QUÈ NO", title: "El mapa no és un GPS de troballes.", tone: "forest", cover: stock.photoPeople, coverPosition: "center 35%" },
  { eyebrow: "SÍ · CONDICIONS", title: "T’explica quines condicions té cada sector avui.", body: "Pluja recent, temperatura i terreny, resumits en una puntuació comparable de 0 a 100.", tone: "cream", image: captures.windowCerdanya, imagePosition: "center 100%", imageHeight: 640 },
  { eyebrow: "SÍ · TERRENY I HÀBITAT", title: "T’explica si el terreny hi encaixa.", body: "La vista de terreny adequat mostra on l’hàbitat és compatible amb l’espècie, més enllà del temps que ha fet.", tone: "clay", image: captures.aranCepHabitat, imagePosition: "center 30%", imageHeight: 600 },
  { eyebrow: "NO · PRESÈNCIA NI PUNTS", title: "No confirma presència ni assenyala punts de recol·lecció.", body: "Les teves troballes són teves: el quadern de camp és privat i mai no publica coordenades exactes.", tone: "cream", image: captures.findings, imagePosition: "center 40%" },
  { eyebrow: "EXPLORA AMB CRITERI", title: "Respecta el bosc. Decideix amb context.", body: "Consulta el mapa, tria l’espècie i compara territoris abans de preparar la sortida.", tone: "forest", footer: "bolets.app/map" },
];

const speciesSlides: CampaignSlide[] = [
  { eyebrow: "TRIA L’ESPÈCIE", title: "El mateix bosc no serveix igual per a tots els bolets.", tone: "forest", cover: stock.coverTrompetes, coverPosition: "center 45%" },
  { eyebrow: "CEP · VAL D’ARAN · 4 DE SETEMBRE", title: "Un mosaic de sectors verds.", body: "El mapa del cep a la Val d’Aran, amb sectors mitjans repartits per tota la vall.", tone: "cream", image: captures.aranCep, imagePosition: "center 28%", imageHeight: 620 },
  { eyebrow: "PINETELL · VAL D’ARAN · 4 DE SETEMBRE", title: "Senyal baix, però extens.", body: "Els mateixos sectors, en taronja: el pinetell hi mostra un senyal baix el mateix dia.", tone: "clay", image: captures.aranPinetell, imagePosition: "center 28%", imageHeight: 620 },
  { eyebrow: "TROMPETA DE LA MORT · VAL D’ARAN · 4 DE SETEMBRE", title: "Gairebé cap sector.", body: "Per a la trompeta, el mapa de la mateixa vall queda quasi buit.", tone: "cream", image: captures.aranTrompeta, imagePosition: "center 28%", imageHeight: 620 },
  { eyebrow: "TRIA L’ESPÈCIE", title: "Abans de triar el bosc, tria el bolet.", body: "Canvia l’espècie al mapa i compara: el color i l’extensió del senyal no coincideixen.", tone: "forest", footer: "bolets.app/map" },
];

const valleysSlides: CampaignSlide[] = [
  { eyebrow: "COMPARA TERRITORIS", title: "Tres valls del Pirineu, tres lectures.", tone: "forest", cover: stock.coverPath, coverPosition: "center 50%" },
  { eyebrow: "VAL D’ARAN · CEP · 4 DE SETEMBRE", title: "27/100 al sector tocat, verds al voltant.", body: "Baixa al sector central, però el mosaic de la vall mostra força sectors verds.", tone: "cream", image: captures.windowAran, imagePosition: "center 100%", imageHeight: 640 },
  { eyebrow: "RIPOLLÈS · CEP · 4 DE SETEMBRE", title: "46/100 a la vall de Camprodon.", body: "Mitjana: condicions 55/100 i terreny adequat al 64%.", tone: "clay", image: captures.windowRipolles, imagePosition: "center 100%", imageHeight: 640 },
  { eyebrow: "CERDANYA · CEP · 4 DE SETEMBRE", title: "9/100 prop de Puigcerdà.", body: "Molt baixa: condicions 17/100 i terreny 18%. Mateixa espècie, mateix dia, lectura diferent.", tone: "cream", image: captures.windowCerdanya, imagePosition: "center 100%", imageHeight: 640 },
  { eyebrow: "COMPARA TERRITORIS", title: "Compara abans de triar el bosc.", body: "El mapa compara sectors, no troballes: mai no revela cap punt de recol·lecció.", tone: "forest", footer: "bolets.app/map" },
];

const profileSlides: CampaignSlide[] = [
  { eyebrow: "LA GUIA DE BOLETS", title: "Cada bolet, una fitxa.", tone: "forest", cover: stock.coverCep, coverPosition: "center 55%" },
  { eyebrow: "LA FITXA", title: "Hàbitat, altitud i temporada, d’un cop d’ull.", body: "Cada espècie comença amb el que cal saber abans de sortir.", tone: "cream", image: captures.guideHero, imagePosition: "center top", imageHeight: 620 },
  { eyebrow: "COM RECONÈIXER-LO", title: "Barret, himeni, peu, carn i olor.", body: "Els trets que permeten reconèixer l’espècie, un per un.", tone: "clay", image: captures.guideReconeixer, imagePosition: "center top", imageHeight: 620 },
  { eyebrow: "ESPÈCIES SEMBLANTS", title: "Amb què es confon.", body: "Les confusions possibles, amb un enllaç per comparar-les tret a tret.", tone: "cream", image: captures.guideSemblants, imagePosition: "center top", imageHeight: 620 },
  { eyebrow: "62 ESPÈCIES", title: "Coneix cada bolet.", body: "Comestibles i tòxics, amb les confusions habituals. Busca per nom, temporada o hàbitat.", tone: "forest", footer: "bolets.app/bolets" },
];

function CarouselSlideCard({ slides }: { slides: CampaignSlide[] }) {
  const frame = useCurrentFrame();
  const index = Math.min(Math.floor(frame), slides.length - 1);
  const slide = slides[index];
  const dark = slide.tone === "cream";
  const background = slide.tone === "cream" ? palette.cream : slide.tone === "clay" ? palette.clay : palette.forest;
  const foreground = dark ? palette.ink : palette.cream;
  const secondary = dark ? "#63645d" : "rgba(244, 236, 215, 0.84)";
  const border = dark ? "rgba(20, 39, 28, 0.20)" : "rgba(244, 236, 215, 0.24)";
  const accent = dark ? palette.clay : palette.orangeLight;
  const windowStyle: CSSProperties = { position: "relative", overflow: "hidden", borderRadius: 28, border: `2px solid ${palette.cream}`, background: palette.creamSoft, boxShadow: "0 24px 60px rgba(0, 0, 0, 0.28)" };

  if (slide.cover) {
    return (
      <AbsoluteFill style={{ background: palette.forestDeep, color: palette.cream, fontFamily }}>
        <Img src={staticFile(slide.cover)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: slide.coverPosition ?? "center" }} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(9,23,15,0.35) 0%, rgba(9,23,15,0.05) 30%, rgba(9,23,15,0.88) 100%)" }} />
        <div style={{ position: "absolute", top: 58, left: 58, right: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <InstagramPromoBrand />
          <span style={{ color: palette.orangeLight, fontSize: 23, fontWeight: 900 }}>{index + 1}/05</span>
        </div>
        <div style={{ position: "absolute", left: 58, right: 58, bottom: 74 }}>
          <div style={{ color: palette.orangeLight, fontSize: 23, fontWeight: 900, letterSpacing: "0.14em" }}>{slide.eyebrow}</div>
          <div style={{ marginTop: 18, fontSize: 84, fontWeight: 900, letterSpacing: "-0.055em", lineHeight: 0.94, textShadow: "0 6px 30px rgba(0,0,0,0.35)" }}>{slide.title}</div>
          <div style={{ marginTop: 34, display: "flex", alignItems: "center", gap: 14, color: "rgba(244, 236, 215, 0.85)", fontSize: 24 }}>
            <span style={{ width: 54, height: 8, background: palette.orange }} /> Desplaça per continuar →
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  const hasMedia = Boolean(slide.image || slide.imagePair);
  return (
    <AbsoluteFill style={{ background, color: foreground, padding: "58px 58px 62px", fontFamily }}>
      <div style={{ position: "absolute", inset: 24, border: `1px solid ${border}`, borderRadius: 28 }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 25, borderBottom: `1px solid ${border}` }}>
        <InstagramPromoBrand dark={dark} />
        <span style={{ color: accent, fontSize: 23, fontWeight: 900 }}>{index + 1}/05</span>
      </div>
      <div style={{ position: "relative", display: "flex", height: 1110, flexDirection: "column", justifyContent: hasMedia ? "flex-start" : "center", paddingTop: hasMedia ? 52 : 0 }}>
        <div style={{ color: accent, fontSize: 23, fontWeight: 900, letterSpacing: "0.14em" }}>{slide.eyebrow}</div>
        <div style={{ maxWidth: 930, marginTop: 18, fontSize: slide.title.length > 44 ? 64 : 76, fontWeight: 900, letterSpacing: "-0.052em", lineHeight: 0.96 }}>{slide.title}</div>
        {slide.body ? <div style={{ maxWidth: 880, marginTop: 24, color: secondary, fontSize: 28, fontWeight: 620, lineHeight: 1.34 }}>{slide.body}</div> : null}
        {slide.image ? (
          <div style={{ ...windowStyle, marginTop: 40, height: slide.imageHeight ?? 520 }}>
            <Img src={staticFile(slide.image)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: slide.imagePosition ?? "center top" }} />
          </div>
        ) : null}
        {slide.imagePair ? (
          <div style={{ display: "flex", gap: 22, marginTop: 40 }}>
            {slide.imagePair.map((item) => (
              <div key={item.src} style={{ ...windowStyle, flex: 1, height: 560 }}>
                <Img src={staticFile(item.src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 26%" }} />
                <div style={{ position: "absolute", left: 18, bottom: 18, padding: "10px 16px", borderRadius: 999, background: palette.orange, color: palette.forestDeep, fontSize: 22, fontWeight: 900 }}>{item.label}</div>
              </div>
            ))}
          </div>
        ) : null}
        {!hasMedia ? <div style={{ width: 120, height: 12, marginTop: 50, background: palette.orange }} /> : null}
        {slide.footer ? (
          <div style={{ display: "inline-flex", alignSelf: "flex-start", marginTop: 54, padding: "20px 30px", borderRadius: 999, color: palette.forest, background: palette.cream, fontSize: 30, fontWeight: 900 }}>{slide.footer}</div>
        ) : null}
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 24, borderTop: `1px solid ${border}`, color: secondary, fontSize: 22 }}>
        <span>{index === slides.length - 1 ? "Enllaç al perfil" : "Desplaça per continuar →"}</span>
        <span style={{ color: foreground, fontWeight: 900 }}>bolets.app</span>
      </div>
    </AbsoluteFill>
  );
}

export function InstagramMapReadCarousel() {
  return <CarouselSlideCard slides={readMapSlides} />;
}

export function InstagramMapNotGpsCarousel() {
  return <CarouselSlideCard slides={notGpsSlides} />;
}

export function InstagramMapSpeciesCarousel() {
  return <CarouselSlideCard slides={speciesSlides} />;
}

export function InstagramMapValleysCarousel() {
  return <CarouselSlideCard slides={valleysSlides} />;
}

export function InstagramMapProfileCarousel() {
  return <CarouselSlideCard slides={profileSlides} />;
}
