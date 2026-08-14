import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import {
  extremeTemperatureMultiplier,
  relativeExtractableWater,
  smoothBand,
  temperatureResponse,
  temperatureSuitability,
  waterSuitability,
} from "@/src/lib/hydrothermal";
import type {
  ConditionSnapshot,
  TemperatureModelParameters,
  WaterModelParameters,
} from "@/src/lib/types";

function parameters() {
  const config = getSpecies("boletus-edulis")!.modelConfig;
  if (config.status !== "supported") throw new Error("Expected supported config");
  return config;
}

const favourableWaterValues: ConditionSnapshot["values"] = {
  soilTexture: "Franca",
  soilMoistureAvg7d: 0.24,
  soilMoistureMin7d: 0.225,
  temperatureAvg7dC: 13,
  relativeHumidityAvg7d: 90,
  drySpellDays: 0,
  rainfall26dMm: 30,
  rainfallDays26d: 4,
  evapotranspiration26dMm: 0,
};

function water(
  values: ConditionSnapshot["values"],
  model: WaterModelParameters = parameters().water,
) {
  const result = waterSuitability(values, model);
  if (!result) throw new Error("Expected complete water response");
  return result;
}

describe("smooth hydrothermal response functions", () => {
  it("forms a bounded, smooth moisture band with an optimum plateau", () => {
    const band = [0.1, 0.4, 0.8, 1.2] as const;

    expect(smoothBand(0.1, band)).toBe(0);
    expect(smoothBand(0.25, band)).toBeCloseTo(0.5);
    expect(smoothBand(0.4, band)).toBe(1);
    expect(smoothBand(0.6, band)).toBe(1);
    expect(smoothBand(0.8, band)).toBe(1);
    expect(smoothBand(1, band)).toBeCloseTo(0.5);
    expect(smoothBand(1.2, band)).toBe(0);
    expect(() => smoothBand(0.5, [0.4, 0.3, 0.8, 1]))
      .toThrow(RangeError);
  });

  it("normalises VWC by texture and never falls back for an unknown texture", () => {
    expect(relativeExtractableWater(0.18, "Arenosa")).toBeCloseTo(4 / 3);
    expect(relativeExtractableWater(0.18, "Franca")).toBeCloseTo(0.4);
    expect(relativeExtractableWater(0.18, "Argilosa")).toBe(0);
    expect(relativeExtractableWater(0.18, "desconeguda")).toBeNull();
  });

  it("peaks at the configured temperature optimum and halves at either width", () => {
    const model = parameters().temperature;

    expect(temperatureResponse(model.optimumC, model)).toBe(1);
    expect(temperatureResponse(model.optimumC - model.coldHalfWidthC, model))
      .toBeCloseTo(0.5);
    expect(temperatureResponse(model.optimumC + model.warmHalfWidthC, model))
      .toBeCloseTo(0.5);
  });

  it("uses asymmetric cold and warm responses", () => {
    const model = parameters().temperature;
    const cold = temperatureResponse(model.optimumC - 4, model);
    const warm = temperatureResponse(model.optimumC + 4, model);

    expect(model.coldHalfWidthC).toBeLessThan(model.warmHalfWidthC);
    expect(cold).toBeLessThan(warm);
  });

  it("selects the configured trailing temperature window", () => {
    const model = parameters().temperature;
    expect(model.windowDays).toBe(20);
    expect(temperatureSuitability({
      temperatureAvg14dC: model.optimumC + 8,
      temperatureAvg20dC: model.optimumC,
    }, model)).toBe(1);
  });

  it("applies exact half-lives to frost and heat exposure", () => {
    const model = parameters().temperature;
    const baseline = {
      frostHours20d: 0,
      heatHours20d: 0,
    };

    expect(extremeTemperatureMultiplier(baseline, model)).toBe(1);
    expect(extremeTemperatureMultiplier({
      ...baseline,
      frostHours20d: model.frostHalfLifeHours,
    }, model)).toBeCloseTo(0.5);
    expect(extremeTemperatureMultiplier({
      ...baseline,
      heatHours20d: model.heatHalfLifeHours,
    }, model)).toBeCloseTo(0.5);
    expect(extremeTemperatureMultiplier({
      frostHours20d: model.frostHalfLifeHours,
      heatHours20d: model.heatHalfLifeHours,
    }, model)).toBeCloseTo(0.25);
  });

  it("rejects non-positive response widths and half-lives", () => {
    const temperature: TemperatureModelParameters = {
      ...parameters().temperature,
      coldHalfWidthC: 0,
    };
    expect(() => temperatureResponse(10, temperature)).toThrow(RangeError);

    const extremes: TemperatureModelParameters = {
      ...parameters().temperature,
      frostHalfLifeHours: 0,
    };
    expect(() => extremeTemperatureMultiplier({
      frostHours20d: 0,
      heatHours20d: 0,
    }, extremes)).toThrow(RangeError);
  });
});

