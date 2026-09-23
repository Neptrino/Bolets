import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/brand-mark";
import { INSTAGRAM_CARD_FONT_FAMILY, instagramCardFonts } from "@/src/lib/instagram-card-fonts";

export const alt = "Bolets de Catalunya: mapa, espècies i temporada";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Messaging apps (WhatsApp, Telegram, iMessage in compact mode) often show a
// centre-cropped square of this image, so everything meaningful stays inside
// the central 630 × 630 area and remains legible at thumbnail size.
export default async function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#183c2e",
        color: "#f5f0df",
        fontFamily: INSTAGRAM_CARD_FONT_FAMILY,
      }}
    >
      <BrandMark size={150} aria-hidden="true" />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 34,
          fontSize: 88,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: -1,
        }}
      >
        <div style={{ display: "flex" }}>Bolets de</div>
        <div style={{ display: "flex", color: "#d8b971" }}>Catalunya</div>
      </div>
      <div style={{ display: "flex", marginTop: 30, fontSize: 34, fontWeight: 700, opacity: 0.9 }}>
        Mapa · espècies · temporada
      </div>
    </div>,
    { ...size, fonts: await instagramCardFonts() },
  );
}
