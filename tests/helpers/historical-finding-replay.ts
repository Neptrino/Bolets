import { getSpecies } from "@/data/species";

export const HISTORICAL_FINDING_REPLAY_VERSION = "historical-finding-replay-v1";
export const HISTORICAL_FORECAST_ENDPOINT =
  "https://historical-forecast-api.open-meteo.com/v1/forecast";
export const HISTORICAL_AROME_MODEL = "arome_france";
export const HISTORICAL_SOIL_MODEL = "best_match";
export const HISTORICAL_ICON_EU_SOIL_MODEL = "icon_eu";
export const HISTORICAL_ICON_GLOBAL_SOIL_MODEL = "icon_global";

const MAX_PRIVATE_FINDING_LOCATIONS = 24;
const MAX_EVALUATION_FINDING_LOCATIONS = 200;
const MAX_SPECIES_PER_LOCATION = 8;
export const MINIMUM_AROME_ARCHIVE_DATE = "2024-01-02";
const MAXIMUM_RANGE_SPAN_DAYS = 92;

const ATMOSPHERIC_HOURLY_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "wind_speed_10m",
  "wind_gusts_10m",
  "precipitation",
  "et0_fao_evapotranspiration",
] as const;

const SOIL_HOURLY_VARIABLES = ["soil_moisture_3_to_9cm"] as const;

export type PrivateHistoricalFinding = {
  observedAt: string;
  latitude: number;
  longitude: number;
  speciesIds: string[];
};

type HistoricalForecastRequest = {
  profile: "atmosphere" | "soil";
  latitude: number;
  longitude: number;
  targetAt: string;
  elevationM?: number;
  beforeDays?: number;
  afterDays?: number;
  cellSelection?: "land" | "sea" | "nearest";
  model?: typeof HISTORICAL_AROME_MODEL |
    typeof HISTORICAL_SOIL_MODEL |
    typeof HISTORICAL_ICON_EU_SOIL_MODEL |
    typeof HISTORICAL_ICON_GLOBAL_SOIL_MODEL;
};

type HistoricalRangeRequest = {
  profile: "atmosphere" | "soil";
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  elevationM?: number;
  cellSelection?: "land" | "sea" | "nearest";
  model?: typeof HISTORICAL_AROME_MODEL |
    typeof HISTORICAL_SOIL_MODEL |
    typeof HISTORICAL_ICON_EU_SOIL_MODEL |
    typeof HISTORICAL_ICON_GLOBAL_SOIL_MODEL;
};

function finiteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isoDate(value: unknown): value is string {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function isoTimestamp(value: unknown) {
  if (
    typeof value !== "string" ||
    !/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error("Every historical finding needs an ISO timestamp with an explicit offset");
  }
  return new Date(value).toISOString();
}

function validateFinding(value: unknown): PrivateHistoricalFinding {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Every historical finding must be an object");
  }
  const record = value as Record<string, unknown>;
  if (
    !finiteCoordinate(record.latitude) ||
    record.latitude < -90 ||
    record.latitude > 90 ||
    !finiteCoordinate(record.longitude) ||
    record.longitude < -180 ||
    record.longitude > 180
  ) {
    throw new Error("Private historical coordinates are invalid");
  }
  const observedAt = isoTimestamp(record.observedAt);
  if (observedAt.slice(0, 10) < MINIMUM_AROME_ARCHIVE_DATE) {
    throw new Error(
      `AROME historical findings must be on or after ${MINIMUM_AROME_ARCHIVE_DATE}`,
    );
  }
  if (Date.parse(observedAt) >= Date.now()) {
    throw new Error("Historical finding timestamps must be in the past");
  }
  if (
    !Array.isArray(record.speciesIds) ||
    record.speciesIds.length < 1 ||
    record.speciesIds.length > MAX_SPECIES_PER_LOCATION ||
    record.speciesIds.some((speciesId) => typeof speciesId !== "string")
  ) {
    throw new Error(
      `Every historical finding needs 1-${MAX_SPECIES_PER_LOCATION} speciesIds`,
    );
  }
  const speciesIds = record.speciesIds as string[];
  if (new Set(speciesIds).size !== speciesIds.length) {
    throw new Error("Historical finding speciesIds must be unique per location");
  }
  for (const speciesId of speciesIds) {
    const species = getSpecies(speciesId);
    if (!species || species.predictionMode !== "current") {
      throw new Error(
        "Historical findings can only replay species with current predictions",
      );
    }
  }
  return {
    observedAt,
    latitude: record.latitude,
    longitude: record.longitude,
    speciesIds,
  };
}

