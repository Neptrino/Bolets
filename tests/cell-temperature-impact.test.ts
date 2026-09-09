import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import type { ConditionSnapshot } from "@/src/lib/types";
import { compareCellTemperature, compareCellObservedTemperature, intervalBiasAtInstant } from "@/scripts/lib/cell-temperature-impact";
import { providerAccountingConfig } from "@/scripts/lib/provider-accounting";
import { blendStationModelTemperature, modelTemperatureAtElevation } from "@/scripts/lib/station-temperature-blend";

const time = Date.parse("2026-09-09T00:00:00Z");
const species = getSpecies("boletus-edulis")!;
function fixture() {
  const snapshot: ConditionSnapshot = {
    observedAt: new Date(time).toISOString(), regionId: "pirineus", stale: false,
    source: ["test"], confidence: "limited", unavailableFields: [],
    values: {
      weatherObservedAt: new Date(time).toISOString(), weatherModel: "Météo-France AROME France",
      atmosphericResolutionM: 2500, weatherGridLatitude: 42.3, weatherGridLongitude: 2.2,
      weatherElevationM: 1500, altitudeM: 1900, habitatCoveragePercent: 100, habitatAltitudeSuitability: 75,
      temperatureAvg14dC: 26.5, temperatureAvg20dC: 26.5,
      heatHours14d: 0, heatHours20d: 0, frostHours14d: 0, frostHours20d: 0,
      soilTexture: "Franca", soilMoistureAvg7d: 0.24, soilMoistureMin7d: 0.22,
      temperatureAvg7dC: 21, relativeHumidityAvg7d: 74, drySpellDays: 2,
      rainfall7dMm: 0, rainfallDays7d: 0, evapotranspiration7dMm: 0,
      rainfall14dMm: 20, rainfallDays14d: 3, evapotranspiration14dMm: 19,
      rainfall21dMm: 42, rainfallDays21d: 6, evapotranspiration21dMm: 38,
      rainfall26dMm: 42, rainfallDays26d: 6, evapotranspiration26dMm: 38,
      rainfall30dMm: 42, rainfallDays30d: 6, evapotranspiration30dMm: 38,
    },
  };
  const source = { latitude: 42.3, longitude: 2.2, elevationM: 1500,
    hours: new Map(Array.from({ length: 480 }, (_, i) => [time - i * 3_600_000, 26.5])) };
  return { snapshot, source };
}

