import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import {
  correctForecastValues,
  type ForecastCorrectionState,
} from "@/src/lib/forecast-correction";
import { calculateSuitability } from "@/src/lib/scoring";
import type { ConditionSnapshot } from "@/src/lib/types";

type Values = ConditionSnapshot["values"];

const current: Values = {
  temperatureMin10dC: 8,
  temperatureAvg10dC: 14,
  temperatureMax10dC: 20,
  frostHours10d: 0,
  relativeHumidityAvg24h: 63,
  soilMoistureAvg24h: 0.171,
  soilMoistureMin7d: 0.168,
  soilMoistureAvg7d: 0.21,
  soilMoistureTrend7d: -0.04,
  rainfall3dMm: 16.2,
  rainfall7dMm: 37.2,
  rainfallPrevious23dMm: 54.2,
  rainfall30dMm: 91.4,
  drySpellDays: 2,
  evapotranspiration3dMm: 12.36,
  evapotranspiration7dMm: 28.43,
  evapotranspiration30dMm: 147.17,
};

const baseline: Values = {
  temperatureMin10dC: 8,
  temperatureAvg10dC: 17,
  temperatureMax10dC: 23,
  frostHours10d: 0,
  relativeHumidityAvg24h: 67.375,
  soilMoistureAvg24h: 0.16475,
  soilMoistureMin7d: 0.155,
  soilMoistureAvg7d: 0.20759,
  soilMoistureTrend7d: -0.05,
  rainfall3dMm: 5.9,
  rainfall7dMm: 21.6,
  rainfallPrevious23dMm: 52.7,
  rainfall30dMm: 74.3,
  drySpellDays: 2,
  evapotranspiration3dMm: 11.69,
  evapotranspiration7dMm: 27.88,
  evapotranspiration30dMm: 131.25,
};

const initialState: ForecastCorrectionState = {
  modelDrySpellDays: 2,
  correctedDrySpellDays: 2,
};

