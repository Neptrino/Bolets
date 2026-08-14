import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import {
  correctForecastValues,
  type ForecastCorrectionState,
} from "@/src/lib/forecast-correction";
import { calculateSuitability } from "@/src/lib/scoring";
import type { ConditionSnapshot } from "@/src/lib/types";

type Values = ConditionSnapshot["values"];

const requiredHydrothermalFields = [
  "temperatureAvg7dC",
  "temperatureAvg14dC",
  "temperatureAvg20dC",
  "frostHours14d",
  "heatHours14d",
  "frostHours20d",
  "heatHours20d",
  "relativeHumidityAvg7d",
  "soilMoistureMin7d",
  "soilMoistureAvg7d",
  "rainfall14dMm",
  "rainfallDays14d",
  "rainfall21dMm",
  "rainfallDays21d",
  "rainfall26dMm",
  "rainfallDays26d",
  "drySpellDays",
  "evapotranspiration14dMm",
  "evapotranspiration21dMm",
  "evapotranspiration26dMm",
] as const satisfies readonly (keyof Values)[];

const current: Values = {
  temperatureAvg7dC: 13,
  temperatureAvg14dC: 13.2,
  temperatureAvg20dC: 13.5,
  frostHours14d: 1,
  heatHours14d: 2,
  frostHours20d: 2,
  heatHours20d: 3,
  relativeHumidityAvg7d: 90,
  soilMoistureMin7d: 0.225,
  soilMoistureAvg7d: 0.24,
  soilMoistureMax7d: 0.27,
  rainfall3dMm: 12,
  rainfall7dMm: 24,
  rainfallDays7d: 3,
  rainfall14dMm: 35,
  rainfallDays14d: 4,
  rainfall21dMm: 44,
  rainfallDays21d: 5,
  rainfall26dMm: 50,
  rainfallDays26d: 6,
  rainfall30dMm: 55,
  rainfallDays30d: 7,
  rainfallPrevious23dMm: 31,
  drySpellDays: 1,
  evapotranspiration3dMm: 2,
  evapotranspiration7dMm: 4,
  evapotranspiration14dMm: 8,
  evapotranspiration21dMm: 12,
  evapotranspiration26dMm: 15,
  evapotranspiration30dMm: 17,
  habitatCoveragePercent: 80,
  habitatAltitudeSuitability: 75,
  soilTexture: "Franca",
};

const baseline: Values = {
  temperatureAvg7dC: 14,
  temperatureAvg14dC: 14.5,
  temperatureAvg20dC: 15,
  frostHours14d: 2,
  heatHours14d: 3,
  frostHours20d: 4,
  heatHours20d: 5,
  relativeHumidityAvg7d: 85,
  soilMoistureMin7d: 0.2,
  soilMoistureAvg7d: 0.22,
  soilMoistureMax7d: 0.25,
  rainfall3dMm: 8,
  rainfall7dMm: 18,
  rainfallDays7d: 2,
  rainfall14dMm: 30,
  rainfallDays14d: 3,
  rainfall21dMm: 35,
  rainfallDays21d: 4,
  rainfall26dMm: 40,
  rainfallDays26d: 5,
  rainfall30dMm: 50,
  rainfallDays30d: 6,
  drySpellDays: 2,
  evapotranspiration3dMm: 3,
  evapotranspiration7dMm: 6,
  evapotranspiration14dMm: 10,
  evapotranspiration21dMm: 14,
  evapotranspiration26dMm: 18,
  evapotranspiration30dMm: 21,
};

const initialState: ForecastCorrectionState = {
  modelDrySpellDays: 2,
  correctedDrySpellDays: 1,
};

function suitability(values: Values, unavailableFields: string[] = []) {
  const species = getSpecies("boletus-edulis")!;
  return calculateSuitability(species, {
    regionId: "pirineus",
    observedAt: "2026-10-14T22:00:00.000Z",
    source: ["test"],
    confidence: "moderate",
    stale: false,
    unavailableFields,
    values,
  });
}

