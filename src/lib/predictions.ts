import { getSpecies } from "@/data/species";
import { altitudeHabitatEnvelope } from "@/src/lib/altitude";
import { habitatForestTerms, habitatProfileKey } from "@/src/lib/habitat";
import { getOccurrenceSupport } from "@/src/lib/occurrences";
import { boundsCentre, boundsContain } from "@/src/lib/map-grid";
import { correctForecastValues, FORECAST_CORRECTION_METHOD } from "@/src/lib/forecast-correction";
import { PREDICTION_CACHE_VERSION, predictionModelVersion } from "@/src/lib/model-versions";
import { spatialEnvironmentHistorySchema, spatialEnvironmentResponseSchema } from "@/src/lib/schema";
import {
  calculateSuitability,
  missingModelFields,
} from "@/src/lib/scoring";
import type {
  ConditionSnapshot,
  CoordinateBounds,
  EvidenceConfidence,
  HistoricalOccurrenceEvidence,
  OccurrenceEvidenceStatus,
  OccurrenceSupportCell,
  PredictionCell,
  PredictionCellTimeline,
  PredictionForecastPoint,
  PredictionMapCell,
  SpatialBounds,
  SpatialGridSizeM,
  SuitabilityResult,
} from "@/src/lib/types";

const MAX_FORECAST_ANCHOR_GAP_MS = 8 * 60 * 60 * 1000;

