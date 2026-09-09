import { expect, it } from "vitest";
import { heatDegreeHours, heatDegreeHoursFromTemperatures } from "@/supabase/functions/_shared/heat-intensity";
import { buildThermalExposure } from "@/supabase/functions/_shared/thermal-exposure";
import { thermalAggregates } from "@/supabase/functions/_shared/station-temperature-scoring";
import { extremeTemperatureMultiplier } from "@/src/lib/hydrothermal";
import { scoringValues } from "@/supabase/functions/_shared/scoring-values";
import { aggregateEnvironmentRows } from "@/supabase/functions/_shared/environment-aggregation";
import { correctForecastValues } from "@/src/lib/forecast-correction";
import type { TemperatureModelParameters } from "@/src/lib/types";

const config: TemperatureModelParameters = { windowDays: 20, optimumC: 15, coldHalfWidthC: 5,
  warmHalfWidthC: 5, frostHalfLifeHours: 32, heatHalfLifeHours: 12, heatIntensityWidthC: 6 };
const values = (temperature: number) => {
  const series = [...Array<number>(479).fill(20), temperature];
  return { ...thermalAggregates(series), ...heatDegreeHoursFromTemperatures(series) };
};
it("weights one 33 C hour six times one 28 C hour and retains frost", () => {
  expect(extremeTemperatureMultiplier(values(33), config)).toBeCloseTo(2 ** (-1 / 12));
  expect(extremeTemperatureMultiplier(values(28), config)).toBeCloseTo(2 ** (-1 / 72));
  expect(extremeTemperatureMultiplier({ ...values(33), frostHours20d: 32 }, config)).toBeCloseTo(0.5 * 2 ** (-1 / 12));
  expect(extremeTemperatureMultiplier(values(27), config)).toBe(1);
});
it("retains count-based scoring for missing or invalid optional intensity and v1", () => {
  const old = thermalAggregates([...Array<number>(479).fill(20), 28]);
  const expected = 2 ** (-1 / 12);
  expect(extremeTemperatureMultiplier(old, config)).toBeCloseTo(expected);
  expect(extremeTemperatureMultiplier({ ...old, heatDegreeHours14d: NaN, heatDegreeHours20d: 5 }, config)).toBeCloseTo(expected);
  expect(extremeTemperatureMultiplier(values(28), { ...config, heatIntensityWidthC: undefined })).toBeCloseTo(expected);
  expect(heatDegreeHoursFromTemperatures([33])).toBeUndefined();
});
it("recovers raw intensity from controlled bins without applying an hourly lapse", () => {
  const series = [...Array<number>(479).fill(20), 33];
  const raw = { ...thermalAggregates(series), thermalExposure: buildThermalExposure(series, 1000), altitudeM: 2000 };
  expect(heatDegreeHours(raw)).toEqual({ heatDegreeHours14d: 6, heatDegreeHours20d: 6 });
  expect(scoringValues(raw).heatDegreeHours20d).toBe(6);
  expect(scoringValues(raw).thermalExposure).toBeUndefined();
  expect(heatDegreeHours({ ...raw, thermalReferenceElevationM: 2000 })).toBeUndefined();
  expect(heatDegreeHours({ ...raw, heatHours20d: 2 })).toBeUndefined();
});
it("does not aggregate incomplete intensity as though every source contributed", () => {
  const row = { observed_at: "2026-09-09T12:00:00Z", sources: [], source_resolution_m: 2500,
    confidence: "moderate" as const, unavailable_fields: [], values: values(33) };
  expect(aggregateEnvironmentRows([row, { ...row, values: values(28) }]).values.heatDegreeHours20d).toBe(6);
  const missing = { ...row, values: { temperatureAvg20dC: 20 } };
  expect(aggregateEnvironmentRows([row, missing]).values.heatDegreeHours20d).toBeUndefined();
});

it("carries fractional forecast intensity only when current, baseline and forecast support it", () => {
  const state = { modelDrySpellDays: 0, correctedDrySpellDays: 0 };
  const current = { ...values(28), heatDegreeHours14d: 60, heatDegreeHours20d: 120 };
  const baseline = { ...values(28), heatDegreeHours14d: 40, heatDegreeHours20d: 80 };
  const future = { ...values(28), heatDegreeHours14d: 46.5, heatDegreeHours20d: 92.5 };
  const corrected = correctForecastValues(current, baseline, future, state);
  expect(corrected.values.heatDegreeHours14d).toBe(66.5);
  expect(corrected.values.heatDegreeHours20d).toBe(132.5);
  const unsupported = correctForecastValues(current, { ...baseline, heatDegreeHours14d: undefined, heatDegreeHours20d: undefined }, future, state);
  expect(unsupported.values.heatDegreeHours14d).toBeUndefined();
  expect(unsupported.values.heatDegreeHours20d).toBeUndefined();
  expect(unsupported.unavailableFields).not.toContain("heatDegreeHours20d");
});
