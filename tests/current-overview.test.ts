import { describe, expect, it } from "vitest";
import { getSpecies, speciesProfiles } from "@/data/species";
import {
  CURRENT_OVERVIEW_CANDIDATES_PER_REGION,
  CURRENT_OVERVIEW_CONCURRENCY,
  CURRENT_OVERVIEW_MONTANE_REACH_M,
  currentOverviewTargetsForMonth,
  dominantLimitingComponent,
  loadCurrentOverview,
  rankCurrentOverviewItems,
  seasonalActivityRank,
  topCurrentOverviewItems,
} from "@/src/lib/current-overview";
import type { RegionId, RegionalPredictionSummary } from "@/src/lib/types";

function summary(regionId: RegionId, options: { stale?: boolean; completeness?: number; score?: number; bestCellScore?: number } = {}): RegionalPredictionSummary {
  const incomplete = (options.completeness ?? 1) < 1;
  const opportunityIndex = incomplete ? null : options.score ?? 65;
  return {
    regionId,
    gridSizeM: 10000,
    scoredCellCount: 4,
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
  it("guarantees a montane-reach candidate wherever one is in season", () => {
    const targets = currentOverviewTargetsForMonth("ago");
    for (const regionId of new Set(targets.map((target) => target.regionId))) {
      const hasEligibleMontane = speciesProfiles.some((species) =>
        species.predictionMode === "current" &&
        ["excellent_edible", "edible", "edible_with_conditions"].includes(species.identity.edibility) &&
        species.ecologicalConfig.regions.includes(regionId) &&
        species.ecologicalConfig.seasonality.ago !== "inactive" &&
        species.ecologicalConfig.habitat.altitude[1] >= CURRENT_OVERVIEW_MONTANE_REACH_M
      );
      if (!hasEligibleMontane) continue;
      const selectedMontane = targets
        .filter((target) => target.regionId === regionId)
        .some((target) =>
          getSpecies(target.speciesId)!.ecologicalConfig.habitat.altitude[1] >=
            CURRENT_OVERVIEW_MONTANE_REACH_M
        );
      expect(selectedMontane, regionId).toBe(true);
    }
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


  it("selects up to three priority in-season edible species for every region", () => {
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
      // The montane-reach guarantee may append one extra candidate.
      expect(regionTargets.length).toBeGreaterThanOrEqual(
        Math.min(CURRENT_OVERVIEW_CANDIDATES_PER_REGION, eligibleCount),
      );
      expect(regionTargets.length).toBeLessThanOrEqual(
        Math.min(CURRENT_OVERVIEW_CANDIDATES_PER_REGION + 1, eligibleCount),
      );

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
    expect(currentOverviewTargetsForMonth("oct").length).toBeLessThanOrEqual(27);
  });

  it("bounds concurrency and distinguishes incomplete, stale, null and rejected sources", async () => {
    const firstTarget = currentOverviewTargetsForMonth("ago")[0]!;
    let activeRequests = 0;
    let maximumConcurrency = 0;
    const items = await loadCurrentOverview(async (speciesId, regionId) => {
      activeRequests += 1;
      maximumConcurrency = Math.max(maximumConcurrency, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 1));
      activeRequests -= 1;
      if (speciesId === firstTarget.speciesId && regionId === firstTarget.regionId) throw new Error("provider failed");
      if (regionId === "prepirineus") return null;
      if (regionId === "catalunya-central") return summary(regionId, { stale: true });
      if (regionId === "montseny") return summary(regionId, { completeness: 0.5 });
      return summary(regionId);
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
    const items = await loadCurrentOverview(async (_speciesId, regionId) => {
      if (regionId === "emporda") return null;
      return summary(regionId, { score: scores[regionId] ?? 49 });
    }, "ago");
    const ranked = rankCurrentOverviewItems(items);
    const topTen = topCurrentOverviewItems(items);

    expect(ranked[0]?.regionId).toBe("prepirineus");
    expect(topTen).toHaveLength(10);
    expect(topTen.every((item) => item.status === "available" && item.summary !== null)).toBe(true);
    expect(topTen.every((item, index) => index === 0 || (topTen[index - 1]?.summary?.result.score ?? 0) >= (item.summary?.result.score ?? 0))).toBe(true);
    expect(topTen.some((item) => item.regionId === "emporda")).toBe(false);
    expect(ranked.at(-1)).toMatchObject({ regionId: "emporda", status: "insufficient", summary: null });
  });

  it("surfaces a localized best-cell pocket ahead of uniformly flat regions", async () => {
    const items = await loadCurrentOverview(async (speciesId, regionId) =>
      summary(regionId, {
        score: 0,
        bestCellScore: regionId === "pirineus" && speciesId === "boletus-edulis" ? 16 : 0,
      }), "ago");
    const ranked = rankCurrentOverviewItems(items);

    expect(ranked[0]).toMatchObject({ regionId: "pirineus", speciesId: "boletus-edulis" });
    expect(ranked[0]?.summary?.bestCell.score).toBe(16);
  });

  it("returns an honest empty top ten when every environmental read fails", async () => {
    const items = await loadCurrentOverview(async () => {
      throw new Error("provider unavailable");
    }, "ago");

    expect(items.every((item) => item.status === "unavailable" && item.summary === null)).toBe(true);
    expect(topCurrentOverviewItems(items)).toEqual([]);
  });
});