export async function getPredictionCellHistory(
  speciesId: string,
  cell: Pick<PredictionCell, "cellId" | "gridSizeM" | "regionId" | "values">,
): Promise<PredictionCellTimeline> {
  const species = getSpecies(speciesId);
  if (!species) throw new Error("Unknown species");
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)
    throw new Error("Spatial environment service is not configured");

  const query = new URLSearchParams({
    mode: "history",
    cell: cell.cellId,
    resolution: String(cell.gridSizeM),
    days: "7",
    historyVersion: PREDICTION_CACHE_VERSION,
  });
  const response = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/read-spatial-environment?${query}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        apikey: process.env.SUPABASE_ANON_KEY,
      },
      cache: "force-cache",
      next: { revalidate: 300 },
    },
  );
  if (!response.ok) throw new Error(`Spatial environment history returned ${response.status}`);
  const payload = spatialEnvironmentHistorySchema.parse(await response.json());
  if (payload.cellId !== cell.cellId || payload.regionId !== cell.regionId)
    throw new Error("Spatial environment history did not match the selected cell");

  const modelVersion = predictionModelVersion(species.modelConfig.version);

  const habitatValues: ConditionSnapshot["values"] = {
    altitudeM: cell.values.altitudeM,
    habitatAltitudeSuitability: cell.values.habitatAltitudeSuitability,
    habitatCoveragePercent: cell.values.habitatCoveragePercent,
    forestTypes: cell.values.forestTypes,
    treeSpecies: cell.values.treeSpecies,
    soilPh: cell.values.soilPh,
    soilTexture: cell.values.soilTexture,
    soilSubstrate: cell.values.soilSubstrate,
  };

  const observedSnapshots = payload.snapshots.map((snapshot) => {
    // Habitat is static at this model version. Dynamic values must come only
    // from the historical snapshot so today's weather cannot fill an old gap.
    const values = { ...habitatValues, ...snapshot.values };
    const missingFields = missingModelFields(species, values);
    const unavailableFields = [...new Set([...snapshot.unavailableFields, ...missingFields])];
    const conditionSnapshot: ConditionSnapshot = {
        regionId: cell.regionId,
        observedAt: snapshot.observedAt,
        source: snapshot.source,
        confidence: snapshot.confidence,
        // Historical snapshots are intentionally old; their age must not make
        // the historical score unavailable.
        stale: false,
        unavailableFields,
        values,
    };
    const result = calculateSuitability(species, conditionSnapshot);
    return {
      conditionSnapshot,
      point: {
        observedAt: snapshot.observedAt,
        score: result.opportunityIndex,
        fruitingConditionsScore: result.fruitingConditionsScore,
        opportunityIndex: result.opportunityIndex,
      },
    };
  });
  const observed = observedSnapshots.map(({ point }) => point);

  const generatedAt = payload.forecast?.generatedAt;
  const generatedAtMilliseconds = generatedAt ? Date.parse(generatedAt) : Number.NaN;
  const nowMilliseconds = Date.now();
  const forecastAgeMilliseconds = nowMilliseconds - generatedAtMilliseconds;
  const forecastSnapshots = [...(payload.forecast?.snapshots ?? [])]
    .sort((left, right) => left.horizonHours - right.horizonHours);
  const futureForecastSnapshots = forecastSnapshots.filter((snapshot) =>
    Date.parse(snapshot.validAt) > nowMilliseconds
  );
  const forecastFresh = Number.isFinite(generatedAtMilliseconds) &&
    forecastAgeMilliseconds >= -15 * 60 * 1000 &&
    forecastAgeMilliseconds <= 36 * 60 * 60 * 1000 &&
    futureForecastSnapshots.length > 0;
  const baseline = payload.forecast?.baseline;
  if (!payload.forecast || !baseline || !forecastFresh || baseline.unavailableFields.length) {
    return { modelVersion, observed, forecast: null };
  }
  const baselinePointCount = baseline.pointCount;
  if (baselinePointCount === undefined || forecastSnapshots.some((snapshot) =>
    snapshot.pointCount === undefined
  )) {
    // During a migration-first rollout the old Edge reader may still return
    // five absolute targets. Preserve observed history, but never guess the
    // aggregation semantics needed to calibrate those targets.
    return { modelVersion, observed, forecast: null };
  }

  // The calibration anchor must remain server-authoritative. Request values
  // provide static habitat context only; accepting browser-supplied dynamic
  // weather here would let stale or forged state redefine the forecast seam.
  const currentSnapshot = observedSnapshots.at(-1)?.conditionSnapshot;
  if (!currentSnapshot) return { modelVersion, observed, forecast: null };
  const currentValues = currentSnapshot.values;
  const currentObservedAt = currentSnapshot.observedAt;
  const currentResult = calculateSuitability(species, currentSnapshot);
  const currentScore = currentResult.opportunityIndex;
  if (currentScore === null) return { modelVersion, observed, forecast: null };
  const anchor = {
    observedAt: currentObservedAt,
    score: currentScore,
    fruitingConditionsScore: currentResult.fruitingConditionsScore,
    opportunityIndex: currentResult.opportunityIndex,
  };
  observed[observed.length - 1] = anchor;

  const currentWeatherAt = Date.parse(currentValues.weatherObservedAt ?? currentObservedAt);
  const baselineAt = Date.parse(baseline.validAt);
  const anchorGapMilliseconds = Math.abs(baselineAt - currentWeatherAt);
  if (!Number.isFinite(anchorGapMilliseconds) || anchorGapMilliseconds > MAX_FORECAST_ANCHOR_GAP_MS) {
    return { modelVersion, observed, forecast: null };
  }

  const horizonConfidence = (
    horizonDays: number,
    sourceConfidences: EvidenceConfidence[],
  ): PredictionForecastPoint["horizonConfidence"] => {
    const horizon = horizonDays === 1 ? "high" : horizonDays <= 3 ? "moderate" : "limited";
    const order: PredictionForecastPoint["horizonConfidence"][] = ["limited", "moderate", "high"];
    const sourceIndex = Math.min(...sourceConfidences.map((confidence) =>
      confidence === "high" || confidence === "moderate" ? order.indexOf(confidence) : 0
    ));
    return order[Math.min(order.indexOf(horizon), sourceIndex)];
  };
  const baselineDrySpellDays = baseline.values.drySpellDays;
  const currentDrySpellDays = currentValues.drySpellDays;
  if (baselineDrySpellDays === undefined || currentDrySpellDays === undefined) {
    return { modelVersion, observed, forecast: null };
  }
  let correctionState = {
    modelDrySpellDays: baselineDrySpellDays,
    correctedDrySpellDays: currentDrySpellDays,
  };
  // Advance through every model horizon, including a just-expired target, so
  // path-dependent events such as a rain reset still influence later points.
  // Only future-valid targets are exposed to the chart below.
  const correctedPoints = forecastSnapshots.map((snapshot) => {
    const correction = correctForecastValues(
      currentValues,
      baseline.values,
      snapshot.values,
      correctionState,
      { aggregatePointCount: Math.max(baselinePointCount, snapshot.pointCount!) },
    );
    correctionState = correction.state;
    const values = { ...habitatValues, ...correction.values };
    const missingFields = missingModelFields(species, values);
    const unavailableFields = [
      ...new Set([
        ...baseline.unavailableFields,
        ...snapshot.unavailableFields,
        ...correction.unavailableFields,
        ...missingFields,
      ]),
    ];
    const horizonDays = (snapshot.horizonHours / 24) as PredictionForecastPoint["horizonDays"];
    const result = calculateSuitability(species, {
      regionId: cell.regionId,
      observedAt: snapshot.validAt,
      source: snapshot.source,
      confidence: snapshot.confidence,
      stale: false,
      unavailableFields,
      values,
    });
    return {
      validAt: snapshot.validAt,
      horizonDays,
      horizonConfidence: horizonConfidence(
        horizonDays,
        [currentSnapshot.confidence, baseline.confidence, snapshot.confidence],
      ),
      score: result.opportunityIndex,
      fruitingConditionsScore: result.fruitingConditionsScore,
      opportunityIndex: result.opportunityIndex,
    } satisfies PredictionForecastPoint;
  });
  const points = correctedPoints.filter((point) => Date.parse(point.validAt) > nowMilliseconds);

  return {
    modelVersion,
    observed,
    forecast: {
      generatedAt: payload.forecast.generatedAt,
      source: [...new Set([
        ...baseline.source,
        ...futureForecastSnapshots.flatMap((snapshot) => snapshot.source),
      ])],
      sourceResolutionM: Math.max(
        baseline.sourceResolutionM,
        ...futureForecastSnapshots.map((snapshot) => snapshot.sourceResolutionM),
      ),
      anchor,
      calibratedAt: baseline.validAt,
      correctionMethod: FORECAST_CORRECTION_METHOD,
      points,
    },
  };
}

