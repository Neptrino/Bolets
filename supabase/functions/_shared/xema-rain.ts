// Meteocat XEMA automatic-station precipitation, read from the official
// Dades Obertes de Catalunya Socrata datasets. Gauge accumulations are the
// observed ground truth that numerical-model "past hours" never receive:
// a mis-placed convective storm stays wrong in every model archive, while
// the station network measured what actually fell. This stream stays a
// private shadow next to the production Open-Meteo rain windows until the
// versioned comparison validates a correction into the unified water model.
//
// Dataset semantics verified against the provider on 2026-08-16:
// - `nzvn-apee` publishes semi-hourly measurements; variable code 35 is
//   precipitation accumulated over the half hour, in millimetres.
// - `data_lectura` timestamps are floating strings in universal time (TU),
//   so they parse as UTC without any local-time correction.
// - The feed lags observation time by roughly one hour.

export const XEMA_SOCRATA_ORIGIN = "https://analisi.transparenciacatalunya.cat";
export const XEMA_MEASUREMENTS_DATASET = "nzvn-apee";
export const XEMA_STATIONS_DATASET = "yqwd-vj5e";
export const XEMA_RAIN_VARIABLE_CODE = "35";
export const XEMA_SEMIHOURLY_BASE_CODE = "SH";
export const XEMA_PAGE_LIMIT = 50_000;
export const XEMA_RETENTION_DAYS = 60;

// Physical sanity caps, not climatology: they only reject corrupt readings.
// Catalan convective records stay far below 120 mm in half an hour.
export const XEMA_MAX_SEMIHOURLY_MM = 120;
export const XEMA_MAX_HOURLY_MM = 240;

// Catalonia plus a small margin; stations outside this box are metadata errors.
const STATION_BOUNDS = {
  minLatitude: 40.3,
  maxLatitude: 43.0,
  minLongitude: -0.5,
  maxLongitude: 3.5,
} as const;

const STATION_CODE_PATTERN = /^[A-Z0-9]{1,4}$/;

export type XemaStation = {
  station_code: string;
  station_name: string;
  latitude: number;
  longitude: number;
  altitude_m: number;
};

export type XemaHourlyRain = {
  station_code: string;
  hour_start: string;
  precipitation_mm: number;
  sample_count: number;
};

const finiteNumber = (value: unknown) => {
  const parsed = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
};

/** Socrata floating timestamp (universal time) for an instant. */
function floatingUtc(isoTimestamp: string, label: string) {
  const milliseconds = Date.parse(isoTimestamp);
  if (!Number.isFinite(milliseconds)) throw new Error(`${label} must be a valid ISO timestamp`);
  return new Date(milliseconds).toISOString().slice(0, 19);
}

export function xemaStationsUrl() {
  const url = new URL(`${XEMA_SOCRATA_ORIGIN}/resource/${XEMA_STATIONS_DATASET}.json`);
  url.searchParams.set("$select", "codi_estacio,nom_estacio,latitud,longitud,altitud");
  url.searchParams.set("$limit", "2000");
  return url;
}

/** Half-open window [startAt, endAt) of semi-hourly rain readings. */
export function xemaRainReadingsUrl(startAt: string, endAt: string, offset = 0) {
  if (!Number.isInteger(offset) || offset < 0) throw new Error("XEMA reading offset must be a non-negative integer");
  const start = floatingUtc(startAt, "XEMA window start");
  const end = floatingUtc(endAt, "XEMA window end");
  if (start >= end) throw new Error("XEMA reading window is empty or inverted");
  const url = new URL(`${XEMA_SOCRATA_ORIGIN}/resource/${XEMA_MEASUREMENTS_DATASET}.json`);
  url.searchParams.set("$select", "codi_estacio,codi_variable,data_lectura,valor_lectura,codi_base");
  url.searchParams.set(
    "$where",
    `codi_variable='${XEMA_RAIN_VARIABLE_CODE}' AND data_lectura >= '${start}' AND data_lectura < '${end}'`,
  );
  url.searchParams.set("$order", "data_lectura,codi_estacio");
  url.searchParams.set("$limit", String(XEMA_PAGE_LIMIT));
  url.searchParams.set("$offset", String(offset));
  return url;
}

