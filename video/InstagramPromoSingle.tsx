import { AbsoluteFill, Img, staticFile } from "remotion";

import {
  InstagramPromoBrand,
  promoFontFamily as fontFamily,
  promoPalette as palette,
} from "./InstagramPromoFrame";

// One-image app promo for the feed (1080 × 1350): the cep hero photograph,
// the claim at the top and the three products in three lenses at the bottom:
// the live map (large), the catalogue and the field guide (small).


interface LensSource {
  src: string;
  natural: { width: number; height: number };
  // Capture pixel that lands in the centre of the lens, and the zoom applied.
  focus: { x: number; y: number };
  scale: number;
}

// Val d'Aran cep mosaic, framed inside the territorial-window rectangle.
const mapSource: LensSource = {
  src: "captures/mobile/m08-window-aran-cep-start.png",
  natural: { width: 1080, height: 1920 },
  focus: { x: 640, y: 1060 },
  scale: 0.8,
};
interface WindowSource {
  src: string;
  // Region of the capture, in capture pixels, that fills the window.
  crop: { left: number; top: number; width: number; height: number };
}

// Cep card of the catalogue list, photo included (scripts/capture-promo-single.mjs).
const catalogueSource: WindowSource = {
  src: "captures/mobile/m11-catalogue-card-cep.png",
  crop: { left: 0, top: 0, width: 984, height: 1208 },
};
// "Parts d'un bolet" anatomy poster from the guide.
const guideSource: WindowSource = {
  src: "captures/mobile/m11-parts-dun-bolet.png",
  crop: { left: 60, top: 1080, width: 960, height: 1180 },
};

const grainSvg = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='320' height='320' filter='url(#n)' opacity='0.9'/></svg>",
);

function Lens({
  caption,
  chip,
  glow = false,
  size,
  source,
  x,
  y,
}: {
  caption?: { title: string; text: string };
  chip?: string;
  glow?: boolean;
  size: number;
  source: LensSource;
  x: number;
  y: number;
}) {
  const ring = size > 300 ? 3 : 2;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: size, height: size }}>
      {glow ? <div style={{ position: "absolute", left: -180, top: -180, width: size + 360, height: size + 360, borderRadius: 999, background: "radial-gradient(circle, rgba(242,138,50,0.28) 0%, rgba(242,138,50,0) 62%)" }} /> : null}
      <div style={{ position: "absolute", inset: 0, borderRadius: 999, overflow: "hidden", background: palette.creamSoft, boxShadow: glow ? "0 34px 90px rgba(0,0,0,0.5)" : "0 22px 50px rgba(0,0,0,0.45)" }}>
        <Img
          src={staticFile(source.src)}
          style={{ position: "absolute", width: source.natural.width * source.scale, height: source.natural.height * source.scale, left: size / 2 - source.focus.x * source.scale, top: size / 2 - source.focus.y * source.scale }}
        />
        <div style={{ position: "absolute", inset: 0, borderRadius: 999, boxShadow: `inset 0 0 ${size > 300 ? 70 : 34}px rgba(9,23,15,0.35)` }} />
      </div>
      <div style={{ position: "absolute", inset: size > 300 ? 10 : 6, borderRadius: 999, border: `${ring}px solid rgba(242,138,50,0.92)` }} />
      <div style={{ position: "absolute", inset: size > 300 ? -16 : -10, borderRadius: 999, border: "1px solid rgba(255,236,200,0.28)" }} />
      {chip ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: size - 26, display: "flex", justifyContent: "center" }}>
          <span style={{ padding: "9px 16px", borderRadius: 999, background: palette.orange, color: palette.forestDeep, fontSize: 18, fontWeight: 900, letterSpacing: "0.08em", whiteSpace: "nowrap", boxShadow: "0 10px 24px rgba(0,0,0,0.35)" }}>{chip}</span>
        </div>
      ) : null}
      {caption ? (
        <div style={{ position: "absolute", left: -20, width: size + 40, top: size + 18, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <span style={{ color: palette.cream, fontSize: 26, fontWeight: 900, letterSpacing: "-0.01em", textShadow: "0 4px 18px rgba(0,0,0,0.5)" }}>{caption.title}</span>
          <span style={{ marginTop: 4, color: "rgba(244,236,215,0.84)", fontSize: 20, fontWeight: 700, lineHeight: 1.25, textShadow: "0 4px 18px rgba(0,0,0,0.5)" }}>{caption.text}</span>
        </div>
      ) : null}
    </div>
  );
}

function Window({
  chip,
  height,
  source,
  width,
  x,
  y,
}: {
  chip: string;
  height: number;
  source: WindowSource;
  width: number;
  x: number;
  y: number;
}) {
  const scale = width / source.crop.width;
  return (
    <div style={{ position: "absolute", left: x, top: y, width, height }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 20, border: `2px solid ${palette.creamSoft}`, background: palette.creamSoft, boxShadow: "0 20px 46px rgba(0,0,0,0.45)" }}>
        <Img src={staticFile(source.src)} style={{ position: "absolute", left: -source.crop.left * scale, top: -source.crop.top * scale, width: "auto", height: "auto", transform: `scale(${scale})`, transformOrigin: "0 0" }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: height - 20, display: "flex", justifyContent: "center" }}>
        <span style={{ padding: "9px 16px", borderRadius: 999, background: palette.orange, color: palette.forestDeep, fontSize: 18, fontWeight: 900, letterSpacing: "0.08em", whiteSpace: "nowrap", boxShadow: "0 10px 24px rgba(0,0,0,0.35)" }}>{chip}</span>
      </div>
    </div>
  );
}

export type InstagramSinglePromoFormat = "portrait" | "square" | "story";

