import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import { normalizeOpenMeteoAt } from "@/supabase/functions/_shared/open-meteo";
import { aggregateEnvironmentRows } from "@/supabase/functions/_shared/environment-aggregation";
import { scoringValues } from "@/supabase/functions/_shared/scoring-values";
import {
  buildThermalExposure, mergeThermalExposure, diagnosticThermalExposureAtElevation,
  validThermalExposure, withoutThermalExposure,
} from "@/supabase/functions/_shared/thermal-exposure";
import { terrainThermalCorrection } from "@/src/lib/hydrothermal-v2";
import { correctForecastValues } from "@/src/lib/forecast-correction";
import { conditionSnapshotSchema } from "@/src/lib/schema";
import { calculateSuitability, missingModelFields } from "@/src/lib/scoring";
import type { ConditionSnapshot } from "@/src/lib/types";

const history = Array.from({ length: 480 }, (_, hour) =>
  // Include both thresholds and nearby values at provider precision.
  [-2, -0.1, 0, 0.1, 10.15, 20, 26.9, 27, 27.1, 30][hour % 10]);
const exposure = buildThermalExposure(history, 1000)!;
const snapshotValues: ConditionSnapshot["values"] = {
  ...diagnosticThermalExposureAtElevation(exposure, 1000),
  weatherElevationM: 1000, altitudeM: 1500, thermalExposure: exposure,
  temperatureAvg7dC: 16, relativeHumidityAvg7d: 80, drySpellDays: 2,
  rainfall7dMm: 20, rainfall14dMm: 40, rainfall21dMm: 60, rainfall26dMm: 80, rainfall30dMm: 90,
  rainfallDays7d: 3, rainfallDays14d: 6, rainfallDays21d: 9, rainfallDays26d: 12, rainfallDays30d: 14,
  evapotranspiration7dMm: 5, evapotranspiration14dMm: 10, evapotranspiration21dMm: 15,
  evapotranspiration26dMm: 20, evapotranspiration30dMm: 25,
  habitatCoveragePercent: 100, habitatAltitudeSuitability: 100,
  soilTexture: "franca", soilMoistureAvg7d: 0.13, soilMoistureMin7d: 0.12,
};

