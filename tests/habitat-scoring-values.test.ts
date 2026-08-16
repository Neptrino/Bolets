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
      habitatCoveragePercent: 25,
      habitatAltitudeSuitability: 50,
      habitatCoverage: 0.25,
    });
  });

  it("returns hard zeroes without compatible habitat", () => {
    expect(habitatScoringValues({
      coverage: 0,
      altitudeWeightedCoverage: 0,
    })).toEqual({
      habitatCoveragePercent: 0,
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
      habitatCoveragePercent: 25,
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
      temperatureAvg7dC: 13,
      temperatureAvg20dC: 13.5,
      frostHours20d: 0,
      heatHours20d: 0,
      relativeHumidityAvg7d: 90,
      soilMoistureMin7d: 0.225,
      soilMoistureAvg7d: 0.24,
      rainfall26dMm: 50,
      rainfallDays26d: 5,
      evapotranspiration26dMm: 5,
      // Matured rain: the trailing week is subtracted from the window.
      rainfall7dMm: 0,
      rainfallDays7d: 0,
      evapotranspiration7dMm: 0,
      drySpellDays: 0,
      altitudeM: 2040,
      soilTexture: "franca",
    }, rawHabitatRow, true) as ConditionSnapshot["values"];

    expect(values.habitatCoveragePercent).toBeCloseTo(27.7500003576279);
    expect(values.habitatAltitudeSuitability).toBeCloseTo(46.5720724863486);
    expect((values.habitatCoveragePercent ?? 0) / 100).not.toBe(4 / 16);

    const result = calculateSuitability(getSpecies("boletus-edulis")!, {
      regionId: "pirineus",
      observedAt: "2026-10-11T12:00:00.000Z",
      source: ["test"],
      confidence: "moderate",
      stale: false,
      unavailableFields: [],
      values,
    });
    expect(result.components.find((component) => component.id === "altitude")?.score)
      .toBe(47);
    expect(result.rawHabitatCoverage).toBeCloseTo(0.277500003576279);
    expect(result.effectiveHabitatCoverage).toBeCloseTo(0.129237502813339);
    expect(result.fruitingConditionsScore).not.toBeNull();
    expect(result.score).toBe(result.opportunityIndex);
  });

  it("withholds malformed rows instead of reusing stale habitat values", () => {
    const values = mergeHabitatScoringValues({
      habitatCoveragePercent: 80,
      habitatAltitudeSuitability: 75,
      forestTypes: ["pinedes"],
      treeSpecies: ["Pinus"],
    }, {
      coverage: 0.4,
      altitude_weighted_coverage: undefined,
    }, true);

    expect(values).not.toHaveProperty("habitatCoveragePercent");
    expect(values).not.toHaveProperty("habitatAltitudeSuitability");
    expect(values).not.toHaveProperty("forestTypes");
    expect(values).not.toHaveProperty("treeSpecies");
  });
});
