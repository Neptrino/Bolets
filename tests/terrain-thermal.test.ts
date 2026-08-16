import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import { calculateSuitability } from "@/src/lib/scoring";
import {
  compareTerrainThermalSuitability,
  TERRAIN_THERMAL_PROVIDER_MODEL,
  TERRAIN_THERMAL_SOURCE_RESOLUTION_M,
  TERRAIN_THERMAL_WEATHER_MODEL,
  type TerrainThermalObservation,
  type TerrainThermalReplayPair,
} from "@/src/lib/terrain-thermal";
import type { ConditionSnapshot } from "@/src/lib/types";

const observedAt = "2026-08-15T01:00:00.000Z";

const baselineValues: ConditionSnapshot["values"] = {
  weatherObservedAt: observedAt,
  weatherModel: TERRAIN_THERMAL_WEATHER_MODEL,
  atmosphericResolutionM: TERRAIN_THERMAL_SOURCE_RESOLUTION_M,
  soilMoistureResolutionM: 9000,
  weatherGridLatitude: 42.3,
  weatherGridLongitude: 2.35,
  weatherElevationM: 1100,
  altitudeM: 1400,
  habitatCoveragePercent: 80,
  habitatAltitudeSuitability: 100,
  soilTexture: "Franca",
  soilMoistureAvg7d: 0.24,
  soilMoistureMin7d: 0.22,
  temperatureAvg7dC: 21,
  relativeHumidityAvg7d: 74,
  drySpellDays: 2,
  rainfall21dMm: 42,
  rainfallDays21d: 6,
  evapotranspiration21dMm: 38,
  // Matured rain: the trailing week is subtracted from the window.
  rainfall7dMm: 0,
  rainfallDays7d: 0,
  evapotranspiration7dMm: 0,
  temperatureAvg14dC: 23,
  temperatureAvg20dC: 23,
  frostHours14d: 0,
  frostHours20d: 0,
  heatHours14d: 90,
  heatHours20d: 120,
};

const localThermalValues: TerrainThermalObservation["values"] = {
  temperatureAvg14dC: 20,
  temperatureAvg20dC: 20,
  frostHours14d: 0,
  frostHours20d: 0,
  heatHours14d: 20,
  heatHours20d: 30,
};

function snapshot(
  values: ConditionSnapshot["values"] = baselineValues,
  overrides: Partial<Omit<ConditionSnapshot, "values">> = {},
): ConditionSnapshot {
  return {
    regionId: "pirineus",
    observedAt,
    source: ["Météo-France AROME", "Open-Meteo soil moisture"],
    confidence: "moderate",
    stale: false,
    unavailableFields: [],
    ...overrides,
    values,
  };
}

function observation(
  elevationM: number,
  values: TerrainThermalObservation["values"],
  overrides: Partial<TerrainThermalObservation> = {},
): TerrainThermalObservation {
  return {
    observedAt,
    providerModel: TERRAIN_THERMAL_PROVIDER_MODEL,
    weatherGridLatitude: 42.3,
    weatherGridLongitude: 2.35,
    requestedElevationM: elevationM,
    returnedElevationM: elevationM,
    sourceResolutionM: TERRAIN_THERMAL_SOURCE_RESOLUTION_M,
    values,
    ...overrides,
  };
}

function replayPair(
  localOverrides: Partial<TerrainThermalObservation> = {},
  representativeOverrides: Partial<TerrainThermalObservation> = {},
): TerrainThermalReplayPair {
  return {
    representative: observation(1100, baselineValues, representativeOverrides),
    local: observation(1400, localThermalValues, localOverrides),
  };
}

