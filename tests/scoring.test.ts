import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import { calculateSuitability, phenologySuitability } from "@/src/lib/scoring";
import type {
  ConditionSnapshot,
  FruitingModelConfig,
  SpeciesProfile,
} from "@/src/lib/types";

type SupportedProfile = SpeciesProfile & {
  modelConfig: Extract<FruitingModelConfig, { status: "supported" }>;
};

const peakObservedAt = "2026-10-14T22:00:00.000Z"; // 15 October, 00:00 in Madrid.

const favourableValues: ConditionSnapshot["values"] = {
  habitatCoveragePercent: 100,
  habitatAltitudeSuitability: 100,
  soilTexture: "Franca",
  soilMoistureAvg7d: 0.24,
  soilMoistureMin7d: 0.225,
  temperatureAvg7dC: 13,
  relativeHumidityAvg7d: 90,
  drySpellDays: 0,
  rainfall26dMm: 50,
  rainfallDays26d: 5,
  evapotranspiration26dMm: 5,
  temperatureAvg20dC: 13.5,
  frostHours20d: 0,
  heatHours20d: 0,
};

function snapshot(
  values: ConditionSnapshot["values"] = favourableValues,
  overrides: Partial<Omit<ConditionSnapshot, "values">> = {},
): ConditionSnapshot {
  return {
    regionId: "pirineus",
    observedAt: peakObservedAt,
    source: ["test"],
    confidence: "moderate",
    stale: false,
    unavailableFields: [],
    ...overrides,
    values,
  };
}

function supportedSpecies(speciesId = "boletus-edulis"): SupportedProfile {
  const species = getSpecies(speciesId)!;
  if (species.modelConfig.status !== "supported") {
    throw new Error(`${speciesId} is not supported by the hydrothermal model`);
  }
  return species as SupportedProfile;
}

