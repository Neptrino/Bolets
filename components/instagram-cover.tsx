import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { InstagramEditorialMotif } from "@/components/instagram-editorial-motif";
import type { InstagramCoverBrief } from "@/src/lib/instagram-cover-brief";
import { INSTAGRAM_FONT_FAMILY, instagramFormats, instagramPalette as p, instagramTitleSize, instagramType as t, type InstagramFormat } from "@/src/lib/instagram-design";
import type { InstagramReferencePhoto } from "@/src/lib/instagram-image-assets";

export function InstagramCover({ brief, photo, format = "feed", draft = false, footer, visual }: {
  brief: InstagramCoverBrief;
  photo?: InstagramReferencePhoto;
  format?: InstagramFormat;
  draft?: boolean;
  footer?: string;
  visual?: ReactNode;
}) {
  const box = instagramFormats[format];
  const isPhoto = brief.layout === "photo";
  if (isPhoto && !photo) throw new Error("A photo cover requires its credited catalogue reference");
  const background = isPhoto ? p.forest : p[brief.tone];
  const light = isPhoto || brief.tone === "forest";
  const foreground = light ? p.cream : p.forest;
  const frameHeight = box.height - box.top - box.bottom;
  return <div style={{ display: "flex", flexDirection: "column", position: "relative", width: box.width, height: box.height, overflow: "hidden", background, color: foreground, fontFamily: INSTAGRAM_FONT_FAMILY }}>
    {isPhoto && photo ? <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: box.width, height: box.height }}>
      {/* The server renderer converts local catalogue images for Satori. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" src={photo.dataUrl} width={box.width} height={box.height} style={{ width: box.width, height: box.height, objectFit: "cover" }} />
    </div> : null}
    <div style={{ display: "flex", position: "absolute", top: box.top, left: box.left, right: box.right, alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background }}><BrandMark size={42} /><span style={{ fontSize: t.label, fontWeight: 900 }}>bolets.app</span></div>
      {draft ? <span style={{ padding: "10px 14px", background: p.orange, color: p.forest, fontSize: t.small, fontWeight: 900 }}>ESBORRANY</span> : null}
    </div>
    {isPhoto ? <div style={{ display: "flex", position: "absolute", bottom: box.bottom, left: box.left, right: box.right, flexDirection: "column", padding: "28px 32px", background: p.forest, color: p.cream }}>
      <span style={{ fontSize: t.label, color: p.orangeLight, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{brief.eyebrow}</span>
      <span style={{ marginTop: 16, fontSize: instagramTitleSize(brief.title), lineHeight: 0.98, fontWeight: 900, letterSpacing: "-0.05em" }}>{brief.title}</span>
      <span style={{ marginTop: 22, fontSize: t.body, lineHeight: 1.2 }}>{brief.subtitle}</span>
      <span style={{ marginTop: 26, fontSize: t.credit, color: "#bfcbb8" }}>Foto de referència · {photo?.credit}</span>
      {footer ? <span style={{ marginTop: 12, fontSize: t.small }}>{footer}</span> : null}
    </div> : <div style={{ display: "flex", position: "absolute", left: box.left, right: box.right, top: box.top + 120, height: frameHeight - 120, flexDirection: "column" }}>
      <span style={{ fontSize: t.label, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{brief.eyebrow}</span>
      <span style={{ marginTop: 22, fontSize: instagramTitleSize(brief.title), lineHeight: 0.98, fontWeight: 900, letterSpacing: "-0.05em" }}>{brief.title}</span>
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", minHeight: 360 }}>{visual ?? <InstagramEditorialMotif motif={brief.motif} light={light} />}</div>
      <span style={{ fontSize: t.body, lineHeight: 1.3, maxWidth: 880 }}>{brief.subtitle}</span>
      <span style={{ marginTop: 36, paddingTop: 20, borderTop: `2px solid ${foreground}`, fontSize: t.small }}>{footer ?? "Guia · Desplaça per continuar"}</span>
    </div>}
  </div>;
}
