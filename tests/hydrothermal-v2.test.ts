import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import { smoothBand, waterSuitability } from "@/src/lib/hydrothermal";
import {
  calibrate,
  habitatWeight,
  smoothBandV2,
  waterSuitabilityV2,
} from "@/src/lib/hydrothermal-v2";
import { calculateSuitability } from "@/src/lib/scoring";
import { opportunityLabel } from "@/src/lib/scoring";
import type {
  ConditionSnapshot,
  FruitingModelConfig,
  SpeciesProfile,
  WaterModelParametersV2,
} from "@/src/lib/types";

const BAND = [0.15, 0.5, 0.9, 1.2] as const;

function v1Config() {
  const config = getSpecies("lactarius-deliciosus")!.modelConfig;
  if (config.status !== "supported" || config.model !== "hydrothermal-v1") {
    throw new Error("Expected a supported hydrothermal-v1 config");
  }
  return config;
}

/** Builds the v2 counterpart of a shipped v1 species for side-by-side scoring. */
function v2Profile(): SpeciesProfile {
  const species = getSpecies("lactarius-deliciosus")!;
  const v1 = v1Config();
  const water: WaterModelParametersV2 = {
    ...v1.water,
    soilWeight: 0.15,
    soilFloorWeight: 0.15,
    soilDryFloor: 0.25,
    soilWetFloor: 0.4,
    rainFloor: 0.1,
  };
  const modelConfig: FruitingModelConfig = {
    model: "hydrothermal-v2",
    version: "hydrothermal-v2-test",
    status: "supported",
    guild: v1.guild,
    water,
    temperature: v1.temperature,
    combination: { habitatExponent: 0.4, calibrationGamma: 1 },
    phenology: v1.phenology,
    evidence: v1.evidence,
  };
  return { ...species, modelConfig };
}

/**
 * The diagnosed failure: three weeks of good rain, but the coarse soil series
 * reports moisture below the wilting-point band. v1 scores this as a hard zero.
 */
const RAIN_WET_SOIL_DRY: ConditionSnapshot["values"] = {
  soilTexture: "franca",
  soilMoistureAvg7d: 0.13,
  soilMoistureMin7d: 0.12,
  temperatureAvg7dC: 12,
  temperatureAvg14dC: 12.5,
  temperatureAvg20dC: 12.8,
  relativeHumidityAvg7d: 88,
  drySpellDays: 1,
  rainfall14dMm: 70,
  rainfall21dMm: 90,
  rainfall26dMm: 95,
  rainfallDays14d: 7,
  rainfallDays21d: 9,
  rainfallDays26d: 10,
  evapotranspiration14dMm: 20,
  evapotranspiration21dMm: 28,
  evapotranspiration26dMm: 32,
  frostHours14d: 0,
  frostHours20d: 0,
  heatHours14d: 0,
  heatHours20d: 0,
  habitatCoveragePercent: 40,
  habitatAltitudeSuitability: 100,
};

function snapshot(values: ConditionSnapshot["values"]): ConditionSnapshot {
  return {
    regionId: "pirineus",
    observedAt: "2025-10-14T22:00:00.000Z",
    source: ["test"],
    confidence: "limited",
    stale: false,
    unavailableFields: [],
    values,
  };
}

describe("smoothBandV2", () => {
  const floors = { dryFloor: 0.25, wetFloor: 0.4 };

  it("returns floors outside the band instead of zero", () => {
    expect(smoothBandV2(0.05, BAND, floors)).toBe(0.25);
    expect(smoothBandV2(1.5, BAND, floors)).toBe(0.4);
  });

  it("still returns one across the optimum plateau", () => {
    expect(smoothBandV2(0.5, BAND, floors)).toBe(1);
    expect(smoothBandV2(0.7, BAND, floors)).toBe(1);
    expect(smoothBandV2(0.9, BAND, floors)).toBe(1);
  });

  it("is continuous at both band edges", () => {
    expect(smoothBandV2(0.1501, BAND, floors)).toBeCloseTo(0.25, 3);
    expect(smoothBandV2(1.1999, BAND, floors)).toBeCloseTo(0.4, 3);
  });

  it("reduces to the v1 response when both floors are zero", () => {
    const zeroFloors = { dryFloor: 0, wetFloor: 0 };
    for (const value of [0.05, 0.2, 0.35, 0.5, 0.75, 0.95, 1.1, 1.3]) {
      expect(smoothBandV2(value, BAND, zeroFloors)).toBeCloseTo(
        smoothBand(value, BAND),
        12,
      );
    }
  });

  it("rejects an unordered band or out-of-range floors", () => {
    expect(() => smoothBandV2(0.5, [0.5, 0.4, 0.9, 1.2], floors)).toThrow(/strictly ordered/);
    expect(() => smoothBandV2(0.5, BAND, { dryFloor: -0.1, wetFloor: 0 }))
      .toThrow(/within \[0, 1\]/);
  });
});

