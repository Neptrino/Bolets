import { describe, expect, it } from "vitest";
import { createStationTemperatureScorer, mergeThermalSources, thermalAggregates, type StationTemperatureWindow, type ThermalModelWindow } from "@/supabase/functions/_shared/station-temperature-scoring";
import { STATION_TEMPERATURE_VERSION } from "@/supabase/functions/_shared/station-temperature-field";
import { terrainThermalCorrection } from "@/src/lib/hydrothermal-v2";
import { correctForecastValues } from "@/src/lib/forecast-correction";

const id = "a".repeat(64), endAt = Date.parse("2026-09-09T00:00:00Z"), HOUR = 3_600_000;
const model: ThermalModelWindow = { version: STATION_TEMPERATURE_VERSION, endAt,
  latitude: 42.3, longitude: 2.2, elevationM: 1000, stationWindowId: "stations", temperaturesC: Array(480).fill(28) };
const window: StationTemperatureWindow = { version: STATION_TEMPERATURE_VERSION, endAt,
  stations: ["CG", "DG"].map((station_code, i) => ({ station_code, station_name: station_code, latitude: 42.3 + i * 0.01, longitude: 2.2, altitude_m: 1200 })),
  hours: ["CG", "DG"].flatMap((stationCode) => Array.from({ length: 481 }, (_, i) => ({ stationCode, hour: endAt - (480 - i) * HOUR, temperatureC: 20, validation: "provisional" as const }))),
};
const values = { ...thermalAggregates(model.temperaturesC), altitudeM: 1200, weatherElevationM: 1000,
  weatherGridLatitude: 42.3, weatherGridLongitude: 2.2, weatherObservedAt: new Date(endAt).toISOString(),
  weatherModel: "Météo-France AROME France", atmosphericResolutionM: 2500, temperatureAvg7dC: 23,
  thermalSources: [{ id }], rainfall7dMm: 42, soilMoisture: 0.1 };
const score = (w = window, m = model) => createStationTemperatureScorer(new Map([[id, m]]), new Map([["stations", w]]));

describe("published station/model temperature blend", () => {
  it("uses provisional complete hours, recounts after blending, and avoids a second lapse correction", () => {
    const result = score()(values, 42.3, 2.2);
    expect(result.temperatureAvg20dC).toBeCloseTo(23.35);
    expect(result.heatHours20d).toBe(0);
    expect(result.temperatureQuality).toBe("includes-provisional");
    expect(result.weatherElevationM).toBe(1000);
    expect(result.thermalReferenceElevationM).toBe(1200);
    expect(result.temperatureAvg7dC).toBe(23);
    expect(result.rainfall7dMm).toBe(42);
    expect(result.soilMoisture).toBe(0.1);
    expect(terrainThermalCorrection(result)).toEqual({});
    expect(score()(result, 42.3, 2.2)).toBe(result);
  });
  it("preserves exact baseline for one missing bracketing hour, even in a 14-day species window", () => {
    const missing = { ...window, hours: window.hours.slice(1) };
    expect(score(missing)(values, 42.3, 2.2)).toBe(values);
  });
  it("preserves exact baseline on absent, stale-reference or conflicting optional evidence", () => {
    expect(createStationTemperatureScorer(new Map(), new Map())(values, 42.3, 2.2)).toBe(values);
    for (const change of [{ endAt: endAt - HOUR }, { elevationM: 900 }, { temperaturesC: Array(480).fill(26) }]) {
      expect(score(window, { ...model, ...change })(values, 42.3, 2.2)).toBe(values);
    }
    const conflict = { ...window, hours: [...window.hours, { ...window.hours[0], temperatureC: 10 }] };
    expect(score(conflict)(values, 42.3, 2.2)).toBe(values);
  });
  it("does not expand the evaluated station pool or geographic support", () => {
    const unknown = { ...window, stations: window.stations.map((s) => ({ ...s, station_code: "ZZ" })) };
    expect(score(unknown)(values, 42.3, 2.2)).toBe(values);
    expect(score()(values, 41.0, 2.2)).toBe(values);
  });
  it("requires every atmospheric source and preserves multiplicity", () => {
    expect(mergeThermalSources([[{ id }], [{ id, weight: 2 }]])).toEqual([{ id, weight: 3 }]);
    expect(mergeThermalSources([[{ id }], undefined])).toBeUndefined();
    expect(mergeThermalSources([])).toBeUndefined();
  });
  it("keeps forecasts at the blended reference elevation while carrying model changes", () => {
    const current = score()(values, 42.3, 2.2);
    const next = correctForecastValues(current, { ...values, drySpellDays: 1 }, { ...values, temperatureAvg20dC: 29, drySpellDays: 2 },
      { modelDrySpellDays: 1, correctedDrySpellDays: 1 });
    expect(next.values.temperatureAvg20dC).toBeCloseTo(24.35);
    expect(next.values.thermalReferenceElevationM).toBe(1200);
    expect(terrainThermalCorrection(next.values)).toEqual({});
  });
});
