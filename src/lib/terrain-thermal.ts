import { TERRAIN_THERMAL_SENSITIVITY_VERSION } from "@/src/lib/model-versions";
import { calculateSuitability } from "@/src/lib/scoring";
import type {
  ConditionSnapshot,
  EvidenceConfidence,
  SpeciesProfile,
  SuitabilityResult,
} from "@/src/lib/types";

export const TERRAIN_THERMAL_PROVIDER_MODEL = "arome_france";
export const TERRAIN_THERMAL_WEATHER_MODEL = "Météo-France AROME France";
export const TERRAIN_THERMAL_SOURCE_RESOLUTION_M = 2500;

const TERRAIN_THERMAL_FIELDS = [
  "temperatureAvg14dC",
  "temperatureAvg20dC",
  "frostHours14d",
  "frostHours20d",
  "heatHours14d",
  "heatHours20d",
] as const satisfies readonly (keyof ConditionSnapshot["values"])[];

type TerrainThermalField = typeof TERRAIN_THERMAL_FIELDS[number];
type TerrainThermalValues = Record<TerrainThermalField, number>;

const TERRAIN_THERMAL_HOUR_MAXIMUMS = {
  frostHours14d: 336,
  heatHours14d: 336,
  frostHours20d: 480,
  heatHours20d: 480,
} as const satisfies Partial<Record<TerrainThermalField, number>>;

export type TerrainThermalObservation = {
  observedAt: string;
  providerModel: string;
  weatherGridLatitude: number;
  weatherGridLongitude: number;
  requestedElevationM: number;
  returnedElevationM: number;
  sourceResolutionM: number;
  values: Pick<ConditionSnapshot["values"], TerrainThermalField>;
};

export type TerrainThermalReplayPair = {
  representative: TerrainThermalObservation;
  local: TerrainThermalObservation;
};

type TerrainThermalChangedField = {
  field: TerrainThermalField;
  baseline: number;
  representativeReplay: number;
  terrainAdjusted: number;
  delta: number;
};

type TerrainThermalUnavailableReason =
  | "unsupported-species-model"
  | "stale-baseline"
  | "missing-baseline-metadata"
  | "incomplete-baseline-thermal-values"
  | "incomplete-replay-thermal-values"
  | "incomplete-baseline-score"
  | "incomplete-terrain-score"
  | "observation-time-mismatch"
  | "weather-model-mismatch"
  | "source-resolution-mismatch"
  | "weather-grid-mismatch"
  | "representative-elevation-mismatch"
  | "local-elevation-mismatch"
  | "returned-elevation-mismatch"
  | "baseline-replay-mismatch";

export type TerrainThermalComparison =
  | {
      status: "unavailable";
      reason: TerrainThermalUnavailableReason;
      baseline: SuitabilityResult;
      methodVersion: typeof TERRAIN_THERMAL_SENSITIVITY_VERSION;
    }
  | {
      status: "available";
      confidence: Extract<EvidenceConfidence, "limited">;
      methodVersion: typeof TERRAIN_THERMAL_SENSITIVITY_VERSION;
      baseline: SuitabilityResult;
      terrainAdjusted: SuitabilityResult;
      representativeThermalValues: TerrainThermalValues;
      terrainThermalValues: TerrainThermalValues;
      representativeElevationM: number;
      localElevationM: number;
      elevationDeltaM: number;
      atmosphericResolutionM: number;
      soilMoistureResolutionM: number | null;
      changedFields: TerrainThermalChangedField[];
      limitations: readonly [
        "same-atmospheric-grid",
        "temperature-only-adjustment",
        "coarse-soil-moisture-unchanged",
      ];
    };

const MAX_ELEVATION_DIFFERENCE_M = 25;
const MAX_GRID_COORDINATE_DIFFERENCE_DEGREES = 0.0001;
const MAX_BASELINE_MEAN_TEMPERATURE_DIFFERENCE_C = 0.02;
const HOUR_MILLISECONDS = 60 * 60 * 1000;

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function thermalValues(
  values: ConditionSnapshot["values"],
): TerrainThermalValues | null {
  const entries = TERRAIN_THERMAL_FIELDS.map((field) => [field, values[field]] as const);
  if (entries.some(([field, value]) => {
    if (!finiteNumber(value)) return true;
    if (field.startsWith("temperatureAvg")) return value < -90 || value > 60;
    const maximum = TERRAIN_THERMAL_HOUR_MAXIMUMS[
      field as keyof typeof TERRAIN_THERMAL_HOUR_MAXIMUMS
    ];
    return !Number.isInteger(value) || value < 0 || value > maximum;
  })) return null;

  const result = Object.fromEntries(entries) as TerrainThermalValues;
  if (
    result.frostHours14d + result.heatHours14d > 336 ||
    result.frostHours20d + result.heatHours20d > 480
  ) return null;
  return result;
}