describe("forecast anomaly correction", () => {
  it("maps the model baseline back to the latest observed state", () => {
    const corrected = correctForecastValues(current, baseline, baseline, initialState);

    expect(corrected.unavailableFields).toEqual([]);
    for (const [field, value] of Object.entries(current)) {
      expect(corrected.values[field as keyof Values]).toBeCloseTo(value as number, 10);
    }
    expect(corrected.values.rainfallPrevious23dMm).toBeCloseTo(54.2);
  });

  it("applies forecast change instead of replacing the observed weather history", () => {
    const future: Values = {
      ...baseline,
      relativeHumidityAvg24h: 55.67,
      soilMoistureAvg24h: 0.14854,
      soilMoistureMin7d: 0.146,
      soilMoistureAvg7d: 0.1948,
      rainfall3dMm: 4.3,
      rainfall7dMm: 12.2,
      rainfall30dMm: 74.1,
      evapotranspiration3dMm: 12.26,
      evapotranspiration7dMm: 28.92,
      evapotranspiration30dMm: 130.49,
      drySpellDays: 3,
    };

    const corrected = correctForecastValues(current, baseline, future, initialState);

    expect(corrected.values.rainfall3dMm).toBeCloseTo(14.6);
    expect(corrected.values.rainfall7dMm).toBeCloseTo(27.8);
    expect(corrected.values.rainfall30dMm).toBeCloseTo(91.2);
    expect(corrected.values.rainfallPrevious23dMm).toBeCloseTo(63.4);
    expect(corrected.values.soilMoistureAvg24h).toBeCloseTo(0.15479);
    expect(corrected.values.relativeHumidityAvg24h).toBeCloseTo(51.295);
    expect(corrected.values.drySpellDays).toBe(3);
  });

  it("resets a corrected dry spell when the model path records rain", () => {
    const first = correctForecastValues(
      current,
      baseline,
      { ...baseline, drySpellDays: 4 },
      initialState,
    );
    expect(first.values.drySpellDays).toBe(4);

    const reset = correctForecastValues(
      current,
      baseline,
      { ...baseline, drySpellDays: 0 },
      first.state,
    );
    expect(reset.values.drySpellDays).toBe(0);
  });

  it("preserves partial dry-spell resets for aggregated coarse cells", () => {
    const coarseCurrent = { ...current, drySpellDays: 10 };
    const coarseBaseline = { ...baseline, drySpellDays: 8 };
    const partialReset = correctForecastValues(
      coarseCurrent,
      coarseBaseline,
      { ...baseline, drySpellDays: 4 },
      { modelDrySpellDays: 8, correctedDrySpellDays: 10 },
      { aggregatePointCount: 2 },
    );

    expect(partialReset.values.drySpellDays).toBe(6);
  });

  it("withholds missing required fields and reconciles physical window ordering", () => {
    const incompleteBaseline = { ...baseline, rainfall30dMm: undefined };
    const incomplete = correctForecastValues(
      current,
      incompleteBaseline,
      baseline,
      initialState,
    );
    expect(incomplete.unavailableFields).toContain("rainfall30dMm");
    expect(incomplete.values.rainfall30dMm).toBeUndefined();
    expect(incomplete.values.rainfallPrevious23dMm).toBeUndefined();

    const corrected = correctForecastValues(
      current,
      baseline,
      {
        ...baseline,
        relativeHumidityAvg24h: 200,
        soilMoistureAvg24h: -2,
        rainfall3dMm: 30,
        rainfall7dMm: 20,
        rainfall30dMm: 10,
      },
      initialState,
    );
    expect(corrected.values.relativeHumidityAvg24h).toBe(100);
    expect(corrected.values.soilMoistureAvg24h).toBe(0);
    expect(corrected.values.rainfall7dMm).toBeGreaterThanOrEqual(corrected.values.rainfall3dMm!);
    expect(corrected.values.rainfall30dMm).toBeGreaterThanOrEqual(corrected.values.rainfall7dMm!);
  });

  it("keeps extrema and frost evidence physically consistent", () => {
    const currentWithWindows: Values = {
      ...current,
      temperatureMin24hC: 5,
      temperatureAvg24hC: 10,
      temperatureMax24hC: 15,
      temperatureMin7dC: 5,
      frostHours7d: 0,
      relativeHumidityMin24h: 40,
      relativeHumidityMax24h: 80,
      soilMoistureMin24h: 0.15,
      soilMoistureMax24h: 0.2,
      soilMoistureMax7d: 0.25,
    };
    const baselineWithFrost: Values = {
      ...baseline,
      temperatureMin24hC: -5,
      temperatureAvg24hC: 0,
      temperatureMax24hC: 5,
      temperatureMin7dC: -5,
      frostHours7d: 10,
      temperatureMin10dC: -5,
      frostHours10d: 10,
      relativeHumidityMin24h: 30,
      relativeHumidityMax24h: 90,
      soilMoistureMin24h: 0.1,
      soilMoistureMax24h: 0.3,
      soilMoistureMax7d: 0.35,
    };
    const future = {
      ...baselineWithFrost,
      temperatureAvg24hC: 20,
      temperatureMax24hC: 0,
      frostHours7d: 20,
      frostHours10d: 20,
      relativeHumidityMin24h: 95,
      relativeHumidityAvg24h: 60,
      relativeHumidityMax24h: 20,
      soilMoistureMin24h: 0.4,
      soilMoistureAvg24h: 0.1,
      soilMoistureMax24h: 0.05,
      soilMoistureMin7d: 0.4,
      soilMoistureAvg7d: 0.1,
      soilMoistureMax7d: 0.05,
    } satisfies Values;

    const corrected = correctForecastValues(
      currentWithWindows,
      baselineWithFrost,
      future,
      initialState,
    ).values;

    expect(corrected.temperatureMin24hC).toBeLessThanOrEqual(corrected.temperatureAvg24hC!);
    expect(corrected.temperatureMax24hC).toBeGreaterThanOrEqual(corrected.temperatureAvg24hC!);
    expect(corrected.relativeHumidityMin24h).toBeLessThanOrEqual(corrected.relativeHumidityAvg24h!);
    expect(corrected.relativeHumidityMax24h).toBeGreaterThanOrEqual(corrected.relativeHumidityAvg24h!);
    expect(corrected.soilMoistureMin24h).toBeLessThanOrEqual(corrected.soilMoistureAvg24h!);
    expect(corrected.soilMoistureMax24h).toBeGreaterThanOrEqual(corrected.soilMoistureAvg24h!);
    expect(corrected.soilMoistureMin7d).toBeLessThanOrEqual(corrected.soilMoistureAvg7d!);
    expect(corrected.soilMoistureMax7d).toBeGreaterThanOrEqual(corrected.soilMoistureAvg7d!);
    expect(corrected.temperatureMin10dC).toBeGreaterThan(0);
    expect(corrected.frostHours10d).toBe(0);
    expect(corrected.frostHours7d).toBe(0);
  });

  it("regresses the reported cell across its full calibrated five-day trajectory", () => {
    const exactCurrent: Values = {
      temperatureMin10dC: 9.9,
      temperatureAvg10dC: 15.8183333333333,
      temperatureMax10dC: 23.1,
      frostHours10d: 0,
      relativeHumidityAvg24h: 62.7291666666667,
      soilMoistureAvg24h: 0.171083333333333,
      soilMoistureMin7d: 0.168,
      soilMoistureAvg7d: 0.210488095238095,
      soilMoistureTrend7d: -0.0459722222222223,
      rainfall3dMm: 16.2,
      rainfall7dMm: 37.2,
      rainfallPrevious23dMm: 54.2,
      rainfall30dMm: 91.4,
      drySpellDays: 1,
      evapotranspiration3dMm: 12.36,
      evapotranspiration7dMm: 28.43,
      evapotranspiration30dMm: 147.165,
    };
    const exactBaseline: Values = {
      temperatureMin10dC: 13,
      temperatureAvg10dC: 17.367,
      temperatureMax10dC: 23.3,
      frostHours10d: 0,
      relativeHumidityAvg24h: 67.375,
      soilMoistureAvg24h: 0.16475,
      soilMoistureMin7d: 0.155,
      soilMoistureAvg7d: 0.20759,
      soilMoistureTrend7d: -0.04998,
      rainfall3dMm: 5.9,
      rainfall7dMm: 21.6,
      rainfallPrevious23dMm: 52.7,
      rainfall30dMm: 74.3,
      drySpellDays: 0,
      evapotranspiration3dMm: 11.69,
      evapotranspiration7dMm: 27.88,
      evapotranspiration30dMm: 131.25,
    };
    const exactDayOne: Values = {
      ...exactBaseline,
      temperatureAvg10dC: 17.59625,
      temperatureMax10dC: 24.2,
      relativeHumidityAvg24h: 55.6666666667,
      soilMoistureAvg24h: 0.1485416666667,
      soilMoistureMin7d: 0.146,
      soilMoistureAvg7d: 0.1947976190476,
      soilMoistureTrend7d: -0.0539652777778,
      rainfall3dMm: 4.3,
      rainfall7dMm: 12.2,
      rainfallPrevious23dMm: 61.9,
      rainfall30dMm: 74.1,
      drySpellDays: 1,
      evapotranspiration3dMm: 12.26,
      evapotranspiration7dMm: 28.92,
      evapotranspiration30dMm: 130.49,
    };
    const exactForecasts: Values[] = [
      exactDayOne,
      {
        ...exactBaseline,
        temperatureMin10dC: 13.1,
        temperatureAvg10dC: 17.815,
        temperatureMax10dC: 24.2,
        relativeHumidityAvg24h: 51.1666666667,
        soilMoistureAvg24h: 0.1405416666667,
        soilMoistureMin7d: 0.139,
        soilMoistureAvg7d: 0.1799642857143,
        soilMoistureTrend7d: -0.0459930555556,
        rainfall3dMm: 2.8,
        rainfall7dMm: 9.2,
        rainfallPrevious23dMm: 63.4,
        rainfall30dMm: 72.6,
        drySpellDays: 2,
        evapotranspiration3dMm: 12.95,
        evapotranspiration7dMm: 29.38,
        evapotranspiration30dMm: 129.55,
      },
      {
        ...exactBaseline,
        temperatureMin10dC: 11.9,
        temperatureAvg10dC: 17.7445833333,
        temperatureMax10dC: 24.2,
        relativeHumidityAvg24h: 71.75,
        soilMoistureAvg24h: 0.1572916666667,
        soilMoistureMin7d: 0.135,
        soilMoistureAvg7d: 0.1695297619048,
        soilMoistureTrend7d: -0.0142777777778,
        rainfall3dMm: 4.1,
        rainfall7dMm: 11.2,
        rainfallPrevious23dMm: 62,
        rainfall30dMm: 73.2,
        drySpellDays: 0,
        evapotranspiration3dMm: 12.63,
        evapotranspiration7dMm: 29.01,
        evapotranspiration30dMm: 129.15,
      },
      {
        ...exactBaseline,
        temperatureMin10dC: 11.5,
        temperatureAvg10dC: 17.6195833333,
        temperatureMax10dC: 24.2,
        relativeHumidityAvg24h: 82.75,
        soilMoistureAvg24h: 0.1836666666667,
        soilMoistureMin7d: 0.135,
        soilMoistureAvg7d: 0.1663333333331,
        soilMoistureTrend7d: 0.0202222222222,
        rainfall3dMm: 10.5,
        rainfall7dMm: 16.8,
        rainfallPrevious23dMm: 62,
        rainfall30dMm: 78.8,
        drySpellDays: 0,
        evapotranspiration3dMm: 11.54,
        evapotranspiration7dMm: 27.68,
        evapotranspiration30dMm: 127.35,
      },
      {
        ...exactBaseline,
        temperatureMin10dC: 11.5,
        temperatureAvg10dC: 17.3229166667,
        temperatureMax10dC: 24.2,
        relativeHumidityAvg24h: 83,
        soilMoistureAvg24h: 0.2199583333334,
        soilMoistureMin7d: 0.135,
        soilMoistureAvg7d: 0.1706488095238,
        soilMoistureTrend7d: 0.0575277777778,
        rainfall3dMm: 29.4,
        rainfall7dMm: 34,
        rainfallPrevious23dMm: 62.3,
        rainfall30dMm: 96.3,
        drySpellDays: 0,
        evapotranspiration3dMm: 10.5,
        evapotranspiration7dMm: 27.22,
        evapotranspiration30dMm: 126.26,
      },
    ];
    const habitat = {
      altitudeM: 1882,
      habitatAltitudeSuitability: 76.8493881391788,
      forestCompatibility: 81.7499995231628,
      soilCompatibility: 90,
    };
    const species = getSpecies("boletus-edulis")!;
    const score = (observedAt: string, values: Values) => calculateSuitability(species, {
      regionId: "pirineus",
      observedAt,
      source: [],
      confidence: "moderate",
      stale: false,
      unavailableFields: [],
      values: { ...habitat, ...values },
    });

    const validAts = [14, 15, 16, 17, 18].map((day) =>
      `2026-08-${day}T07:00:00Z`
    );
    let correctionState: ForecastCorrectionState = {
      modelDrySpellDays: 0,
      correctedDrySpellDays: 1,
    };
    const projected = exactForecasts.map((forecast, index) => {
      const correction = correctForecastValues(
        exactCurrent,
        exactBaseline,
        forecast,
        correctionState,
      );
      correctionState = correction.state;
      return score(validAts[index]!, correction.values);
    });

    expect(score("2026-08-13T00:30:00Z", exactCurrent).score).toBe(46);
    expect(projected.map((result) => result.score)).toEqual([43, 39, 45, 51, 55]);
    const dayOne = projected[0]!;
    expect(dayOne.contributions.find((factor) => factor.id === "rainfall")?.score).toBe(35.23);
    expect(dayOne.contributions.find((factor) => factor.id === "soilMoisture")?.score).toBe(17.44);
  });
});
