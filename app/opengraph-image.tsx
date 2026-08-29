import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/brand-mark";

export const alt = "Bolets Atles — predicció de bolets, mapa i condicions actuals a Catalunya";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#183c2e",
        color: "#f5f0df",
        padding: "72px 82px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <BrandMark size={60} aria-hidden="true" />
        <div style={{ display: "flex", fontSize: 29, letterSpacing: 7 }}>
          BOLETS · ATLES
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 76, lineHeight: 1.04, fontWeight: 700 }}>
          Predicció de bolets
        </div>
        <div style={{ display: "flex", fontSize: 66, lineHeight: 1.1, color: "#d8b971" }}>
          a Catalunya.
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 27, opacity: 0.84 }}>
        Condicions actuals · mapa de predicció · per espècie i zona
      </div>
    </div>,
    size,
  );
}
