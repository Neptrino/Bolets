import {
  finiteNumber,
  type OpenMeteoLocation,
} from "./open-meteo-core.ts";
import {
  ROLLING_ATMOSPHERE_HISTORY_HOURS,
  ROLLING_PROVIDER_OVERLAP_HOURS,
} from "./open-meteo-config.ts";
import { drySpellDays, rainfallDays } from "./open-meteo-current.ts";

type HourlySeries = Map<number, number>;

function epochSecond(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value !== "string" || !/(?:Z|[+-]\d{2}:?\d{2})$/.test(value)) return undefined;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : undefined;
}

function latestHourlyEpoch(location: OpenMeteoLocation) {
  const times = Array.isArray(location.hourly?.time) ? location.hourly.time : [];
  let latest: number | undefined;
  for (const rawTime of times) {
    const time = epochSecond(rawTime);
    if (time !== undefined && (latest === undefined || time > latest)) latest = time;
  }
  return latest;
}

/**
 * A state is incremental-safe only when it contains every exact retained hour
 * and its newest hour still overlaps the next short provider request. Invalid
 * or older states deliberately trigger a full bootstrap instead of allowing a
 * silent hole to shorten any ecological window.
 */
export function openMeteoRollingHistoryNeedsBootstrap(
  location: OpenMeteoLocation | undefined,
  variables: readonly string[],
  referenceAt = new Date().toISOString(),
  historyHours = ROLLING_ATMOSPHERE_HISTORY_HOURS,
  overlapHours = ROLLING_PROVIDER_OVERLAP_HOURS,
) {
  if (!location?.hourly || !Array.isArray(location.hourly.time)) return true;
  const times = location.hourly.time as unknown[];
  if (times.length !== historyHours) return true;
  if (variables.some((key) => !Array.isArray(location.hourly?.[key]) ||
    (location.hourly?.[key] as unknown[]).length !== historyHours)) return true;
  const latest = latestHourlyEpoch(location);
  const referenceMilliseconds = Date.parse(referenceAt);
  if (latest === undefined || !Number.isFinite(referenceMilliseconds)) return true;
  const referenceHour = Math.floor(referenceMilliseconds / 3_600_000) * 3600;
  if (latest < referenceHour - (overlapHours - 2) * 3600) return true;
  for (let index = 0; index < times.length; index += 1) {
    const time = epochSecond(times[index]);
    if (time === undefined || time !== latest - (historyHours - 1 - index) * 3600) return true;
    if (variables.some((key) => finiteNumber((location.hourly?.[key] as unknown[])[index]) === undefined)) {
      return true;
    }
  }
  return false;
}

/**
 * Merges an incremental provider response into one exact, bounded hourly
 * history. Incoming values win so revised recent model hours are retained.
 * The merge fails closed unless every variable has all required samples.
 */
export function mergeOpenMeteoHourlyHistory(
  previous: OpenMeteoLocation | undefined,
  incoming: OpenMeteoLocation,
  variables: readonly string[],
  historyHours = ROLLING_ATMOSPHERE_HISTORY_HOURS,
): OpenMeteoLocation {
  const combined = new Map<number, Record<string, number>>();
  const mergeLocation = (location: OpenMeteoLocation | undefined) => {
    const times = Array.isArray(location?.hourly?.time) ? location.hourly.time as unknown[] : [];
    for (let index = 0; index < times.length; index += 1) {
      const time = epochSecond(times[index]);
      if (time === undefined) continue;
      const values = combined.get(time) ?? {};
      for (const key of variables) {
        const source = Array.isArray(location?.hourly?.[key])
          ? location.hourly[key] as unknown[]
          : [];
        const value = finiteNumber(source[index]);
        if (value !== undefined) values[key] = value;
      }
      combined.set(time, values);
    }
  };
  mergeLocation(previous);
  mergeLocation(incoming);

  const candidateTimes = [...combined.entries()]
    .filter(([, values]) => variables.every((key) => values[key] !== undefined))
    .map(([time]) => time)
    .sort((left, right) => right - left);
  const latest = candidateTimes[0];
  if (latest === undefined) throw new Error("Rolling Open-Meteo response has no complete hourly sample");
  const times = Array.from(
    { length: historyHours },
    (_, index) => latest - (historyHours - 1 - index) * 3600,
  );
  for (const time of times) {
    const values = combined.get(time);
    if (!values || variables.some((key) => values[key] === undefined)) {
      throw new Error(`Rolling Open-Meteo history is incomplete at ${new Date(time * 1000).toISOString()}`);
    }
  }

  const hourly: Record<string, unknown> = { time: times };
  for (const key of variables) hourly[key] = times.map((time) => combined.get(time)![key]);
  const current: Record<string, unknown> = { time: latest };
  for (const key of variables) current[key] = combined.get(latest)![key];
  return {
    latitude: finiteNumber(incoming.latitude) ?? finiteNumber(previous?.latitude),
    longitude: finiteNumber(incoming.longitude) ?? finiteNumber(previous?.longitude),
    elevation: finiteNumber(incoming.elevation) ?? finiteNumber(previous?.elevation),
    utc_offset_seconds: finiteNumber(incoming.utc_offset_seconds) ?? finiteNumber(previous?.utc_offset_seconds),
    current,
    hourly,
  };
}

