import type { CSSProperties, ReactNode } from "react";
import { INSTAGRAM_FONT_FAMILY, instagramPalette } from "@/src/lib/instagram-design";
import { BrandMark } from "@/components/brand-mark";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import { getSuitabilityBand, suitabilityScale } from "@/src/lib/suitability-scale";

// Share-image pixels, rendered by Satori. Keep the message between y=270 and
// y=1580 so it also survives the central feed crop and the Reel controls.
export const WEEKEND_SLIDE_COUNT = 5;
export const WEEKEND_MAP_SLIDE = 1;
const color = { ...instagramPalette, muted: "#bfcbb8", inkMuted: "#58624f" };
const column: CSSProperties = { display: "flex", flexDirection: "column" };
const dateFormat = new Intl.DateTimeFormat("ca-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });
const percent = (value: number) => `${Math.round(value * 100)}%`;
type Reading = DailyShareCard["readings"][number];

export interface WeekendPhoto {
  dataUrl: string;
  credit: string;
}

function Heading({ eyebrow, children, light = false }: { eyebrow: string; children: ReactNode; light?: boolean }) {
  return <div style={{ ...column, width: "100%", marginBottom: 40 }}>
    <span style={{ color: light ? color.orange : color.inkMuted, fontSize: 27, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase" }}>{eyebrow}</span>
    <span style={{ width: 898, whiteSpace: "normal", wordBreak: "break-word", marginTop: 18, fontSize: 88, fontWeight: 900, lineHeight: 0.98, letterSpacing: "-0.055em" }}>{children}</span>
  </div>;
}

function Photo({ photo, height }: { photo?: WeekendPhoto; height: number }) {
  if (!photo) return null;
  return <div style={{ display: "flex", position: "relative", height, flexShrink: 0, overflow: "hidden", background: color.forest }}>
    {/* The catalogue WebP is converted to JPEG before entering ImageResponse. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={photo.dataUrl} alt="" width={936} height={height} style={{ width: "100%", height, objectFit: "cover" }} />
    <span style={{ position: "absolute", left: 0, bottom: 0, padding: "9px 16px", background: color.forest, color: color.cream, fontSize: 18 }}>Foto de referència · {photo.credit}</span>
  </div>;
}

function Extent({ reading, light = false }: { reading: Reading; light?: boolean }) {
  return <div style={{ ...column, gap: 15, width: "100%" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: 54, fontWeight: 900 }}>{percent(reading.positiveCellShare)}</span>
      <span style={{ fontSize: 28 }}>sectors amb senyal positiu</span>
    </div>
    <div style={{ display: "flex", width: "100%", height: 18, background: light ? "#40503b" : "#ddd8c3" }}>
      <div style={{ display: "flex", width: percent(reading.positiveCellShare), height: "100%", background: light ? color.orange : color.forest }} />
    </div>
    <span style={{ fontSize: 26, color: light ? color.muted : color.inkMuted }}>{percent(reading.score20CellShare)} dels sectors arriben a 20/100 o més.</span>
  </div>;
}

function MapSlide({ card, mapImageUrl }: { card: DailyShareCard; mapImageUrl?: string }) {
  return <div style={{ ...column, width: "100%" }}>
    <Heading eyebrow="Aquest cap de setmana">On miraries?</Heading>
    <span style={{ marginTop: -18, marginBottom: 22, fontSize: 30, fontWeight: 800 }}>{card.readings[0]?.score === 0 ? "El senyal d’avui és a zero." : "El mapa Avui de Catalunya"}</span>
    <div style={{ ...column, background: "#eee9dc", height: 810, overflow: "hidden" }}>
      {mapImageUrl ? <div style={{ ...column, width: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mapImageUrl} alt="" width={936} height={750} style={{ width: "100%", height: 750, objectFit: "contain" }} />
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 22px", fontSize: 24 }}><span>{card.isPreview ? "Mapa de referència" : "Catalunya · 2,5 km"}</span><span>© ICGC</span></div>
      </div> : <span style={{ margin: "auto", fontSize: 36 }}>Mapa no disponible</span>}
    </div>
    <div style={{ display: "flex", gap: 6, marginTop: 22 }}>
      {suitabilityScale.map((band) => <div key={band.id} style={{ ...column, flex: 1, gap: 9 }}>
        <div style={{ display: "flex", height: 15, background: band.color }} />
        <span style={{ fontSize: 22 }}>{band.label}</span>
      </div>)}
    </div>
    <span style={{ marginTop: 18, fontSize: 24, color: color.inkMuted }}>Color = senyal positiu · Zero = contorn discontinu</span>
  </div>;
}

function Ranking({ card }: { card: DailyShareCard }) {
  return <div style={{ ...column, width: "100%" }}>
    <Heading eyebrow="01 / Compara territoris" light>On destaca avui?</Heading>
    <span style={{ color: color.muted, fontSize: 29, marginBottom: 24 }}>Millor sector de cada territori · escala de 0 a 100</span>
    {card.readings.slice(0, 3).map((reading, index) => <div key={`${reading.regionName}-${reading.speciesId}`} style={{ ...column, padding: "26px 0", borderTop: "2px solid #40503b" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
        <div style={{ ...column, flex: 1 }}>
          <span style={{ color: color.orange, fontSize: 24, fontWeight: 900 }}>0{index + 1}</span>
          <span style={{ fontSize: reading.regionName.length > 22 ? 41 : 49, lineHeight: 1.1, fontWeight: 900, marginTop: 8 }}>{reading.regionName}</span>
          <span style={{ color: color.muted, fontSize: 29, marginTop: 8 }}>{reading.speciesName}</span>
        </div>
        <div style={{ ...column, alignItems: "flex-end" }}>
          <span style={{ fontSize: 102, lineHeight: 1, letterSpacing: "-0.055em", fontWeight: 900 }}>{reading.score}</span>
          <span style={{ color: color.muted, fontSize: 24 }}>/100 · màxim</span>
        </div>
      </div>
      <span style={{ marginTop: 18, fontSize: 25, color: color.muted }}>{percent(reading.positiveCellShare)} amb senyal · {percent(reading.score20CellShare)} a 20+</span>
    </div>)}
    {card.readings.length === 0 ? <span style={{ fontSize: 40 }}>Sense lectures publicables.</span> : null}
  </div>;
}

function Leader({ reading, photo }: { reading?: Reading; photo?: WeekendPhoto }) {
  if (!reading) return <Heading eyebrow="02 / L’espècie">Sense lectura publicable.</Heading>;
  return <div style={{ ...column, width: "100%" }}>
    <Heading eyebrow={reading.score === 0 ? "02 / Sense senyal positiu" : "02 / La lectura que destaca"}>{reading.speciesName}</Heading>
    <Photo photo={photo} height={620} />
    <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 22, marginBottom: 22 }}>
      <div style={{ ...column, width: 590, flexShrink: 0, gap: 10 }}>
        <span style={{ width: 590, whiteSpace: "normal", wordBreak: "break-word", fontSize: 40, lineHeight: 1.1, fontWeight: 900 }}>{reading.regionName}</span>
        <span style={{ fontSize: 26, color: color.inkMuted }}>{reading.score === 0 ? "Sense senyal positiu" : `Oportunitat ${getSuitabilityBand(reading.score).label.toLowerCase()}`}</span>
      </div>
      <div style={{ ...column, alignItems: "flex-end", gap: 8 }}>
        <span style={{ fontSize: 112, lineHeight: 1, fontWeight: 900, letterSpacing: "-0.06em" }}>{reading.score}</span>
        <span style={{ fontSize: 23, fontWeight: 800 }}>millor sector /100</span>
      </div>
    </div>
    <Extent reading={reading} />
  </div>;
}

function Context({ reading }: { reading?: Reading }) {
  return <div style={{ ...column, width: "100%" }}>
    <Heading eyebrow="03 / El detall que importa" light>Un bon sector no és tot el bosc.</Heading>
    {reading ? <div style={{ ...column, width: "100%" }}>
      <span style={{ color: color.orange, fontSize: 180, lineHeight: 1.1, letterSpacing: "-0.06em", fontWeight: 900, marginTop: 38 }}>{percent(reading.positiveCellShare)}</span>
      <span style={{ fontSize: 42, lineHeight: 1.15, maxWidth: 820 }}>dels sectors tenen senyal positiu a {reading.regionName}.</span>
      <div style={{ marginTop: 48, ...column, paddingTop: 35, borderTop: "2px solid #40503b", gap: 18 }}>
        <span style={{ fontSize: 32, fontWeight: 800 }}>{reading.speciesName} · màxim {reading.score}/100</span>
        <span style={{ fontSize: 30, color: color.muted }}>{percent(reading.score20CellShare)} dels sectors arriben a 20/100 o més.</span>
      </div>
    </div> : <span style={{ fontSize: 40 }}>Comprova l’extensió del senyal al mapa.</span>}
    <span style={{ marginTop: 42, color: color.muted, fontSize: 31 }}>Compara el màxim amb l’extensió abans de triar territori.</span>
  </div>;
}

function Closing() {
  return <div style={{ ...column, width: "100%" }}>
    <Heading eyebrow="Abans de dissabte">Desa el mapa. Decideix després.</Heading>
    <span style={{ marginTop: 28, fontSize: 38, lineHeight: 1.3 }}>Les condicions canvien. Revisa-les abans de sortir.</span>
    <div style={{ ...column, marginTop: 72, padding: "46px 36px", background: color.forest, color: color.cream, gap: 20 }}>
      <span style={{ color: color.orange, fontSize: 28, fontWeight: 800 }}>EL MAPA ACTUALITZAT</span>
      <span style={{ fontSize: 98, lineHeight: 1, fontWeight: 900, letterSpacing: "-0.05em" }}>bolets.app</span>
      <span style={{ fontSize: 31 }}>Enllaç al perfil · @bolets.app</span>
    </div>
    <span style={{ marginTop: 55, fontSize: 39, fontWeight: 900 }}>Envia-ho a qui vindrà amb tu.</span>
  </div>;
}

export function InstagramWeekendCard({ card, slide, mapImageUrl, photo }: { card: DailyShareCard; slide: number; mapImageUrl?: string; photo?: WeekendPhoto }) {
  const current = Math.min(Math.max(slide, 1), WEEKEND_SLIDE_COUNT);
  const dark = current === 2 || current === 4;
  return <div style={{ ...column, position: "relative", width: 1080, height: 1920, overflow: "hidden", background: dark ? color.forest : color.cream, color: dark ? color.cream : color.forest, fontFamily: INSTAGRAM_FONT_FAMILY }}>
    <div style={{ display: "flex", position: "absolute", left: 0, top: 0, right: 0, height: 18, background: color.orange }} />
    <div style={{ display: "flex", position: "absolute", left: 72, right: 110, top: 208, alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}><BrandMark size={44} /><span style={{ fontSize: 26, fontWeight: 900 }}>BOLETS ATLES</span></div>
      <span style={{ fontSize: 24 }}>{card.isPreview ? "MOSTRA · " : ""}{card.observedAt ? dateFormat.format(new Date(card.observedAt)) : "Sense lectura"}</span>
    </div>
    <div style={{ ...column, position: "absolute", left: 72, right: 110, top: 304 }}>
      {current === 1 ? <MapSlide card={card} mapImageUrl={mapImageUrl} /> : current === 2 ? <Ranking card={card} /> : current === 3 ? <Leader reading={card.readings[0]} photo={photo} /> : current === 4 ? <Context reading={card.readings[0]} /> : <Closing />}
    </div>
    <div style={{ ...column, position: "absolute", left: 72, right: 110, top: 1555, gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 20, borderTop: `2px solid ${dark ? "#40503b" : "#d3cfba"}`, fontSize: 24 }}>
        <span>Condicions d’avui · No confirma presència</span><span style={{ fontWeight: 900 }}>{current}/0{WEEKEND_SLIDE_COUNT}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>{Array.from({ length: WEEKEND_SLIDE_COUNT }, (_, index) => <div key={index} style={{ display: "flex", flex: 1, height: 5, background: index + 1 === current ? color.orange : dark ? "#40503b" : "#d3cfba" }} />)}</div>
    </div>
  </div>;
}