export function toPredictionMapCell(
  cell: Pick<PredictionCell, "cellId" | "regionId" | "gridSizeM" | "values"> & { bounds: CoordinateBounds },
  result: Pick<SuitabilityResult, "score" | "label">
): PredictionMapCell {
  const habitatCoverage = cell.values.habitatCoveragePercent;
  return {
    cellId: cell.cellId,
    gridSizeM: cell.gridSizeM,
    cellBounds: cell.bounds,
    score: result.score,
    habitatCoverage: habitatCoverage === undefined
      ? null
      : Math.max(0, Math.min(1, habitatCoverage / 100)),
  };
}

function findOccurrenceEvidence(
  cellBounds: CoordinateBounds,
  supportCells: OccurrenceSupportCell[]
): HistoricalOccurrenceEvidence | null {
  const [longitude, latitude] = boundsCentre(cellBounds);
  const support = supportCells.find((candidate) => boundsContain(candidate.bounds, longitude, latitude));
  if (!support) return null;
  return {
    supportCellId: support.supportCellId,
    gridSizeM: support.gridSizeM,
    recordCount: support.recordCount,
    observedYearMin: support.observedYearMin,
    observedYearMax: support.observedYearMax,
    observedMonths: support.observedMonths,
    sources: support.sources
  };
}

export function resolveOccurrenceEvidence(
  cellBounds: CoordinateBounds,
  supportCells: OccurrenceSupportCell[],
  available: boolean
): { occurrenceEvidence: HistoricalOccurrenceEvidence | null; occurrenceEvidenceStatus: OccurrenceEvidenceStatus } {
  if (!available) return { occurrenceEvidence: null, occurrenceEvidenceStatus: "unavailable" };
  const occurrenceEvidence = findOccurrenceEvidence(cellBounds, supportCells);
  return {
    occurrenceEvidence,
    occurrenceEvidenceStatus: occurrenceEvidence ? "supported" : "no-records"
  };
}