export function parsePrivateHistoricalFindings(encoded: string): PrivateHistoricalFinding[] {
  const parsed = JSON.parse(encoded) as unknown;
  if (
    !Array.isArray(parsed) ||
    parsed.length < 1 ||
    parsed.length > MAX_PRIVATE_FINDING_LOCATIONS
  ) {
    throw new Error(
      `Private historical input must contain 1-${MAX_PRIVATE_FINDING_LOCATIONS} locations`,
    );
  }

  return parsed.map(validateFinding);
}

/**
 * Same per-record rules as the manual replay tool with a larger location cap.
 * The 24-location limit protects a five-series-per-location interactive report;
 * the evaluation harness fetches two cached series per location span, so it can
 * cover a whole findings dataset in one run.
 */
export function parsePrivateEvaluationFindings(
  encoded: string,
  { maxLocations = MAX_EVALUATION_FINDING_LOCATIONS }: { maxLocations?: number } = {},
): PrivateHistoricalFinding[] {
  if (!Number.isInteger(maxLocations) || maxLocations < 1) {
    throw new Error("Evaluation location cap must be a positive integer");
  }
  const parsed = JSON.parse(encoded) as unknown;
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > maxLocations) {
    throw new Error(`Private evaluation input must contain 1-${maxLocations} locations`);
  }
  return parsed.map(validateFinding);
}

function utcDate(milliseconds: number) {
  return new Date(milliseconds).toISOString().slice(0, 10);
}

/**
 * Builds a Historical Forecast request with one full extra UTC day before the
 * longest production window. The normalizer still requires the exact 720
 * hourly samples ending at targetAt, so the extra day never shortens or shifts
 * the score window.
 */
