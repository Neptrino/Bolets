import "server-only";

import { getEnvironmentFrame } from "@/src/lib/prediction-environment-frame";
import type { z } from "zod";
import { getSpecies } from "@/data/species";
import { habitatScoringValues } from "@/supabase/functions/_shared/habitat-scoring-values";
import { correctForecastValues } from "@/src/lib/forecast-correction";
import {
  fetchGlobalEnvironment,
  resolveCandidateSlots,
} from "@/src/lib/global-predictions";
import { getPotentialHabitatCoverage } from "@/src/lib/habitat";
import { GLOBAL_SPECIES_ID } from "@/src/lib/global-map";
import { spatialEnvironmentFrameSchema } from "@/src/lib/prediction-map-timeline-schema";
import { calculateSuitability, missingModelFields } from "@/src/lib/scoring";
import type {
  ConditionSnapshot,
  GlobalPredictionMapCell,
  PredictionMapCell,
  PredictionTimelineOffset,
  SpatialBounds,
  SpatialGridSizeM,
  SpeciesProfile,
} from "@/src/lib/types";

type EnvironmentFrame = z.infer<typeof spatialEnvironmentFrameSchema>;
type EnvironmentFrameCell = EnvironmentFrame["cells"][number];

const MAX_FORECAST_AGE_MS = 36 * 60 * 60 * 1000;
const MAX_FORECAST_ANCHOR_GAP_MS = 8 * 60 * 60 * 1000;

function frameEnvironment(
  cell: EnvironmentFrameCell,
  offset: Exclude<PredictionTimelineOffset, 0>,
) {
  const observedValues = { ...cell.staticValues, ...cell.snapshot.values };
  if (offset < 0) {
    return {
      observedAt: cell.snapshot.observedAt,
      source: cell.snapshot.source,
      confidence: cell.snapshot.confidence,
      unavailableFields: cell.snapshot.unavailableFields,
      values: observedValues,
    };
  }

  const forecast = cell.forecast;
  const generatedAt = Date.parse(forecast?.generatedAt ?? "");
  if (
    !forecast || !Number.isFinite(generatedAt) ||
    Date.now() - generatedAt > MAX_FORECAST_AGE_MS ||
    Date.now() - generatedAt < -15 * 60 * 1000 ||
    forecast.baseline.unavailableFields.length ||
    forecast.snapshots.length !== offset
  ) return null;

  const currentWeatherAt = Date.parse(
    String(observedValues.weatherObservedAt ?? cell.snapshot.observedAt),
  );
  if (
    !Number.isFinite(currentWeatherAt) ||
    Math.abs(Date.parse(forecast.baseline.validAt) - currentWeatherAt) > MAX_FORECAST_ANCHOR_GAP_MS
  ) return null;

  const baselineDrySpellDays = forecast.baseline.values.drySpellDays;
  const currentDrySpellDays = observedValues.drySpellDays;
  if (baselineDrySpellDays === undefined || currentDrySpellDays === undefined) return null;
  let correctionState = {
    modelDrySpellDays: baselineDrySpellDays,
    correctedDrySpellDays: currentDrySpellDays,
  };
  let finalValues = observedValues;
  let finalUnavailableFields: string[] = [];
  for (const snapshot of forecast.snapshots) {
    const correction = correctForecastValues(
      observedValues,
      forecast.baseline.values,
      snapshot.values,
      correctionState,
      { aggregatePointCount: Math.max(forecast.baseline.pointCount ?? 0, snapshot.pointCount ?? 0) },
    );
    correctionState = correction.state;
    finalValues = { ...cell.staticValues, ...correction.values };
    finalUnavailableFields = [
      ...new Set([
        ...forecast.baseline.unavailableFields,
        ...snapshot.unavailableFields,
        ...correction.unavailableFields,
      ]),
    ];
  }
  const target = forecast.snapshots.at(-1)!;
  return {
    observedAt: target.validAt,
    source: [...new Set([
      ...forecast.baseline.source,
      ...target.source,
    ])],
    confidence: target.confidence,
    unavailableFields: finalUnavailableFields,
    values: finalValues,
  };
}

function scoreSpeciesCell(
  species: SpeciesProfile,
  cell: EnvironmentFrameCell,
  environment: NonNullable<ReturnType<typeof frameEnvironment>>,
  habitat: { coverage: number; altitudeWeightedCoverage: number } | undefined,
) {
  const habitatValues = habitat ? habitatScoringValues(habitat) : null;
  const values = { ...environment.values, ...(habitatValues ?? {}) };
  const unavailableFields = [
    ...new Set([...environment.unavailableFields, ...missingModelFields(species, values)]),
  ];
  const snapshot: ConditionSnapshot = {
    regionId: cell.regionId,
    observedAt: environment.observedAt,
    source: environment.source,
    confidence: environment.confidence,
    stale: false,
    unavailableFields,
    values,
  };
  return calculateSuitability(species, snapshot);
}

