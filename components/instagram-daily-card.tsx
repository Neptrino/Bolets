import { BrandMark } from "@/components/brand-mark";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import type { InstagramFormat } from "@/src/lib/instagram-design";
import { getSuitabilityBand, suitabilityScale } from "@/src/lib/suitability-scale";

function scoreTone(score: number) {
  return score === 0 ? "#756f64" : getSuitabilityBand(score).color;
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
        <span style={{ color: "#344438", fontSize: isStory ? 28 : 24, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Nivell de condicions</span>
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

function PortraitShareCard({ card, format, homeHeroUrl, isPreview }: { card: DailyShareCard; format: InstagramFormat; homeHeroUrl: string; isPreview: boolean }) {
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
              {isPreview ? "MOSTRA · dades simulades" : observedLabel}
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
              <span style={{ color: "#5d6159", fontSize: isStory ? 25 : 22, lineHeight: 1.22 }}>de sectors amb condicions favorables</span>
            </div>
            <div style={{ display: "flex", flex: 1, alignItems: "center", gap: isStory ? 22 : 16, padding: isStory ? "25px 30px" : "19px 24px", border: "1px solid #d4c8ab", borderRadius: isStory ? 22 : 17, background: "rgba(255,250,240,0.62)" }}>
              <span style={{ color: scoreTone(reading.score), fontSize: isStory ? 48 : 38, fontWeight: 900, letterSpacing: "-0.04em" }}>{Math.round(reading.score20CellShare * 100)}%</span>
              <span style={{ color: "#5d6159", fontSize: isStory ? 25 : 22, lineHeight: 1.22 }}>de sectors amb condicions destacables</span>
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

function OverviewPortraitShareCard({ card, format, homeHeroUrl, isPreview }: { card: DailyShareCard; format: InstagramFormat; homeHeroUrl: string; isPreview: boolean }) {
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
              {isPreview ? "MOSTRA · dades simulades" : observedLabel}
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
                  <div style={{ display: "flex", color: scoreTone(reading.score), fontSize: isStory ? 23 : 20, fontWeight: 800, marginTop: 8 }}>{Math.round(reading.positiveCellShare * 100)}% positives · {Math.round(reading.score20CellShare * 100)}% amb 20+</div>
                </div>
                <div style={{ display: "flex", width: isStory ? 170 : 132, flexShrink: 0, flexDirection: "column", alignItems: "center", justifyContent: "center", background: scoreTone(reading.score), color: "#fffaf0" }}>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <span style={{ fontSize: isStory ? 58 : 45, lineHeight: 0.85, fontWeight: 900, letterSpacing: "-0.055em" }}>{reading.score}</span>
                    <span style={{ fontSize: isStory ? 22 : 20, marginLeft: 4, marginBottom: 3 }}>/100</span>
                  </div>
                  <span style={{ fontSize: isStory ? 21 : 19, fontWeight: 900, letterSpacing: "0.06em", marginTop: 9, textTransform: "uppercase" }}>{reading.score === 0 ? "Sense senyal" : band.label}</span>
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
            <span style={{ color: "#173021", fontSize: isStory ? 36 : 28, fontWeight: 900, letterSpacing: "-0.025em", marginTop: 5 }}>bolets.app/bolets-avui</span>
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

/** Restore the photo-led daily summary; unavailable readings remain withheld. */
export function InstagramDailyCard({ card: input, format, homeHeroUrl }: { card: DailyShareCard; format: InstagramFormat; homeHeroUrl: string }) {
  const card = input.available && input.observedAt ? input : { ...input, readings: [] };
  const isPreview = card.isPreview === true;
  const hasPositiveReading = card.readings.some(reading => reading.score > 0);
  return card.scope === "overview" && hasPositiveReading
    ? <OverviewPortraitShareCard card={card} format={format} homeHeroUrl={homeHeroUrl} isPreview={isPreview} />
    : <PortraitShareCard card={card} format={format} homeHeroUrl={homeHeroUrl} isPreview={isPreview} />;
}
