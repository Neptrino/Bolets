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
      score: 36,
      fruitingConditionsScore: 70,
      opportunityIndex: 36,
      effectiveHabitatCoverage: 0.51,
      label: "baixa",
      sourceResolutionM: 2500,
      confidence: "limited",
      stale: false,
      source: ["Météo-France AROME via Open-Meteo"],
      unavailableFields: [],
      values: {
        temperatureC: 23.6,
        habitatCoveragePercent: 51,
        habitatAltitudeSuitability: 100,
      },
      modelVersion: "hydrothermal-test+hydrothermal-v1",
      components: [],
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
      temperatureAvg7dC: 13,
      temperatureAvg20dC: 13.5,
      frostHours20d: 0,
      heatHours20d: 0,
      relativeHumidityAvg7d: 90,
      soilMoistureMin7d: 0.225,
      soilMoistureAvg7d: 0.24,
      soilMoistureMax7d: 0.261,
      soilMoistureTrend7d: -0.044,
      rainfall26dMm: 50,
      rainfallDays26d: 5,
      drySpellDays: 0,
      evapotranspiration26dMm: 5,
      // Matured rain: boletus excludes the trailing fortnight, so the 14 d
      // fields are the load-bearing recent window alongside the 7 d ones.
      rainfall7dMm: 0,
      rainfallDays7d: 0,
      evapotranspiration7dMm: 0,
      rainfall14dMm: 0,
      rainfallDays14d: 0,
      evapotranspiration14dMm: 0,
      altitudeM: 2040,
      habitatAltitudeSuitability: 50,
      habitatCoveragePercent: 51,
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
    expect(compactValues.rainfall26dMm).toBe(50);
    expect(compactValues.habitatCoveragePercent).toBe(51);
    expect(compactValues.habitatAltitudeSuitability).toBe(50);
    const compactResult = calculateSuitability(species, { ...snapshot, values: compactValues });
    const fullResult = calculateSuitability(species, snapshot);
    expect(compactResult.score).toBeGreaterThan(0);
    expect(compactResult).toEqual(fullResult);
    expect(compactResult.score).toBe(compactResult.opportunityIndex);
    expect(compactResult.fruitingConditionsScore).not.toBeNull();
  });
});