// The provider's response time varies from under a second to minutes for the
// same query, so every request carries its own deadline and transport errors
// retry alongside retryable statuses.
export const XEMA_REQUEST_TIMEOUT_MS = 60_000;

export async function fetchXemaRows(url: URL, context: string, attempts = 3): Promise<unknown[]> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Bolets-Atles/1.0" },
        signal: AbortSignal.timeout(XEMA_REQUEST_TIMEOUT_MS),
      });
      if (response.ok) {
        const payload = await response.json();
        if (!Array.isArray(payload)) throw new Error(`XEMA ${context} response is not a row list`);
        return payload;
      }
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === attempts) throw new Error(`XEMA ${context} request returned ${response.status}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith(`XEMA ${context}`)) throw error;
      if (attempt === attempts) {
        const reason = error instanceof Error ? error.message : "unknown transport error";
        throw new Error(`XEMA ${context} request failed: ${reason}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
  }
  throw new Error(`XEMA ${context} request failed`);
}

export function normalizeXemaStation(input: unknown): XemaStation | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const row = input as Record<string, unknown>;
  const stationCode = typeof row.codi_estacio === "string" ? row.codi_estacio.trim().toUpperCase() : "";
  const stationName = typeof row.nom_estacio === "string" ? row.nom_estacio.trim() : "";
  const latitude = finiteNumber(row.latitud);
  const longitude = finiteNumber(row.longitud);
  const altitude = finiteNumber(row.altitud);
  if (!STATION_CODE_PATTERN.test(stationCode) || !stationName || stationName.length > 120) return undefined;
  if (latitude === undefined || latitude < STATION_BOUNDS.minLatitude || latitude > STATION_BOUNDS.maxLatitude) return undefined;
  if (longitude === undefined || longitude < STATION_BOUNDS.minLongitude || longitude > STATION_BOUNDS.maxLongitude) return undefined;
  if (altitude === undefined || altitude < -5 || altitude > 3500) return undefined;
  return {
    station_code: stationCode,
    station_name: stationName,
    latitude,
    longitude,
    altitude_m: altitude,
  };
}

type SemihourlyReading = {
  stationCode: string;
  readingAt: number;
  precipitationMm: number;
};

function normalizeReading(input: unknown): SemihourlyReading | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const row = input as Record<string, unknown>;
  if (row.codi_variable !== XEMA_RAIN_VARIABLE_CODE) return undefined;
  if (row.codi_base !== undefined && row.codi_base !== XEMA_SEMIHOURLY_BASE_CODE) return undefined;
  const stationCode = typeof row.codi_estacio === "string" ? row.codi_estacio.trim().toUpperCase() : "";
  if (!STATION_CODE_PATTERN.test(stationCode)) return undefined;
  const readingTime = typeof row.data_lectura === "string" ? row.data_lectura : "";
  // Floating provider timestamps are universal time; anchor them explicitly.
  const readingAt = Date.parse(readingTime.endsWith("Z") ? readingTime : `${readingTime}Z`);
  if (!Number.isFinite(readingAt)) return undefined;
  const minutes = new Date(readingAt).getUTCMinutes();
  if ((minutes !== 0 && minutes !== 30) || new Date(readingAt).getUTCSeconds() !== 0) return undefined;
  const precipitationMm = finiteNumber(row.valor_lectura);
  if (precipitationMm === undefined || precipitationMm < 0 || precipitationMm > XEMA_MAX_SEMIHOURLY_MM) return undefined;
  return { stationCode, readingAt, precipitationMm };
}

/**
 * Collapses semi-hourly readings into station hours. Duplicate rows for one
 * station and half hour keep the last published value; `sample_count` records
 * how many distinct half hours support each hour so consumers can require
 * complete hours instead of mistaking outages for dry weather.
 */