describe("cell temperature score sensitivity", () => {
  it("preserves the exact baseline when observations do not support a correction", () => {
    const { snapshot, source } = fixture();
    const result = compareCellTemperature(species, snapshot, source, () => undefined);
    expect(result.status).toBe("available");
    if (result.status !== "available") throw new Error(result.reason);
    expect(result.supportedHours).toBe(0);
    expect(result.scenario).toEqual(result.baseline);
    expect(result.scoreChange).toBe(0);
  });

  it("recounts source exposure, applies the existing cell mean correction once and preserves other inputs", () => {
    const { snapshot, source } = fixture();
    const original = structuredClone(snapshot);
    const result = compareCellTemperature(species, snapshot, source, () => 0.5);
    expect(result.status).toBe("available");
    if (result.status !== "available") throw new Error(result.reason);
    expect(result.scenario.heatHours20d).toBe(480);
    expect(result.corrected.heatHours14d).toBe(336);
    expect(result.scenario.cellMean20dC).toBeCloseTo(24.4);
    for (const component of ["water", "altitude", "habitatCoverage", "phenology"]) {
      expect(result.scenario.components[component]).toBe(result.baseline.components[component]);
    }
    expect(snapshot).toEqual(original);
    expect(result.scenario.score).toBeLessThan(result.baseline.score!);
  });

  it("withholds the comparison on a missing hour, changed source, or failed thermal control", () => {
    const missing = fixture(); missing.source.hours.delete(time - 100 * 3_600_000);
    expect(compareCellTemperature(species, missing.snapshot, missing.source, () => 0).status).toBe("unavailable");
    const wrongSource = fixture(); wrongSource.source.elevationM += 300;
    expect(compareCellTemperature(species, wrongSource.snapshot, wrongSource.source, () => 0).status).toBe("unavailable");
    const mismatch = fixture(); mismatch.snapshot.values.heatHours20d = 1;
    const result = compareCellTemperature(species, mismatch.snapshot, mismatch.source, () => 0);
    expect(result.status).toBe("unavailable");
    expect(result.baseline.score).not.toBeNull();
  });

  it("anchors windows to the stored valid hour even if the provider state has newer data", () => {
    const { snapshot, source } = fixture(); source.hours.set(time + 3_600_000, -10);
    const result = compareCellTemperature(species, snapshot, source, () => 0);
    expect(result.status).toBe("available");
    if (result.status !== "available") throw new Error(result.reason);
    expect(result.scenario.frostHours20d).toBe(0);
  });

  it("rejects invalid biases and requires both bracketing observation intervals", () => {
    const { snapshot, source } = fixture();
    expect(compareCellTemperature(species, snapshot, source, () => NaN).status).toBe("unavailable");
    expect(compareCellTemperature(species, snapshot, source, () => 4).status).toBe("unavailable");
    expect(intervalBiasAtInstant((at) => at === time ? 2 : 0, time)).toBe(1);
    expect(intervalBiasAtInstant((at) => at === time ? 2 : undefined, time)).toBeUndefined();
  });

  it("uses a complete cell-elevation series without correcting its means twice", () => {
    const { snapshot, source } = fixture();
    const original = structuredClone(snapshot);
    const result = compareCellObservedTemperature(species, snapshot, source, () => 20);
    if (result.status !== "available") throw new Error(result.reason);
    expect(result.scenario.cellMean20dC).toBe(20);
    expect(result.scenario.thermalReferenceElevationM).toBe(1900);
    expect(result.scenario.heatHours20d).toBe(0);
    expect(result.supportedHours).toBe(480);
    for (const component of ["water", "altitude", "habitatCoverage", "phenology"]) {
      expect(result.scenario.components[component]).toBe(result.baseline.components[component]);
    }
    expect(snapshot).toEqual(original);
  });

  it("does not mix incomplete cell-elevation estimates with representative-elevation hours", () => {
    const { snapshot, source } = fixture();
    const missing = compareCellObservedTemperature(species, snapshot, source, (at) => at === time ? undefined : 20);
    expect(missing.status).toBe("unavailable");
    expect(missing.baseline.score).not.toBeNull();
    expect(compareCellObservedTemperature(species, snapshot, source, () => 61).status).toBe("unavailable");
    expect(compareCellObservedTemperature(species, snapshot, source, () => NaN).status).toBe("unavailable");
    snapshot.values.heatHours20d = 1;
    expect(compareCellObservedTemperature(species, snapshot, source, () => 20).status).toBe("unavailable");
  });

  it("recounts heat after blending and preserves the baseline when either blend input is missing", () => {
    const { snapshot, source } = fixture();
    const original = structuredClone(snapshot);
    const estimate = (at: number) => blendStationModelTemperature(
      modelTemperatureAtElevation(source.hours.get(at), source.elevationM, snapshot.values.altitudeM!), 30);
    // Model at the cell is 23.9 C; a 30 C station estimate averages to 26.95 C.
    // Averaging source threshold counts would fabricate 240 heat hours.
    const result = compareCellObservedTemperature(species, snapshot, source, estimate);
    if (result.status !== "available") throw new Error(result.reason);
    expect(result.scenario.heatHours20d).toBe(0);
    expect(result.scenario.cellMean20dC).toBeCloseTo(26.95);
    expect(snapshot).toEqual(original);
    const missing = compareCellObservedTemperature(species, snapshot, source,
      (at) => at === time ? blendStationModelTemperature(20, undefined) : estimate(at));
    expect(missing.status).toBe("unavailable");
    expect(missing.baseline).toEqual(result.baseline);
  });
});

describe("diagnostic shared usage accounting", () => {
  it("uses the hosted spatial owner rather than its local development database", () => {
    const config = providerAccountingConfig({ SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_ROLE_KEY: "local-test",
      BOLETS_DEV_SPATIAL_DATA_URL: "https://example.supabase.co", BOLETS_DEV_SPATIAL_SERVICE_ROLE_KEY: "remote-test" });
    expect(config).toEqual({ url: "https://example.supabase.co", key: "remote-test" });
  });
  it("rejects local-only and incomplete credentials without falling back to another owner", () => {
    expect(() => providerAccountingConfig({ SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_ROLE_KEY: "local-test" })).toThrow();
    expect(() => providerAccountingConfig({ BOLETS_DEV_SPATIAL_DATA_URL: "https://example.supabase.co",
      SUPABASE_URL: "https://other.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "different-test" })).toThrow();
  });
});
