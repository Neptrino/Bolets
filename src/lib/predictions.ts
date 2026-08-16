import { getSpecies } from "@/data/species";
import { regionBounds } from "@/data/regions";
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
  opportunityLabel,
} from "@/src/lib/scoring";
import type {
  ConditionSnapshot,
  CoordinateBounds,
  EvidenceConfidence,
  ModelComponent,
  HistoricalOccurrenceEvidence,
  OccurrenceEvidenceStatus,
  OccurrenceSupportCell,
  PredictionCell,
  PredictionCellTimeline,
  PredictionForecastPoint,
  PredictionMapCell,
  RegionId,
  RegionalPredictionSummary,
  SpatialBounds,
  SpatialGridSizeM,
  SpeciesProfile,
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

export function findOccurrenceEvidence(
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

type WeightedValue = { value: number; weight: number };
type NumericValues = Record<string, unknown>;

function weightedQuantile(values: WeightedValue[], quantile: number) {
  const sorted = [...values].sort((left, right) => left.value - right.value);
  const totalWeight = sorted.reduce((total, item) => total + item.weight, 0);
  const threshold = totalWeight * quantile;
  let accumulated = 0;
  for (const item of sorted) {
    accumulated += item.weight;
    if (accumulated >= threshold) return item.value;
  }
  return sorted.at(-1)?.value ?? 0;
}

function weightedAverage(values: WeightedValue[]) {
  const totalWeight = values.reduce((total, item) => total + item.weight, 0);
  if (!totalWeight) return undefined;
  return values.reduce((total, item) => total + item.value * item.weight, 0) / totalWeight;
}

function habitatWeight(cell: PredictionCell) {
  return Math.max(cell.effectiveHabitatCoverage ?? 0, 0);
}

function aggregateNumericField(
  cells: PredictionCell[],
  field: string,
  mode: "average" | "min" | "max" = "average",
) {
  const values = cells.flatMap((cell) => {
    const value = (cell.values as NumericValues)[field];
    return typeof value === "number"
      ? [{ value, weight: habitatWeight(cell) }]
      : [];
  });
  if (!values.length) return undefined;
  if (mode === "min") return Math.min(...values.map((item) => item.value));
  if (mode === "max") return Math.max(...values.map((item) => item.value));
  return weightedAverage(values);
}

function aggregateRegionalSnapshot(
  regionId: RegionId,
  cells: PredictionCell[],
): ConditionSnapshot {
  const averageFields = [
    "temperatureC",
    "temperatureAvg7dC",
    "temperatureAvg14dC",
    "temperatureAvg20dC",
    "relativeHumidity",
    "relativeHumidityAvg24h",
    "relativeHumidityAvg7d",
    "soilMoisture",
    "soilMoistureAvg24h",
    "soilMoistureAvg7d",
    "soilMoistureTrend7d",
    "rainfall3dMm",
    "rainfall7dMm",
    "rainfallPrevious23dMm",
    "rainfall30dMm",
    "rainfall14dMm",
    "rainfall21dMm",
    "rainfall26dMm",
    "rainfallDays7d",
    "rainfallDays14d",
    "rainfallDays21d",
    "rainfallDays26d",
    "rainfallDays30d",
    "drySpellDays",
    "evapotranspiration3dMm",
    "evapotranspiration7dMm",
    "evapotranspiration30dMm",
    "evapotranspiration14dMm",
    "evapotranspiration21dMm",
    "evapotranspiration26dMm",
    "windKmh",
    "windAvg24hKmh",
    "altitudeM",
    "habitatAltitudeSuitability",
    "habitatCoveragePercent",
    "soilPh",
  ];
  const minFields = [
    "relativeHumidityMin24h",
    "soilMoistureMin24h",
    "soilMoistureMin7d",
  ];
  const maxFields = [
    "frostHours14d",
    "frostHours20d",
    "heatHours14d",
    "heatHours20d",
    "relativeHumidityMax24h",
    "soilMoistureMax24h",
    "soilMoistureMax7d",
    "windMax24hKmh",
    "windGustMax24hKmh",
  ];
  const values: NumericValues = {};
  for (const field of averageFields) values[field] = aggregateNumericField(cells, field);
  for (const field of minFields) values[field] = aggregateNumericField(cells, field, "min");
  for (const field of maxFields) values[field] = aggregateNumericField(cells, field, "max");
  const cleanValues = Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as ConditionSnapshot["values"];
  const weatherObservedAt = cells
    .map((cell) => cell.values.weatherObservedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  if (weatherObservedAt) cleanValues.weatherObservedAt = weatherObservedAt;
  const weatherModel = cells.find((cell) => cell.values.weatherModel)?.values.weatherModel;
  if (weatherModel) cleanValues.weatherModel = weatherModel;
  const atmosphericResolutionM = aggregateNumericField(cells, "atmosphericResolutionM", "max");
  if (atmosphericResolutionM !== undefined) cleanValues.atmosphericResolutionM = Math.round(atmosphericResolutionM);
  const soilMoistureResolutionM = aggregateNumericField(cells, "soilMoistureResolutionM", "max");
  if (soilMoistureResolutionM !== undefined) cleanValues.soilMoistureResolutionM = Math.round(soilMoistureResolutionM);

  const confidenceOrder: EvidenceConfidence[] = ["unknown", "limited", "moderate", "high"];
  const confidence = cells.reduce<EvidenceConfidence>((lowest, cell) =>
    confidenceOrder.indexOf(cell.confidence) < confidenceOrder.indexOf(lowest)
      ? cell.confidence
      : lowest,
  "high");

  return {
    regionId,
    observedAt: cells.map((cell) => cell.observedAt).sort().at(-1)!,
    source: [...new Set(cells.flatMap((cell) => cell.source))],
    confidence,
    stale: cells.some((cell) => cell.stale),
    unavailableFields: [...new Set(cells.flatMap((cell) => cell.unavailableFields))],
    values: cleanValues,
  };
}

export function summariseRegionalPredictions(
  species: SpeciesProfile,
  regionId: RegionId,
  cells: PredictionCell[],
): RegionalPredictionSummary | null {
  const compatibleCells = cells.filter(
    (cell) => cell.regionId === regionId && habitatWeight(cell) > 0,
  );
  const scoredCells = compatibleCells.filter(
    (cell): cell is PredictionCell & { score: number } => cell.score !== null,
  );
  if (!scoredCells.length) return null;

  // The cell opportunity index already contains effective habitat coverage.
  // Equal cell area therefore avoids applying that coverage a second time.
  const scores = scoredCells.map((cell) => ({ value: cell.score, weight: 1 }));
  const score = Math.round(weightedQuantile(scores, 0.5));
  const components = scoredCells[0].components.map((template) => {
    const componentValues = scoredCells.flatMap((cell) => {
      const componentScore = cell.components.find((item) => item.id === template.id)?.score;
      return componentScore === null || componentScore === undefined
        ? []
        : [{ value: componentScore, weight: habitatWeight(cell) }];
    });
    const aggregate = weightedAverage(componentValues);
    const componentScore = aggregate === undefined ? null : Math.round(aggregate);
    return {
      id: template.id,
      label: template.label,
      score: componentScore,
      state: componentScore === null
        ? "unknown"
        : componentScore >= 70
          ? "favourable"
          : componentScore >= 45
            ? "mixed"
            : "unfavourable",
    } satisfies ModelComponent;
  });
  const missingComponents = components.filter((item) => item.score === null).map((item) => item.id);
  const fruitingConditionValues = scoredCells.flatMap((cell) =>
    cell.fruitingConditionsScore === null
      ? []
      : [{ value: cell.fruitingConditionsScore, weight: habitatWeight(cell) }]
  );
  const fruitingConditionsScore = fruitingConditionValues.length
    ? Math.round(weightedQuantile(fruitingConditionValues, 0.5))
    : null;
  const rawHabitatCoverage = weightedAverage(scoredCells.map((cell) => ({
    value: (cell.values.habitatCoveragePercent ?? 0) / 100,
    weight: 1,
  }))) ?? null;
  const effectiveHabitatCoverage = weightedAverage(scoredCells.map((cell) => ({
    value: cell.effectiveHabitatCoverage ?? 0,
    weight: 1,
  }))) ?? null;

  return {
    regionId,
    gridSizeM: 10000,
    scoredCellCount: scoredCells.length,
    scoreRange: [
      Math.round(weightedQuantile(scores, 0.25)),
      Math.round(weightedQuantile(scores, 0.75)),
    ],
    result: {
      score,
      fruitingConditionsScore,
      opportunityIndex: score,
      rawHabitatCoverage,
      effectiveHabitatCoverage,
      label: opportunityLabel(score),
      components,
      modelVersion: predictionModelVersion(species.modelConfig.version),
      dataCompleteness: (components.length - missingComponents.length) / components.length,
      missingComponents,
    },
    snapshot: aggregateRegionalSnapshot(regionId, scoredCells),
  };
}

export async function getRegionalPredictionSummary(
  speciesId: string,
  regionId: RegionId,
) {
  const species = getSpecies(speciesId);
  if (!species) throw new Error("Unknown species");
  const result = await getPredictionCells(
    speciesId,
    regionBounds[regionId],
    1000,
    10000,
    false,
    false,
    true,
  );
  if (result.truncated) {
    throw new Error(`Regional prediction response was truncated for ${speciesId} in ${regionId}`);
  }
  return summariseRegionalPredictions(
    species,
    regionId,
    result.cells as PredictionCell[],
  );
}
