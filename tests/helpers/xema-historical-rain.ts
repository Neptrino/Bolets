import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildStationCorrectedPrecipitation,
  madridHourKey,
  normalizeXemaStation,
  XEMA_MAX_HOURLY_MM,
  XEMA_MAX_SEMIHOURLY_MM,
  XEMA_MEASUREMENTS_DATASET,
  XEMA_RAIN_VARIABLE_CODE,
  XEMA_SOCRATA_ORIGIN,
  xemaStationsUrl,
  type StationHourSeries,
  type XemaStation,
} from "@/supabase/functions/_shared/xema-rain";
import type { OpenMeteoLocation } from "@/supabase/functions/_shared/open-meteo";

/**
 * Historical gauge rain for the findings-evaluation replay. Production past
 * precipitation is station-rain-v1 (gauge inverse distance over the seamless
 * Météo-France blend), but the ingestion tables only retain 60 days, so
 * replays of older findings read the same official Socrata dataset directly.
 *
 * Queries are grouped server side per UTC day (the provider answers per-day
 * aggregations in under a second where raw multi-day reads take minutes) and
 * carry no coordinates, so the shared per-day cache is location-blind.
 */
export const XEMA_HISTORICAL_RAIN_VERSION = "xema-historical-rain-v1";

const REQUEST_SPACING_MS = 150;
const FETCH_ATTEMPTS = 3;
const DAY_MS = 86_400_000;

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isoDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error("XEMA historical day must be an ISO calendar date");
  }
  return value;
}

/**
 * One UTC day of station rain, grouped to hours server side. Hours are kept
 * only when exactly two half-hour samples support them, which simultaneously
 * rejects outage hours, duplicated republications, and any non-semi-hourly
 * base rows — all of which would otherwise corrupt the sum.
 */
