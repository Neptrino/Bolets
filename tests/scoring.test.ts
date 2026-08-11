import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import { localSnapshots, normaliseSnapshot } from "@/src/lib/conditions";
import { calculateSuitability } from "@/src/lib/scoring";

describe("suitability scoring", () => {
  it("produces explainable contributions from the same ecological profile", () => {
    const species = getSpecies("boletus-edulis")!;
    const result = calculateSuitability(species, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-08-11T06:00:00.000Z",
      stale: false,
      values: { temperatureC: 14, relativeHumidity: 78, soilMoisture: 0.34, rainfall7dMm: 23, windKmh: 10, altitudeM: 1500, forestCompatibility: 86, soilCompatibility: 76 }
    }));
    expect(result.score).not.toBeNull();
    expect(result.contributions).toHaveLength(species.modelConfig.factors.length);
    expect(result.contributions.find((factor) => factor.id === "temperature")?.score).toBe(100);
    expect(result.modelVersion).toBe(species.modelConfig.version);
  });

  it("does not present local fixture data as a real prediction", () => {
    const result = calculateSuitability(getSpecies("boletus-edulis")!, localSnapshots[0]);
    expect(result.score).toBeNull();
    expect(result.label).toBe("sense dades");
  });

  it("accepts Supabase timestamps with an explicit UTC offset", () => {
    expect(() => normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-08-11T10:42:07.147+00:00"
    })).not.toThrow();
  });

  it("marks missing environmental input as unknown instead of manufacturing a result", () => {
    const species = getSpecies("boletus-edulis")!;
    const snapshot = normaliseSnapshot({
      ...localSnapshots[0],
      values: { altitudeM: 1000 },
      unavailableFields: ["temperatureC", "relativeHumidity", "soilMoisture", "rainfall7dMm"]
    });
    const result = calculateSuitability(species, snapshot);
    expect(result.contributions.find((factor) => factor.id === "temperature")?.state).toBe("unknown");
  });

  it("withholds weather-only regional scores when habitat evidence is absent", () => {
    const result = calculateSuitability(getSpecies("hydnum-repandum")!, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-08-11T10:00:00.000Z",
      stale: false,
      values: { temperatureC: 14, relativeHumidity: 82, soilMoisture: 0.31, rainfall7dMm: 28, altitudeM: 1400 }
    }));
    expect(result.score).toBeNull();
    expect(result.missingFactors).toEqual(expect.arrayContaining(["forest", "soil"]));
  });

  it("derives habitat compatibility from verified raw forest and soil fields", () => {
    const species = getSpecies("boletus-edulis")!;
    const result = calculateSuitability(species, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-08-11T10:00:00.000Z",
      stale: false,
      values: {
        temperatureC: 14,
        relativeHumidity: 82,
        soilMoisture: 0.31,
        rainfall7dMm: 28,
        altitudeM: 1400,
        forestTypes: species.ecologicalConfig.habitat.forestTypes.slice(0, 1),
        treeSpecies: species.ecologicalConfig.habitat.treeAssociations.slice(0, 1),
        soilPh: species.ecologicalConfig.soil.phRange?.[0] ?? 6,
        soilTexture: species.ecologicalConfig.soil.texture,
        soilSubstrate: species.ecologicalConfig.soil.substrate
      }
    }));
    expect(result.score).not.toBeNull();
    expect(result.dataCompleteness).toBeGreaterThanOrEqual(0.7);
  });

  it("caps suitability when current heat and dryness conflict with fruiting", () => {
    const species = getSpecies("boletus-edulis")!;
    const result = calculateSuitability(species, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-08-11T12:00:00.000Z",
      stale: false,
      values: {
        temperatureC: 27,
        relativeHumidity: 33,
        soilMoisture: 0.18,
        rainfall7dMm: 21,
        altitudeM: 1700,
        forestTypes: ["pinedes"],
        soilPh: 6,
        soilTexture: "franca"
      }
    }));
    expect(result.score).toBeLessThanOrEqual(35);
    expect(result.label).toBe("poc favorable");
  });

  it("uses the 24-hour mean instead of a misleading single temperature reading", () => {
    const species = getSpecies("boletus-edulis")!;
    const result = calculateSuitability(species, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-10-11T10:00:00.000Z",
      stale: false,
      values: {
        temperatureC: 25,
        temperatureMin24hC: 11,
        temperatureAvg24hC: 14,
        temperatureMax24hC: 18,
        temperatureMin7dC: 8,
        frostHours7d: 0,
        relativeHumidityAvg24h: 78,
        soilMoistureAvg24h: 0.33,
        rainfall7dMm: 24,
        altitudeM: 1200,
        forestCompatibility: 90,
        soilCompatibility: 85
      }
    }));
    expect(result.contributions.find((factor) => factor.id === "temperature")?.score).toBe(100);
  });

  it("caps a prediction after a recent frost even when the mean looks ideal", () => {
    const species = getSpecies("boletus-edulis")!;
    const result = calculateSuitability(species, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-10-11T10:00:00.000Z",
      stale: false,
      values: {
        temperatureC: 14,
        temperatureMin24hC: -1.5,
        temperatureAvg24hC: 14,
        temperatureMax24hC: 18,
        temperatureMin7dC: -2.4,
        frostHours7d: 4,
        relativeHumidityAvg24h: 80,
        soilMoistureAvg24h: 0.34,
        rainfall7dMm: 28,
        altitudeM: 1300,
        forestCompatibility: 92,
        soilCompatibility: 88
      }
    }));
    expect(result.contributions.find((factor) => factor.id === "temperature")?.score).toBe(10);
    expect(result.score).toBeLessThanOrEqual(20);
  });

  it("excludes Ou de reig above its configured altitude ceiling", () => {
    const species = getSpecies("amanita-caesarea")!;
    const result = calculateSuitability(species, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-09-11T12:00:00.000Z",
      stale: false,
      values: {
        temperatureAvg24hC: 20,
        temperatureMin24hC: 15,
        temperatureMax24hC: 24,
        temperatureMin7dC: 12,
        frostHours7d: 0,
        relativeHumidityAvg24h: 78,
        soilMoistureAvg24h: 0.32,
        rainfall7dMm: 25,
        altitudeM: 2000,
        forestCompatibility: 95,
        soilCompatibility: 95
      }
    }));

    expect(species.ecologicalConfig.habitat.altitude).toEqual([50, 1200]);
    expect(result.contributions.find((factor) => factor.id === "altitude")?.score).toBe(0);
    expect(result.score).toBe(0);
    expect(result.label).toBe("poc favorable");
  });

  it("includes documented seasonality in the explanation", () => {
    const result = calculateSuitability(getSpecies("boletus-edulis")!, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-10-10T12:00:00.000Z"
    }));
    expect(result.contributions.find((factor) => factor.id === "seasonality")?.score).toBe(100);
  });
});