export function aggregateXemaRainHours(rows: unknown[]): XemaHourlyRain[] {
  const semihourly = new Map<string, SemihourlyReading>();
  for (const row of rows) {
    const reading = normalizeReading(row);
    if (reading) semihourly.set(`${reading.stationCode}|${reading.readingAt}`, reading);
  }
  const hours = new Map<string, { stationCode: string; hourStart: number; totalMm: number; halfHours: Set<number> }>();
  for (const reading of semihourly.values()) {
    const hourStart = reading.readingAt - (reading.readingAt % 3_600_000);
    const key = `${reading.stationCode}|${hourStart}`;
    const bucket = hours.get(key) ?? {
      stationCode: reading.stationCode,
      hourStart,
      totalMm: 0,
      halfHours: new Set<number>(),
    };
    bucket.totalMm += reading.precipitationMm;
    bucket.halfHours.add(reading.readingAt);
    hours.set(key, bucket);
  }
  return [...hours.values()]
    .filter((bucket) => bucket.totalMm <= XEMA_MAX_HOURLY_MM)
    .sort((left, right) => left.hourStart - right.hourStart || left.stationCode.localeCompare(right.stationCode))
    .map((bucket) => ({
      station_code: bucket.stationCode,
      hour_start: new Date(bucket.hourStart).toISOString(),
      precipitation_mm: Math.round(bucket.totalMm * 10) / 10,
      sample_count: bucket.halfHours.size,
    }));
}

export function haversineKm(aLatitude: number, aLongitude: number, bLatitude: number, bLongitude: number) {
  const toRadians = Math.PI / 180;
  const halfLatitude = Math.sin(((bLatitude - aLatitude) * toRadians) / 2);
  const halfLongitude = Math.sin(((bLongitude - aLongitude) * toRadians) / 2);
  const chord = halfLatitude * halfLatitude +
    Math.cos(aLatitude * toRadians) * Math.cos(bLatitude * toRadians) * halfLongitude * halfLongitude;
  return 12_742 * Math.asin(Math.min(1, Math.sqrt(chord)));
}

export type StationRainSample = {
  station_code: string;
  latitude: number;
  longitude: number;
  precipitation_mm: number;
};

export type StationRainInterpolation = {
  precipitation_mm: number;
  stations_used: number;
  nearest_station_km: number;
};

export const XEMA_INTERPOLATION = {
  maxDistanceKm: 30,
  maxStations: 6,
  minStations: 2,
  power: 2,
} as const;

/**
 * Versions the promoted past-precipitation source: gauge inverse-distance
 * hours where the XEMA network is dense enough, the seamless Météo-France
 * blend elsewhere. Promoted 2026-08-16 on the 12-run station sweep: AROME
 * missed 9 real storms and invented 16 phantom ones across six cells and
 * two seasons, and phantom autumn rain inflates soil-water state just as
 * badly as missed summer rain suppresses it.
 */
export const STATION_RAIN_SOURCE_VERSION = "station-rain-v1";

export type StationHourSeries = {
  station_code: string;
  latitude: number;
  longitude: number;
  hours: Record<string, number>;
};

/**
 * Validates one row of the `get_xema_rain_matrix` RPC: a station with its
 * complete gauge hours keyed by Europe/Madrid local time strings, matching
 * the provider's hourly axis format.
 */
export function normalizeStationMatrixRow(input: unknown): StationHourSeries | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const row = input as Record<string, unknown>;
  const stationCode = typeof row.station_code === "string" ? row.station_code : "";
  const latitude = finiteNumber(row.latitude);
  const longitude = finiteNumber(row.longitude);
  if (!STATION_CODE_PATTERN.test(stationCode) || latitude === undefined || longitude === undefined) return undefined;
  const rawHours = row.hours;
  if (!rawHours || typeof rawHours !== "object" || Array.isArray(rawHours)) return undefined;
  const hours: Record<string, number> = {};
  for (const [time, value] of Object.entries(rawHours as Record<string, unknown>)) {
    const millimetres = finiteNumber(value);
    if (millimetres !== undefined && millimetres >= 0 && millimetres <= XEMA_MAX_HOURLY_MM) {
      hours[time] = millimetres;
    }
  }
  return { station_code: stationCode, latitude, longitude, hours };
}

const MADRID_HOUR_KEY_FORMAT = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * The Europe/Madrid local hour key used by `get_xema_rain_matrix`, for hourly
 * axes delivered as epoch seconds (historical requests use timeformat
 * unixtime, while the live refresh receives local-time strings directly).
 */
