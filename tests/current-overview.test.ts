import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSitemap } from "@/app/sitemap";
import { getSpecies, speciesProfiles } from "@/data/species";
import {
  CURRENT_OVERVIEW_CONCURRENCY,
  DAILY_OVERVIEW_REVALIDATE_SECONDS,
  areaOverviewTargetsForMonth,
  bestAreaOverviewItemsByHub,
  currentOverviewTargetsForMonth,
  dominantLimitingComponent,
  loadAreaOverview,
  loadCurrentOverview,
  overviewHubs,
  rankCurrentOverviewItems,
  rankOverviewItems,
  seasonalActivityRank,
  topCurrentOverviewItems,
} from "@/src/lib/current-overview";
import {
  AREA_BUCKET_CONCURRENCY,
  AREA_SUMMARY_BUCKET_DEGREES,
  areaSummaryBucketsForBounds,
} from "@/src/lib/predictions";
import type { AreaPredictionSummary, RegionId, RegionalPredictionSummary } from "@/src/lib/types";

function summary(regionId: RegionId, options: { stale?: boolean; completeness?: number; score?: number; bestCellScore?: number } = {}): RegionalPredictionSummary {
  const incomplete = (options.completeness ?? 1) < 1;
  const opportunityIndex = incomplete ? null : options.score ?? 65;
  return {
    regionId,
    gridSizeM: 10000,
    scoredCellCount: 4,
    positiveCellCount: opportunityIndex && opportunityIndex > 0 ? 3 : 0,
    score20CellCount: opportunityIndex && opportunityIndex >= 20 ? 2 : 0,
    positiveCellShare: opportunityIndex && opportunityIndex > 0 ? 0.75 : 0,
    score20CellShare: opportunityIndex && opportunityIndex >= 20 ? 0.5 : 0,
    scoreRange: [58, 72],
    bestCell: {
      cellId: "epsg25831:10000:40:468",
      score: options.bestCellScore ?? (incomplete ? 0 : Math.max(options.score ?? 65, 74)),
      cellBounds: [[1.66, 42.26], [1.79, 42.36]],
    },
    result: {
      score: opportunityIndex,
      fruitingConditionsScore: incomplete ? null : 72,
      opportunityIndex,
      rawHabitatCoverage: 0.9,
      effectiveHabitatCoverage: 0.9,
      label: incomplete ? "sense dades" : "alta",
      components: [
        { id: "habitatCoverage", label: "Coberta d’hàbitat compatible", score: 90, state: "favourable" },
        { id: "altitude", label: "Idoneïtat altitudinal dins l’hàbitat", score: 100, state: "favourable" },
        { id: "phenology", label: "Fenologia", score: 90, state: "favourable" },
        { id: "water", label: "Estat hídric unificat", score: incomplete ? null : 65, state: incomplete ? "unknown" : "mixed" },
        { id: "temperature", label: "Resposta tèrmica", score: incomplete ? null : 70, state: incomplete ? "unknown" : "favourable" },
        { id: "extremes", label: "Exposició a gelada i calor", score: incomplete ? null : 100, state: incomplete ? "unknown" : "favourable" },
      ],
      modelVersion: "test-v1",
      dataCompleteness: options.completeness ?? 1,
      missingComponents: incomplete ? ["water", "temperature", "extremes"] : [],
    },
    snapshot: {
      regionId,
      observedAt: "2026-08-13T08:00:00.000Z",
      source: ["test"],
      confidence: "high",
      stale: options.stale ?? false,
      unavailableFields: [],
      values: {},
    },
  };
}