async function getSpeciesTimelineFrame(
  speciesId: string,
  bounds: SpatialBounds,
  limit: number,
  gridSizeM: SpatialGridSizeM,
  offset: Exclude<PredictionTimelineOffset, 0>,
) {
  const species = getSpecies(speciesId);
  if (!species) throw new Error("Unknown species");
  const [frame, habitat] = await Promise.all([
    getEnvironmentFrame(bounds, limit, gridSizeM, offset),
    getPotentialHabitatCoverage(speciesId, bounds, limit, gridSizeM),
  ]);
  const habitatByCell = new Map(habitat.cells.map((cell) => [cell.cellId, cell]));
  const cells = frame.cells.map((cell): PredictionMapCell => {
    const environment = frameEnvironment(cell, offset);
    const habitatCell = habitatByCell.get(cell.cellId);
    const habitatEvidence = habitatCell
      ? habitatCell
      : habitat.truncated
        ? undefined
        : { coverage: 0, altitudeWeightedCoverage: 0 };
    const result = environment
      ? scoreSpeciesCell(species, cell, environment, habitatEvidence)
      : null;
    return {
      cellId: cell.cellId,
      gridSizeM: cell.gridSizeM,
      cellBounds: cell.bounds,
      score: result?.score ?? null,
      habitatCoverage: habitatEvidence?.coverage ?? null,
    };
  });
  return { cells, truncated: frame.truncated || habitat.truncated };
}

async function getGlobalTimelineFrame(
  bounds: SpatialBounds,
  limit: number,
  gridSizeM: SpatialGridSizeM,
  offset: Exclude<PredictionTimelineOffset, 0>,
) {
  const [frame, habitat] = await Promise.all([
    getEnvironmentFrame(bounds, limit, gridSizeM, offset),
    fetchGlobalEnvironment(bounds, limit, gridSizeM as 1000 | 2500 | 5000 | 10000),
  ]);
  const candidates = resolveCandidateSlots(habitat.habitatProfiles);
  const habitatByCell = new Map(habitat.cells.map((cell) => [cell.cellId, cell]));
  const cells = frame.cells.map((cell): GlobalPredictionMapCell => {
    const environment = frameEnvironment(cell, offset);
    const habitatCell = habitatByCell.get(cell.cellId);
    if (!environment || !habitatCell) {
      return { cellId: cell.cellId, gridSizeM: cell.gridSizeM, cellBounds: cell.bounds,
        score: null, habitatCoverage: null, topSpeciesId: null };
    }
    const scored = candidates.map(({ species, slot }) => {
      const coverage = habitatCell.habitatCoverages?.[slot - 1] ?? 0;
      const weighted = habitatCell.habitatWeightedCoverages?.[slot - 1] ?? 0;
      return {
        species,
        result: scoreSpeciesCell(species, cell, environment, {
          coverage,
          altitudeWeightedCoverage: weighted,
        }),
      };
    });
    const withheld = scored.some(({ result }) => result.score === null);
    const top = withheld
      ? undefined
      : scored
        .filter(({ result }) => (result.score ?? 0) > 0)
        .sort((left, right) =>
          right.result.score! - left.result.score! ||
          left.species.identity.commonName.localeCompare(right.species.identity.commonName, "ca")
        )[0];
    return {
      cellId: cell.cellId,
      gridSizeM: cell.gridSizeM,
      cellBounds: cell.bounds,
      score: withheld ? null : top?.result.score ?? 0,
      habitatCoverage: top?.result.rawHabitatCoverage ?? null,
      topSpeciesId: top?.species.speciesId ?? null,
    };
  });
  return { cells, truncated: frame.truncated || habitat.truncated };
}

export function isPredictionTimelineOffset(value: number): value is PredictionTimelineOffset {
  return Number.isInteger(value) && value >= -3 && value <= 5;
}

export async function getPredictionMapTimelineFrame(
  speciesId: string,
  bounds: SpatialBounds,
  limit: number,
  gridSizeM: SpatialGridSizeM,
  offset: Exclude<PredictionTimelineOffset, 0>,
) {
  if (gridSizeM < 1000) throw new Error("Timeline frames require a coarse grid");
  return speciesId === GLOBAL_SPECIES_ID
    ? getGlobalTimelineFrame(bounds, limit, gridSizeM, offset)
    : getSpeciesTimelineFrame(speciesId, bounds, limit, gridSizeM, offset);
}
