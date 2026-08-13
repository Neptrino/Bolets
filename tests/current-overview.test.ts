import { describe, expect, it } from "vitest";
import { loadCurrentOverview } from "@/src/lib/current-overview";
import type { RegionId, RegionalPredictionSummary } from "@/src/lib/types";

function summary(regionId: RegionId, options: { stale?: boolean; completeness?: number } = {}): RegionalPredictionSummary {
  return {
    regionId,
    gridSizeM: 10000,
    scoredCellCount: 4,
    scoreRange: [58, 72],
    result: {
      score: 65,
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
  it("keeps valid results and distinguishes incomplete, stale, null and rejected sources", async () => {
    const items = await loadCurrentOverview(async (_speciesId, regionId) => {
      if (regionId === "prepirineus") return null;
      if (regionId === "catalunya-central") return summary(regionId, { stale: true });
      if (regionId === "montseny") return summary(regionId, { completeness: 0.5 });
      if (regionId === "emporda") throw new Error("provider failed");
      return summary(regionId);
    });

    expect(items.map((item) => item.status)).toEqual([
      "available",
      "insufficient",
      "insufficient",
      "insufficient",
      "unavailable",
      "available",
    ]);
    expect(items.filter((item) => item.status !== "available").every((item) => item.summary === null)).toBe(true);
  });
});
