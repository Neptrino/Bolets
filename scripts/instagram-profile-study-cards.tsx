// Local art direction only. Never imported by a signed social publication route.
/* eslint-disable @next/next/no-img-element -- Satori consumes data images, not Next.js image components. */
import { BrandMark } from "@/components/brand-mark";
import { INSTAGRAM_FONT_FAMILY, instagramPalette as p } from "@/src/lib/instagram-design";
import { suitabilityScale } from "@/src/lib/suitability-scale";

export function MapStudyCover({ title, eyebrow, subtitle, map, tone = "cream", round = false, backgroundPhoto, timeline = false, proposal = true }: {
  title: string; eyebrow: string; subtitle: string; map: string;
  tone?: "cream" | "orange" | "forest"; round?: boolean; backgroundPhoto?: string; timeline?: boolean; proposal?: boolean;
}) {
  const foreground = tone === "forest" ? p.cream : p.forest;
  return <div style={{ display: "flex", position: "relative", flexDirection: "column", width: 1080, height: 1350, background: p[tone], color: foreground, fontFamily: INSTAGRAM_FONT_FAMILY }}>
    {backgroundPhoto ? <img alt="" src={backgroundPhoto} width={1080} height={1350} style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 1350, objectFit: "cover", opacity: 0.22 }} /> : null}
    <div style={{ display: "flex", flexDirection: "column", position: "relative", padding: "58px 64px", height: 1350 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><BrandMark size={42} /><span style={{ fontSize: 26, fontWeight: 900 }}>bolets.app</span>{proposal ? <span style={{ marginLeft: "auto", fontSize: 20 }}>PROPOSTA</span> : null}</div>
      <span style={{ marginTop: 48, fontSize: 25, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 800 }}>{eyebrow}</span>
      <span style={{ marginTop: 18, fontSize: title.length > 32 ? 94 : 112, fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 0.98 }}>{title}</span>
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", marginTop: 25, marginBottom: 20 }}>
        <img alt="" src={map} width={round ? 640 : 940} height={640} style={{ width: round ? 640 : 940, height: 640, objectFit: round ? "cover" : "contain", borderRadius: round ? 320 : 0, ...(round ? { border: `8px solid ${p.cream}` } : {}) }} />
      </div>
      {timeline ? <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `3px solid ${foreground}`, paddingTop: 12, fontSize: 23, fontWeight: 800 }}><span>OBSERVAT</span><span style={{ padding: "8px 22px", background: p.orange, color: p.forest }}>AVUI</span><span>PREVISIÓ</span></div> : <div style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", height: 9 }}>{suitabilityScale.map(band => <div key={band.label} style={{ width: "20%", background: band.color }} />)}</div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, marginTop: 8 }}><span>Condicions menys favorables</span><span>Més favorables</span></div></div>}
      <span style={{ marginTop: 23, fontSize: 30, lineHeight: 1.2, fontWeight: 700 }}>{subtitle}</span>
      <span style={{ marginTop: 22, fontSize: 19 }}>Mapa de referència · © ICGC · No confirma presència</span>
    </div>
  </div>;
}

export function FieldStudyCover({ photo }: { photo: string }) {
  return <div style={{ display: "flex", position: "relative", width: 1080, height: 1350, background: p.forest }}>
    <img alt="" src={photo} width={1080} height={1350} style={{ width: 1080, height: 1350, objectFit: "cover" }} />
    <div style={{ display: "flex", alignItems: "center", position: "absolute", left: 64, top: 58, gap: 12, padding: "12px 18px", background: p.forest, color: p.cream, fontFamily: INSTAGRAM_FONT_FAMILY, fontSize: 25, fontWeight: 900 }}><BrandMark size={34} /><span>bolets.app</span></div>
    <div style={{ display: "flex", position: "absolute", left: 64, bottom: 58, padding: "12px 18px", background: p.cream, color: p.forest, fontFamily: INSTAGRAM_FONT_FAMILY, fontSize: 24, fontWeight: 800 }}>A PEU DE BOSC</div>
  </div>;
}