export async function getPredictionCells(
  speciesId: string,
  bounds: SpatialBounds,
  limit = 1000,
  gridSizeM: SpatialGridSizeM = 250,
  compact = false,
  includeOccurrence = !compact,
  scoreOnly = compact,
) {
  const species = getSpecies(speciesId);
  if (!species) throw new Error("Unknown species");
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) throw new Error("Spatial environment service is not configured");
  const query = new URLSearchParams({
    west: String(bounds.west), south: String(bounds.south), east: String(bounds.east), north: String(bounds.north),
    limit: String(Math.min(Math.max(Math.round(limit), 1), 1000)), resolution: String(gridSizeM),
    includeHabitat: "true",
    speciesId,
    habitatProfileKey: habitatProfileKey(species),
    predictionVersion: PREDICTION_CACHE_VERSION,
  });
  const [altitudeCoreMin, altitudeCoreMax] = species.ecologicalConfig.habitat.altitude;
  const [altitudeMin, altitudeMax] = altitudeHabitatEnvelope(species.ecologicalConfig.habitat.altitude);
  query.set("altitudeMin", String(altitudeMin));
  query.set("altitudeMax", String(altitudeMax));
  query.set("altitudeCoreMin", String(altitudeCoreMin));
  query.set("altitudeCoreMax", String(altitudeCoreMax));
  for (const term of habitatForestTerms(species)) query.append("forest", term);
  const phRange = species.ecologicalConfig.soil.phRange;
  if (phRange) {
    query.set("phMin", String(phRange[0]));
    query.set("phMax", String(phRange[1]));
  }
  if (scoreOnly) {
    query.set("view", "score");
    // Keep optimized scoring responses cacheable, but bypass older cached
    // payloads whenever their field contract changes.
    query.set("viewVersion", PREDICTION_CACHE_VERSION);
  }
  const environmentRequest = fetch(`${process.env.SUPABASE_URL}/functions/v1/read-spatial-environment?${query}`, {
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`, apikey: process.env.SUPABASE_ANON_KEY },
    cache: "force-cache",
    next: { revalidate: 300 },
  });
  const occurrenceRequest = !includeOccurrence
    ? Promise.resolve({ available: false, cells: [] as OccurrenceSupportCell[] })
    : getOccurrenceSupport(speciesId, bounds);
  const [response, occurrenceSupport] = await Promise.all([
    environmentRequest,
    occurrenceRequest
  ]);
  if (!response.ok) throw new Error(`Spatial environment service returned ${response.status}`);
  const payload = spatialEnvironmentResponseSchema.parse(await response.json());
  const cells = payload.cells.map((cell) => {
    const values = { ...cell.values };
    const missingFields = missingModelFields(species, values);
    const unavailableFields = [...new Set([...cell.unavailableFields, ...missingFields])];
    const result = calculateSuitability(species, { ...cell, unavailableFields, values });
    const mapCell = toPredictionMapCell(cell, result);
    if (compact) return mapCell;
    const evidence = resolveOccurrenceEvidence(cell.bounds, occurrenceSupport.cells, occurrenceSupport.available);
    return {
      ...mapCell,
      speciesId,
      regionId: cell.regionId,
      label: result.label,
      observedAt: cell.observedAt,
      sourceResolutionM: cell.sourceResolutionM,
      confidence: cell.confidence,
      stale: cell.stale,
      source: cell.source,
      unavailableFields,
      values,
      modelVersion: result.modelVersion,
      fruitingConditionsScore: result.fruitingConditionsScore,
      opportunityIndex: result.opportunityIndex,
      effectiveHabitatCoverage: result.effectiveHabitatCoverage,
      components: result.components,
      ...evidence
    } satisfies PredictionCell;
  });
  return { cells, truncated: payload.truncated };
}

export {
  AREA_BUCKET_CONCURRENCY,
  AREA_SUMMARY_BUCKET_DEGREES,
  areaSummaryBucketsForBounds,
  getAreaPredictionSummaries,
  getAreaPredictionSummary,
  getAreaPredictionSummaryBatches,
  getRegionalPredictionSummaries,
  getRegionalPredictionSummary,
  summariseAreaPredictions,
  summariseRegionalPredictions,
  type AreaPredictionBatchRequest,
} from "@/src/lib/prediction-summaries";
