import { ImageResponse } from "next/og";
import { renderInstagramDailyCard } from "@/src/lib/instagram-daily-render";
import { WEEKEND_MAP_SLIDE } from "@/components/instagram-weekend-card";
import { renderInstagramEducationSlide } from "@/src/lib/instagram-editorial-render";
import { renderInstagramWeekendSlide } from "@/src/lib/instagram-weekend-render";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BrandMark } from "@/components/brand-mark";
import {
  isSocialGrowthSeries,
  socialGrowthSlideCount,
} from "@/components/social-growth-card";
import { DAILY_OVERVIEW_REVALIDATE_SECONDS } from "@/src/lib/current-overview";
import { isLocalFavourablePreview, loadDailyShareCard, loadFavourableDailySharePreviewCard, type DailyShareFormat } from "@/src/lib/daily-share-cards";
import { hasSignedDailySharePayload, readSignedDailyShareCard } from "@/src/lib/daily-share-image-payload-server";
import {
  instagramEducationTopicForDate,
  isInstagramEducationTopicId,
} from "@/src/lib/instagram-education";
import { instagramSpeciesImageResponse } from "@/src/lib/instagram-species-image-server";
import { dateInCatalonia } from "@/src/lib/buffer-client";
import { getSuitabilityBand } from "@/src/lib/suitability-scale";
import { renderSocialCurrentMapDataUrl } from "@/src/lib/social-current-map-server";

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

function VerifiedMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="#f2a766" strokeWidth="1.5" />
      <path d="m4.9 8 2 2 4.2-4.1" stroke="#f2a766" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const requestUrl = new URL(request.url);
  const requestedFormat = requestUrl.searchParams.get("format");
  const format: DailyShareFormat = requestedFormat === "story" || requestedFormat === "landscape" ? requestedFormat : "feed";
  const signedCard = readSignedDailyShareCard(requestUrl.searchParams, slug);
  if (hasSignedDailySharePayload(requestUrl.searchParams) && !signedCard) {
    return new Response("Invalid card payload", { status: 400 });
  }
  const isPreview = signedCard?.isPreview === true ||
    isLocalFavourablePreview(requestUrl.searchParams.get("preview") ?? undefined);
  const card = signedCard ?? (isPreview
    ? await loadFavourableDailySharePreviewCard(slug)
    : await loadDailyShareCard(slug));

  if (!card) return new Response("Not found", { status: 404 });
  // An unavailable card usually means the overview snapshot was cold or the
  // load timed out; caching that render for the full publication window would
  // pin a blank image at the CDN long after the data recovers.
  const cacheSeconds = card.available ? DAILY_OVERVIEW_REVALIDATE_SECONDS : 300;
  const hasNoFavourableConditions = card.readings.length > 0 && card.readings.every((reading) => reading.score === 0);

  const requestedGrowthSeries = requestUrl.searchParams.get("series");
  const isSpeciesSeries = requestedGrowthSeries === "species";
  if (requestedGrowthSeries && !isSpeciesSeries && !isSocialGrowthSeries(requestedGrowthSeries)) {
    return new Response("Invalid social series", { status: 400 });
  }
  if (isSpeciesSeries) {
    if (!signedCard || isPreview || !card.available || !card.observedAt) {
      return new Response("Verified signed card required", { status: 400 });
    }
    return instagramSpeciesImageResponse({
      cacheSeconds,
      publicationDate: requestUrl.searchParams.get("date"),
      requestedSlide: Number(requestUrl.searchParams.get("slide")),
      speciesId: requestUrl.searchParams.get("speciesId"),
    });
  }
  const growthSeries = isSocialGrowthSeries(requestedGrowthSeries) ? requestedGrowthSeries : null;
  if (growthSeries) {
    if (!signedCard || isPreview || !card.available || !card.observedAt) {
      return new Response("Verified signed card required", { status: 400 });
    }
    const requestedSlide = Number(requestUrl.searchParams.get("slide"));
    const slide = Number.isInteger(requestedSlide) ? requestedSlide : 1;
    if (slide < 1 || slide > socialGrowthSlideCount(growthSeries)) {
      return new Response("Invalid social slide", { status: 400 });
    }
    const requestedEducationTopic = requestUrl.searchParams.get("topic");
    if (growthSeries === "education" && requestedEducationTopic && !isInstagramEducationTopicId(requestedEducationTopic)) {
      return new Response("Invalid education topic", { status: 400 });
    }
    const educationTopicId = growthSeries === "education"
      ? (isInstagramEducationTopicId(requestedEducationTopic)
          ? requestedEducationTopic
          : instagramEducationTopicForDate(dateInCatalonia(new Date(card.observedAt))).id)
      : undefined;
    let mapImageUrl: string | undefined;
    if (growthSeries === "weekend" && slide === WEEKEND_MAP_SLIDE) {
      try {
        const mapOrigin = requestUrl.hostname === "127.0.0.1" || requestUrl.hostname === "localhost"
          ? requestUrl.origin
          : "https://bolets.app";
        mapImageUrl = await renderSocialCurrentMapDataUrl(mapOrigin);
      } catch (error) {
        console.error("Instagram Reel current map render failed", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
        return new Response("Current map render failed", {
          status: 503,
          headers: { "Cache-Control": "no-store" },
        });
      }
    }
    const image = growthSeries === "weekend"
      ? await renderInstagramWeekendSlide({ card, slide, mapImageUrl })
      : await renderInstagramEducationSlide({ card, topicId: educationTopicId!, slide });
    image.headers.set(
      "Cache-Control",
      `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`,
    );
    return image;
  }

  if (format !== "landscape") {
    const image = await renderInstagramDailyCard({ card: { ...card, isPreview }, format });
    image.headers.set(
      "Cache-Control",
      `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`,
    );
    return image;
  }

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
              <span style={{ color: "#d7dec7", fontSize: 24, marginTop: 11 }}>Si falten lectures recents, no mostrem una valoració parcial.</span>
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

  image.headers.set(
    "Cache-Control",
    `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`,
  );
  return image;
}
