import { getSpecies } from "@/data/species";
import { regionBounds } from "@/data/regions";
import { altitudeHabitatEnvelope } from "@/src/lib/altitude";
import { habitatForestTerms, habitatProfileKey } from "@/src/lib/habitat";
import { getOccurrenceSupport } from "@/src/lib/occurrences";
import { boundsCentre, boundsContain } from "@/src/lib/map-grid";
import { PREDICTION_CACHE_VERSION, predictionModelVersion } from "@/src/lib/model-versions";
import { missingRainfallFields } from "@/src/lib/rainfall";
import { spatialEnvironmentHistorySchema, spatialEnvironmentResponseSchema } from "@/src/lib/schema";
import { calculateSuitability, suitabilityLabel } from "@/src/lib/scoring";
import type {
  ConditionSnapshot,
  CoordinateBounds,
  EvidenceConfidence,
  FactorContribution,
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

export async function getPredictionCellHistory(
  speciesId: string,
  cell: Pick<PredictionCell, "cellId" | "regionId" | "values">,
): Promise<PredictionCellTimeline> {
  const species = getSpecies(speciesId);
  if (!species) throw new Error("Unknown species");
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)
    throw new Error("Spatial environment service is not configured");

  const query = new URLSearchParams({
    mode: "history",
    cell: cell.cellId,
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

  const habitatValues: ConditionSnapshot["values"] = {
    altitudeM: cell.values.altitudeM,
    habitatAltitudeSuitability: cell.values.habitatAltitudeSuitability,
    forestCompatibility: cell.values.forestCompatibility,
    soilCompatibility: cell.values.soilCompatibility,
    forestTypes: cell.values.forestTypes,
    treeSpecies: cell.values.treeSpecies,
    soilPh: cell.values.soilPh,
    soilTexture: cell.values.soilTexture,
    soilSubstrate: cell.values.soilSubstrate,
  };

  const observed = payload.snapshots.map((snapshot) => {
    // Habitat is static at this model version. Dynamic values must come only
    // from the historical snapshot so today's weather cannot fill an old gap.
    const values = { ...habitatValues, ...snapshot.values };
    const unavailableFields = [
      ...new Set([...snapshot.unavailableFields, ...missingRainfallFields(values)]),
    ];
    return {
      observedAt: snapshot.observedAt,
      score: calculateSuitability(species, {
        regionId: cell.regionId,
        observedAt: snapshot.observedAt,
        source: snapshot.source,
        confidence: snapshot.confidence,
        // Historical snapshots are intentionally old; their age must not make
        // the historical score unavailable.
        stale: false,
        unavailableFields,
        values,
      }).score,
    };
  });

  const generatedAt = payload.forecast?.generatedAt;
  const generatedAtMilliseconds = generatedAt ? Date.parse(generatedAt) : Number.NaN;
  const forecastAgeMilliseconds = Date.now() - generatedAtMilliseconds;
  const forecastFresh = Number.isFinite(generatedAtMilliseconds) &&
    forecastAgeMilliseconds >= -15 * 60 * 1000 &&
    forecastAgeMilliseconds <= 36 * 60 * 60 * 1000 &&
    (payload.forecast?.snapshots.every((snapshot) => Date.parse(snapshot.validAt) > Date.now()) ?? false);
  if (!payload.forecast || !forecastFresh) return { observed, forecast: null };

  const horizonConfidence = (horizonDays: number) =>
    horizonDays === 1 ? "high" : horizonDays <= 3 ? "moderate" : "limited";
  const points = payload.forecast.snapshots.map((snapshot) => {
    const values = { ...habitatValues, ...snapshot.values };
    const unavailableFields = [
      ...new Set([...snapshot.unavailableFields, ...missingRainfallFields(values)]),
    ];
    const horizonDays = (snapshot.horizonHours / 24) as PredictionForecastPoint["horizonDays"];
    const score = snapshot.unavailableFields.length
      ? null
      : calculateSuitability(species, {
        regionId: cell.regionId,
        observedAt: snapshot.validAt,
        source: snapshot.source,
        confidence: snapshot.confidence,
        stale: false,
        unavailableFields,
        values,
      }).score;
    return {
      validAt: snapshot.validAt,
      horizonDays,
      horizonConfidence: horizonConfidence(horizonDays),
      score,
    } satisfies PredictionForecastPoint;
  });

  return {
    observed,
    forecast: {
      generatedAt: payload.forecast.generatedAt,
      source: [...new Set(payload.forecast.snapshots.flatMap((snapshot) => snapshot.source))],
      sourceResolutionM: Math.max(...payload.forecast.snapshots.map((snapshot) => snapshot.sourceResolutionM)),
      points,
    },
  };
}

export function toPredictionMapCell(
  cell: Pick<PredictionCell, "cellId" | "regionId" | "gridSizeM" | "values"> & { bounds: CoordinateBounds },
  result: Pick<SuitabilityResult, "score" | "label">
): PredictionMapCell {
  const habitatCoverage = cell.values.forestCompatibility;
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
  if (compact) {
    query.set("view", "score");
    // Keep optimized map responses cacheable, but bypass older cached payloads
    // whenever their field contract changes.
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
    const unavailableFields = [
      ...new Set([...cell.unavailableFields, ...missingRainfallFields(values)]),
    ];
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
      factors: result.contributions,
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
  return Math.max(
    cell.factors.find((factor) => factor.id === "forest")?.score ?? 0,
    0,
  );
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
    "temperatureAvg24hC",
    "temperatureAvg10dC",
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
    "drySpellDays",
    "evapotranspiration3dMm",
    "evapotranspiration7dMm",
    "evapotranspiration30dMm",
    "windKmh",
    "windAvg24hKmh",
    "altitudeM",
    "habitatAltitudeSuitability",
    "forestCompatibility",
    "soilCompatibility",
    "soilPh",
  ];
  const minFields = [
    "temperatureMin24hC",
    "temperatureMin7dC",
    "temperatureMin10dC",
    "relativeHumidityMin24h",
    "soilMoistureMin24h",
    "soilMoistureMin7d",
  ];
  const maxFields = [
    "temperatureMax24hC",
    "temperatureMax10dC",
    "frostHours7d",
    "frostHours10d",
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

  const scores = scoredCells.map((cell) => ({
    value: cell.score,
    weight: habitatWeight(cell),
  }));
  const score = Math.round(weightedQuantile(scores, 0.5));
  const contributions = species.modelConfig.factors.map((factor) => {
    const factorValues = scoredCells.flatMap((cell) => {
      const factorScore = cell.factors.find((item) => item.id === factor.id)?.score;
      return factorScore === null || factorScore === undefined
        ? []
        : [{ value: factorScore, weight: habitatWeight(cell) }];
    });
    const aggregate = weightedAverage(factorValues);
    const factorScore = aggregate === undefined ? null : Math.round(aggregate);
    return {
      id: factor.id,
      label: factor.label,
      weight: factor.weight,
      score: factorScore,
      state: factorScore === null
        ? "unknown"
        : factorScore >= 70
          ? "favourable"
          : factorScore >= 45
            ? "mixed"
            : "unfavourable",
    } satisfies FactorContribution;
  });
  const totalWeight = contributions.reduce((total, factor) => total + factor.weight, 0);
  const knownWeight = contributions.reduce(
    (total, factor) => total + (factor.score === null ? 0 : factor.weight),
    0,
  );

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
      label: suitabilityLabel(score),
      contributions,
      modelVersion: predictionModelVersion(species.modelConfig.version),
      dataCompleteness: totalWeight ? knownWeight / totalWeight : 0,
      missingFactors: contributions
        .filter((factor) => factor.score === null)
        .map((factor) => factor.id),
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
  );
  return summariseRegionalPredictions(
    species,
    regionId,
    result.cells as PredictionCell[],
  );
}