describe("optional diagnostic thermal exposure", () => {
  it.each([-6, -3.25, 0, 2.6, 6])("matches a direct hourly recount for a %s C shift", (delta) => {
    const altitude = 1000 - delta / 0.0065;
    const result = diagnosticThermalExposureAtElevation(exposure, altitude);
    for (const days of [14, 20] as const) {
      const shifted = history.slice(-days * 24).map((value) => value + delta);
      expect(result[`temperatureAvg${days}dC`]).toBeCloseTo(
        shifted.reduce((sum, value) => sum + value, 0) / shifted.length, 10);
      expect(result[`frostHours${days}d`]).toBe(shifted.filter((value) => value <= 0).length);
      expect(result[`heatHours${days}d`]).toBe(shifted.filter((value) => value >= 27).length);
    }
  });

  it("reproduces the synthetic fixed-lapse assumption without claiming real-world accuracy", () => {
    const localHistory = Array.from({ length: 480 }, (_, i) => i % 24 < 8 ? 26 : 14);
    const sourceA = buildThermalExposure(localHistory, 1500)!;
    const sourceB = buildThermalExposure(localHistory.map((t) => t + 3.25), 1000)!;
    expect(diagnosticThermalExposureAtElevation(sourceB, 1000).heatHours20d).toBe(160);
    expect(diagnosticThermalExposureAtElevation(sourceA, 1500).heatHours20d).toBe(0);
    expect(diagnosticThermalExposureAtElevation(sourceB, 1500)).toEqual(diagnosticThermalExposureAtElevation(sourceA, 1500));
  });

  it("corrects each parent source from its own elevation before taking maximum exposure", () => {
    const other = buildThermalExposure(history.map((t) => t + 1.625), 750)!;
    const merged = mergeThermalExposure([exposure, other])!;
    expect(diagnosticThermalExposureAtElevation(merged, 1500)).toEqual(diagnosticThermalExposureAtElevation(exposure, 1500));
    expect(mergeThermalExposure([exposure, undefined])).toBeUndefined();
  });

  it("preserves the weight of repeated weather points while compacting their bins", () => {
    const a = buildThermalExposure(Array(480).fill(20), 1000)!;
    const b = buildThermalExposure(Array(480).fill(30), 1000)!;
    const merged = mergeThermalExposure([a, a, b])!;
    expect(merged).toHaveLength(2);
    expect(diagnosticThermalExposureAtElevation(merged, 1000).temperatureAvg20dC).toBeCloseTo(70 / 3);
    expect(diagnosticThermalExposureAtElevation(merged, 1000).heatHours20d).toBe(480);
  });

  it("rejects incomplete, corrupt and oversized distributions", () => {
    expect(buildThermalExposure(history.slice(1), 1000)).toBeUndefined();
    expect(buildThermalExposure([...history.slice(1), NaN], 1000)).toBeUndefined();
    expect(validThermalExposure([{ ...exposure[0], bins: [[20, 335, 480]] }])).toBe(false);
    expect(validThermalExposure([{ ...exposure[0], bins: [[20, 337, 336], [21, -1, 144]] }])).toBe(false);
    expect(validThermalExposure(Array(129).fill(exposure[0]))).toBe(false);
  });

  it("keeps production scores available and identical with absent or corrupt optional bins", () => {
    const species = getSpecies("boletus-edulis")!;
    const score = (values: ConditionSnapshot["values"]) => calculateSuitability(species, {
      regionId: "pirineus", observedAt: "2026-09-09T12:00:00Z", source: [], confidence: "limited",
      stale: false, unavailableFields: [], values,
    });
    const baseline = withoutThermalExposure(snapshotValues);
    expect(missingModelFields(species, baseline)).toEqual([]);
    expect(score(baseline).fruitingConditionsScore).not.toBeNull();
    expect(score(snapshotValues)).toEqual(score(baseline));
    for (const corrupt of [null, [], [{ version: 1, bins: [] }], "invalid"]) {
      const parsed = conditionSnapshotSchema.shape.values.parse({ ...snapshotValues, thermalExposure: corrupt });
      expect(parsed.thermalExposure).toBeUndefined();
      expect(score(parsed)).toEqual(score(baseline));
    }
    const corrected = { ...snapshotValues, ...terrainThermalCorrection(snapshotValues) };
    expect(corrected.temperatureAvg20dC).toBeCloseTo(snapshotValues.temperatureAvg20dC! - 3.25);
    expect(corrected.heatHours20d).toBe(snapshotValues.heatHours20d);
    expect(corrected.frostHours20d).toBe(snapshotValues.frostHours20d);
  });

  it("omits diagnostic bins from public detail without changing any scoring values", () => {
    const { thermalExposure: omitted, ...expected } = snapshotValues;
    expect(omitted).toBeDefined();
    expect(withoutThermalExposure(snapshotValues)).toEqual(expected);
    expect(snapshotValues.thermalExposure).toBe(exposure);
    expect(withoutThermalExposure(expected)).toEqual(expected);
  });

  it("retains normalized diagnostic evidence while keeping the scoring projection compact", () => {
    const target = Date.parse("2026-09-09T12:00:00Z") / 1000;
    const location = { elevation: 1000, hourly: {
      time: Array.from({ length: 480 }, (_, i) => target - (479 - i) * 3600),
      temperature_2m: history,
    } };
    const normalized = normalizeOpenMeteoAt(location, new Date(target * 1000).toISOString(), "atmosphere");
    const parsed = conditionSnapshotSchema.shape.values.parse(normalized.values);
    expect(parsed.thermalExposure).toEqual(exposure);
    expect(scoringValues(parsed).thermalExposure).toBeUndefined();
    expect(scoringValues(parsed).heatHours20d).toBe(parsed.heatHours20d);
    const broken = { ...location, hourly: { ...location.hourly, time: [...location.hourly.time] } };
    broken.hourly.time[200] = broken.hourly.time[199];
    expect(normalizeOpenMeteoAt(broken, new Date(target * 1000).toISOString(), "atmosphere")
      .values.thermalExposure).toBeUndefined();
  });

  it("retains complete atmosphere distributions when a separate soil row is merged", () => {
    const row = { observed_at: "2026-09-09T12:00:00Z", sources: [], source_resolution_m: 2500,
      confidence: "moderate" as const, unavailable_fields: [], values: snapshotValues };
    expect(aggregateEnvironmentRows([row, { ...row, values: { soilMoisture: 0.2 } }])
      .values.thermalExposure).toEqual(exposure);
    expect(aggregateEnvironmentRows([row, { ...row, values: { temperatureAvg20dC: 12 } }])
      .values.thermalExposure).toBeUndefined();
  });

  it("keeps forecast correction identical and does not carry observed bins into future dates", () => {
    const forecastExposure = buildThermalExposure(history.map((t) => t + 3.25), 500)!;
    const baseline = { ...snapshotValues, ...diagnosticThermalExposureAtElevation(forecastExposure, 500),
      thermalExposure: forecastExposure, weatherElevationM: 500 };
    const target = { ...baseline, temperatureAvg20dC: baseline.temperatureAvg20dC + 1 };
    const state = { modelDrySpellDays: 2, correctedDrySpellDays: 2 };
    const result = correctForecastValues(snapshotValues, baseline, target, state);
    const legacy = correctForecastValues(withoutThermalExposure(snapshotValues),
      withoutThermalExposure(baseline), withoutThermalExposure(target), state);
    expect(result).toEqual(legacy);
    expect(result.values.thermalExposure).toBeUndefined();
    expect(result.values.heatHours20d).toBe(snapshotValues.heatHours20d);
    expect(result.values.temperatureAvg20dC).toBeCloseTo(snapshotValues.temperatureAvg20dC! + 1);
  });
});
