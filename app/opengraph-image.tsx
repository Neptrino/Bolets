import { ImageResponse } from "next/og";

export const alt = "Bolets Atles — espècies, hàbitats i temporada a Catalunya";
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
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            background: "#d69b43",
            display: "flex",
          }}
        />
        <div style={{ display: "flex", fontSize: 29, letterSpacing: 7 }}>
          BOLETS · ATLES
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 76, lineHeight: 1.04, fontWeight: 700 }}>
          Els bolets de Catalunya,
        </div>
        <div style={{ display: "flex", fontSize: 66, lineHeight: 1.1, color: "#d8b971" }}>
          llegits des del territori.
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 27, opacity: 0.84 }}>
        Espècies · hàbitats · temporada · mapes ecològics
      </div>
    </div>,
    size,
  );
}