describe("unified water state", () => {
  it("rewards distributed rain over a single storm with the same total", () => {
    const singleStorm = water({
      ...favourableWaterValues,
      rainfallDays26d: 1,
    });
    const distributed = water({
      ...favourableWaterValues,
      rainfallDays26d: 4,
    });

    expect(distributed.rainTrigger).toBeGreaterThan(singleStorm.rainTrigger);
    expect(distributed.score).toBeGreaterThan(singleStorm.score);
  });

  it("accepts fractional expected wet-day counts from coarse aggregation", () => {
    const result = water({
      ...favourableWaterValues,
      rainfallDays26d: 3.5,
    });

    expect(result.rainTrigger).toBeGreaterThan(0);
    expect(result.rainTrigger).toBeLessThan(1);
  });

  it("does not let heavy rain rescue physiologically dry soil", () => {
    const dry = water({
      ...favourableWaterValues,
      soilMoistureAvg7d: 0.125,
      soilMoistureMin7d: 0.12,
      rainfall26dMm: 100,
      rainfallDays26d: 8,
    });

    expect(dry.soilWaterState).toBe(0);
    expect(dry.score).toBe(0);
  });

  it("declines again under waterlogging", () => {
    const optimal = water(favourableWaterValues);
    const waterlogged = water({
      ...favourableWaterValues,
      soilMoistureAvg7d: 0.31,
      soilMoistureMin7d: 0.31,
    });

    expect(optimal.soilWaterState).toBe(1);
    expect(waterlogged.soilWaterState).toBe(0);
    expect(waterlogged.score).toBe(0);
  });

  it("declines with atmospheric VPD", () => {
    const humid = water(favourableWaterValues);
    const hotAndDry = water({
      ...favourableWaterValues,
      temperatureAvg7dC: 30,
      relativeHumidityAvg7d: 20,
    });

    expect(hotAndDry.vapourPressureDeficitKpa)
      .toBeGreaterThan(humid.vapourPressureDeficitKpa);
    expect(hotAndDry.atmosphericRetention)
      .toBeLessThan(humid.atmosphericRetention);
    expect(hotAndDry.score).toBeLessThan(humid.score);
  });

  it("declines after the configured dry-spell grace period", () => {
    const recentRain = water(favourableWaterValues);
    const prolongedDrySpell = water({
      ...favourableWaterValues,
      drySpellDays: 20,
    });

    expect(recentRain.drySpellRetention).toBe(1);
    expect(prolongedDrySpell.drySpellRetention).toBeLessThan(1);
    expect(prolongedDrySpell.score).toBeLessThan(recentRain.score);
  });

  it("withholds instead of substituting rain for missing soil evidence", () => {
    expect(waterSuitability({
      rainfall26dMm: 100,
      rainfallDays26d: 8,
      evapotranspiration26dMm: 0,
      temperatureAvg7dC: 13,
      relativeHumidityAvg7d: 90,
      drySpellDays: 0,
    }, parameters().water)).toBeNull();
  });
});
