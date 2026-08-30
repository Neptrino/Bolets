import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { BrandMark } from "@/components/brand-mark";
import { catalogueSpecies } from "@/data/catalogue";
import {
  toSpeciesFieldCardProfile,
  type SpeciesFieldCardProfile,
} from "@/src/lib/species-field-card";
import type { EdibilityStatus, Month, SeasonalActivity } from "@/src/lib/types";

export const runtime = "nodejs";

const monthLabels: Record<Month, string> = {
  gen: "G",
  feb: "F",
  mar: "M",
  abr: "A",
  mai: "M",
  jun: "J",
  jul: "J",
  ago: "A",
  set: "S",
  oct: "O",
  nov: "N",
  des: "D",
};

const months = Object.keys(monthLabels) as Month[];

const activityColours: Record<SeasonalActivity, string> = {
  inactive: "#ded5c0",
  possible: "#c8b788",
  moderate: "#a6844e",
  good: "#6e7d50",
  peak: "#bd592a",
};

const statusColours: Record<EdibilityStatus, string> = {
  excellent_edible: "#bd592a",
  edible: "#4f704d",
  edible_with_conditions: "#a67522",
  not_recommended: "#77756d",
  inedible: "#77756d",
  toxic: "#bd5038",
  dangerously_toxic: "#7d2730",
  unknown: "#77756d",
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flex: 1, minWidth: 0, flexDirection: "column" }}>
      <span style={{ color: "#8b806e", fontSize: 18, fontWeight: 800, letterSpacing: "0.1em" }}>{label}</span>
      <span style={{ color: "#343832", fontSize: 25, fontWeight: 750, lineHeight: 1.2, marginTop: 7 }}>{value}</span>
    </div>
  );
}

