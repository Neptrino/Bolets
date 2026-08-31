import { ImageResponse } from "next/og";

import { BrandMark } from "@/components/brand-mark";

export const alt = "Joc de buscar bolets — explora el bosc i identifica sis espècies";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function Mushroom({
  cap,
  left,
  scale,
}: {
  cap: string;
  left: number;
  scale: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        bottom: 74,
        display: "flex",
        width: 180 * scale,
        height: 220 * scale,
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 180 * scale,
          height: 88 * scale,
          borderRadius: `${90 * scale}px ${90 * scale}px ${28 * scale}px ${28 * scale}px`,
          background: cap,
          boxShadow: "inset 0 -14px 28px rgba(48, 19, 8, 0.22), 0 15px 30px rgba(0, 0, 0, 0.26)",
        }}
      />
      <div
        style={{
          display: "flex",
          width: 50 * scale,
          height: 122 * scale,
          marginTop: -5 * scale,
          borderRadius: `${14 * scale}px ${14 * scale}px ${24 * scale}px ${24 * scale}px`,
          background: "linear-gradient(90deg, #dacda6 0%, #fff3ca 48%, #c7b98f 100%)",
        }}
      />
    </div>
  );
}

export default function MushroomGameOpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        color: "#fff4d4",
        background: "radial-gradient(circle at 74% 18%, #657c4a 0%, #294837 31%, #10261e 67%, #091713 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          opacity: 0.2,
          background: "repeating-linear-gradient(102deg, transparent 0 84px, rgba(8, 18, 13, 0.75) 85px 120px, transparent 121px 210px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -80,
          right: -80,
          bottom: -90,
          display: "flex",
          height: 250,
          borderRadius: "50% 50% 0 0",
          background: "linear-gradient(180deg, #29442d 0%, #0b1d16 70%)",
        }}
      />

      <Mushroom cap="#c84f31" left={837} scale={1.18} />
      <Mushroom cap="#dca444" left={740} scale={0.74} />
      <Mushroom cap="#8c9a67" left={1022} scale={0.58} />

      <div
        style={{
          position: "relative",
          display: "flex",
          width: 760,
          height: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "66px 0 62px 76px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <BrandMark size={55} aria-hidden="true" />
          <div style={{ display: "flex", fontSize: 25, letterSpacing: 6 }}>
            BOLETS · ATLES
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: "#e7ad5d", fontSize: 24, fontWeight: 700, letterSpacing: 4 }}>
            EL BOSC SECRET
          </div>
          <div style={{ display: "flex", marginTop: 16, fontSize: 76, fontWeight: 800, lineHeight: 0.98 }}>
            Joc de buscar
          </div>
          <div style={{ display: "flex", color: "#dce5a8", fontSize: 76, fontStyle: "italic", fontWeight: 600, lineHeight: 1 }}>
            bolets.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 13, fontSize: 25, opacity: 0.88 }}>
          <div style={{ display: "flex", width: 9, height: 9, borderRadius: 99, background: "#e7ad5d" }} />
          6 espècies diferents a cada partida
        </div>
      </div>
    </div>,
    size,
  );
}