describe("terrain thermal sensitivity comparison", () => {
  it("changes only thermal scoring while leaving production and water scores intact", () => {
    const species = getSpecies("suillus-luteus")!;
    const baselineSnapshot = snapshot();
    const productionResult = calculateSuitability(species, baselineSnapshot);
    const comparison = compareTerrainThermalSuitability(
      species,
      baselineSnapshot,
      replayPair(),
    );

    expect(comparison.status).toBe("available");
    if (comparison.status !== "available") return;

    expect(comparison.baseline).toEqual(productionResult);
    expect(comparison.terrainAdjusted.modelVersion).toContain(
      "terrain-thermal-sensitivity-v1",
    );
    expect(comparison.confidence).toBe("limited");
    expect(comparison.elevationDeltaM).toBe(300);
    expect(comparison.atmosphericResolutionM).toBe(2500);
    expect(comparison.soilMoistureResolutionM).toBe(9000);
    expect(comparison.terrainAdjusted.opportunityIndex).toBeGreaterThan(
      comparison.baseline.opportunityIndex!,
    );

    const waterScore = (result: typeof productionResult) =>
      result.components.find((component) => component.id === "water")?.score;
    expect(waterScore(comparison.terrainAdjusted)).toBe(waterScore(comparison.baseline));
    expect(comparison.representativeThermalValues.temperatureAvg20dC).toBe(23);
    expect(comparison.terrainThermalValues.temperatureAvg20dC).toBe(20);
    expect(comparison.changedFields.find((change) => change.field === "heatHours20d"))
      .toMatchObject({
        baseline: 120,
        representativeReplay: 120,
        terrainAdjusted: 30,
        delta: -90,
      });
    expect(baselineSnapshot.values).toEqual(baselineValues);
  });

  it("requires a paired control that reproduces the stored thermal baseline", () => {
    const species = getSpecies("suillus-luteus")!;
    const revisedControl = {
      ...baselineValues,
      heatHours20d: 119,
    };

    expect(compareTerrainThermalSuitability(
      species,
      snapshot(),
      replayPair({}, { values: revisedControl }),
    )).toMatchObject({
      status: "unavailable",
      reason: "baseline-replay-mismatch",
    });
  });

  it("withholds when required baseline evidence or scoring inputs are unavailable", () => {
    const species = getSpecies("suillus-luteus")!;
    const withoutElevation = { ...baselineValues };
    delete withoutElevation.weatherElevationM;
    // Soil inputs stopped being load-bearing when the soil estimator weight
    // reached zero, so incompleteness is simulated on a rain window instead.
    const withoutWater = { ...baselineValues };
    delete withoutWater.drySpellDays;

    expect(compareTerrainThermalSuitability(
      species,
      snapshot(withoutElevation),
      replayPair(),
    )).toMatchObject({
      status: "unavailable",
      reason: "missing-baseline-metadata",
    });
    expect(compareTerrainThermalSuitability(
      species,
      snapshot(baselineValues, { unavailableFields: ["heatHours20d"] }),
      replayPair(),
    )).toMatchObject({
      status: "unavailable",
      reason: "incomplete-baseline-thermal-values",
    });
    expect(compareTerrainThermalSuitability(
      species,
      snapshot(withoutWater),
      replayPair(),
    )).toMatchObject({
      status: "unavailable",
      reason: "incomplete-baseline-score",
    });
  });

  it("maps a quarter-hour baseline to its exact hourly thermal sample", () => {
    const species = getSpecies("suillus-luteus")!;
    const quarterHourBaseline = {
      ...baselineValues,
      weatherObservedAt: "2026-08-15T01:15:00.000Z",
    };

    expect(compareTerrainThermalSuitability(
      species,
      snapshot(quarterHourBaseline),
      replayPair({ observedAt: "2026-08-15T01:00:00Z" }),
    ).status).toBe("available");

    for (const mismatchedPair of [
      replayPair({ observedAt: "2026-08-15T01:00:00.001Z" }),
      replayPair({}, { observedAt: "2026-08-15T02:00:00.000Z" }),
    ]) {
      expect(compareTerrainThermalSuitability(
        species,
        snapshot(quarterHourBaseline),
        mismatchedPair,
      )).toMatchObject({
        status: "unavailable",
        reason: "observation-time-mismatch",
      });
    }
  });

  it("rejects a replay from a different grid, model, resolution, or elevation", () => {
    const species = getSpecies("suillus-luteus")!;
    const cases: Array<[Partial<TerrainThermalObservation>, string]> = [
      [{ sourceResolutionM: 1300 }, "source-resolution-mismatch"],
      [{ providerModel: "ecmwf_ifs" }, "weather-model-mismatch"],
      [{ weatherGridLongitude: 2.36 }, "weather-grid-mismatch"],
      [{ requestedElevationM: 1300 }, "local-elevation-mismatch"],
      [{ returnedElevationM: 1300 }, "returned-elevation-mismatch"],
    ];

    for (const [overrides, reason] of cases) {
      expect(compareTerrainThermalSuitability(
        species,
        snapshot(),
        replayPair(overrides),
      )).toMatchObject({ status: "unavailable", reason });
    }
  });

  it("rejects incomplete, negative, or oversized thermal exposure counts", () => {
    const species = getSpecies("suillus-luteus")!;
    const missing = { ...localThermalValues };
    delete missing.heatHours20d;
    const invalidValues = [
      missing,
      { ...localThermalValues, heatHours20d: -1 },
      { ...localThermalValues, heatHours14d: 337 },
      { ...localThermalValues, frostHours20d: 400, heatHours20d: 100 },
    ];

    for (const values of invalidValues) {
      expect(compareTerrainThermalSuitability(
        species,
        snapshot(),
        replayPair({ values }),
      )).toMatchObject({
        status: "unavailable",
        reason: "incomplete-replay-thermal-values",
      });
    }
  });

  it("withholds the shadow method for habitat-only species", () => {
    const species = getSpecies("tuber-melanosporum")!;
    expect(compareTerrainThermalSuitability(
      species,
      snapshot(),
      replayPair(),
    )).toMatchObject({
      status: "unavailable",
      reason: "unsupported-species-model",
    });
  });
});