describe("hydrothermal scoring integration", () => {
  it("keeps conditional fruiting independent from habitat availability", () => {
    const species = supportedSpecies();
    const fullHabitat = calculateSuitability(species, snapshot());
    const partialHabitat = calculateSuitability(species, snapshot({
      ...favourableValues,
      habitatCoveragePercent: 40,
      habitatAltitudeSuitability: 50,
    }));

    expect(fullHabitat.fruitingConditionsScore).not.toBeNull();
    expect(partialHabitat.fruitingConditionsScore).toBe(
      fullHabitat.fruitingConditionsScore,
    );
    expect(partialHabitat.rawHabitatCoverage).toBe(0.4);
    expect(partialHabitat.effectiveHabitatCoverage).toBe(0.2);
    expect(partialHabitat.opportunityIndex).toBeLessThan(
      fullHabitat.opportunityIndex!,
    );
  });

  it("calculates opportunity as effective habitat multiplied by conditions", () => {
    const source = supportedSpecies();
    const species: SpeciesProfile = {
      ...source,
      modelConfig: {
        ...source.modelConfig,
        water: {
          ...source.modelConfig.water,
          triggerDependency: 0,
          vpdExponent: 0,
          drySpellExponent: 0,
        },
      },
    };
    const result = calculateSuitability(species, snapshot({
      ...favourableValues,
      habitatCoveragePercent: 40,
      habitatAltitudeSuitability: 50,
    }));

    expect(result.fruitingConditionsScore).toBe(100);
    expect(result.effectiveHabitatCoverage).toBe(0.2);
    expect(result.opportunityIndex).toBe(20);
    expect(result.score).toBe(result.opportunityIndex);
  });

  it("withholds the complete dynamic result when a required field is missing", () => {
    const values = { ...favourableValues };
    delete values.temperatureAvg20dC;
    const result = calculateSuitability(supportedSpecies(), snapshot(values));

    expect(result.fruitingConditionsScore).toBeNull();
    expect(result.opportunityIndex).toBeNull();
    expect(result.label).toBe("sense dades");
    expect(result.missingComponents).toEqual(["temperature"]);
    expect(result.components.find((item) => item.id === "water")?.score).not.toBeNull();
    expect(result.components.find((item) => item.id === "extremes")?.score).not.toBeNull();
    expect(result.components.find((item) => item.id === "temperature")?.state)
      .toBe("unknown");
  });

  it("treats provider-declared unavailable fields as missing at coarse scale", () => {
    const result = calculateSuitability(
      supportedSpecies(),
      snapshot(favourableValues, { unavailableFields: ["soilMoistureAvg7d"] }),
    );

    expect(favourableValues.soilMoistureAvg7d).toBeDefined();
    expect(result.fruitingConditionsScore).toBeNull();
    expect(result.opportunityIndex).toBeNull();
    expect(result.missingComponents).toContain("water");
  });

  it("does not fall back when soil texture is not a controlled hydraulic class", () => {
    const result = calculateSuitability(supportedSpecies(), snapshot({
      ...favourableValues,
      soilTexture: "textura desconeguda",
    }));

    expect(result.fruitingConditionsScore).toBeNull();
    expect(result.opportunityIndex).toBeNull();
    expect(result.components.find((item) => item.id === "water")?.score).toBeNull();
  });

  it("hard-excludes absent habitat without changing conditions inside habitat", () => {
    const result = calculateSuitability(supportedSpecies(), snapshot({
      ...favourableValues,
      habitatCoveragePercent: 0,
    }));

    expect(result.fruitingConditionsScore).toBeGreaterThan(0);
    expect(result.effectiveHabitatCoverage).toBe(0);
    expect(result.opportunityIndex).toBe(0);
  });

  it("hard-excludes a zero phenology anchor", () => {
    const result = calculateSuitability(
      supportedSpecies(),
      snapshot(favourableValues, { observedAt: "2026-03-14T23:00:00.000Z" }),
    );

    expect(result.components.find((item) => item.id === "phenology")?.score).toBe(0);
    expect(result.fruitingConditionsScore).toBe(0);
    expect(result.opportunityIndex).toBe(0);
  });

  it("preserves hard exclusions even when dynamic inputs are missing", () => {
    const result = calculateSuitability(
      supportedSpecies(),
      snapshot(
        { habitatCoveragePercent: 0, habitatAltitudeSuitability: 100 },
        { observedAt: "2026-03-14T23:00:00.000Z" },
      ),
    );

    expect(result.fruitingConditionsScore).toBe(0);
    expect(result.opportunityIndex).toBe(0);
  });

  it("withholds dynamic scoring for the habitat-only truffle profile", () => {
    const truffle = getSpecies("tuber-melanosporum")!;
    const result = calculateSuitability(truffle, snapshot({
      habitatCoveragePercent: 60,
      habitatAltitudeSuitability: 75,
    }));

    expect(truffle.modelConfig).toMatchObject({
      status: "habitat-only",
      guild: "hypogeous",
    });
    expect(truffle.predictionMode).toBe("habitat_only");
    expect(result.rawHabitatCoverage).toBe(0.6);
    expect(result.effectiveHabitatCoverage).toBeCloseTo(0.45);
    expect(result.fruitingConditionsScore).toBeNull();
    expect(result.opportunityIndex).toBeNull();
  });
});

describe("smooth phenology", () => {
  it("returns the exact month-centre anchor in Europe/Madrid", () => {
    const species = supportedSpecies();
    const anchors = species.modelConfig.phenology.monthlyAnchors;

    expect(phenologySuitability(peakObservedAt, anchors)).toBe(anchors[9]);
    expect(phenologySuitability("2027-01-14T23:00:00.000Z", anchors))
      .toBe(anchors[0]);
  });

  it("is continuous across the December-January boundary", () => {
    const anchors = [
      0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.8,
    ] as const;
    const before = phenologySuitability("2026-12-31T22:59:59.000Z", anchors)!;
    const after = phenologySuitability("2026-12-31T23:00:01.000Z", anchors)!;

    expect(Math.abs(after - before)).toBeLessThan(0.0001);
    expect(before).toBeGreaterThan(0.2);
    expect(before).toBeLessThan(0.8);
  });

  it("distinguishes early and late dates within the same month", () => {
    const anchors = [
      0, 0, 0, 0, 0, 0, 0.2, 0.8, 1, 0, 0, 0,
    ] as const;
    const earlyAugust = phenologySuitability("2026-08-01T10:00:00.000Z", anchors)!;
    const midAugust = phenologySuitability("2026-08-15T10:00:00.000Z", anchors)!;
    const lateAugust = phenologySuitability("2026-08-31T10:00:00.000Z", anchors)!;

    expect(earlyAugust).toBeLessThan(midAugust);
    expect(midAugust).toBeCloseTo(0.8);
    expect(lateAugust).toBeGreaterThan(midAugust);
  });

  it("rejects an invalid observation timestamp", () => {
    expect(phenologySuitability("not-a-date", supportedSpecies().modelConfig.phenology.monthlyAnchors))
      .toBeNull();
  });
});