export function historicalForecastRequestUrl({
  profile,
  latitude,
  longitude,
  targetAt,
  elevationM,
  beforeDays = 31,
  afterDays = 0,
  cellSelection,
  model,
}: HistoricalForecastRequest) {
  if (
    !finiteCoordinate(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !finiteCoordinate(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("Historical forecast coordinates are invalid");
  }
  const targetMilliseconds = Date.parse(targetAt);
  if (!Number.isFinite(targetMilliseconds)) {
    throw new Error("Historical forecast targetAt is invalid");
  }
  if (
    elevationM !== undefined &&
    (!Number.isFinite(elevationM) || elevationM < -100 || elevationM > 5000)
  ) {
    throw new Error("Historical forecast elevation is invalid");
  }
  if (
    !Number.isInteger(beforeDays) ||
    beforeDays < 31 ||
    beforeDays > 90 ||
    !Number.isInteger(afterDays) ||
    afterDays < 0 ||
    afterDays > 30
  ) {
    throw new Error("Historical forecast window is outside the supported replay range");
  }
  const requestedModel = model ??
    (profile === "atmosphere" ? HISTORICAL_AROME_MODEL : HISTORICAL_SOIL_MODEL);
  if (
    (profile === "atmosphere" && requestedModel !== HISTORICAL_AROME_MODEL) ||
    (profile === "soil" && ![
      HISTORICAL_SOIL_MODEL,
      HISTORICAL_ICON_EU_SOIL_MODEL,
      HISTORICAL_ICON_GLOBAL_SOIL_MODEL,
    ].includes(requestedModel))
  ) {
    throw new Error("Historical forecast model is invalid for the requested profile");
  }

  return historicalSeriesUrl({
    profile,
    latitude,
    longitude,
    elevationM,
    startDate: utcDate(targetMilliseconds - beforeDays * 86_400_000),
    endDate: utcDate(targetMilliseconds + afterDays * 86_400_000),
    model: requestedModel,
    cellSelection,
  });
}

function historicalSeriesUrl({
  profile,
  latitude,
  longitude,
  elevationM,
  startDate,
  endDate,
  model,
  cellSelection,
}: {
  profile: "atmosphere" | "soil";
  latitude: number;
  longitude: number;
  elevationM?: number;
  startDate: string;
  endDate: string;
  model: string;
  cellSelection?: "land" | "sea" | "nearest";
}) {
  const url = new URL(HISTORICAL_FORECAST_ENDPOINT);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  if (elevationM !== undefined) url.searchParams.set("elevation", String(elevationM));
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set(
    "hourly",
    (profile === "atmosphere"
      ? ATMOSPHERIC_HOURLY_VARIABLES
      : SOIL_HOURLY_VARIABLES).join(","),
  );
  url.searchParams.set("models", model);
  url.searchParams.set("timezone", "GMT");
  url.searchParams.set("timeformat", "unixtime");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("precipitation_unit", "mm");
  if (cellSelection) url.searchParams.set("cell_selection", cellSelection);
  return url;
}

/**
 * Builds a Historical Forecast request for an explicit UTC date span so a
 * single fetch can serve many scoring targets. The caller is responsible for
 * padding the span far enough before the earliest target to cover the longest
 * production window; the normalizer still requires the exact 720 hourly
 * samples ending at each target.
 */
export function historicalRangeRequestUrl({
  profile,
  latitude,
  longitude,
  startDate,
  endDate,
  elevationM,
  cellSelection,
  model,
}: HistoricalRangeRequest) {
  if (
    !finiteCoordinate(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !finiteCoordinate(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("Historical range coordinates are invalid");
  }
  if (
    elevationM !== undefined &&
    (!Number.isFinite(elevationM) || elevationM < -100 || elevationM > 5000)
  ) {
    throw new Error("Historical range elevation is invalid");
  }
  if (!isoDate(startDate) || !isoDate(endDate)) {
    throw new Error("Historical range dates must be ISO calendar dates");
  }
  if (startDate < MINIMUM_AROME_ARCHIVE_DATE) {
    throw new Error(
      `Historical range must start on or after ${MINIMUM_AROME_ARCHIVE_DATE}`,
    );
  }
  if (endDate < startDate) {
    throw new Error("Historical range end date must not precede its start date");
  }
  const spanDays = Math.round(
    (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) /
      86_400_000,
  ) + 1;
  if (spanDays > MAXIMUM_RANGE_SPAN_DAYS) {
    throw new Error(
      `Historical range span must not exceed ${MAXIMUM_RANGE_SPAN_DAYS} days`,
    );
  }
  const requestedModel = model ??
    (profile === "atmosphere" ? HISTORICAL_AROME_MODEL : HISTORICAL_SOIL_MODEL);
  if (
    (profile === "atmosphere" && requestedModel !== HISTORICAL_AROME_MODEL) ||
    (profile === "soil" && ![
      HISTORICAL_SOIL_MODEL,
      HISTORICAL_ICON_EU_SOIL_MODEL,
      HISTORICAL_ICON_GLOBAL_SOIL_MODEL,
    ].includes(requestedModel))
  ) {
    throw new Error("Historical range model is invalid for the requested profile");
  }
  return historicalSeriesUrl({
    profile,
    latitude,
    longitude,
    elevationM,
    startDate,
    endDate,
    model: requestedModel,
    cellSelection,
  });
}

export function gridDisplacementMetres(
  expectedLatitude: number,
  expectedLongitude: number,
  returnedLatitude: number,
  returnedLongitude: number,
) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(returnedLatitude - expectedLatitude);
  const longitudeDelta = radians(returnedLongitude - expectedLongitude);
  const leftLatitude = radians(expectedLatitude);
  const rightLatitude = radians(returnedLatitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) * Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