describe("waterSuitabilityV2", () => {
  const parameters = v2Profile().modelConfig as Extract<
    FruitingModelConfig,
    { model: "hydrothermal-v2" }
  >;

  it("keeps a usable score when rain is high but the soil series reads dry", () => {
    const v1Score = waterSuitability(RAIN_WET_SOIL_DRY, v1Config().water)?.score;
    const v2 = waterSuitabilityV2(RAIN_WET_SOIL_DRY, parameters.water);

    // This is the measured failure mode: v1 collapses to zero here.
    expect(v1Score).toBe(0);
    expect(v2).not.toBeNull();
    expect(v2!.score).toBeGreaterThan(0.3);
    expect(v2!.soilWaterState).toBeGreaterThan(0);
    expect(v2!.waterBalance).toBeGreaterThan(0.8);
  });

  it("still reports a low score when both estimators are unfavourable", () => {
    const drought = {
      ...RAIN_WET_SOIL_DRY,
      rainfall14dMm: 2,
      rainfall21dMm: 3,
      rainfall26dMm: 4,
      rainfallDays14d: 1,
      rainfallDays21d: 1,
      rainfallDays26d: 1,
      drySpellDays: 30,
      relativeHumidityAvg7d: 35,
    };
    const wet = waterSuitabilityV2(RAIN_WET_SOIL_DRY, parameters.water)!.score;
    const dry = waterSuitabilityV2(drought, parameters.water)!.score;
    expect(dry).toBeLessThan(0.25);
    expect(dry).toBeLessThan(wet);
  });

  it("combines the two estimators as a weighted geometric mean", () => {
    const result = waterSuitabilityV2(RAIN_WET_SOIL_DRY, parameters.water)!;
    const expected =
      result.waterBalance ** (1 - result.soilWeight) *
      result.soilWaterState ** result.soilWeight *
      result.atmosphericRetention ** parameters.water.vpdExponent *
      result.drySpellRetention ** parameters.water.drySpellExponent;
    expect(result.score).toBeCloseTo(expected, 12);
  });

  it("weights the soil estimator less than the rain estimator", () => {
    const result = waterSuitabilityV2(RAIN_WET_SOIL_DRY, parameters.water)!;
    expect(result.soilWeight).toBeLessThan(0.5);
    expect(result.soilWaterSource).toBe("open-meteo-rew");
  });

  it("returns null when a required input is missing", () => {
    const withoutTexture = { ...RAIN_WET_SOIL_DRY, soilTexture: undefined };
    expect(waterSuitabilityV2(withoutTexture, parameters.water)).toBeNull();
  });

  it("rejects a soil weight outside [0, 1]", () => {
    expect(() =>
      waterSuitabilityV2(RAIN_WET_SOIL_DRY, { ...parameters.water, soilWeight: 1.5 })
    ).toThrow(/within \[0, 1\]/);
  });
});

describe("habitat weighting and calibration", () => {
  it("lets a partly compatible cell reach the upper bands", () => {
    // Under v1 a 30% compatible cell could never exceed a score of 30.
    const perfectConditions = 1;
    const v1Score = 0.3 * perfectConditions * 100;
    const v2Score = habitatWeight(0.3, 0.4) * perfectConditions * 100;
    expect(v1Score).toBe(30);
    expect(opportunityLabel(Math.round(v1Score))).toBe("baixa");
    expect(v2Score).toBeGreaterThan(60);
    expect(opportunityLabel(Math.round(v2Score))).toBe("alta");
  });

  it("keeps zero habitat at zero and full habitat at one", () => {
    expect(habitatWeight(0, 0.4)).toBe(0);
    expect(habitatWeight(1, 0.4)).toBe(1);
  });

  it("is monotone in habitat coverage", () => {
    expect(habitatWeight(0.2, 0.4)).toBeLessThan(habitatWeight(0.5, 0.4));
    expect(habitatWeight(0.5, 0.4)).toBeLessThan(habitatWeight(0.9, 0.4));
  });

  it("rejects an exponent outside (0, 1]", () => {
    expect(() => habitatWeight(0.5, 0)).toThrow(/within \(0, 1\]/);
    expect(() => habitatWeight(0.5, 1.2)).toThrow(/within \(0, 1\]/);
  });

  it("calibrates monotonically and leaves the endpoints fixed", () => {
    expect(calibrate(0, 0.7)).toBe(0);
    expect(calibrate(1, 0.7)).toBe(1);
    expect(calibrate(0.5, 1)).toBeCloseTo(0.5, 12);
    expect(calibrate(0.5, 0.7)).toBeGreaterThan(0.5);
    expect(calibrate(0.3, 0.7)).toBeLessThan(calibrate(0.6, 0.7));
    expect(() => calibrate(0.5, 0)).toThrow(/must be positive/);
  });
});

describe("end-to-end scoring", () => {
  it("scores the diagnosed failure case above zero where v1 returns zero", () => {
    const v1 = calculateSuitability(
      getSpecies("lactarius-deliciosus")!,
      snapshot(RAIN_WET_SOIL_DRY),
    );
    const v2 = calculateSuitability(v2Profile(), snapshot(RAIN_WET_SOIL_DRY));

    expect(v1.opportunityIndex).toBe(0);
    expect(v2.opportunityIndex).toBeGreaterThan(0);
    expect(v2.fruitingConditionsScore).toBeGreaterThan(0);
  });

  it("keeps out-of-season and no-habitat exclusions hard", () => {
    const outOfSeason = calculateSuitability(v2Profile(), {
      ...snapshot(RAIN_WET_SOIL_DRY),
      observedAt: "2026-01-15T12:00:00.000Z",
    });
    expect(outOfSeason.opportunityIndex).toBe(0);

    const noHabitat = calculateSuitability(
      v2Profile(),
      snapshot({ ...RAIN_WET_SOIL_DRY, habitatCoveragePercent: 0 }),
    );
    expect(noHabitat.opportunityIndex).toBe(0);
  });

  it("reports the v2 model version", () => {
    const result = calculateSuitability(v2Profile(), snapshot(RAIN_WET_SOIL_DRY));
    expect(result.modelVersion).toContain("hydrothermal-v2-test");
  });
});
