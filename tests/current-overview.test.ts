import { describe, expect, it } from "vitest";
import { getSpecies, speciesProfiles } from "@/data/species";
import {
  CURRENT_OVERVIEW_CANDIDATES_PER_REGION,
  CURRENT_OVERVIEW_CONCURRENCY,
  currentOverviewTargetsForMonth,
  loadCurrentOverview,
  rankCurrentOverviewItems,
  seasonalActivityRank,
  topCurrentOverviewItems,
} from "@/src/lib/current-overview";
import type { RegionId, RegionalPredictionSummary } from "@/src/lib/types";

function summary(regionId: RegionId, options: { stale?: boolean; completeness?: number; score?: number } = {}): RegionalPredictionSummary {
  return {
    regionId,
    gridSizeM: 10000,
    scoredCellCount: 4,
    scoreRange: [58, 72],
    result: {
      score: options.score ?? 65,
      label: "favorable",
      contributions: [],
      modelVersion: "test-v1",
      dataCompleteness: options.completeness ?? 1,
      missingFactors: [],
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
      expect(regionTargets).toHaveLength(Math.min(CURRENT_OVERVIEW_CANDIDATES_PER_REGION, eligibleCount));

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

  it("returns an honest empty top ten when every environmental read fails", async () => {
    const items = await loadCurrentOverview(async () => {
      throw new Error("provider unavailable");
    }, "ago");

    expect(items.every((item) => item.status === "unavailable" && item.summary === null)).toBe(true);
    expect(topCurrentOverviewItems(items)).toEqual([]);
  });
});
