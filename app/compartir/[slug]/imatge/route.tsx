import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadDailyShareCard } from "@/src/lib/daily-share-cards";

export const runtime = "nodejs";

function scoreTone(score: number) {
  if (score >= 75) return "#f2a766";
  if (score >= 50) return "#d9d283";
  return "#b9c29c";
}

function PerformanceMark({ color }: { color: string }) {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden="true">
      <path d="M7 31.5 16.2 22.2l6.1 5.1L35 13.7" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27.5 13.7H35v7.5" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 35h28" stroke="rgba(255,247,232,0.28)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BrandMark() {
  return (
    <svg width="44" height="44" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="20" fill="#3b3b3b" />
      <path d="M13 31.1C14.8 19.5 21.8 13 32 13s17.2 6.5 19 18.1c.2 1.4-.9 2.6-2.3 2.6H15.3c-1.4 0-2.5-1.2-2.3-2.6Z" fill="#f28a2e" />
      <path d="M20.1 27.4c3.5-3.2 7.5-4.8 12-4.7 4.4.1 8.3 1.6 11.8 4.5" stroke="#6e3d25" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M26.1 33.7h11.8l3 15.8c.3 1.4-.8 2.7-2.2 2.7H25.3c-1.4 0-2.5-1.3-2.2-2.7l3-15.8Z" fill="#f2ebd5" />
      <path d="M21.5 51.2c6.7-2.2 13.7-2.2 21 0" stroke="#f2a766" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function VerifiedMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="#f2a766" strokeWidth="1.5" />
      <path d="m4.9 8 2 2 4.2-4.1" stroke="#f2a766" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const card = await loadDailyShareCard(slug);

  if (!card) return new Response("Not found", { status: 404 });
  const hasNoFavourableConditions = card.readings.length > 0 && card.readings.every((reading) => reading.score === 0);
  const homeHero = await readFile(join(process.cwd(), "public/media/generated/home-hero-boletus-v2-share.jpg"));
  const homeHeroUrl = `data:image/jpeg;base64,${homeHero.toString("base64")}`;

  const image = new ImageResponse(
    (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "42px 56px 38px",
        color: "#fff7e8",
        overflow: "hidden",
        background: "#173021",
        position: "relative",
        fontFamily: "sans-serif",
      }}>
        {/* ImageResponse needs a raw data URI rather than Next's runtime image component. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={homeHeroUrl}
          width="1200"
          height="675"
          alt=""
          style={{ position: "absolute", top: -12, left: -12, width: 1224, height: 699, objectFit: "cover", objectPosition: "center", opacity: 0.42 }}
        />
        <div style={{ display: "flex", position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(10,29,19,0.88) 0%, rgba(17,45,29,0.75) 54%, rgba(21,37,25,0.70) 100%)" }} />
        <div style={{ display: "flex", position: "absolute", inset: 0, background: "radial-gradient(circle at 88% 86%, rgba(184,105,50,0.30), transparent 35%)" }} />
        <div style={{ display: "flex", position: "absolute", inset: 18, border: "1px solid rgba(255,247,232,0.12)", borderRadius: 24 }} />
        <div style={{ display: "flex", position: "relative", alignItems: "center", justifyContent: "space-between", paddingBottom: 19, borderBottom: "1px solid rgba(255,247,232,0.16)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BrandMark />
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: "#fff7e8", fontSize: 18, fontWeight: 700, letterSpacing: "0.11em", textTransform: "uppercase" }}>Bolets Atles</span>
              <span style={{ color: "#d7dec7", fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase" }}>Butlletí de camp</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 34, padding: "0 13px", border: "1px solid rgba(242,167,102,0.45)", borderRadius: 999, background: "rgba(20,40,29,0.42)", color: "#f2a766", fontSize: 15, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            <VerifiedMark /> Dades vigents
          </div>
        </div>
        <div style={{ display: "flex", position: "relative", flexDirection: "column", marginTop: 34, maxWidth: "73%" }}>
          <span style={{ color: "#f2a766", fontSize: 18, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{card.eyebrow}</span>
          <span style={{ fontSize: 78, lineHeight: 0.98, fontWeight: 700, letterSpacing: "-0.055em", marginTop: 13 }}>{card.title}</span>
          <span style={{ color: "#d7dec7", fontSize: 24, marginTop: 17 }}>{hasNoFavourableConditions ? "Avui no hi ha condicions favorables publicables" : "Lectura territorial · no localitza bolets"}</span>
        </div>
        <div style={{ display: "flex", position: "relative", marginTop: "auto", gap: 14 }}>
          {hasNoFavourableConditions ? (
            <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: 164, padding: "25px 30px", justifyContent: "center", borderLeft: "4px solid #f2a766", background: "linear-gradient(90deg, rgba(255,247,232,0.13), rgba(255,247,232,0.055))", borderTop: "1px solid rgba(255,247,232,0.24)", borderRight: "1px solid rgba(255,247,232,0.24)", borderBottom: "1px solid rgba(255,247,232,0.24)", borderRadius: 16 }}>
              <span style={{ color: "#f2a766", fontSize: 18, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Lectura d’avui</span>
              <span style={{ fontSize: 41, fontWeight: 700, letterSpacing: "-0.035em", marginTop: 8 }}>No hi ha condicions favorables.</span>
              <span style={{ color: "#d7dec7", fontSize: 22, marginTop: 8 }}>Cap lectura territorial publicada mostra condicions per a la fructificació ara mateix.</span>
            </div>
          ) : card.readings.length > 0 ? card.readings.map((reading) => (
            <div key={`${reading.regionName}-${reading.speciesName}`} style={{
              display: "flex", flexDirection: "column", flex: 1, minHeight: 164, padding: "21px 24px",
              background: "rgba(18, 35, 25, 0.43)", border: "1px solid rgba(255, 247, 232, 0.24)", borderTop: `4px solid ${scoreTone(reading.score)}`, borderRadius: 16,
            }}>
              <span style={{ color: "#d7dec7", fontSize: 17, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" }}>{card.slug === "catalunya" ? reading.regionName : "Lectura publicada"}</span>
              <span style={{ fontSize: 30, fontWeight: 700, marginTop: 11 }}>{reading.speciesName}</span>
              <div style={{ display: "flex", alignItems: "center", marginTop: "auto" }}>
                <div style={{ display: "flex", width: 49, height: 49, alignItems: "center", justifyContent: "center", marginRight: 14, borderRadius: 13, background: "rgba(255,247,232,0.1)" }}>
                  <PerformanceMark color={scoreTone(reading.score)} />
                </div>
                <span style={{ color: scoreTone(reading.score), fontSize: 51, fontWeight: 700, letterSpacing: "-0.045em" }}>{reading.score}</span>
                <span style={{ color: "#d7dec7", fontSize: 20, marginLeft: 7 }}>/100 · {reading.label}</span>
              </div>
            </div>
          )) : (
            <div style={{ display: "flex", flexDirection: "column", width: "100%", minHeight: 164, padding: "25px 30px", justifyContent: "center", borderLeft: "4px solid #f2a766", background: "rgba(255,247,232,0.1)", borderTop: "1px solid rgba(255,247,232,0.24)", borderRight: "1px solid rgba(255,247,232,0.24)", borderBottom: "1px solid rgba(255,247,232,0.24)", borderRadius: 16 }}>
              <span style={{ color: "#f2a766", fontSize: 23 }}>Sense lectura publicada</span>
              <span style={{ color: "#d7dec7", fontSize: 24, marginTop: 11 }}>Les dades que no compleixen els controls de vigència i completitud no reben cap substitut.</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", position: "relative", justifyContent: "space-between", alignItems: "center", marginTop: 22, color: "#d7dec7", fontSize: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: "#d7dec7", fontSize: 17 }}>bolets.app</span>
            </div>
          </div>
          <span>Hàbitat i condicions ambientals verificades</span>
        </div>
      </div>
    ),
    { width: 1200, height: 675 },
  );

  image.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=300");
  return image;
}
