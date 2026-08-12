import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import { calculateSuitability } from "@/src/lib/scoring";
import type { ConditionSnapshot } from "@/src/lib/types";
import {
  habitatScoringValues,
  mergeHabitatScoringValues,
} from "@/supabase/functions/_shared/habitat-scoring-values";

describe("coarse habitat scoring values", () => {
  it("derives altitude suitability within exact compatible cover", () => {
    expect(habitatScoringValues({
      coverage: 0.25,
      altitudeWeightedCoverage: 0.125,
    })).toEqual({
      forestCompatibility: 25,
      habitatAltitudeSuitability: 50,
      habitatCoverage: 0.25,
    });
  });

  it("returns hard zeroes without compatible habitat", () => {
    expect(habitatScoringValues({
      coverage: 0,
      altitudeWeightedCoverage: 0,
    })).toEqual({
      forestCompatibility: 0,
      habitatAltitudeSuitability: 0,
      habitatCoverage: 0,
    });
  });

  it("rejects weighted evidence that cannot come from the same habitat area", () => {
    expect(habitatScoringValues({
      coverage: 0.4,
      altitudeWeightedCoverage: 0.5,
    })).toBeNull();
    expect(habitatScoringValues({
      coverage: 0.4,
      altitudeWeightedCoverage: -0.1,
    })).toBeNull();
  });

  it("rejects missing weighted evidence instead of falling back to mean altitude", () => {
    expect(habitatScoringValues({
      coverage: 0.4,
      altitudeWeightedCoverage: undefined,
    })).toBeNull();
  });

  it("rejects an invalid raw coverage instead of converting it to a false zero", () => {
    expect(habitatScoringValues({
      coverage: Number.NaN,
      altitudeWeightedCoverage: 0,
    })).toBeNull();
  });

  it("keeps the canonical 16-child area denominators separate from eligible count", () => {
    const children = Array.from({ length: 16 }, (_, index) => ({
      coverage: index < 8 ? 0.5 : 0,
      altitudeSuitability: index < 8 ? 0.5 : 0,
    }));
    const coverage = children.reduce((sum, child) => sum + child.coverage, 0) / 16;
    const altitudeWeightedCoverage = children.reduce(
      (sum, child) => sum + child.coverage * child.altitudeSuitability,
      0,
    ) / 16;
    const result = habitatScoringValues({ coverage, altitudeWeightedCoverage });

    expect(coverage).toBe(0.25);
    expect(8 / 16).toBe(0.5);
    expect(result).toEqual({
      forestCompatibility: 25,
      habitatAltitudeSuitability: 50,
      habitatCoverage: 0.25,
    });
  });

  it("merges a raw cached row through to a non-zero coarse score", () => {
    const rawHabitatRow = {
      coverage: 0.277500003576279,
      altitude_weighted_coverage: 0.129237502813339,
      eligible_cell_count: 4,
    };
    const values = mergeHabitatScoringValues({
      temperatureAvg10dC: 14,
      temperatureMin10dC: 8,
      temperatureMax10dC: 18,
      frostHours10d: 0,
      relativeHumidityAvg24h: 75,
      soilMoistureAvg24h: 0.32,
      rainfall3dMm: 18,
      rainfall7dMm: 25,
      rainfallPrevious23dMm: 45,
      rainfall30dMm: 70,
      drySpellDays: 0,
      evapotranspiration3dMm: 4,
      evapotranspiration7dMm: 10,
      evapotranspiration30dMm: 45,
      soilMoistureMin7d: 0.28,
      soilMoistureAvg7d: 0.32,
      soilMoistureMax7d: 0.34,
      soilMoistureTrend7d: 0.01,
      altitudeM: 2040,
      soilCompatibility: 100,
    }, rawHabitatRow, true) as ConditionSnapshot["values"];

    expect(values.forestCompatibility).toBeCloseTo(27.7500003576279);
    expect(values.habitatAltitudeSuitability).toBeCloseTo(46.5720724863486);
    expect((values.forestCompatibility ?? 0) / 100).not.toBe(4 / 16);

    const result = calculateSuitability(getSpecies("boletus-edulis")!, {
      regionId: "pirineus",
      observedAt: "2026-10-11T12:00:00.000Z",
      source: ["test"],
      confidence: "moderate",
      stale: false,
      unavailableFields: [],
      values,
    });
    expect(result.contributions.find((factor) => factor.id === "altitude")?.score)
      .toBeCloseTo(46.5720724863486);
    expect(result.score).toBe(82);
  });

  it("withholds malformed rows instead of reusing stale habitat values", () => {
    const values = mergeHabitatScoringValues({
      forestCompatibility: 80,
      habitatAltitudeSuitability: 75,
      forestTypes: ["pinedes"],
      treeSpecies: ["Pinus"],
    }, {
      coverage: 0.4,
      altitude_weighted_coverage: undefined,
    }, true);

    expect(values).not.toHaveProperty("forestCompatibility");
    expect(values).not.toHaveProperty("habitatAltitudeSuitability");
    expect(values).not.toHaveProperty("forestTypes");
    expect(values).not.toHaveProperty("treeSpecies");
  });
});
