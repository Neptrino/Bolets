import { BrandMark } from "@/components/brand-mark";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import { INSTAGRAM_FONT_FAMILY, instagramFormats, instagramPalette as p, type InstagramFormat } from "@/src/lib/instagram-design";
import { getSuitabilityBand, suitabilityScale } from "@/src/lib/suitability-scale";

const dateFormat = new Intl.DateTimeFormat("ca-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });
const percent = (value: number) => `${Math.round(value * 100)}%`;

/** The daily publisher and its preview render the same signed readings. */
export function InstagramDailyCard({ card, format }: { card: DailyShareCard; format: InstagramFormat }) {
  const frame = instagramFormats[format];
  const readings = card.available && card.observedAt ? card.readings.slice(0, 3) : [];
  const zero = readings.length > 0 && readings.every(reading => reading.score === 0);
  const overview = card.scope === "overview";
  return <div style={{ display: "flex", position: "relative", width: frame.width, height: frame.height, background: p.cream, color: p.forest, fontFamily: INSTAGRAM_FONT_FAMILY }}>
    <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: frame.left, right: frame.right, top: frame.top, bottom: frame.bottom }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><BrandMark size={42} /><span style={{ fontSize: 26, fontWeight: 900 }}>bolets.app</span></div>
        <span style={{ fontSize: 24 }}>{card.isPreview ? "MOSTRA · " : ""}{card.observedAt ? dateFormat.format(new Date(card.observedAt)) : "Sense lectura vigent"}</span>
      </div>
      <span style={{ marginTop: 45, fontSize: 26, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: p.clay }}>{overview ? "Catalunya · Condicions d’avui" : card.title}</span>
      <span style={{ marginTop: 18, fontSize: 96, fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 0.98 }}>{readings.length === 0 ? "Avui, sense lectura." : zero ? "Avui, sense senyal positiu." : "Com està el bosc avui?"}</span>
      <span style={{ marginTop: 24, marginBottom: 28, fontSize: 30, lineHeight: 1.25 }}>{readings.length === 0 ? "Consulta el mapa per comprovar les dades disponibles." : overview ? "Tres territoris per començar a comparar." : "Compara les espècies abans de sortir."}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {readings.map((reading, index) => <div key={`${reading.regionName}-${reading.speciesId}`} style={{ display: "flex", flexDirection: "column", padding: "22px 28px", background: p.creamSoft, color: p.forest, borderLeft: `18px solid ${reading.score === 0 ? "#756f64" : getSuitabilityBand(reading.score).color}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <span style={{ color: p.clay, fontSize: 21, fontWeight: 800 }}>0{index + 1} · {overview ? reading.speciesName : reading.regionName}</span>
              <span style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.05, marginTop: 8 }}>{overview ? reading.regionName : reading.speciesName}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "12px 16px", background: reading.score === 0 ? "#756f64" : getSuitabilityBand(reading.score).color, color: reading.score === 0 ? p.cream : p.forest }}><span style={{ fontSize: 80, lineHeight: 1, fontWeight: 900 }}>{reading.score}</span><span style={{ fontSize: 24 }}>/100</span></div>
          </div>
          <span style={{ marginTop: 12, fontSize: 23, color: p.muted }}>Millor sector · {percent(reading.positiveCellShare)} amb senyal · {percent(reading.score20CellShare)} a 20+</span>
        </div>)}
      </div>
      <div style={{ display: "flex", flex: 1, minHeight: 26 }} />
      <div style={{ display: "flex", gap: 8 }}>{suitabilityScale.map(band => <div key={band.id} style={{ display: "flex", flex: 1, height: 24, background: band.color }} />)}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 21, marginTop: 10 }}><span>Condicions menys favorables</span><span>Més favorables</span></div>
      <span style={{ marginTop: 26, fontSize: 32, fontWeight: 900 }}>Consulta el mapa Avui · bolets.app</span>
      <span style={{ marginTop: 14, fontSize: 23 }}>Condicions, no presència. No revela punts de recol·lecció.</span>
    </div>
  </div>;
}
