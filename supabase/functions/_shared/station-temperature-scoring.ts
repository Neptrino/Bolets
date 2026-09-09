import {
  blendStationModelTemperature, createStationObservedTemperature, modelTemperatureAtElevation,
  STATION_DONOR_TAPER, STATION_TEMPERATURE_CODES, STATION_TEMPERATURE_VERSION, stationTemperatureTailLag,
} from "./station-temperature-field.ts";
import type { XemaStation } from "./xema-rain.ts";
import type { StationTemperatureHour } from "./xema-temperature.ts";

const HOUR = 3_600_000;
export const THERMAL_FIELDS = ["temperatureAvg14dC", "temperatureAvg20dC", "heatHours14d", "heatHours20d", "frostHours14d", "frostHours20d"] as const;
export type ThermalSources = Array<{ id: string; weight?: number }>;
export type StationTemperatureWindow = {
  version: typeof STATION_TEMPERATURE_VERSION | "xema-arome-blend-v1";
  endAt: number;
  stations: XemaStation[];
  hours: StationTemperatureHour[];
};
export type ThermalModelWindow = {
  version: typeof STATION_TEMPERATURE_VERSION | "xema-arome-blend-v1";
  endAt: number;
  latitude: number;
  longitude: number;
  elevationM: number;
  temperaturesC: number[];
  stationWindowId: string;
};

export function thermalAggregates(temperatures: number[]) {
  const fourteen = temperatures.slice(-336);
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  return {
    temperatureAvg14dC: mean(fourteen), temperatureAvg20dC: mean(temperatures),
    heatHours14d: fourteen.filter((value) => value >= 27).length,
    heatHours20d: temperatures.filter((value) => value >= 27).length,
    frostHours14d: fourteen.filter((value) => value <= 0).length,
    frostHours20d: temperatures.filter((value) => value <= 0).length,
  };
}

export function validThermalSources(value: unknown): value is ThermalSources {
  return Array.isArray(value) && value.length > 0 && value.length <= 128 && value.every((v) =>
    v && typeof v.id === "string" && /^[a-f0-9]{64}$/.test(v.id) &&
    (v.weight === undefined || (Number.isInteger(v.weight) && v.weight > 0)));
}

/** Missing evidence from any contributing atmospheric point keeps the baseline. */
export function mergeThermalSources(values: unknown[]): ThermalSources | undefined {
  if (!values.length || !values.every(validThermalSources)) return undefined;
  const weights = new Map<string, number>();
  for (const sources of values) for (const source of sources) {
    weights.set(source.id, (weights.get(source.id) ?? 0) + (source.weight ?? 1));
  }
  if (weights.size > 128) return undefined;
  return [...weights].map(([id, weight]) => weight === 1 ? { id } : { id, weight });
}

function validModel(value: ThermalModelWindow | undefined): value is ThermalModelWindow {
  return !!value && [STATION_TEMPERATURE_VERSION, "xema-arome-blend-v1"].includes(value.version) &&
    [value.endAt, value.latitude, value.longitude, value.elevationM].every(Number.isFinite) && value.endAt % HOUR === 0 &&
    Array.isArray(value.temperaturesC) && value.temperaturesC.length === 480 &&
    value.temperaturesC.every((v) => Number.isFinite(v) && v >= -50 && v <= 60);
}

function validStations(value: StationTemperatureWindow | undefined): value is StationTemperatureWindow {
  return !!value && [STATION_TEMPERATURE_VERSION, "xema-arome-blend-v1"].includes(value.version) && Number.isFinite(value.endAt) &&
    Array.isArray(value.stations) && new Set(value.stations.map((s) => s.station_code)).size === value.stations.length &&
    value.stations.every((s) => (STATION_TEMPERATURE_CODES as readonly string[]).includes(s.station_code) &&
      [s.latitude, s.longitude, s.altitude_m].every(Number.isFinite)) &&
    Array.isArray(value.hours) && value.hours.every((h) =>
      Number.isFinite(h.hour) && h.hour % HOUR === 0 && Number.isFinite(h.temperatureC) && h.temperatureC >= -50 && h.temperatureC <= 60 &&
      ["validated", "provisional"].includes(h.validation));
}