describe("forecast anomaly correction", () => {
  it("maps the model baseline to the observed hydrothermal state", () => {
    const corrected = correctForecastValues(current, baseline, baseline, initialState);

    expect(corrected.unavailableFields).toEqual([]);
    for (const field of requiredHydrothermalFields) {
      expect(corrected.values[field]).toBeCloseTo(current[field]!, 10);
    }
    expect(corrected.values).toMatchObject({
      habitatCoveragePercent: 80,
      habitatAltitudeSuitability: 75,
      soilTexture: "Franca",
    });
    expect(corrected.values.rainfallPrevious23dMm).toBe(31);
  });

  it("applies forecast deltas across every hydrothermal response family", () => {
    const future: Values = {
      ...baseline,
      temperatureAvg7dC: 10,
      temperatureAvg14dC: 11.5,
      temperatureAvg20dC: 12,
      frostHours14d: 4,
      heatHours14d: 1,
      frostHours20d: 8,
      heatHours20d: 2,
      relativeHumidityAvg7d: 70,
      soilMoistureMin7d: 0.17,
      soilMoistureAvg7d: 0.18,
      rainfall14dMm: 36,
      rainfallDays14d: 5,
      rainfall21dMm: 45,
      rainfallDays21d: 6,
      rainfall26dMm: 65,
      rainfallDays26d: 8,
      evapotranspiration14dMm: 12,
      evapotranspiration21dMm: 18,
      evapotranspiration26dMm: 24,
      drySpellDays: 3,
    };

    const corrected = correctForecastValues(current, baseline, future, initialState);

    expect(corrected.values).toMatchObject({
      temperatureAvg7dC: 9,
      temperatureAvg14dC: 10.2,
      temperatureAvg20dC: 10.5,
      frostHours14d: 3,
      heatHours14d: 0,
      frostHours20d: 6,
      heatHours20d: 0,
      relativeHumidityAvg7d: 75,
      rainfall14dMm: 41,
      rainfallDays14d: 6,
      rainfall21dMm: 54,
      rainfallDays21d: 7,
      rainfall26dMm: 75,
      rainfallDays26d: 9,
      evapotranspiration14dMm: 10,
      evapotranspiration21dMm: 16,
      evapotranspiration26dMm: 21,
      drySpellDays: 2,
    });
    expect(corrected.values.soilMoistureMin7d).toBeCloseTo(0.195);
    expect(corrected.values.soilMoistureAvg7d).toBeCloseTo(0.2);
    expect(corrected.unavailableFields).toEqual([]);
  });

  it("keeps exact and aggregate dry-spell paths distinct", () => {
    const first = correctForecastValues(
      current,
      baseline,
      { ...baseline, drySpellDays: 4 },
      initialState,
    );
    expect(first.values.drySpellDays).toBe(3);

    const reset = correctForecastValues(
      current,
      baseline,
      { ...baseline, drySpellDays: 0 },
      first.state,
    );
    expect(reset.values.drySpellDays).toBe(0);

    const aggregate = correctForecastValues(
      { ...current, drySpellDays: 10, rainfallDays14d: 4.25 },
      { ...baseline, drySpellDays: 8, rainfallDays14d: 3.5 },
      { ...baseline, drySpellDays: 4, rainfallDays14d: 3 },
      { modelDrySpellDays: 8, correctedDrySpellDays: 10 },
      { aggregatePointCount: 4 },
    );
    expect(aggregate.values.drySpellDays).toBe(6);
    expect(aggregate.values.rainfallDays14d).toBe(3.75);
  });

  it("reports a missing model window and withholds F and O", () => {
    const correction = correctForecastValues(
      current,
      { ...baseline, rainfall26dMm: undefined },
      baseline,
      initialState,
    );
    const result = suitability(correction.values, correction.unavailableFields);

    expect(correction.unavailableFields).toContain("rainfall26dMm");
    expect(correction.values.rainfall26dMm).toBeUndefined();
    expect(result.fruitingConditionsScore).toBeNull();
    expect(result.opportunityIndex).toBeNull();
  });

  it("reconciles nested totals and bounded exposure memories", () => {
    const corrected = correctForecastValues(current, baseline, {
      ...baseline,
      rainfall14dMm: 100,
      rainfall21dMm: 0,
      rainfall26dMm: 0,
      rainfall30dMm: 0,
      rainfallDays14d: 99,
      rainfallDays21d: 0,
      rainfallDays26d: 0,
      rainfallDays30d: 0,
      evapotranspiration14dMm: 100,
      evapotranspiration21dMm: 0,
      evapotranspiration26dMm: 0,
      evapotranspiration30dMm: 0,
      frostHours14d: 500,
      frostHours20d: 0,
      heatHours14d: 500,
      heatHours20d: 0,
    }, initialState).values;

    expect(corrected.rainfall21dMm).toBeGreaterThanOrEqual(corrected.rainfall14dMm!);
    expect(corrected.rainfall26dMm).toBeGreaterThanOrEqual(corrected.rainfall21dMm!);
    expect(corrected.rainfall30dMm).toBeGreaterThanOrEqual(corrected.rainfall26dMm!);
    expect(corrected.rainfallDays14d).toBe(14);
    expect(corrected.rainfallDays21d).toBeGreaterThanOrEqual(corrected.rainfallDays14d!);
    expect(corrected.evapotranspiration26dMm)
      .toBeGreaterThanOrEqual(corrected.evapotranspiration21dMm!);
    expect(corrected.frostHours14d).toBe(336);
    expect(corrected.frostHours20d).toBe(336);
    expect(corrected.heatHours14d).toBe(336);
    expect(corrected.heatHours20d).toBe(336);
  });

  it("carries corrected conditions into the hydrothermal F and O indices", () => {
    const observed = suitability(current);
    const correction = correctForecastValues(current, baseline, {
      ...baseline,
      temperatureAvg20dC: 26,
      heatHours20d: 100,
      relativeHumidityAvg7d: 40,
      soilMoistureMin7d: 0.1,
      soilMoistureAvg7d: 0.11,
      rainfall26dMm: 10,
      rainfallDays26d: 1,
      evapotranspiration26dMm: 35,
      drySpellDays: 8,
    }, initialState);
    const projected = suitability(correction.values, correction.unavailableFields);

    expect(observed.fruitingConditionsScore).toBeGreaterThan(0);
    expect(observed.opportunityIndex).toBeGreaterThan(0);
    expect(observed.opportunityIndex).toBeLessThan(observed.fruitingConditionsScore!);
    expect(projected.fruitingConditionsScore).not.toBeNull();
    expect(projected.fruitingConditionsScore)
      .toBeLessThan(observed.fruitingConditionsScore!);
    expect(projected.opportunityIndex).toBeLessThan(observed.opportunityIndex!);
    expect(projected.score).toBe(projected.opportunityIndex);
  });
});
