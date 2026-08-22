import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isLocalFavourablePreview, loadDailyShareCard, loadFavourableDailySharePreviewCard, type DailyShareCard, type DailyShareFormat } from "@/src/lib/daily-share-cards";
import { getSuitabilityBand, suitabilityScale } from "@/src/lib/suitability-scale";

export const runtime = "nodejs";

function scoreTone(score: number) {
  return score === 0 ? "#756f64" : getSuitabilityBand(score).color;
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

const shareDate = new Intl.DateTimeFormat("ca-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

function PredictionScale({ score, isStory }: { score: number | null; isStory: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#344438", fontSize: isStory ? 28 : 24, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Escala de la predicció</span>
        <span style={{ color: "#706f67", fontSize: isStory ? 26 : 22 }}>0 — 100</span>
      </div>
      <div style={{ display: "flex", position: "relative", width: "100%", height: isStory ? 30 : 24, gap: 5, marginTop: isStory ? 22 : 16 }}>
        {suitabilityScale.map((band) => (
          <div key={band.id} style={{ display: "flex", flex: 1, height: "100%", background: band.color, borderRadius: 4 }} />
        ))}
        {score !== null ? (
          <div style={{ display: "flex", position: "absolute", left: `${score}%`, top: isStory ? -13 : -10, width: isStory ? 10 : 8, height: isStory ? 56 : 44, transform: "translateX(-50%)", border: "3px solid #fffaf0", borderRadius: 99, background: "#172f20", boxShadow: "0 2px 8px rgba(23,47,32,0.34)" }} />
        ) : null}
      </div>
      <div style={{ display: "flex", width: "100%", marginTop: 9 }}>
        {suitabilityScale.map((band) => (
          <span key={band.id} style={{ flex: 1, color: "#706f67", fontSize: isStory ? 24 : 20, textAlign: "center" }}>{band.label}</span>
        ))}
      </div>
    </div>
  );
}

function PortraitShareCard({ card, format, homeHeroUrl, isPreview }: { card: DailyShareCard; format: Extract<DailyShareFormat, "feed" | "story">; homeHeroUrl: string; isPreview: boolean }) {
  const reading = card.readings[0];
  const isStory = format === "story";
  const hasNoFavourableConditions = card.readings.length > 0 && card.readings.every((candidate) => candidate.score === 0);
  const score = reading?.score ?? null;
  const band = reading ? getSuitabilityBand(reading.score) : null;
  const observedLabel = card.observedAt ? shareDate.format(new Date(card.observedAt)) : "Avui";
  const heroHeight = isStory ? 650 : 420;
  const sidePadding = isStory ? 72 : 54;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", color: "#173021", overflow: "hidden", background: "#f3eddc", position: "relative", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", position: "relative", width: "100%", height: heroHeight, flexShrink: 0, overflow: "hidden", background: "#173021", padding: isStory ? `210px ${sidePadding}px 48px` : `42px ${sidePadding}px 44px` }}>
        {/* ImageResponse needs a raw data URI rather than Next's runtime image component. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={homeHeroUrl} width="1080" height={heroHeight} alt="" style={{ position: "absolute", top: 0, left: 0, width: 1080, height: heroHeight, objectFit: "cover", objectPosition: "56% center", opacity: 0.72 }} />
        <div style={{ display: "flex", position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(8,29,18,0.96) 0%, rgba(12,38,23,0.78) 58%, rgba(15,37,23,0.40) 100%)" }} />
        <div style={{ display: "flex", position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(11,32,20,0.2), rgba(11,32,20,0.88))" }} />

        <div style={{ display: "flex", position: "relative", width: "100%", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <BrandMark />
              <span style={{ color: "#fff7e8", fontSize: isStory ? 28 : 24, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase" }}>Bolets Atles</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, color: "#fff7e8", fontSize: isStory ? 25 : 22 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: isPreview ? "#f2a766" : "#88a84f" }} />
              {isPreview ? "Dades simulades" : observedLabel}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#f2a766", fontSize: isStory ? 25 : 22, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>{card.scopeLabel}</span>
            <span style={{ color: "#fff7e8", fontSize: isStory ? 88 : 70, lineHeight: 0.92, fontWeight: 800, letterSpacing: "-0.055em", marginTop: 14, maxWidth: "92%" }}>{card.title}</span>
            <span style={{ color: "#d7dec7", fontSize: isStory ? 32 : 28, marginTop: 16 }}>Lectura territorial · no localitza bolets</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, flexDirection: "column", padding: isStory ? `56px ${sidePadding}px 260px` : `38px ${sidePadding}px 42px`, background: "#f3eddc" }}>
        <div style={{ display: "flex", width: "100%", minHeight: isStory ? 350 : 252, overflow: "hidden", border: "1px solid #d4c8ab", borderRadius: isStory ? 30 : 24, background: "#fffaf0", boxShadow: "0 18px 42px rgba(44,55,39,0.10)" }}>
          <div style={{ display: "flex", width: isStory ? 330 : 270, flexShrink: 0, flexDirection: "column", alignItems: "center", justifyContent: "center", color: score === null ? "#173021" : "#fffaf0", background: score === null ? "#ded7c6" : scoreTone(score), padding: isStory ? "32px 28px" : "24px 20px" }}>
            <span style={{ fontSize: isStory ? 28 : 24, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase" }}>{score === null ? "Sense dades" : "Màxim"}</span>
            <div style={{ display: "flex", alignItems: "flex-end", marginTop: 14 }}>
              <span style={{ fontSize: isStory ? 144 : 112, lineHeight: 0.78, fontWeight: 800, letterSpacing: "-0.075em" }}>{score ?? "—"}</span>
              {score !== null ? <span style={{ fontSize: isStory ? 29 : 24, marginLeft: 7, marginBottom: 7 }}>/100</span> : null}
            </div>
          </div>
          <div style={{ display: "flex", flex: 1, minWidth: 0, flexDirection: "column", justifyContent: "center", padding: isStory ? "38px 42px" : "28px 32px" }}>
            {hasNoFavourableConditions ? (
              <div style={{ display: "flex", width: "100%", flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{ display: "flex", color: "#706f67", fontSize: isStory ? 25 : 22, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase" }}>Lectura d’avui</div>
                <div style={{ display: "flex", color: "#173021", fontSize: isStory ? 41 : 32, lineHeight: 1.04, fontWeight: 800, letterSpacing: "-0.035em", marginTop: 13 }}>Sense condicions favorables</div>
              </div>
            ) : reading ? (
              <div style={{ display: "flex", width: "100%", flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{ display: "flex", color: band?.color, fontSize: isStory ? 25 : 22, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>{band?.label}</div>
                <div style={{ display: "flex", color: "#173021", fontSize: isStory ? 49 : 38, lineHeight: 1, fontWeight: 800, letterSpacing: "-0.04em", marginTop: 13 }}>{reading.speciesName}</div>
                <div style={{ display: "flex", width: "100%", color: "#706f67", fontSize: isStory ? 28 : 24, lineHeight: 1.25, marginTop: 15 }}>{card.scope === "overview" ? reading.regionName : "Lectura més alta publicada a la zona"}</div>
              </div>
            ) : (
              <div style={{ display: "flex", width: "100%", flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{ display: "flex", color: "#c95e35", fontSize: isStory ? 25 : 22, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase" }}>No disponible</div>
                <div style={{ display: "flex", color: "#173021", fontSize: isStory ? 38 : 30, lineHeight: 1.08, fontWeight: 800, letterSpacing: "-0.035em", marginTop: 13 }}>La lectura encara no supera els controls de publicació.</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", width: "100%", marginTop: isStory ? 52 : 34, padding: isStory ? "34px 38px" : "25px 30px", border: "1px solid #d4c8ab", borderRadius: isStory ? 26 : 20, background: "rgba(255,250,240,0.76)" }}>
          <PredictionScale score={score} isStory={isStory} />
        </div>

        {reading ? (
          <div style={{ display: "flex", width: "100%", gap: isStory ? 20 : 16, marginTop: isStory ? 28 : 22 }}>
            <div style={{ display: "flex", flex: 1, alignItems: "center", gap: isStory ? 22 : 16, padding: isStory ? "25px 30px" : "19px 24px", border: "1px solid #d4c8ab", borderRadius: isStory ? 22 : 17, background: "rgba(255,250,240,0.62)" }}>
              <span style={{ color: scoreTone(reading.score), fontSize: isStory ? 48 : 38, fontWeight: 900, letterSpacing: "-0.04em" }}>{Math.round(reading.positiveCellShare * 100)}%</span>
              <span style={{ color: "#5d6159", fontSize: isStory ? 25 : 22, lineHeight: 1.22 }}>de cel·les amb puntuació positiva</span>
            </div>
            <div style={{ display: "flex", flex: 1, alignItems: "center", gap: isStory ? 22 : 16, padding: isStory ? "25px 30px" : "19px 24px", border: "1px solid #d4c8ab", borderRadius: isStory ? 22 : 17, background: "rgba(255,250,240,0.62)" }}>
              <span style={{ color: scoreTone(reading.score), fontSize: isStory ? 48 : 38, fontWeight: 900, letterSpacing: "-0.04em" }}>{Math.round(reading.score20CellShare * 100)}%</span>
              <span style={{ color: "#5d6159", fontSize: isStory ? 25 : 22, lineHeight: 1.22 }}>de cel·les amb 20 punts o més</span>
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 28, marginTop: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#706f67", fontSize: isStory ? 25 : 22 }}>Consulta la lectura completa</span>
            <span style={{ color: "#173021", fontSize: isStory ? 36 : 28, fontWeight: 900, letterSpacing: "-0.025em", marginTop: 5 }}>bolets.app</span>
          </div>
          <div style={{ display: "flex", maxWidth: isStory ? 500 : 460, paddingLeft: 24, borderLeft: `5px solid ${band?.color ?? "#c95e35"}`, color: "#5d6159", fontSize: isStory ? 24 : 22, lineHeight: 1.35 }}>
            No confirma presència ni assenyala punts de recol·lecció.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", position: "absolute", left: 0, right: 0, bottom: 0, height: isStory ? 18 : 14 }}>
        {suitabilityScale.map((scaleBand) => (
          <div key={scaleBand.id} style={{ display: "flex", flex: 1, height: "100%", background: scaleBand.color }} />
        ))}
      </div>
    </div>
  );
}

function OverviewPortraitShareCard({ card, format, homeHeroUrl, isPreview }: { card: DailyShareCard; format: Extract<DailyShareFormat, "feed" | "story">; homeHeroUrl: string; isPreview: boolean }) {
  const isStory = format === "story";
  const readings = card.readings.slice(0, 3);
  const observedLabel = card.observedAt ? shareDate.format(new Date(card.observedAt)) : "Avui";
  const heroHeight = isStory ? 610 : 370;
  const sidePadding = isStory ? 72 : 54;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", color: "#173021", overflow: "hidden", background: "#f3eddc", position: "relative", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", position: "relative", width: "100%", height: heroHeight, flexShrink: 0, overflow: "hidden", background: "#173021", padding: isStory ? `210px ${sidePadding}px 46px` : `40px ${sidePadding}px 38px` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={homeHeroUrl} width="1080" height={heroHeight} alt="" style={{ position: "absolute", top: 0, left: 0, width: 1080, height: heroHeight, objectFit: "cover", objectPosition: "56% center", opacity: 0.72 }} />
        <div style={{ display: "flex", position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(8,29,18,0.96) 0%, rgba(12,38,23,0.78) 58%, rgba(15,37,23,0.40) 100%)" }} />
        <div style={{ display: "flex", position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(11,32,20,0.2), rgba(11,32,20,0.88))" }} />

        <div style={{ display: "flex", position: "relative", width: "100%", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <BrandMark />
              <span style={{ color: "#fff7e8", fontSize: isStory ? 28 : 24, fontWeight: 800, letterSpacing: "0.11em", textTransform: "uppercase" }}>Bolets Atles</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, color: "#fff7e8", fontSize: isStory ? 25 : 22 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: isPreview ? "#f2a766" : "#88a84f" }} />
              {isPreview ? "Dades simulades" : observedLabel}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#f2a766", fontSize: isStory ? 25 : 22, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Visió general</span>
            <span style={{ color: "#fff7e8", fontSize: isStory ? 82 : 66, lineHeight: 0.92, fontWeight: 800, letterSpacing: "-0.055em", marginTop: 13 }}>Catalunya</span>
            <span style={{ color: "#d7dec7", fontSize: isStory ? 32 : 28, marginTop: 15 }}>Les tres zones amb la lectura més alta</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, flexDirection: "column", padding: isStory ? `46px ${sidePadding}px 260px` : `30px ${sidePadding}px 38px`, background: "#f3eddc" }}>
        <div style={{ display: "flex", width: "100%", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#c95e35", fontSize: isStory ? 24 : 21, fontWeight: 900, letterSpacing: "0.11em", textTransform: "uppercase" }}>Rànquing territorial</span>
            <span style={{ color: "#173021", fontSize: isStory ? 43 : 32, fontWeight: 900, letterSpacing: "-0.04em", marginTop: 6 }}>Top 3 zones</span>
          </div>
          <span style={{ maxWidth: isStory ? 420 : 390, color: "#706f67", fontSize: isStory ? 24 : 21, lineHeight: 1.3, textAlign: "right" }}>Màxim de cada zona, amb la seva extensió dins del territori</span>
        </div>

        <div style={{ display: "flex", width: "100%", flexDirection: "column", gap: isStory ? 18 : 12, marginTop: isStory ? 28 : 20 }}>
          {readings.map((reading, index) => {
            const band = getSuitabilityBand(reading.score);
            return (
              <div key={`${reading.regionName}-${reading.speciesId}`} style={{ display: "flex", width: "100%", minHeight: isStory ? 165 : 122, overflow: "hidden", border: "1px solid #d4c8ab", borderRadius: isStory ? 24 : 18, background: "#fffaf0", boxShadow: "0 10px 24px rgba(44,55,39,0.07)" }}>
                <div style={{ display: "flex", width: isStory ? 90 : 68, flexShrink: 0, alignItems: "center", justifyContent: "center", background: "#173021", color: "#fff7e8", fontSize: isStory ? 32 : 26, fontWeight: 900 }}>0{index + 1}</div>
                <div style={{ display: "flex", flex: 1, minWidth: 0, flexDirection: "column", justifyContent: "center", padding: isStory ? "22px 28px" : "16px 22px" }}>
                  <div style={{ display: "flex", color: "#173021", fontSize: isStory ? 34 : 28, lineHeight: 1, fontWeight: 900, letterSpacing: "-0.035em" }}>{reading.regionName}</div>
                  <div style={{ display: "flex", color: "#706f67", fontSize: isStory ? 25 : 22, marginTop: 8 }}>{reading.speciesName}</div>
                  <div style={{ display: "flex", color: band.color, fontSize: isStory ? 23 : 20, fontWeight: 800, marginTop: 8 }}>{Math.round(reading.positiveCellShare * 100)}% positives · {Math.round(reading.score20CellShare * 100)}% amb 20+</div>
                </div>
                <div style={{ display: "flex", width: isStory ? 170 : 132, flexShrink: 0, flexDirection: "column", alignItems: "center", justifyContent: "center", background: band.color, color: "#fffaf0" }}>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <span style={{ fontSize: isStory ? 58 : 45, lineHeight: 0.85, fontWeight: 900, letterSpacing: "-0.055em" }}>{reading.score}</span>
                    <span style={{ fontSize: isStory ? 22 : 20, marginLeft: 4, marginBottom: 3 }}>/100</span>
                  </div>
                  <span style={{ fontSize: isStory ? 21 : 19, fontWeight: 900, letterSpacing: "0.06em", marginTop: 9, textTransform: "uppercase" }}>{band.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", width: "100%", marginTop: isStory ? 30 : 22, padding: isStory ? "29px 34px" : "21px 27px", border: "1px solid #d4c8ab", borderRadius: isStory ? 24 : 18, background: "rgba(255,250,240,0.72)" }}>
          <PredictionScale score={readings[0]?.score ?? null} isStory={isStory} />
        </div>

        <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 28, marginTop: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#706f67", fontSize: isStory ? 25 : 22 }}>Consulta totes les zones</span>
            <span style={{ color: "#173021", fontSize: isStory ? 36 : 28, fontWeight: 900, letterSpacing: "-0.025em", marginTop: 5 }}>bolets.app/avui</span>
          </div>
          <div style={{ display: "flex", maxWidth: isStory ? 500 : 460, paddingLeft: 24, borderLeft: `5px solid ${scoreTone(readings[0]?.score ?? 0)}`, color: "#5d6159", fontSize: isStory ? 24 : 22, lineHeight: 1.35 }}>
            No confirma presència ni assenyala punts de recol·lecció.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", position: "absolute", left: 0, right: 0, bottom: 0, height: isStory ? 18 : 14 }}>
        {suitabilityScale.map((scaleBand) => (
          <div key={scaleBand.id} style={{ display: "flex", flex: 1, height: "100%", background: scaleBand.color }} />
        ))}
      </div>
    </div>
  );
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const requestUrl = new URL(request.url);
  const requestedFormat = requestUrl.searchParams.get("format");
  const format: DailyShareFormat = requestedFormat === "story" || requestedFormat === "landscape" ? requestedFormat : "feed";
  const isPreview = isLocalFavourablePreview(requestUrl.searchParams.get("preview") ?? undefined);
  const card = isPreview ? await loadFavourableDailySharePreviewCard(slug) : await loadDailyShareCard(slug);

  if (!card) return new Response("Not found", { status: 404 });
  const hasNoFavourableConditions = card.readings.length > 0 && card.readings.every((reading) => reading.score === 0);
  const homeHero = await readFile(join(process.cwd(), "public/media/generated/home-hero-boletus-v2-share.jpg"));
  const homeHeroUrl = `data:image/jpeg;base64,${homeHero.toString("base64")}`;

  if (format !== "landscape") {
    const dimensions = format === "story" ? { width: 1080, height: 1920 } : { width: 1080, height: 1350 };
    const image = new ImageResponse(
      card.scope === "overview" && card.readings.length > 0
        ? <OverviewPortraitShareCard card={card} format={format} homeHeroUrl={homeHeroUrl} isPreview={isPreview} />
        : <PortraitShareCard card={card} format={format} homeHeroUrl={homeHeroUrl} isPreview={isPreview} />,
      dimensions,
    );
    image.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=300");
    return image;
  }

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
            <VerifiedMark /> {isPreview ? "Dades simulades" : "Dades vigents"}
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