function unavailable(
  reason: TerrainThermalUnavailableReason,
  baseline: SuitabilityResult,
): TerrainThermalComparison {
  return {
    status: "unavailable",
    reason,
    baseline,
    methodVersion: TERRAIN_THERMAL_SENSITIVITY_VERSION,
  };
}

function thermalWindowValidInstant(observedAt: string) {
  const observedInstant = Date.parse(observedAt);
  if (!Number.isFinite(observedInstant)) return undefined;
  return Math.floor(observedInstant / HOUR_MILLISECONDS) * HOUR_MILLISECONDS;
}

function observationMatchesTime(
  observation: TerrainThermalObservation,
  targetInstant: number,
) {
  const observationInstant = Date.parse(observation.observedAt);
  return Number.isFinite(observationInstant) &&
    observationInstant === targetInstant;
}

function observationMatchesGrid(
  observation: TerrainThermalObservation,
  latitude: number,
  longitude: number,
) {
  return finiteNumber(observation.weatherGridLatitude) &&
    finiteNumber(observation.weatherGridLongitude) &&
    Math.abs(observation.weatherGridLatitude - latitude) <=
      MAX_GRID_COORDINATE_DIFFERENCE_DEGREES &&
    Math.abs(observation.weatherGridLongitude - longitude) <=
      MAX_GRID_COORDINATE_DIFFERENCE_DEGREES;
}

function returnedElevationMatchesRequest(observation: TerrainThermalObservation) {
  return finiteNumber(observation.returnedElevationM) &&
    Math.abs(observation.returnedElevationM - observation.requestedElevationM) <=
      MAX_ELEVATION_DIFFERENCE_M;
}

function baselineReplayMatches(
  baseline: TerrainThermalValues,
  replay: TerrainThermalValues,
) {
  return TERRAIN_THERMAL_FIELDS.every((field) => {
    const tolerance = field.startsWith("temperatureAvg")
      ? MAX_BASELINE_MEAN_TEMPERATURE_DIFFERENCE_C
      : 0;
    return Math.abs(baseline[field] - replay[field]) <= tolerance;
  });
}

/**
 * Compares production hydrothermal-v1 with a temperature-only terrain replay.
 *
 * Both elevations are replayed from the same provider request boundary and
 * exact canonical hourly sample. The baseline current-condition timestamp may
 * fall within an hour, while its stored rolling windows end at the last hourly
 * sample, so only that baseline timestamp is floored deterministically; replay
 * timestamps themselves are never rounded or tolerated. The representative
 * replay must first reproduce the stored thermal baseline, so model-run
 * revisions cannot be mistaken for an elevation effect. Seven-day temperature
 * remains unchanged because it participates in the unified water calculation;
 * changing it here would count one terrain assumption twice.
 */