function MonthBar({ card, colour }: { card: SpeciesFieldCardProfile; colour: string }) {
  if (!card.seasonality) {
    return (
      <div style={{ display: "flex", alignItems: "center", marginTop: 13 }}>
        <span style={{ color: colour, fontSize: 30, fontWeight: 850 }}>{card.bestMonthsLabel}</span>
        <span style={{ color: "#77756d", fontSize: 20, marginLeft: 16 }}>temporada documentada</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", width: "100%", gap: 6, marginTop: 13 }}>
      {months.map((month) => {
        const activity = card.seasonality?.[month] ?? "inactive";
        const isBest = card.bestMonths.includes(month);
        return (
          <div key={month} style={{ display: "flex", flex: 1, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 7, color: isBest ? "#fffaf0" : "#5f5c53", background: activityColours[activity], fontSize: 16, fontWeight: isBest ? 900 : 750 }}>
            {monthLabels[month]}
          </div>
        );
      })}
    </div>
  );
}

function FieldCardArtwork({
  card,
  imageDataUrl,
}: {
  card: SpeciesFieldCardProfile;
  imageDataUrl: string;
}) {
  const colour = statusColours[card.edibility];
  const altitudeLabel = card.altitude
    ? `${card.altitude[0]}–${card.altitude[1]} m`
    : "Sense rang publicat";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", color: "#3b3b3b", background: "#f2ebd5", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", position: "relative", width: "100%", height: 500, flexShrink: 0, overflow: "hidden", background: "#273a2d" }}>
        {/* ImageResponse needs a raw image URL rather than the runtime image component. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageDataUrl} width="1080" height="500" alt="" style={{ position: "absolute", inset: 0, width: 1080, height: 500, objectFit: "cover", objectPosition: "center 48%" }} />
        <div style={{ display: "flex", position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(15,24,17,0.2) 0%, rgba(15,24,17,0.18) 38%, rgba(15,24,17,0.94) 100%)" }} />
        <div style={{ display: "flex", position: "absolute", top: 38, left: 46, alignItems: "center", gap: 14 }}>
          <BrandMark size={54} aria-hidden="true" />
          <span style={{ color: "#fff7e8", fontSize: 24, fontWeight: 850, letterSpacing: "0.12em" }}>BOLETS ATLES</span>
        </div>
        <div style={{ display: "flex", position: "absolute", top: 42, right: 46, minHeight: 49, alignItems: "center", padding: "0 20px", border: "2px solid rgba(255,250,240,0.74)", borderRadius: 999, color: "#fffaf0", background: colour, fontSize: 21, fontWeight: 850, letterSpacing: "0.04em" }}>
          {card.edibilityLabel}
        </div>
        <div style={{ display: "flex", position: "absolute", right: 46, bottom: 43, left: 46, flexDirection: "column" }}>
          <span style={{ color: "#f2a766", fontSize: 20, fontWeight: 850, letterSpacing: "0.12em" }}>TARGETA DE CAMP</span>
          <span style={{ color: "#fff7e8", fontSize: card.commonName.length > 20 ? 62 : 74, lineHeight: 0.98, fontWeight: 900, letterSpacing: "-0.045em", marginTop: 9 }}>{card.commonName}</span>
          <span style={{ color: "#d7dec7", fontFamily: "serif", fontSize: 31, fontStyle: "italic", marginTop: 11 }}>{card.scientificName}</span>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, flexDirection: "column", padding: "33px 46px 27px" }}>
        <div style={{ display: "flex", width: "100%", gap: 34, padding: "0 0 24px", borderBottom: "1px solid #d1c5aa" }}>
          <Fact label="MIDA HABITUAL" value={card.typicalSize} />
          <div style={{ display: "flex", width: 1, background: "#d1c5aa" }} />
          <Fact label="IDENTIFICACIÓ" value={card.identificationDifficulty} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", paddingTop: 23 }}>
          <span style={{ color: colour, fontSize: 19, fontWeight: 900, letterSpacing: "0.11em" }}>TRES TRETS A COMPROVAR</span>
          <div style={{ display: "flex", width: "100%", gap: 14, marginTop: 13 }}>
            {card.keyFeatures.map((feature, index) => (
              <div key={feature} style={{ display: "flex", flex: 1, minWidth: 0, alignItems: "flex-start", gap: 9, padding: "12px 13px", border: "1px solid #d8cdb4", borderRadius: 12, background: "#fff9ed" }}>
                <span style={{ display: "flex", width: 27, height: 27, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 999, color: "#fffaf0", background: colour, fontSize: 15, fontWeight: 900 }}>{index + 1}</span>
                <span style={{ color: "#474b44", fontSize: 20, fontWeight: 750, lineHeight: 1.2 }}>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", width: "100%", gap: 30, marginTop: 23 }}>
          <div style={{ display: "flex", flex: 1, minWidth: 0, flexDirection: "column" }}>
            <span style={{ color: "#8b806e", fontSize: 18, fontWeight: 850, letterSpacing: "0.1em" }}>BOSC O HÀBITAT</span>
            <span style={{ color: "#343832", fontSize: 27, fontWeight: 800, lineHeight: 1.18, marginTop: 7 }}>{card.habitatTypes.join(" · ")}</span>
          </div>
          <div style={{ display: "flex", width: 250, flexShrink: 0, flexDirection: "column" }}>
            <span style={{ color: "#8b806e", fontSize: 18, fontWeight: 850, letterSpacing: "0.1em" }}>ALTITUD</span>
            <span style={{ color: "#343832", fontSize: 27, fontWeight: 800, marginTop: 7 }}>{altitudeLabel}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ color: "#8b806e", fontSize: 18, fontWeight: 850, letterSpacing: "0.1em" }}>MILLORS MESOS</span>
            <span style={{ color: colour, fontSize: 22, fontWeight: 900 }}>{card.bestMonthsLabel}</span>
          </div>
          <MonthBar card={card} colour={colour} />
        </div>

        {card.lookalike ? (
          <div style={{ display: "flex", width: "100%", minHeight: 132, marginTop: 23, overflow: "hidden", border: `2px solid ${colour}`, borderRadius: 16, background: "#fff9ed" }}>
            <div style={{ display: "flex", width: 185, flexShrink: 0, flexDirection: "column", justifyContent: "center", padding: "18px 20px", color: "#fffaf0", background: colour }}>
              <span style={{ fontSize: 16, fontWeight: 850, letterSpacing: "0.09em" }}>CONFUSIÓ A</span>
              <span style={{ fontSize: 16, fontWeight: 850, letterSpacing: "0.09em", marginTop: 3 }}>DESCARTAR</span>
              <span style={{ fontSize: 27, fontWeight: 900, lineHeight: 1.05, marginTop: 11 }}>{card.lookalike.commonName}</span>
            </div>
            <div style={{ display: "flex", flex: 1, minWidth: 0, flexDirection: "column", justifyContent: "center", padding: "16px 21px" }}>
              <span style={{ color: "#77756d", fontFamily: "serif", fontSize: 18, fontStyle: "italic" }}>{card.lookalike.scientificName}</span>
              <span style={{ color: "#454941", fontSize: 21, fontWeight: 650, lineHeight: 1.27, marginTop: 6 }}>{card.lookalike.mainDifferences}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", width: "100%", height: 92, flexShrink: 0, alignItems: "center", justifyContent: "space-between", padding: "0 46px", borderTop: "9px solid #f28a2e", color: "#fff7e8", background: "#3b3b3b" }}>
        <span style={{ maxWidth: 730, fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>No identifiquis ni consumeixis cap bolet només amb aquesta targeta. Confirma’l amb una persona experta.</span>
        <span style={{ color: "#f2a766", fontSize: 22, fontWeight: 900, letterSpacing: "0.07em" }}>BOLETS.APP</span>
      </div>
    </div>
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const species = catalogueSpecies.find((candidate) => candidate.speciesId === slug);
  if (!species) return new Response("Not found", { status: 404 });

  const card = toSpeciesFieldCardProfile(species);
  const image = await readFile(join(process.cwd(), "public", card.imagePath.slice(1)));
  // ImageResponse does not decode embedded WebP. Convert the version-controlled
  // catalogue source in memory; the completed card is cached at the response.
  const jpeg = await sharp(image).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  const imageDataUrl = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  const response = new ImageResponse(
    <FieldCardArtwork card={card} imageDataUrl={imageDataUrl} />,
    { width: 1080, height: 1350 },
  );
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400",
  );
  return response;
}
