import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import { toPredictionMapCell } from "@/src/lib/predictions";
import { calculateSuitability } from "@/src/lib/scoring";
import { scoringValues } from "@/supabase/functions/_shared/scoring-values";
import type { ConditionSnapshot, PredictionCell } from "@/src/lib/types";

describe("compact prediction map cells", () => {
  it("keeps map geometry and score while omitting detailed conditions", () => {
    const cell = {
      speciesId: "boletus-edulis",
      cellId: "epsg25831:1000:440:4680",
      regionId: "pirineus",
      observedAt: "2026-08-11T13:40:00Z",
      gridSizeM: 1000,
      cellBounds: [[2.2, 42.3], [2.21, 42.31]],
      score: 35,
      label: "poc favorable",
      sourceResolutionM: 2500,
      confidence: "limited",
      stale: false,
      source: ["Météo-France AROME via Open-Meteo"],
      unavailableFields: [],
      values: { temperatureC: 23.6, forestCompatibility: 51 },
      modelVersion: "ecologia-v1.2",
      factors: [],
      occurrenceEvidence: null,
      occurrenceEvidenceStatus: "no-records"
    } satisfies PredictionCell;

    expect(toPredictionMapCell({ ...cell, bounds: cell.cellBounds }, cell)).toEqual({
      cellId: cell.cellId,
      gridSizeM: cell.gridSizeM,
      cellBounds: cell.cellBounds,
      score: cell.score,
      habitatCoverage: 0.51,
    });
  });

  it("keeps every input needed to calculate the same compact map score", () => {
    const values: ConditionSnapshot["values"] = {
      temperatureC: 21.175,
      temperatureMin24hC: 16.2,
      temperatureAvg24hC: 21.58,
      temperatureMax24hC: 30.5,
      temperatureMin7dC: 14.6,
      temperatureMin10dC: 14.5,
      temperatureAvg10dC: 21.54,
      temperatureMax10dC: 32.7,
      frostHours7d: 0,
      frostHours10d: 0,
      relativeHumidity: 52.25,
      relativeHumidityAvg24h: 48.7,
      relativeHumidityAvg7d: 42.5,
      soilMoisture: 0.174,
      soilMoistureAvg24h: 0.18,
      soilMoistureMin7d: 0.174,
      soilMoistureAvg7d: 0.217,
      soilMoistureMax7d: 0.261,
      soilMoistureTrend7d: -0.044,
      rainfall3dMm: 5.65,
      rainfall7dMm: 16,
      rainfallPrevious23dMm: 26.325,
      rainfall30dMm: 42.325,
      drySpellDays: 0,
      evapotranspiration3dMm: 16.12,
      evapotranspiration7dMm: 34.76,
      evapotranspiration30dMm: 170.35,
      altitudeM: 2040,
      habitatAltitudeSuitability: 50,
      forestCompatibility: 51,
      soilPh: 6.5,
      soilTexture: "franca",
      windKmh: 1.15,
    };
    const snapshot: ConditionSnapshot = {
      regionId: "prepirineus",
      observedAt: "2026-08-12T07:36:33.419Z",
      source: ["test"],
      confidence: "limited",
      stale: false,
      unavailableFields: [],
      values,
    };
    const compactValues = scoringValues(values) as ConditionSnapshot["values"];
    const species = getSpecies("boletus-edulis")!;

    expect(compactValues).not.toHaveProperty("windKmh");
    expect(compactValues).not.toHaveProperty("soilMoistureMax7d");
    expect(compactValues.habitatAltitudeSuitability).toBe(50);
    const compactResult = calculateSuitability(species, { ...snapshot, values: compactValues });
    const fullResult = calculateSuitability(species, snapshot);
    expect(compactResult.score).toBeGreaterThan(0);
    expect(compactResult).toEqual(fullResult);
  });
});