export function xemaDayHourlyUrl(day: string) {
  const start = isoDay(day);
  const end = new Date(Date.parse(`${start}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
  const url = new URL(`${XEMA_SOCRATA_ORIGIN}/resource/${XEMA_MEASUREMENTS_DATASET}.json`);
  url.searchParams.set(
    "$select",
    "codi_estacio,date_extract_hh(data_lectura) as hour,sum(valor_lectura) as mm,count(valor_lectura) as samples",
  );
  url.searchParams.set(
    "$where",
    `codi_variable='${XEMA_RAIN_VARIABLE_CODE}' AND data_lectura >= '${start}T00:00:00' ` +
      `AND data_lectura < '${end}T00:00:00' AND valor_lectura >= 0 ` +
      `AND valor_lectura <= ${XEMA_MAX_SEMIHOURLY_MM}`,
  );
  url.searchParams.set("$group", "codi_estacio,hour");
  url.searchParams.set("$limit", "20000");
  return url;
}

export type XemaDayHourRow = {
  stationCode: string;
  hourStartEpoch: number;
  precipitationMm: number;
};

export function normalizeDayHourRow(day: string, input: unknown): XemaDayHourRow | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const row = input as Record<string, unknown>;
  const stationCode = typeof row.codi_estacio === "string" ? row.codi_estacio.trim().toUpperCase() : "";
  const hour = Number(row.hour);
  const precipitationMm = Number(row.mm);
  const samples = Number(row.samples);
  if (!/^[A-Z0-9]{1,4}$/.test(stationCode)) return undefined;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return undefined;
  if (samples !== 2) return undefined;
  if (!Number.isFinite(precipitationMm) || precipitationMm < 0 || precipitationMm > XEMA_MAX_HOURLY_MM) {
    return undefined;
  }
  const hourStartEpoch = Math.floor(Date.parse(`${day}T00:00:00Z`) / 1000) + hour * 3600;
  return {
    stationCode,
    hourStartEpoch,
    precipitationMm: Math.round(precipitationMm * 10) / 10,
  };
}

async function fetchJsonCached(url: URL, cacheDir: string, context: string) {
  const file = join(
    cacheDir,
    `${createHash("sha256").update(url.toString()).digest("hex")}.json`,
  );
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8")) as unknown;
  let lastError: unknown;
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Bolets-Atles/1.0" },
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) throw new Error(`XEMA ${context} request returned ${response.status}`);
      const payload = await response.json();
      writeFileSync(file, JSON.stringify(payload), { mode: 0o600 });
      await wait(REQUEST_SPACING_MS);
      return payload as unknown;
    } catch (error) {
      lastError = error;
      await wait(attempt * 1500);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`XEMA ${context} request failed`);
}

let stationInventory: XemaStation[] | undefined;

// Both caches are per-process: replays visit the same calendar days for many
// locations, and re-parsing day files plus re-formatting Intl hour keys per
// location turns a cached sweep into hours of pure CPU.
const hourKeyByEpoch = new Map<number, string>();
const dayHoursCache = new Map<string, { stationCode: string; key: string; precipitationMm: number }[]>();

function cachedMadridHourKey(epochSeconds: number) {
  const cached = hourKeyByEpoch.get(epochSeconds);
  if (cached !== undefined) return cached;
  const key = madridHourKey(epochSeconds) ?? "";
  hourKeyByEpoch.set(epochSeconds, key);
  return key;
}

async function fetchStationInventory(cacheDir: string) {
  if (!stationInventory) {
    const rows = await fetchJsonCached(xemaStationsUrl(), cacheDir, "station inventory");
    if (!Array.isArray(rows)) throw new Error("XEMA station inventory response is not a row list");
    stationInventory = rows
      .map(normalizeXemaStation)
      .filter((station): station is XemaStation => station !== undefined);
  }
  return stationInventory;
}

/**
 * Builds the gauge matrix for an inclusive ISO date range: every validated
 * station with its complete hours keyed exactly as production keys them
 * (Europe/Madrid local time), ready for buildStationCorrectedPrecipitation.
 */
export async function fetchHistoricalStationSeries(
  startDate: string,
  endDate: string,
  cacheDir: string,
): Promise<StationHourSeries[]> {
  if (isoDay(startDate) > isoDay(endDate)) {
    throw new Error("XEMA historical range end must not precede its start");
  }
  mkdirSync(cacheDir, { recursive: true, mode: 0o700 });
  const stations = await fetchStationInventory(cacheDir);
  const hoursByStation = new Map<string, Record<string, number>>();
  for (
    let dayMs = Date.parse(`${startDate}T00:00:00Z`);
    dayMs <= Date.parse(`${endDate}T00:00:00Z`);
    dayMs += DAY_MS
  ) {
    const day = new Date(dayMs).toISOString().slice(0, 10);
    let dayHours = dayHoursCache.get(day);
    if (!dayHours) {
      const rows = await fetchJsonCached(xemaDayHourlyUrl(day), cacheDir, `day ${day}`);
      if (!Array.isArray(rows)) throw new Error(`XEMA day ${day} response is not a row list`);
      dayHours = [];
      for (const raw of rows) {
        const row = normalizeDayHourRow(day, raw);
        if (!row) continue;
        const key = cachedMadridHourKey(row.hourStartEpoch);
        if (!key) continue;
        dayHours.push({ stationCode: row.stationCode, key, precipitationMm: row.precipitationMm });
      }
      dayHoursCache.set(day, dayHours);
    }
    for (const row of dayHours) {
      const hours = hoursByStation.get(row.stationCode) ?? {};
      hours[row.key] = row.precipitationMm;
      hoursByStation.set(row.stationCode, hours);
    }
  }
  return stations
    .filter((station) => hoursByStation.has(station.station_code))
    .map((station) => ({
      station_code: station.station_code,
      latitude: station.latitude,
      longitude: station.longitude,
      hours: hoursByStation.get(station.station_code)!,
    }));
}

/**
 * Replaces a replay series' model precipitation with the production rain
 * stack: seamless Météo-France hours as the base (when supplied), gauge
 * inverse-distance hours on top where the network is dense enough. The
 * hourly axis must be epoch seconds (timeformat=unixtime).
 */
export function applyStationRainToLocation(
  location: OpenMeteoLocation,
  stations: StationHourSeries[],
  latitude: number,
  longitude: number,
  seamless?: OpenMeteoLocation,
) {
  const hourly = location.hourly as Record<string, unknown> | undefined;
  const times = Array.isArray(hourly?.time) ? hourly.time as unknown[] : [];
  let fallback = Array.isArray(hourly?.precipitation) ? hourly.precipitation as unknown[] : [];
  if (!times.length) return { gaugeCoverage: 0, applied: false };
  if (seamless) {
    const seamlessHourly = seamless.hourly as Record<string, unknown> | undefined;
    const seamlessTimes = Array.isArray(seamlessHourly?.time) ? seamlessHourly.time as unknown[] : [];
    const seamlessValues = Array.isArray(seamlessHourly?.precipitation)
      ? seamlessHourly.precipitation as unknown[]
      : [];
    const byTime = new Map<unknown, unknown>();
    for (let index = 0; index < Math.min(seamlessTimes.length, seamlessValues.length); index += 1) {
      byTime.set(seamlessTimes[index], seamlessValues[index]);
    }
    fallback = times.map((time) => byTime.get(time) ?? null);
  }
  const localKeys = times.map((time) =>
    typeof time === "number" ? cachedMadridHourKey(time) : ""
  );
  const corrected = buildStationCorrectedPrecipitation(
    localKeys,
    fallback,
    stations,
    latitude,
    longitude,
  );
  if (hourly) hourly.precipitation = corrected.series;
  const gaugeCoverage = corrected.totalHours
    ? Math.round((corrected.gaugeHours / corrected.totalHours) * 1000) / 1000
    : 0;
  return { gaugeCoverage, applied: gaugeCoverage > 0 };
}
