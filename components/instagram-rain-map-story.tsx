import { BrandMark } from "@/components/brand-mark";
import { INSTAGRAM_FONT_FAMILY, instagramFormats, instagramPalette as p, instagramType as t } from "@/src/lib/instagram-design";
import { rainfallScale } from "@/src/lib/rainfall-scale";

export interface InstagramRainMapStoryBrief {
  /** The painted rain map, already cropped to the panel, as a data URL. */
  mapDataUrl: string;
  eyebrow: string;
  title: string;
  legend: string;
  wettest: { name: string; rainfall: string };
  driest: { name: string; rainfall: string };
  caveat: string;
  link: string;
  /** Day the painted reading belongs to, already formatted in Catalan. */
  readingDate: string;
  sources: string;
}

/** The painted bands; dry ground is left unpainted, so it has no legend step. */
const legendBands = rainfallScale.filter((band) => band.id !== "dry");

/**
 * The map panel. Nothing below the header may grow, or Satori overflows the
 * Story frame and stacks the type over the map, so every block here carries an
 * explicit size and the script crops the map to this exact shape.
 */
export const RAIN_STORY_MAP_WIDTH = 898;
export const RAIN_STORY_MAP_HEIGHT = 702;

function Stat({ label, name, rainfall }: { label: string; name: string; rainfall: string }) {
  return <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 4 }}>
    <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: p.orangeLight }}>{label}</span>
    <span style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.03em" }}>{name}</span>
    <span style={{ fontSize: 28 }}>{rainfall} en 7 dies</span>
  </div>;
}

export function InstagramRainMapStory({ brief }: { brief: InstagramRainMapStoryBrief }) {
  const box = instagramFormats.story;
  const width = box.width - box.left - box.right;
  const band = width / legendBands.length;
  return <div style={{
    display: "flex", flexDirection: "column", width: box.width, height: box.height,
    padding: `${box.top}px ${box.right}px ${box.bottom}px ${box.left}px`,
    background: p.cream, color: p.forest, fontFamily: INSTAGRAM_FONT_FAMILY,
  }}>
    <div style={{ display: "flex", height: 44, alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <BrandMark size={44} />
        <span style={{ fontSize: t.label, fontWeight: 900 }}>bolets.app</span>
      </div>
      <span style={{ display: "flex", padding: "9px 18px", background: p.orange, color: p.forest, fontSize: t.small, fontWeight: 900, letterSpacing: "0.1em" }}>NOU</span>
    </div>

    <span style={{ display: "flex", marginTop: 26, height: 32, fontSize: t.label, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: p.clay }}>{brief.eyebrow}</span>
    <span style={{ display: "flex", marginTop: 8, height: 108, fontSize: 104, lineHeight: 1, fontWeight: 900, letterSpacing: "-0.05em" }}>{brief.title}</span>

    {/* The map is the announcement: the real painted render, not a mock-up. */}
    <div style={{ display: "flex", marginTop: 18, border: `4px solid ${p.forest}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" src={brief.mapDataUrl} width={RAIN_STORY_MAP_WIDTH} height={RAIN_STORY_MAP_HEIGHT} />
    </div>

    <div style={{ display: "flex", flexDirection: "column", marginTop: 16, height: 96 }}>
      <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: p.muted }}>{brief.legend}</span>
      <div style={{ display: "flex", marginTop: 8 }}>
        {legendBands.map((item) => <div key={item.id} style={{ display: "flex", width: band, height: 22, background: item.colour }} />)}
      </div>
      <div style={{ display: "flex", marginTop: 6 }}>
        {legendBands.map((item) => <span key={item.id} style={{ display: "flex", width: band, fontSize: 22, fontWeight: 700 }}>{item.minimumMm} mm</span>)}
      </div>
    </div>

    <div style={{ display: "flex", marginTop: 14, height: 124, padding: "0 30px", alignItems: "center", gap: 24, background: p.forest, color: p.cream }}>
      <Stat label="Més plujós" name={brief.wettest.name} rainfall={brief.wettest.rainfall} />
      <Stat label="Més sec" name={brief.driest.name} rainfall={brief.driest.rainfall} />
    </div>

    <span style={{ display: "flex", marginTop: 12, height: 32, fontSize: 26 }}>{brief.caveat}</span>
    <span style={{ display: "flex", marginTop: 6, height: 44, fontSize: 34, fontWeight: 900 }}>{brief.link}</span>
    <span style={{ display: "flex", marginTop: 6, height: 24, fontSize: 19, color: p.muted }}>Lectura del {brief.readingDate} · {brief.sources}</span>
  </div>;
}
