import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import { localSnapshots, normaliseSnapshot as parseSnapshot } from "@/src/lib/conditions";
import { calculateSuitability } from "@/src/lib/scoring";
import { predictionModelVersion } from "@/src/lib/model-versions";
import type { ConditionSnapshot } from "@/src/lib/types";

const favourableHydrology = {
  rainfall3dMm: 18,
  rainfall7dMm: 25,
  rainfallPrevious23dMm: 45,
  rainfall30dMm: 70,
  drySpellDays: 0,
  evapotranspiration3dMm: 4,
  evapotranspiration7dMm: 10,
  evapotranspiration30dMm: 45,
  soilMoistureMin7d: 0.22,
  soilMoistureAvg7d: 0.24,
  soilMoistureMax7d: 0.28,
  soilMoistureTrend7d: 0.01,
};

function normaliseSnapshot(snapshot: ConditionSnapshot) {
  return parseSnapshot({
    ...snapshot,
    values: { ...favourableHydrology, ...snapshot.values },
  });
}

describe("suitability scoring", () => {
  it("withholds short-term fruiting scores for habitat-only profiles", () => {
    const result = calculateSuitability(
      getSpecies("tuber-melanosporum")!,
      normaliseSnapshot({
        ...localSnapshots[0],
        observedAt: "2027-01-15T12:00:00.000Z",
        stale: false,
        values: {
          temperatureAvg10dC: 8,
          relativeHumidityAvg24h: 80,
          soilMoistureAvg24h: 0.24,
          altitudeM: 800,
          forestCompatibility: 100,
          soilCompatibility: 100,
        },
      }),
    );

    expect(result.score).toBeNull();
    expect(result.dataCompleteness).toBe(0);
    expect(result.missingFactors).toHaveLength(8);
  });

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
    expect(result.modelVersion).toBe(predictionModelVersion(species.modelConfig.version));
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

  it("uses the measured compatible-habitat percentage without coarse score bands", () => {
    const species = getSpecies("marasmius-oreades")!;
    const result = calculateSuitability(species, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-10-11T12:00:00.000Z",
      stale: false,
      values: {
        temperatureAvg24hC: 16,
        temperatureMin24hC: 12,
        temperatureMax24hC: 20,
        temperatureMin7dC: 10,
        frostHours7d: 0,
        relativeHumidityAvg24h: 75,
        soilMoistureAvg24h: 0.24,
        rainfall7dMm: 25,
        altitudeM: 500,
        forestCompatibility: 37.5,
        soilCompatibility: 100
      }
    }));

    expect(result.contributions.find((factor) => factor.id === "forest")?.score).toBe(37.5);
    expect(result.score).toBeGreaterThan(0);
  });

  it("scores altitude within compatible habitat instead of the coarse mean elevation", () => {
    const species = getSpecies("boletus-edulis")!;
    const values: ConditionSnapshot["values"] = {
      temperatureAvg10dC: 14,
      temperatureMin10dC: 8,
      temperatureMax10dC: 18,
      frostHours10d: 0,
      relativeHumidityAvg24h: 75,
      soilMoistureAvg24h: 0.32,
      ...favourableHydrology,
      altitudeM: 2040,
      forestCompatibility: 27.75,
      soilCompatibility: 100,
    };
    const snapshot = normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-10-11T12:00:00.000Z",
      stale: false,
      values: { ...values, habitatAltitudeSuitability: 46.57 },
    });

    const result = calculateSuitability(species, snapshot);
    expect(result.contributions.find((factor) => factor.id === "altitude")?.score)
      .toBe(46.57);
    expect(result.score).toBeGreaterThan(0);

    const legacy = calculateSuitability(species, normaliseSnapshot({
      ...snapshot,
      values,
    }));
    expect(legacy.contributions.find((factor) => factor.id === "altitude")?.score)
      .toBe(0);
    expect(legacy.score).toBe(0);

    const explicitZero = calculateSuitability(species, normaliseSnapshot({
      ...snapshot,
      values: {
        ...values,
        altitudeM: 1200,
        habitatAltitudeSuitability: 0,
      },
    }));
    expect(explicitZero.contributions.find((factor) => factor.id === "altitude")?.score)
      .toBe(0);
    expect(explicitZero.score).toBe(0);
  });

  it("scores soil moisture continuously and linearly instead of using coarse bands", () => {
    const species = getSpecies("marasmius-oreades")!;
    const soilMoistureScore = (soilMoistureAvg24h: number) => {
      const result = calculateSuitability(species, normaliseSnapshot({
        ...localSnapshots[0],
        observedAt: "2026-10-11T12:00:00.000Z",
        stale: false,
        values: {
          temperatureAvg24hC: 16,
          relativeHumidityAvg24h: 75,
          soilMoistureAvg24h,
          rainfall7dMm: 25,
          altitudeM: 500,
          forestCompatibility: 100,
          soilCompatibility: 100
        }
      }));
      return result.contributions.find((factor) => factor.id === "soilMoisture")?.score;
    };

    expect(soilMoistureScore(0.14)).toBeCloseTo(50);
    expect(soilMoistureScore(0.19)).toBeCloseTo(75);
    expect(soilMoistureScore(0.24)).toBeCloseTo(100);
    expect(soilMoistureScore(0.29)).toBeCloseTo(75);
    expect(soilMoistureScore(0.34)).toBeCloseTo(50);
  });

  it("scores the same 12 mm pulse lower after a dry month than after a wet month", () => {
    const species = getSpecies("marasmius-oreades")!;
    const rainfallContribution = (wetMonth: boolean) => calculateSuitability(species, parseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-10-11T12:00:00.000Z",
      stale: false,
      values: {
        temperatureAvg10dC: 16,
        temperatureMin10dC: 12,
        temperatureMax10dC: 20,
        frostHours10d: 0,
        relativeHumidityAvg24h: 75,
        soilMoistureAvg24h: wetMonth ? 0.24 : 0.12,
        rainfall3dMm: 12,
        rainfall7dMm: 12,
        rainfallPrevious23dMm: wetMonth ? 80 : 0,
        rainfall30dMm: wetMonth ? 92 : 12,
        drySpellDays: 0,
        evapotranspiration3dMm: 6,
        evapotranspiration7dMm: 14,
        evapotranspiration30dMm: 90,
        soilMoistureMin7d: wetMonth ? 0.22 : 0.1,
        soilMoistureAvg7d: wetMonth ? 0.24 : 0.12,
        soilMoistureMax7d: wetMonth ? 0.27 : 0.14,
        soilMoistureTrend7d: wetMonth ? 0 : 0.01,
        altitudeM: 500,
        forestCompatibility: 100,
        soilCompatibility: 100,
      },
    })).contributions.find((factor) => factor.id === "rainfall")?.score;

    const dryScore = rainfallContribution(false)!;
    const wetScore = rainfallContribution(true)!;
    expect(dryScore).toBe(40.36);
    expect(wetScore).toBeGreaterThan(dryScore);
    expect(wetScore).toBeLessThan(100);
  });

  it("scores rainfall as zero after 30 dry days", () => {
    const species = getSpecies("marasmius-oreades")!;
    const result = calculateSuitability(species, parseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-10-11T12:00:00.000Z",
      stale: false,
      values: {
        temperatureAvg10dC: 16,
        relativeHumidityAvg24h: 40,
        soilMoistureAvg24h: 0.08,
        rainfall3dMm: 0,
        rainfall7dMm: 0,
        rainfallPrevious23dMm: 0,
        rainfall30dMm: 0,
        drySpellDays: 30,
        evapotranspiration3dMm: 8,
        evapotranspiration7dMm: 20,
        evapotranspiration30dMm: 95,
        soilMoistureMin7d: 0.06,
        soilMoistureAvg7d: 0.08,
        soilMoistureMax7d: 0.1,
        soilMoistureTrend7d: -0.02,
        altitudeM: 500,
        forestCompatibility: 100,
        soilCompatibility: 100,
      },
    }));

    expect(result.contributions.find((factor) => factor.id === "rainfall")?.score).toBe(0);
    expect(result.score).toBeLessThanOrEqual(35);
  });

  it("withholds the prediction when the 30-day rainfall context is absent", () => {
    const species = getSpecies("marasmius-oreades")!;
    const result = calculateSuitability(species, parseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-10-11T12:00:00.000Z",
      stale: false,
      values: {
        temperatureAvg10dC: 16,
        relativeHumidityAvg24h: 75,
        soilMoistureAvg24h: 0.24,
        rainfall7dMm: 25,
        altitudeM: 500,
        forestCompatibility: 100,
        soilCompatibility: 100,
      },
    }));

    expect(result.contributions.find((factor) => factor.id === "rainfall")?.score).toBeNull();
    expect(result.score).toBeNull();
  });

  it("scores a cell with no matching habitat cover as zero", () => {
    const species = getSpecies("marasmius-oreades")!;
    const result = calculateSuitability(species, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-10-11T12:00:00.000Z",
      stale: false,
      values: {
        temperatureAvg24hC: 16,
        relativeHumidityAvg24h: 75,
        soilMoistureAvg24h: 0.24,
        rainfall7dMm: 25,
        altitudeM: 500,
        forestTypes: ["pinedes"],
        soilCompatibility: 100
      }
    }));

    expect(result.contributions.find((factor) => factor.id === "forest")?.score).toBe(0);
    expect(result.score).toBe(0);
  });

  it("hard-excludes incompatible habitat even when rainfall history is missing", () => {
    const species = getSpecies("marasmius-oreades")!;
    const result = calculateSuitability(species, parseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-10-11T12:00:00.000Z",
      stale: false,
      unavailableFields: ["rainfall30dMm"],
      values: {
        temperatureAvg24hC: 16,
        relativeHumidityAvg24h: 75,
        soilMoistureAvg24h: 0.24,
        altitudeM: 500,
        forestCompatibility: 0,
        soilCompatibility: 100,
      },
    }));

    expect(result.contributions.find((factor) => factor.id === "rainfall")?.score).toBeNull();
    expect(result.score).toBe(0);
  });

  it("scores an inactive month as zero even when habitat and weather are compatible", () => {
    const species = getSpecies("marasmius-oreades")!;
    const result = calculateSuitability(species, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-08-11T12:00:00.000Z",
      stale: false,
      values: {
        temperatureAvg24hC: 16,
        relativeHumidityAvg24h: 75,
        soilMoistureAvg24h: 0.24,
        rainfall7dMm: 25,
        altitudeM: 500,
        forestCompatibility: 100,
        soilCompatibility: 100
      }
    }));

    expect(result.contributions.find((factor) => factor.id === "seasonality")?.score).toBe(0);
    expect(result.score).toBe(0);
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

  it("varies the ceiling continuously for a single stressed condition", () => {
    const species = getSpecies("boletus-edulis")!;
    const result = calculateSuitability(species, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-10-11T12:00:00.000Z",
      stale: false,
      values: {
        temperatureAvg24hC: 14,
        relativeHumidityAvg24h: 45,
        soilMoistureAvg24h: 0.32,
        rainfall7dMm: 25,
        altitudeM: 1200,
        forestCompatibility: 95,
        soilCompatibility: 95
      }
    }));

    expect(result.contributions.find((factor) => factor.id === "humidity")?.score).toBe(40);
    expect(result.score).toBe(53);
  });

  it("applies a limited persistence penalty after a dry seven-day humidity window", () => {
    const species = getSpecies("boletus-edulis")!;
    const result = calculateSuitability(species, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-10-11T12:00:00.000Z",
      stale: false,
      values: {
        temperatureAvg24hC: 14,
        relativeHumidityAvg24h: 75,
        relativeHumidityAvg7d: 45,
        soilMoistureAvg24h: 0.32,
        rainfall7dMm: 25,
        altitudeM: 1200,
        forestCompatibility: 95,
        soilCompatibility: 95,
      },
    }));

    expect(result.contributions.find((factor) => factor.id === "humidity")?.score).toBe(85);
  });

  it("does not let an older humid week mask a dry latest day", () => {
    const species = getSpecies("boletus-edulis")!;
    const result = calculateSuitability(species, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-10-11T12:00:00.000Z",
      stale: false,
      values: {
        temperatureAvg24hC: 14,
        relativeHumidityAvg24h: 45,
        relativeHumidityAvg7d: 75,
        soilMoistureAvg24h: 0.32,
        rainfall7dMm: 25,
        altitudeM: 1200,
        forestCompatibility: 95,
        soilCompatibility: 95,
      },
    }));

    expect(result.contributions.find((factor) => factor.id === "humidity")?.score).toBe(40);
  });

  it("can fall below 35 as two current stressors become severe", () => {
    const species = getSpecies("boletus-edulis")!;
    const result = calculateSuitability(species, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-10-11T12:00:00.000Z",
      stale: false,
      values: {
        temperatureAvg24hC: 14,
        relativeHumidityAvg24h: 30,
        soilMoistureAvg24h: 0.14,
        rainfall7dMm: 25,
        altitudeM: 1200,
        forestCompatibility: 95,
        soilCompatibility: 95
      }
    }));

    expect(result.contributions.find((factor) => factor.id === "humidity")?.score).toBe(10);
    expect(result.contributions.find((factor) => factor.id === "soilMoisture")?.score).toBe(10);
    expect(result.score).toBe(12);
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

  it("uses the trailing 10-day temperature instead of one favourable day", () => {
    const species = getSpecies("marasmius-oreades")!;
    const result = calculateSuitability(species, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-10-11T10:00:00.000Z",
      stale: false,
      values: {
        temperatureC: 16,
        temperatureAvg24hC: 16,
        temperatureMin24hC: 12,
        temperatureMax24hC: 20,
        temperatureMin10dC: 14,
        temperatureAvg10dC: 23.2,
        temperatureMax10dC: 23.2,
        frostHours10d: 0,
        relativeHumidityAvg24h: 78,
        soilMoistureAvg24h: 0.24,
        rainfall7dMm: 24,
        altitudeM: 500,
        forestCompatibility: 90,
        soilCompatibility: 85
      }
    }));

    expect(result.contributions.find((factor) => factor.id === "temperature")?.score).toBe(90);
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

  it.each([
    { altitudeM: 625, expected: 100 },
    { altitudeM: 50, expected: 75 },
    { altitudeM: 100, expected: 87.5 },
    { altitudeM: 150, expected: 100 },
    { altitudeM: 1100, expected: 100 },
    { altitudeM: 1150, expected: 87.5 },
    { altitudeM: 1200, expected: 75 },
    { altitudeM: 1250, expected: 37.5 },
    { altitudeM: 1300, expected: 0 }
  ])("scores altitude with 100 m edge tapers and the 100 m outer margin at $altitudeM m", ({ altitudeM, expected }) => {
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
        altitudeM,
        forestCompatibility: 95,
        soilCompatibility: 95
      }
    }));

    expect(species.ecologicalConfig.habitat.altitude).toEqual([50, 1200]);
    expect(result.contributions.find((factor) => factor.id === "altitude")?.score).toBe(expected);
    if (expected === 0) {
      expect(result.score).toBe(0);
      expect(result.label).toBe("poc favorable");
    }
  });

  it("includes documented seasonality in the explanation", () => {
    const result = calculateSuitability(getSpecies("boletus-edulis")!, normaliseSnapshot({
      ...localSnapshots[0],
      observedAt: "2026-10-10T12:00:00.000Z"
    }));
    expect(result.contributions.find((factor) => factor.id === "seasonality")?.score).toBe(100);
  });
});
