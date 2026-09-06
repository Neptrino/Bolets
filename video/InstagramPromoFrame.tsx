import type { ReactNode } from "react";

import { instagramPalette, INSTAGRAM_MOTION_FONT_FAMILY } from "../src/lib/instagram-design";

export const promoPalette = instagramPalette;
export const promoFontFamily = INSTAGRAM_MOTION_FONT_FAMILY;

function MushroomMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <div style={{
      position: "relative",
      width: 43,
      height: 43,
      flex: "0 0 auto",
      overflow: "hidden",
      borderRadius: 13,
      background: inverted ? promoPalette.cream : promoPalette.forest,
    }}>
      <div style={{
        position: "absolute",
        top: 9,
        left: 8,
        width: 27,
        height: 15,
        borderRadius: "18px 18px 4px 4px",
        background: promoPalette.orange,
      }} />
      <div style={{
        position: "absolute",
        top: 22,
        left: 17,
        width: 10,
        height: 14,
        borderRadius: "2px 2px 6px 6px",
        background: inverted ? promoPalette.forest : promoPalette.cream,
      }} />
    </div>
  );
}

export function InstagramPromoBrand({ dark = false }: { dark?: boolean }) {
  const foreground = dark ? promoPalette.forest : promoPalette.cream;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 15, color: foreground }}>
      <MushroomMark inverted={!dark} />
      <div style={{ display: "flex", flexDirection: "column", fontFamily: promoFontFamily }}>
        <span style={{ fontSize: 23, fontWeight: 900, letterSpacing: "0.13em" }}>BOLETS ATLES</span>
        <span style={{ marginTop: 2, color: promoPalette.orange, fontSize: 15, fontWeight: 850, letterSpacing: "0.16em" }}>CATALUNYA</span>
      </div>
    </div>
  );
}

export function InstagramProductWindow({
  children,
  height = 505,
}: {
  children: ReactNode;
  height?: number;
}) {
  return (
    <div style={{
      position: "relative",
      width: "100%",
      height,
      overflow: "hidden",
      border: `2px solid ${promoPalette.cream}`,
      borderRadius: 30,
      background: promoPalette.cream,
      boxShadow: "0 28px 70px rgba(0, 0, 0, 0.30)",
    }}>
      {children}
    </div>
  );
}