/** Aligns a coarse provider series to another location's exact UTC axis. */
export function alignOpenMeteoHourlySeries(
  location: OpenMeteoLocation,
  key: string,
  targetTimes: unknown[],
) {
  const series = hourlySeries(location, key);
  return targetTimes.map((rawTime) => {
    const time = epochSecond(rawTime);
    return time === undefined ? null : series.get(time) ?? null;
  });
}

export function hourlySeries(location: OpenMeteoLocation, key: string): HourlySeries {
  const times = Array.isArray(location.hourly?.time) ? location.hourly.time : [];
  const source = Array.isArray(location.hourly?.[key]) ? location.hourly[key] as unknown[] : [];
  const values = new Map<number, number>();
  const seenTimes = new Set<number>();
  const duplicates = new Set<number>();
  for (let index = 0; index < Math.min(times.length, source.length); index += 1) {
    const time = epochSecond(times[index]);
    if (time === undefined) continue;
    if (seenTimes.has(time)) duplicates.add(time);
    seenTimes.add(time);
    const value = finiteNumber(source[index]);
    if (value === undefined) continue;
    values.set(time, value);
  }
  for (const time of duplicates) values.delete(time);
  return values;
}

export function forecastAtmosphericSeries(
  forecast: OpenMeteoLocation,
  key: string,
  history?: OpenMeteoLocation,
  cutover?: number,
) {
  const future = hourlySeries(forecast, key);
  if (!history || cutover === undefined) return future;

  const combined = new Map<number, number>();
  for (const [time, value] of hourlySeries(history, key)) {
    if (time <= cutover) combined.set(time, value);
  }
  for (const [time, value] of future) {
    if (time > cutover) combined.set(time, value);
  }
  return combined;
}

function completeWindow(series: HourlySeries, target: number, hours: number) {
  const values: number[] = [];
  for (let time = target - (hours - 1) * 3600; time <= target; time += 3600) {
    const value = series.get(time);
    if (value === undefined) return undefined;
    values.push(value);
  }
  return values;
}

export function completeSummary(series: HourlySeries, target: number, hours: number) {
  const values = completeWindow(series, target, hours);
  if (!values) return {};
  return {
    min: Math.min(...values),
    average: values.reduce((total, value) => total + value, 0) / values.length,
    max: Math.max(...values),
    values,
  };
}

export function completeSum(series: HourlySeries, target: number, hours: number) {
  const values = completeWindow(series, target, hours);
  return values?.reduce((total, value) => total + value, 0);
}

export function projectedDrySpellDays(series: HourlySeries, target: number) {
  const values = completeWindow(series, target, 720);
  if (!values) return undefined;
  return drySpellDays(values);
}

export function projectedRainfallDays(series: HourlySeries, target: number, days: number) {
  const values = completeWindow(series, target, days * 24);
  return values ? rainfallDays(values, days) : undefined;
}

export function projectedSoilTrend(series: HourlySeries, target: number) {
  const recent = completeWindow(series, target, 24);
  const previous = completeWindow(series, target - 24 * 3600, 144);
  if (!recent || !previous) return undefined;
  const average = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
  return average(recent) - average(previous);
}
