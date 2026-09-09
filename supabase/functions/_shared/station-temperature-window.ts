import { MAX_TEMPERATURE_STATIONS } from "./station-temperature-field.ts";
import type { StationTemperatureWindow } from "./station-temperature-scoring.ts";
import type { StationTemperatureHour } from "./xema-temperature.ts";

/** A full network window repeats neither station codes nor timestamps per hour.
 * Nulls and V/P flags preserve absence and validation without rounding values. */
export type PackedStationTemperatureWindow = Omit<StationTemperatureWindow, "hours"> & {
  encoding: "station-hour-series-v1";
  series: { stationCode: string; temperaturesC: Array<number | null>; validation: string }[];
};
const HOUR = 3_600_000;
export function packStationTemperatureWindow(window: StationTemperatureWindow): PackedStationTemperatureWindow {
  const series = new Map<string, PackedStationTemperatureWindow["series"][number]>();
  const first = window.endAt - 480 * HOUR;
  const known = new Set(window.stations.map((station) => station.station_code));
  for (const hour of window.hours) {
    const index = (hour.hour - first) / HOUR;
    if (!Number.isFinite(hour.temperatureC) || hour.temperatureC < -50 || hour.temperatureC > 60 ||
      !["validated", "provisional"].includes(hour.validation) || !known.has(hour.stationCode) || !Number.isInteger(index) || index < 0 || index > 480) throw new Error("Invalid frozen station hour");
    const entry = series.get(hour.stationCode) ?? { stationCode: hour.stationCode, temperaturesC: Array(481).fill(null), validation: ".".repeat(481) };
    if (entry.temperaturesC[index] !== null) throw new Error("Duplicate frozen station hour");
    entry.temperaturesC[index] = hour.temperatureC;
    entry.validation = entry.validation.slice(0, index) + (hour.validation === "validated" ? "V" : "P") + entry.validation.slice(index + 1);
    series.set(hour.stationCode, entry);
  }
  return { version: window.version, endAt: window.endAt, stations: window.stations,
    encoding: "station-hour-series-v1", series: [...series.values()].sort((a, b) => a.stationCode.localeCompare(b.stationCode)) };
}

export function unpackStationTemperatureWindow(value: unknown): StationTemperatureWindow | undefined {
  if (!value || typeof value !== "object") return;
  const input = value as PackedStationTemperatureWindow & { hours?: StationTemperatureHour[] };
  // Legacy publications retain their original representation and provenance.
  if (Array.isArray(input.hours) && input.encoding === undefined) return input as unknown as StationTemperatureWindow;
  if (input.encoding !== "station-hour-series-v1" || input.version !== "xema-arome-blend-v3" ||
    !Number.isFinite(input.endAt) || input.endAt % HOUR || !Array.isArray(input.stations) ||
    input.stations.length > MAX_TEMPERATURE_STATIONS || !Array.isArray(input.series) || input.series.length > MAX_TEMPERATURE_STATIONS) return;
  const known = new Set(input.stations.map((station) => station.station_code));
  const seen = new Set<string>();
  const hours: StationTemperatureHour[] = [];
  for (const series of input.series) {
    if (!known.has(series.stationCode) || seen.has(series.stationCode) || !Array.isArray(series.temperaturesC) ||
      series.temperaturesC.length !== 481 || typeof series.validation !== "string" || series.validation.length !== 481) return;
    seen.add(series.stationCode);
    for (let i = 0; i < 481; i++) {
      const temperatureC = series.temperaturesC[i], flag = series.validation[i];
      if (temperatureC === null && flag === ".") continue;
      if (typeof temperatureC !== "number" || !Number.isFinite(temperatureC) || temperatureC < -50 || temperatureC > 60 || !["V", "P"].includes(flag)) return;
      hours.push({ stationCode: series.stationCode, hour: input.endAt - (480 - i) * HOUR, temperatureC,
        validation: flag === "V" ? "validated" : "provisional" });
    }
  }
  return { version: input.version, endAt: input.endAt, stations: input.stations, hours };
}