export function madridHourKey(epochSeconds: number) {
  if (!Number.isFinite(epochSeconds)) return undefined;
  return MADRID_HOUR_KEY_FORMAT.format(new Date(epochSeconds * 1000)).replace(" ", "T");
}

/**
 * Builds the promoted past-precipitation series for one grid point: per
 * hour, the gauge inverse-distance value when enough complete stations sit
 * within the cutoff, otherwise the aligned fallback model value. Hours the
 * gauges cannot cover keep model semantics (including the fallback's own
 * nulls), so window-completeness guards behave exactly as before.
 */
export function buildStationCorrectedPrecipitation(
  hourlyTimes: unknown[],
  fallbackPrecipitation: unknown[],
  stations: StationHourSeries[],
  targetLatitude: number,
  targetLongitude: number,
  options: Partial<typeof XEMA_INTERPOLATION> = {},
): { series: (number | null)[]; gaugeHours: number; totalHours: number } {
  const settings = { ...XEMA_INTERPOLATION, ...options };
  const candidates = stations
    .map((station) => ({
      station,
      distanceKm: haversineKm(targetLatitude, targetLongitude, station.latitude, station.longitude),
    }))
    .filter((entry) => entry.distanceKm <= settings.maxDistanceKm);
  let gaugeHours = 0;
  const series = hourlyTimes.map((time, index) => {
    const fallback = finiteNumber(fallbackPrecipitation[index]) ?? null;
    const hourKey = typeof time === "number" ? madridHourKey(time) : typeof time === "string" ? time : undefined;
    if (!hourKey || candidates.length < settings.minStations) return fallback;
    const samples: StationRainSample[] = [];
    for (const candidate of candidates) {
      const value = candidate.station.hours[hourKey];
      if (value !== undefined) {
        samples.push({
          station_code: candidate.station.station_code,
          latitude: candidate.station.latitude,
          longitude: candidate.station.longitude,
          precipitation_mm: value,
        });
      }
    }
    const interpolated = interpolateStationRain(targetLatitude, targetLongitude, samples, settings);
    if (!interpolated) return fallback;
    gaugeHours += 1;
    return interpolated.precipitation_mm;
  });
  return { series, gaugeHours, totalHours: hourlyTimes.length };
}

/**
 * Inverse-distance-weighted station rain at one target point. Returns
 * undefined instead of guessing when the network is too thin nearby, so a
 * cell far from every gauge keeps its model value rather than a fabricated
 * observation. Gauge smoothing deliberately spreads convective cells over
 * the neighbourhood: for sustained-wetness ecology a smeared measured storm
 * beats a confidently dry mis-placed model storm.
 */
export function interpolateStationRain(
  targetLatitude: number,
  targetLongitude: number,
  samples: StationRainSample[],
  options: Partial<typeof XEMA_INTERPOLATION> = {},
): StationRainInterpolation | undefined {
  const settings = { ...XEMA_INTERPOLATION, ...options };
  const ranked = samples
    .filter((sample) =>
      Number.isFinite(sample.latitude) && Number.isFinite(sample.longitude) &&
      Number.isFinite(sample.precipitation_mm) && sample.precipitation_mm >= 0
    )
    .map((sample) => ({
      sample,
      distanceKm: haversineKm(targetLatitude, targetLongitude, sample.latitude, sample.longitude),
    }))
    .filter((entry) => entry.distanceKm <= settings.maxDistanceKm)
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, settings.maxStations);
  if (ranked.length < settings.minStations) return undefined;
  // A station effectively at the target point is the measurement itself.
  const coincident = ranked[0].distanceKm < 0.05;
  let weightTotal = 0;
  let weightedRain = 0;
  for (const entry of ranked) {
    const weight = coincident
      ? (entry.distanceKm < 0.05 ? 1 : 0)
      : 1 / Math.pow(entry.distanceKm, settings.power);
    weightTotal += weight;
    weightedRain += weight * entry.sample.precipitation_mm;
  }
  if (weightTotal <= 0) return undefined;
  return {
    precipitation_mm: Math.round((weightedRain / weightTotal) * 10) / 10,
    stations_used: ranked.length,
    nearest_station_km: Math.round(ranked[0].distanceKm * 100) / 100,
  };
}