export function compareTerrainThermalSuitability(
  species: SpeciesProfile,
  snapshot: ConditionSnapshot,
  replays: TerrainThermalReplayPair,
): TerrainThermalComparison {
  const baseline = calculateSuitability(species, snapshot);
  if (species.modelConfig.status !== "supported") {
    return unavailable("unsupported-species-model", baseline);
  }
  if (snapshot.stale) return unavailable("stale-baseline", baseline);

  const localElevationM = snapshot.values.altitudeM;
  const representativeElevationM = snapshot.values.weatherElevationM;
  const atmosphericResolutionM = snapshot.values.atmosphericResolutionM;
  const weatherGridLatitude = snapshot.values.weatherGridLatitude;
  const weatherGridLongitude = snapshot.values.weatherGridLongitude;
  const weatherModel = snapshot.values.weatherModel;
  if (
    !finiteNumber(localElevationM) ||
    !finiteNumber(representativeElevationM) ||
    !finiteNumber(atmosphericResolutionM) ||
    !Number.isInteger(atmosphericResolutionM) ||
    atmosphericResolutionM <= 0 ||
    !finiteNumber(weatherGridLatitude) ||
    !finiteNumber(weatherGridLongitude) ||
    !weatherModel
  ) {
    return unavailable("missing-baseline-metadata", baseline);
  }

  const baselineThermal = thermalValues(snapshot.values);
  if (
    !baselineThermal ||
    TERRAIN_THERMAL_FIELDS.some((field) => snapshot.unavailableFields.includes(field))
  ) {
    return unavailable("incomplete-baseline-thermal-values", baseline);
  }
  if (baseline.opportunityIndex === null || baseline.fruitingConditionsScore === null) {
    return unavailable("incomplete-baseline-score", baseline);
  }

  const representativeThermal = thermalValues(replays.representative.values);
  const terrainThermal = thermalValues(replays.local.values);
  if (!representativeThermal || !terrainThermal) {
    return unavailable("incomplete-replay-thermal-values", baseline);
  }

  const baselineObservedAt = snapshot.values.weatherObservedAt ?? snapshot.observedAt;
  const baselineThermalValidInstant = thermalWindowValidInstant(baselineObservedAt);
  if (
    baselineThermalValidInstant === undefined ||
    !observationMatchesTime(replays.representative, baselineThermalValidInstant) ||
    !observationMatchesTime(replays.local, baselineThermalValidInstant)
  ) {
    return unavailable("observation-time-mismatch", baseline);
  }
  if (
    weatherModel !== TERRAIN_THERMAL_WEATHER_MODEL ||
    replays.representative.providerModel !== TERRAIN_THERMAL_PROVIDER_MODEL ||
    replays.local.providerModel !== TERRAIN_THERMAL_PROVIDER_MODEL
  ) {
    return unavailable("weather-model-mismatch", baseline);
  }
  if (
    atmosphericResolutionM !== TERRAIN_THERMAL_SOURCE_RESOLUTION_M ||
    replays.representative.sourceResolutionM !== TERRAIN_THERMAL_SOURCE_RESOLUTION_M ||
    replays.local.sourceResolutionM !== TERRAIN_THERMAL_SOURCE_RESOLUTION_M
  ) {
    return unavailable("source-resolution-mismatch", baseline);
  }
  if (
    !observationMatchesGrid(
      replays.representative,
      weatherGridLatitude,
      weatherGridLongitude,
    ) ||
    !observationMatchesGrid(replays.local, weatherGridLatitude, weatherGridLongitude)
  ) {
    return unavailable("weather-grid-mismatch", baseline);
  }
  if (
    !finiteNumber(replays.representative.requestedElevationM) ||
    Math.abs(replays.representative.requestedElevationM - representativeElevationM) > 1
  ) {
    return unavailable("representative-elevation-mismatch", baseline);
  }
  if (
    !finiteNumber(replays.local.requestedElevationM) ||
    Math.abs(replays.local.requestedElevationM - localElevationM) > 1
  ) {
    return unavailable("local-elevation-mismatch", baseline);
  }
  if (
    !returnedElevationMatchesRequest(replays.representative) ||
    !returnedElevationMatchesRequest(replays.local)
  ) {
    return unavailable("returned-elevation-mismatch", baseline);
  }
  if (!baselineReplayMatches(baselineThermal, representativeThermal)) {
    return unavailable("baseline-replay-mismatch", baseline);
  }

  const scoreOnlySnapshot: ConditionSnapshot = {
    ...snapshot,
    confidence: "limited",
    values: {
      ...snapshot.values,
      ...terrainThermal,
    },
  };
  const terrainAdjustedRaw = calculateSuitability(species, scoreOnlySnapshot);
  if (
    terrainAdjustedRaw.opportunityIndex === null ||
    terrainAdjustedRaw.fruitingConditionsScore === null
  ) {
    return unavailable("incomplete-terrain-score", baseline);
  }
  const terrainAdjusted: SuitabilityResult = {
    ...terrainAdjustedRaw,
    modelVersion:
      `${terrainAdjustedRaw.modelVersion}+${TERRAIN_THERMAL_SENSITIVITY_VERSION}`,
  };
  const changedFields = TERRAIN_THERMAL_FIELDS.map((field) => ({
    field,
    baseline: baselineThermal[field],
    representativeReplay: representativeThermal[field],
    terrainAdjusted: terrainThermal[field],
    delta: terrainThermal[field] - representativeThermal[field],
  }));

  return {
    status: "available",
    confidence: "limited",
    methodVersion: TERRAIN_THERMAL_SENSITIVITY_VERSION,
    baseline,
    terrainAdjusted,
    representativeThermalValues: representativeThermal,
    terrainThermalValues: terrainThermal,
    representativeElevationM,
    localElevationM,
    elevationDeltaM: localElevationM - representativeElevationM,
    atmosphericResolutionM,
    soilMoistureResolutionM: snapshot.values.soilMoistureResolutionM ?? null,
    changedFields,
    limitations: [
      "same-atmospheric-grid",
      "temperature-only-adjustment",
      "coarse-soil-moisture-unchanged",
    ],
  };
}
