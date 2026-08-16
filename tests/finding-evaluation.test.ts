import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import {
  extremeTemperatureMultiplier,
  temperatureSuitability,
  waterSuitability,
} from "@/src/lib/hydrothermal";
import { phenologySuitability } from "@/src/lib/scoring";
import type { ConditionSnapshot } from "@/src/lib/types";
import {
  bottleneck,
  componentFactors,
  hitRates,
  logDamage,
  mannWhitneyAuc,
  mulberry32,
  neutralizedScores,
  productOf,
  quantile,
  rankPercentile,
  sampleControlDates,
  seasonalDistance,
  waterFactors,
} from "@/tests/helpers/finding-evaluation";
import {
  type EvaluationRecord,
  renderSummaryTable,
  summarizeEvaluation,
} from "@/tests/helpers/finding-evaluation-report";

const EVENTS = [
  {
    observedAt: "2025-10-12T12:00:00+02:00",
    latitude: 41.9,
    longitude: 2.2,
    speciesIds: ["lactarius-deliciosus"],
  },
  {
    observedAt: "2025-10-20T12:00:00+02:00",
    latitude: 41.9,
    longitude: 2.2,
    speciesIds: ["lactarius-deliciosus"],
  },
];

describe("deterministic sampling", () => {
  it("produces the same stream for a seed and a different one otherwise", () => {
    const first = Array.from({ length: 5 }, mulberry32(7));
    const second = Array.from({ length: 5 }, mulberry32(7));
    const other = Array.from({ length: 5 }, mulberry32(8));
    expect(first).toEqual(second);
    expect(first).not.toEqual(other);
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it("samples the same control dates for the same seed", () => {
    const options = { seed: 42, today: "2026-08-16" };
    expect(sampleControlDates(EVENTS, options)).toEqual(sampleControlDates(EVENTS, options));
  });

  it("keeps controls in season, inside the archive, and away from every event", () => {
    const controls = sampleControlDates(EVENTS, {
      seed: 3,
      controlsPerEvent: 5,
      today: "2026-08-16",
    });
    expect(controls.length).toBe(10);
    for (const control of controls) {
      expect(control.date >= "2024-02-09").toBe(true);
      expect(control.date <= "2026-08-15").toBe(true);
      // Away from BOTH events at this location, not just its own pair.
      for (const event of EVENTS) {
        const gap = Math.abs(
          Date.parse(`${control.date}T00:00:00Z`) -
            Date.parse(`${event.observedAt.slice(0, 10)}T00:00:00Z`),
        ) / 86_400_000;
        expect(gap).toBeGreaterThan(10);
      }
      expect(seasonalDistance(control.date, "2025-10-12")).toBeLessThanOrEqual(45);
    }
  });

  it("carries the event time of day into its controls", () => {
    const [control] = sampleControlDates(EVENTS, {
      seed: 11,
      controlsPerEvent: 1,
      today: "2026-08-16",
    });
    expect(control.observedAt.endsWith("T12:00:00+02:00")).toBe(true);
  });

  it("measures day-of-year distance circularly", () => {
    expect(seasonalDistance("2025-01-01", "2025-12-31")).toBeLessThanOrEqual(2);
    expect(seasonalDistance("2025-10-12", "2025-10-20")).toBe(8);
  });
});

describe("component attribution", () => {
  const exponents = {
    waterExponent: 0.6,
    triggerDependency: 0.35,
    vpdExponent: 0.15,
    drySpellExponent: 0.25,
  };

  it("reproduces the production product exactly", () => {
    const profile = getSpecies("lactarius-deliciosus")!;
    expect(profile.modelConfig.status).toBe("supported");
    if (
      profile.modelConfig.status !== "supported" ||
      profile.modelConfig.model !== "hydrothermal-v1"
    ) return;

    const values: ConditionSnapshot["values"] = {
      soilTexture: "franca",
      soilMoistureAvg7d: 0.22,
      soilMoistureMin7d: 0.19,
      temperatureAvg7dC: 12,
      temperatureAvg14dC: 12.5,
      temperatureAvg20dC: 12.8,
      relativeHumidityAvg7d: 82,
      drySpellDays: 2,
      rainfall14dMm: 40,
      rainfall21dMm: 55,
      rainfall26dMm: 60,
      rainfallDays14d: 5,
      rainfallDays21d: 6,
      rainfallDays26d: 7,
      evapotranspiration14dMm: 20,
      evapotranspiration21dMm: 28,
      evapotranspiration26dMm: 35,
      frostHours20d: 4,
      heatHours20d: 0,
      frostHours14d: 2,
      heatHours14d: 0,
    };

    const water = waterSuitability(values, profile.modelConfig.water);
    const temperature = temperatureSuitability(values, profile.modelConfig.temperature);
    const extremes = extremeTemperatureMultiplier(values, profile.modelConfig.temperature);
    const phenology = phenologySuitability(
      "2025-10-12T12:00:00+02:00",
      profile.modelConfig.phenology.monthlyAnchors,
    );
    expect(water).not.toBeNull();
    expect(temperature).not.toBeNull();
    expect(extremes).not.toBeNull();

    const modelExponents = {
      waterExponent: profile.modelConfig.water.waterExponent,
      triggerDependency: profile.modelConfig.water.triggerDependency,
      vpdExponent: profile.modelConfig.water.vpdExponent,
      drySpellExponent: profile.modelConfig.water.drySpellExponent,
    };
    const raw = {
      habitat: 0.5,
      altitude: 1,
      effectiveHabitat: 0.5,
      phenology,
      water: water!.score,
      waterDetails: water!,
      temperature,
      extremes,
      fruitingConditions: null,
      opportunity: null,
    };

    const factors = componentFactors(raw, modelExponents)!;
    const expected = phenology! *
      water!.score ** modelExponents.waterExponent *
      temperature! ** (1 - modelExponents.waterExponent) *
      extremes!;
    expect(productOf(factors)).toBeCloseTo(expected, 12);

    // The water sub-terms must reconstruct the water score they came from.
    const sub = waterFactors(raw, modelExponents)!;
    expect(productOf(sub)).toBeCloseTo(water!.score, 12);
  });

  it("returns null when any component is missing", () => {
    expect(
      componentFactors(
        {
          habitat: 1,
          altitude: 1,
          effectiveHabitat: 1,
          phenology: null,
          water: 0.5,
          temperature: 0.5,
          extremes: 1,
          fruitingConditions: null,
          opportunity: null,
        },
        exponents,
      ),
    ).toBeNull();
  });

  it("ranks the smallest factor as the bottleneck", () => {
    const result = bottleneck({ phenology: 0.8, water: 0.5, temperature: 0.7, extremes: 0.1 });
    expect(result.id).toBe("extremes");
    expect(result.ranking.map((entry) => entry.id)).toEqual([
      "extremes",
      "water",
      "temperature",
      "phenology",
    ]);
  });

  it("neutralizes one factor at a time, including zeros", () => {
    const factors = { a: 0.5, b: 0.4, c: 0 };
    const neutralized = neutralizedScores(factors);
    expect(neutralized.c).toBeCloseTo(0.2, 12);
    expect(neutralized.a).toBe(0);
    // Restoring the neutralized factor returns the original product.
    expect(neutralized.a * factors.a).toBeCloseTo(productOf(factors), 12);
  });

  it("scores log damage additively and flags total zeros", () => {
    expect(logDamage(1)).toBeCloseTo(0, 12);
    expect(logDamage(Math.exp(-2))).toBeCloseTo(2, 12);
    expect(logDamage(0)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("discrimination metrics", () => {
  it("computes AUC with separation, overlap and ties", () => {
    expect(mannWhitneyAuc([5, 6, 7], [1, 2, 3])).toBe(1);
    expect(mannWhitneyAuc([1, 2, 3], [5, 6, 7])).toBe(0);
    expect(mannWhitneyAuc([1, 2], [1, 2])).toBe(0.5);
    expect(mannWhitneyAuc([2], [1, 2, 3])).toBeCloseTo(0.5, 12);
    expect(mannWhitneyAuc([], [1])).toBeNull();
  });

  it("ranks a value inside its comparison set", () => {
    expect(rankPercentile(10, [1, 2, 3])).toBe(1);
    expect(rankPercentile(0, [1, 2, 3])).toBe(0);
    expect(rankPercentile(2, [1, 2, 3])).toBeCloseTo(0.5, 12);
    expect(rankPercentile(1, [])).toBeNull();
  });

  it("computes hit rates and quantiles", () => {
    expect(hitRates([10, 30, 50, 70], [20, 40, 60])).toEqual({
      atLeast20: 0.75,
      atLeast40: 0.5,
      atLeast60: 0.25,
    });
    expect(quantile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 12);
    expect(quantile([], 0.5)).toBeNull();
  });
});

describe("report assembly", () => {
  const exponents = {
    waterExponent: 0.6,
    triggerDependency: 0.35,
    vpdExponent: 0.15,
    drySpellExponent: 0.25,
  };

  function record(
    kind: EvaluationRecord["kind"],
    location: number,
    overrides: Partial<EvaluationRecord["raw"]> = {},
    extra: Partial<EvaluationRecord> = {},
  ): EvaluationRecord {
    const raw = {
      habitat: 0.4,
      altitude: 1,
      effectiveHabitat: 0.4,
      phenology: 0.8,
      water: 0.6,
      waterDetails: {
        soilWaterState: 0.7,
        rainTrigger: 0.4,
        atmosphericRetention: 0.9,
        drySpellRetention: 0.95,
        relativeExtractableWaterMean: 0.6,
        relativeExtractableWaterFloor: 0.4,
        vapourPressureDeficitKpa: 0.5,
      },
      temperature: 0.7,
      extremes: 0.3,
      fruitingConditions: null,
      opportunity: null,
      ...overrides,
    };
    const factors = componentFactors(raw, exponents);
    const conditions = factors ? productOf(factors) * 100 : null;
    return {
      location,
      speciesId: "lactarius-deliciosus",
      kind,
      date: "2025-10-12",
      fruitingConditionsScore: conditions,
      opportunityIndex: conditions === null ? null : conditions * (raw.effectiveHabitat ?? 0),
      raw,
      exponents,
      optimumC: 15,
      windowMeanTemperatureC: 11,
      ...extra,
    };
  }

  it("summarises events against controls and names the bottleneck", () => {
    const records = [
      record("event", 1),
      record("event", 2),
      record("control", 1, { phenology: 0.2, extremes: 0.2 }),
      record("control", 2, { phenology: 0.2, extremes: 0.2 }),
    ];
    const report = summarizeEvaluation(records, { seed: 1 });

    expect(report.meta.events).toBe(2);
    expect(report.meta.controls).toBe(2);
    expect(report.discrimination.aucOpportunity).toBe(1);
    expect(report.attribution.bottleneckCountsTopLevel.extremes).toBe(2);
    expect(report.habitatCeiling.shareWhereAltaBandUnreachable).toBe(1);
  });

  it("separates waterlogged zeros from dry-soil zeros", () => {
    const waterlogged = record("event", 1, {
      water: 0,
      waterDetails: {
        soilWaterState: 0,
        rainTrigger: 0.8,
        atmosphericRetention: 0.9,
        drySpellRetention: 1,
        relativeExtractableWaterMean: 1.3,
        relativeExtractableWaterFloor: 1.1,
        vapourPressureDeficitKpa: 0.3,
      },
    });
    const dry = record("event", 2, {
      water: 0,
      waterDetails: {
        soilWaterState: 0,
        rainTrigger: 0.1,
        atmosphericRetention: 0.7,
        drySpellRetention: 0.5,
        relativeExtractableWaterMean: 0.05,
        relativeExtractableWaterFloor: 0.02,
        vapourPressureDeficitKpa: 1.6,
      },
    });
    const report = summarizeEvaluation([waterlogged, dry]);
    expect(report.attribution.eventsZeroedByWaterlogging).toBe(1);
    expect(report.attribution.eventsZeroedByDrySoil).toBe(1);
  });

  it("reports the temperature optimum shift implied by the events", () => {
    const report = summarizeEvaluation([record("event", 1), record("event", 2)]);
    expect(report.temperatureBias.suggestedOptimumShiftC).toBeCloseTo(-4, 12);
    expect(
      report.verdicts.find((entry) => entry.hypothesis === "f-temperature-optimum")?.verdict,
    ).toBe("supported");
  });

  it("marks thin evidence inconclusive rather than supported", () => {
    const report = summarizeEvaluation([record("event", 1)]);
    expect(
      report.verdicts.find((entry) => entry.hypothesis === "b-extremes-crush")?.verdict,
    ).toBe("inconclusive");
  });

  it("renders a compact human summary", () => {
    const report = summarizeEvaluation([
      record("event", 1),
      record("control", 1, { phenology: 0.1 }),
    ]);
    const table = renderSummaryTable(report);
    expect(table).toContain("events 1");
    expect(table).toContain("AUC opportunity");
    expect(table).toContain("top bottlenecks");
  });

  it("is deterministic for identical inputs", () => {
    const records = [record("event", 1), record("control", 1, { phenology: 0.2 })];
    expect(JSON.stringify(summarizeEvaluation(records)))
      .toBe(JSON.stringify(summarizeEvaluation(records)));
  });
});