export interface InstagramSinglePromoProps {
  // Hero photograph (in video/assets); the crop is set per format below.
  photo?: string;
  format?: InstagramSinglePromoFormat;
}

interface Layout {
  width: number;
  height: number;
  position: string;
  gradient: string;
  brandTop: number;
  textTop: number;
  headlineSize: number;
  subline: boolean;
  ctaText: boolean;
  lens: { x: number; y: number; size: number };
  cards: { y: number; width: number; height: number; xA: number; xB: number };
}

// Feed 4:5, ad-safe 1:1 and Stories/Reels 9:16 share the same content; each
// layout keeps every element inside its own frame (and inside the Stories
// safe zone, 250 px from the top and bottom).
const layouts: Record<InstagramSinglePromoFormat, Layout> = {
  portrait: {
    width: 1080,
    height: 1350,
    position: "center 100%",
    gradient: "linear-gradient(180deg, rgba(9,23,15,0.86) 0%, rgba(9,23,15,0.6) 30%, rgba(9,23,15,0) 46%, rgba(9,23,15,0) 60%, rgba(9,23,15,0.86) 100%)",
    brandTop: 58,
    textTop: 168,
    headlineSize: 100,
    subline: true,
    ctaText: true,
    lens: { x: 722, y: 958, size: 300 },
    cards: { y: 1016, width: 184, height: 226, xA: 58, xB: 262 },
  },
  square: {
    width: 1080,
    height: 1080,
    position: "center 78%",
    gradient: "linear-gradient(180deg, rgba(9,23,15,0.86) 0%, rgba(9,23,15,0.6) 30%, rgba(9,23,15,0) 48%, rgba(9,23,15,0) 64%, rgba(9,23,15,0.86) 100%)",
    brandTop: 44,
    textTop: 124,
    headlineSize: 88,
    subline: false,
    ctaText: false,
    lens: { x: 772, y: 776, size: 250 },
    cards: { y: 826, width: 150, height: 184, xA: 58, xB: 226 },
  },
  story: {
    width: 1080,
    height: 1920,
    position: "center 50%",
    gradient: "linear-gradient(180deg, rgba(9,23,15,0.88) 0%, rgba(9,23,15,0.62) 30%, rgba(9,23,15,0) 44%, rgba(9,23,15,0) 62%, rgba(9,23,15,0.88) 100%)",
    brandTop: 270,
    textTop: 330,
    headlineSize: 104,
    subline: true,
    ctaText: true,
    lens: { x: 722, y: 1320, size: 300 },
    cards: { y: 1380, width: 184, height: 226, xA: 58, xB: 262 },
  },
};

export function InstagramSinglePromo({ photo = "stock/photo-cep-canopy.jpg", format = "portrait" }: InstagramSinglePromoProps) {
  const layout = layouts[format];
  return (
    <AbsoluteFill style={{ background: palette.forestDeep, color: palette.cream, fontFamily }}>
      <Img src={staticFile(photo)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: layout.position }} />
      <AbsoluteFill style={{ background: layout.gradient }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(9,23,15,0) 45%, rgba(9,23,15,0.55) 100%)" }} />
      <AbsoluteFill style={{ backgroundImage: `url("data:image/svg+xml;utf8,${grainSvg}")`, opacity: 0.08, mixBlendMode: "soft-light" }} />

      <div style={{ position: "absolute", top: layout.brandTop, left: 58, right: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <InstagramPromoBrand />
        <span style={{ padding: "9px 16px", borderRadius: 999, border: "1px solid rgba(244,236,215,0.4)", color: palette.cream, fontSize: 19, fontWeight: 900, letterSpacing: "0.14em" }}>MAPA EN DIRECTE</span>
      </div>

      <div style={{ position: "absolute", top: layout.textTop, left: 58, right: 58, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ color: palette.orangeLight, fontSize: 24, fontWeight: 900, letterSpacing: "0.15em" }}>MAPA DIARI · CATÀLEG DE 62 ESPÈCIES · GUIES DE CAMP</div>
        <div style={{ marginTop: 20, fontSize: layout.headlineSize, fontWeight: 900, letterSpacing: "-0.055em", lineHeight: 0.94, textShadow: "0 8px 34px rgba(0,0,0,0.5)" }}>
          On val la pena<br />buscar bolets <span style={{ color: palette.orange }}>avui</span>?
        </div>
        {layout.subline ? (
          <div style={{ marginTop: 24, maxWidth: 820, color: "rgba(244,236,215,0.9)", fontSize: 31, fontWeight: 650, lineHeight: 1.3, textShadow: "0 4px 18px rgba(0,0,0,0.45)" }}>
            Pluja, temperatura i terreny, sector per sector i per espècie. S’actualitza cada dia.
          </div>
        ) : null}
        <div style={{ marginTop: layout.subline ? 26 : 24, display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ padding: "15px 28px", borderRadius: 999, background: palette.orange, color: palette.forestDeep, fontSize: 30, fontWeight: 900, boxShadow: "0 14px 34px rgba(0,0,0,0.35)" }}>bolets.app</span>
          {layout.ctaText ? <span style={{ color: "rgba(244,236,215,0.88)", fontSize: 23, fontWeight: 700, textShadow: "0 4px 18px rgba(0,0,0,0.45)" }}>Al navegador, sense instal·lar res</span> : null}
        </div>
      </div>

      <Lens source={mapSource} x={layout.lens.x} y={layout.lens.y} size={layout.lens.size} glow chip="MAPA DIARI" />
      <Window source={catalogueSource} x={layout.cards.xA} y={layout.cards.y} width={layout.cards.width} height={layout.cards.height} chip="CATÀLEG" />
      <Window source={guideSource} x={layout.cards.xB} y={layout.cards.y} width={layout.cards.width} height={layout.cards.height} chip="GUIES" />
    </AbsoluteFill>
  );
}