type Values = Record<string, unknown>;
/** No source requests, species parameters, or water changes occur here. */
export function createStationTemperatureScorer(
  models: Map<string, ThermalModelWindow>, windows: Map<string, StationTemperatureWindow>,
) {
  const fields = new Map<string, ReturnType<typeof createStationObservedTemperature>>();
  for (const [id, window] of windows) {
    if (!validStations(window)) continue;
    try { fields.set(id, createStationObservedTemperature(window.hours, window.stations, 6.5, STATION_DONOR_TAPER)); }
    catch { /* A conflicting optional window must preserve the original score. */ }
  }
  return (values: Values, latitude: number, longitude: number): Values => {
    const altitudeM = values.altitudeM;
    if (!validThermalSources(values.thermalSources) || typeof altitudeM !== "number" ||
      ![latitude, longitude, altitudeM].every(Number.isFinite) || values.thermalReferenceElevationM !== undefined ||
      !["Météo-France AROME France", "Météo-France AROME France historical forecast"].includes(String(values.weatherModel)) ||
      values.atmosphericResolutionM !== 2500) return values;
    const entries = values.thermalSources.map((s) => ({ model: models.get(s.id), weight: s.weight ?? 1 }));
    if (entries.some((e) => !validModel(e.model))) return values;
    const points = entries as Array<{ model: ThermalModelWindow; weight: number }>;
    const time = Date.parse(String(values.weatherObservedAt));
    if (!Number.isFinite(time) || points.some((p) => p.model.endAt !== time)) return values;
    const total = points.reduce((n, p) => n + p.weight, 0);
    const average = (at: (m: ThermalModelWindow) => number) => points.reduce((n, p) => n + p.weight * at(p.model), 0) / total;
    if (typeof values.weatherGridLatitude !== "number" || Math.abs(values.weatherGridLatitude - average((m) => m.latitude)) > 1e-5 ||
      typeof values.weatherGridLongitude !== "number" || Math.abs(values.weatherGridLongitude - average((m) => m.longitude)) > 1e-5 ||
      typeof values.weatherElevationM !== "number" || Math.abs(values.weatherElevationM - average((m) => m.elevationM)) > (total > 1 ? 0.51 : 0.01)) return values;
    const combine = (aggregates: ReturnType<typeof thermalAggregates>[]) => Object.fromEntries(THERMAL_FIELDS.map((f) =>
      [f, f.startsWith("temperature") ? aggregates.reduce((n, a, i) => n + a[f] * points[i].weight, 0) / total : Math.max(...aggregates.map((a) => a[f]))])) as ReturnType<typeof thermalAggregates>;
    const control = combine(points.map((p) => thermalAggregates(p.model.temperaturesC)));
    if (THERMAL_FIELDS.some((f) => typeof values[f] !== "number" ||
      Math.abs((values[f] as number) - control[f]) > (f.startsWith("temperature") ? 0.02 : 0))) return values;
    const corrected: ReturnType<typeof thermalAggregates>[] = [];
    let provisional = false;
    let minimumDonors = Infinity;
    let modelOnlyHours = 0;
    for (const { model } of points) {
      const window = windows.get(model.stationWindowId);
      const field = fields.get(model.stationWindowId);
      if (!window || !field || window.endAt !== time) return values;
      const at = field({ station_code: "cell", latitude, longitude, altitude_m: altitudeM });
      const intervals = Array.from({ length: 481 }, (_, i) => at(time - (480 - i) * HOUR, false));
      const lag = stationTemperatureTailLag(intervals.map(Boolean));
      if (lag === undefined) return values;
      modelOnlyHours = Math.max(modelOnlyHours, lag);
      const temperatures: number[] = [];
      // Preserve the diagnostic's interval-centre approximation exactly.
      for (let i = 0; i < 480; i++) {
        const before = intervals[i], after = intervals[i + 1];
        if (!before || !after) {
          // Preserve provider extremes for the unpublished tail: no unsupported
          // hourly lapse recount. Mean elevation alignment is applied below.
          temperatures.push(model.temperaturesC[i]);
          continue;
        }
        minimumDonors = Math.min(minimumDonors, before.donorCount, after.donorCount);
        const estimate = blendStationModelTemperature(
          modelTemperatureAtElevation(model.temperaturesC[i], model.elevationM, altitudeM),
          (before.temperatureC + after.temperatureC) / 2,
        );
        if (estimate === undefined || estimate < -50 || estimate > 60) return values;
        temperatures.push(estimate);
      }
      provisional ||= window.hours.some((h) => h.validation === "provisional");
      const aggregates = thermalAggregates(temperatures);
      const meanAdjustment = modelTemperatureAtElevation(0, model.elevationM, altitudeM)!;
      aggregates.temperatureAvg14dC += meanAdjustment * lag / 336;
      aggregates.temperatureAvg20dC += meanAdjustment * lag / 480;
      corrected.push(aggregates);
    }
    return { ...values, ...combine(corrected), thermalExposure: undefined,
      thermalReferenceElevationM: altitudeM, temperatureSource: STATION_TEMPERATURE_VERSION,
      temperatureQuality: provisional ? "includes-provisional" : "validated",
      temperatureMinimumStations: minimumDonors, temperatureModelOnlyHours: modelOnlyHours };
  };
}