describe("current-condition overview", () => {
  it("keeps publication data on a twice-daily cache", () => {
    expect(DAILY_OVERVIEW_REVALIDATE_SECONDS).toBe(12 * 60 * 60);
  });

  it("limits the ranked Avui comparison to ten rendered cards", () => {
    const pageSource = readFileSync("app/bolets-avui/page.tsx", "utf8");

    expect(pageSource).toContain("const MAX_OVERVIEW_CARDS = 10");
    expect(pageSource).toContain("items.slice(0, MAX_OVERVIEW_CARDS)");
    expect(pageSource).toContain("visibleItems.map((item, index)");
  });

  it("keeps the private sharing tool out of the public Avui page", () => {
    const pageSource = readFileSync("app/bolets-avui/page.tsx", "utf8");

    expect(pageSource).not.toContain('href="/compartir"');
    expect(pageSource).not.toContain("daily-share-entry");
  });

  it("does not present the editorial update date as prediction freshness", () => {
    const pageSource = readFileSync("app/bolets-avui/page.tsx", "utf8");

    expect(pageSource).not.toContain("<EditorialAttribution");
  });

  it("answers the current Catalan search intent in metadata and visible copy", () => {
    const pageSource = readFileSync("app/bolets-avui/page.tsx", "utf8");

    expect(pageSource).toContain('const overviewTitle = "On trobar bolets avui i aquesta setmana"');
    expect(pageSource).toContain("On trobar bolets avui<br />");
    expect(pageSource).toContain("On trobar bolets ara a Catalunya?");
    expect(pageSource).toContain('inLanguage: "ca"');
    expect(pageSource).toContain("dateModified: pageModifiedAt.toISOString()");
  });

  it("publishes the current overview generation date in the sitemap", () => {
    const publishedAt = new Date("2026-08-31T07:00:00.000Z");
    const entry = buildSitemap(publishedAt).find((item) => item.url.endsWith("/bolets-avui"));

    expect(entry?.lastModified).toEqual(publishedAt);
  });

  it("uses plain-language labels in the leading Avui card", () => {
    const pageSource = readFileSync("app/bolets-avui/page.tsx", "utf8");

    expect(pageSource).toContain("Millors condicions ara");
    expect(pageSource).toContain("Abast dins la zona");
    expect(pageSource).toContain("Principal fre");
    expect(pageSource).toContain("Zona i bolet");
    expect(pageSource).toContain("Condicions");
    expect(pageSource).toContain("Abast");
    expect(pageSource).not.toContain("Component més limitant");
    expect(pageSource).not.toContain("controls de publicació");
    expect(pageSource).not.toContain("Cel·les compatibles de");
    expect(pageSource).toContain('className="current-leader-topline"');
  });

  it("keys the long-lived overview cache by both published condition generations", () => {
    const overviewSource = readFileSync("src/lib/current-overview.ts", "utf8");
    const generationSource = readFileSync(
      "src/lib/current-overview-generation-server.ts",
      "utf8",
    );

    expect(overviewSource).toContain("readCurrentOverviewGeneration");
    expect(overviewSource).toContain("loadCachedCurrentOverviewData(await readCurrentOverviewGeneration())");
    expect(overviewSource).toContain("loadCachedAreaOverviewData(await readCurrentOverviewGeneration())");
    expect(generationSource).toContain('import "server-only"');
    expect(generationSource).toContain('"spatial-condition-coarse"');
    expect(generationSource).toContain('"spatial-condition-territorial"');
    expect(generationSource).toContain('cache: "no-store"');
  });

  it("keys local-guide readings by the same published condition generations", () => {
    const localGuideSource = readFileSync(
      "src/lib/local-guide-conditions-server.ts",
      "utf8",
    );

    expect(localGuideSource).toContain("readCurrentOverviewGeneration");
    expect(localGuideSource).toContain("loadCachedLocalGuideCondition(");
    expect(localGuideSource).toContain('tags: ["local-guide-condition"]');
  });

  it("consolidates territorial hubs into bounded shared 1 km summary buckets", () => {
    const buckets = overviewHubs().flatMap((hub) => areaSummaryBucketsForBounds(hub.bounds));
    const uniqueBuckets = new Set(
      buckets.map((bucket) => `${bucket.west}:${bucket.south}:${bucket.east}:${bucket.north}`),
    );

    expect(buckets).toHaveLength(68);
    expect(uniqueBuckets.size).toBe(33);
    expect(AREA_BUCKET_CONCURRENCY).toBeLessThanOrEqual(2);
    expect(buckets.every((bucket) =>
      bucket.east - bucket.west <= AREA_SUMMARY_BUCKET_DEGREES &&
      bucket.north - bucket.south <= AREA_SUMMARY_BUCKET_DEGREES
    )).toBe(true);
  });

  it("names the component that limits most publishable readings", () => {
    const lowWater = summary("pirineus", { score: 0 });
    lowWater.result.components.find((c) => c.id === "water")!.score = 5;
    const lowWaterToo = summary("montseny", { score: 0 });
    lowWaterToo.result.components.find((c) => c.id === "water")!.score = 3;
    const lowExtremes = summary("ports", { score: 0 });
    lowExtremes.result.components.find((c) => c.id === "extremes")!.score = 1;
    const items = [
      { speciesId: "a", regionId: "pirineus", seasonalActivity: "good", speciesName: "a", regionName: "Pirineus", status: "available", summary: lowWater },
      { speciesId: "b", regionId: "montseny", seasonalActivity: "good", speciesName: "b", regionName: "Montseny", status: "available", summary: lowWaterToo },
      { speciesId: "c", regionId: "ports", seasonalActivity: "good", speciesName: "c", regionName: "Ports", status: "available", summary: lowExtremes },
      { speciesId: "d", regionId: "emporda", seasonalActivity: "good", speciesName: "d", regionName: "Empordà", status: "insufficient", summary: null },
    ] as const;
    expect(dominantLimitingComponent([...items] as never)).toBe("Estat hídric unificat");
    expect(dominantLimitingComponent([])).toBeNull();
  });


  it("selects every in-season edible species for every region", () => {
    const targets = currentOverviewTargetsForMonth("ago");

    expect(new Set(targets.map((target) => target.regionId))).toHaveLength(9);
    expect(new Set(targets.map((target) => `${target.speciesId}:${target.regionId}`))).toHaveLength(targets.length);
    expect(targets.some((target) => target.regionId === "altres")).toBe(false);

    for (const regionId of new Set(targets.map((target) => target.regionId))) {
      const regionTargets = targets.filter((target) => target.regionId === regionId);
      const eligibleCount = speciesProfiles.filter((species) =>
        species.predictionMode === "current" &&
        ["excellent_edible", "edible", "edible_with_conditions"].includes(species.identity.edibility) &&
        species.ecologicalConfig.regions.includes(regionId) &&
        species.ecologicalConfig.seasonality.ago !== "inactive"
      ).length;
      expect(regionTargets).toHaveLength(eligibleCount);

      for (const target of regionTargets) {
        const species = getSpecies(target.speciesId);
        expect(species?.predictionMode).toBe("current");
        expect(["excellent_edible", "edible", "edible_with_conditions"]).toContain(species?.identity.edibility);
        expect(species?.ecologicalConfig.regions).toContain(target.regionId);
        expect(target.seasonalActivity).toBe(species?.ecologicalConfig.seasonality.ago);
      }

      for (let index = 1; index < regionTargets.length; index += 1) {
        expect(seasonalActivityRank[regionTargets[index - 1]!.seasonalActivity])
          .toBeGreaterThanOrEqual(seasonalActivityRank[regionTargets[index]!.seasonalActivity]);
      }
    }
  });

  it("keeps the highest-demand autumn species in the candidate set", () => {
    const octoberSpecies = new Set(
      currentOverviewTargetsForMonth("oct").map((target) => target.speciesId),
    );

    expect(octoberSpecies).toContain("lactarius-deliciosus");
    expect(octoberSpecies).toContain("lactarius-sanguifluus");
    expect(currentOverviewTargetsForMonth("oct").length).toBeGreaterThan(27);
  });

  it("bounds concurrency and distinguishes incomplete, stale, null and rejected sources", async () => {
    const firstTarget = currentOverviewTargetsForMonth("ago")[0]!;
    let activeRequests = 0;
    let maximumConcurrency = 0;
    const items = await loadCurrentOverview(async (speciesIds, regionId) => {
      activeRequests += 1;
      maximumConcurrency = Math.max(maximumConcurrency, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 1));
      activeRequests -= 1;
      if (regionId === firstTarget.regionId) throw new Error("provider failed");
      return Object.fromEntries(speciesIds.map((speciesId) => [
        speciesId,
        regionId === "prepirineus"
          ? null
          : regionId === "catalunya-central"
            ? summary(regionId, { stale: true })
            : regionId === "montseny"
              ? summary(regionId, { completeness: 0.5 })
              : summary(regionId),
      ]));
    }, "ago");

    expect(maximumConcurrency).toBeLessThanOrEqual(CURRENT_OVERVIEW_CONCURRENCY);
    expect(items.find((item) => item.speciesId === firstTarget.speciesId && item.regionId === firstTarget.regionId)?.status).toBe("unavailable");
    expect(items.filter((item) => item.regionId === "prepirineus").every((item) => item.status === "insufficient")).toBe(true);
    expect(items.filter((item) => item.regionId === "catalunya-central").every((item) => item.status === "insufficient")).toBe(true);
    expect(items.filter((item) => item.regionId === "montseny").every((item) => item.status === "insufficient")).toBe(true);
    expect(items.filter((item) => item.status !== "available").every((item) => item.summary === null)).toBe(true);
  });

  it("ranks every publishable candidate and returns the global top ten", async () => {
    const scores: Partial<Record<RegionId, number>> = {
      pirineus: 58,
      prepirineus: 83,
      "catalunya-central": 71,
    };
    const items = await loadCurrentOverview(async (speciesIds, regionId) => {
      return Object.fromEntries(speciesIds.map((speciesId) => [
        speciesId,
        regionId === "emporda" ? null : summary(regionId, { score: scores[regionId] ?? 49 }),
      ]));
    }, "ago");
    const ranked = rankCurrentOverviewItems(items);
    const topTen = topCurrentOverviewItems(items);

    expect(ranked[0]?.regionId).toBe("prepirineus");
    expect(topTen).toHaveLength(10);
    expect(topTen.every((item) => item.status === "available" && item.summary !== null)).toBe(true);
    expect(topTen.every((item, index) => index === 0 || (topTen[index - 1]?.summary?.bestCell.score ?? 0) >= (item.summary?.bestCell.score ?? 0))).toBe(true);
    expect(topTen.some((item) => item.regionId === "emporda")).toBe(false);
    expect(ranked.at(-1)).toMatchObject({ regionId: "emporda", status: "insufficient", summary: null });
  });

  it("surfaces a localized best-cell pocket ahead of uniformly flat regions", async () => {
    const items = await loadCurrentOverview(async (speciesIds, regionId) =>
      Object.fromEntries(speciesIds.map((speciesId) => [speciesId, summary(regionId, {
          score: 0,
          bestCellScore: regionId === "pirineus" && speciesId === "boletus-edulis" ? 16 : 0,
        })])), "ago");
    const ranked = rankCurrentOverviewItems(items);

    expect(ranked[0]).toMatchObject({ regionId: "pirineus", speciesId: "boletus-edulis" });
    expect(ranked[0]?.summary?.bestCell.score).toBe(16);
  });

  it("returns every territorial combination and lets current 1 km scores choose each hub card", async () => {
    const ripollesTargets = areaOverviewTargetsForMonth("ago")
      .filter((target) => target.hub.slug === "ripolles");
    expect(ripollesTargets.map((target) => target.speciesId)).toContain("cantharellus-cibarius");
    expect(ripollesTargets.map((target) => target.speciesId)).toContain("boletus-edulis");

    const items = await loadAreaOverview(async (speciesIds, hub) =>
      Object.fromEntries(speciesIds.map((speciesId) => {
        const bestCellScore = hub.slug === "ripolles"
          ? speciesId === "boletus-edulis" ? 48 : speciesId === "cantharellus-cibarius" ? 22 : 12
          : 10;
        const regional = summary(hub.regionId, { score: 0, bestCellScore });
        const areaSummary: AreaPredictionSummary = {
          ...regional,
          areaSlug: hub.slug,
          gridSizeM: 1000,
          positiveCellCount: bestCellScore > 0 ? 5 : 0,
          score20CellCount: bestCellScore >= 20 ? 2 : 0,
          positiveCellShare: bestCellScore > 0 ? 0.25 : 0,
          score20CellShare: bestCellScore >= 20 ? 0.1 : 0,
        };
        return [speciesId, areaSummary];
      })), "ago");

    const ripollesItems = items.filter((item) => item.areaSlug === "ripolles");
    expect(ripollesItems).toHaveLength(ripollesTargets.length);
    expect(ripollesItems.map((item) => item.speciesId)).toEqual(
      expect.arrayContaining(ripollesTargets.map((target) => target.speciesId)),
    );
    expect(bestAreaOverviewItemsByHub(items).find((item) => item.areaSlug === "ripolles")).toMatchObject({
      speciesId: "boletus-edulis",
      speciesName: "Cep",
      summary: { gridSizeM: 1000, bestCell: { score: 48 } },
    });
  });

  it("uses one score order across regions and territorial types", async () => {
    const regional = await loadCurrentOverview(async (speciesIds, regionId) =>
      Object.fromEntries(speciesIds.map((speciesId) => [
        speciesId,
        summary(regionId, { score: 0, bestCellScore: regionId === "pirineus" ? 45 : 12 }),
      ])), "ago");
    const territorial = await loadAreaOverview(async (speciesIds, hub) =>
      Object.fromEntries(speciesIds.map((speciesId) => {
        const regionalSummary = summary(hub.regionId, {
          score: 0,
          bestCellScore: hub.slug === "ripolles" && speciesId === "boletus-edulis" ? 78 : 8,
        });
        return [speciesId, { ...regionalSummary, areaSlug: hub.slug, gridSizeM: 1000 }];
      })), "ago");

    const ranked = rankOverviewItems([...regional, ...territorial]);
    expect(ranked[0]).toMatchObject({ areaSlug: "ripolles", speciesId: "boletus-edulis" });
    expect(ranked.every((item, index) =>
      index === 0 ||
      item.status !== "available" ||
      (ranked[index - 1]?.summary?.bestCell.score ?? -1) >= (item.summary?.bestCell.score ?? -1)
    )).toBe(true);
  });

  it("returns an honest empty top ten when every environmental read fails", async () => {
    const items = await loadCurrentOverview(async () => {
      throw new Error("provider unavailable");
    }, "ago");

    expect(items.every((item) => item.status === "unavailable" && item.summary === null)).toBe(true);
    expect(topCurrentOverviewItems(items)).toEqual([]);
  });
});
