import { HEAT_HOUR_THRESHOLD_C } from "./open-meteo-core.ts";

/** Exact sufficient statistics for the two thermal windows, at provider elevation.
 * Bins retain provider precision; they are not rounded temperature classes.
 * Counts are [temperature C, hours in last 14 days, hours in last 20 days].
 */
export type ThermalExposure = {
  version: 1;
  elevationM: number;
  weight?: number;
  bins: [number, number, number][];
};

export const THERMAL_FIELDS = [
  "temperatureAvg14dC", "temperatureAvg20dC",
  "frostHours14d", "frostHours20d", "heatHours14d", "heatHours20d",
] as const;

function thermalLapseDeltaC(referenceM: number, targetM: number) {
  return Math.max(-6, Math.min(6, 6.5 * (referenceM - targetM) / 1000));
}

export function buildThermalExposure(
  temperatures20d: readonly number[] | undefined,
  elevationM: number | undefined,
): ThermalExposure[] | undefined {
  if (!temperatures20d || temperatures20d.length !== 480 ||
      elevationM === undefined || !Number.isFinite(elevationM) ||
      temperatures20d.some((value) => !Number.isFinite(value) || value < -90 || value > 60)) {
    return undefined;
  }
  const bins = new Map<number, [number, number, number]>();
  temperatures20d.forEach((value, index) => {
    const bin = bins.get(value) ?? [value, 0, 0];
    if (index >= 144) bin[1]++;
    bin[2]++;
    bins.set(value, bin);
  });
  return [{ version: 1, elevationM, bins: [...bins.values()].sort((a, b) => a[0] - b[0]) }];
}

export function validThermalExposure(value: unknown): value is ThermalExposure[] {
  if (!Array.isArray(value) || !value.length || value.length > 128) return false;
  return value.every((point) => {
    if (!point || point.version !== 1 || !Number.isFinite(point.elevationM) ||
        (point.weight !== undefined && (!Number.isInteger(point.weight) || point.weight < 1 || point.weight > 8192)) ||
        !Array.isArray(point.bins) || !point.bins.length || point.bins.length > 480) return false;
    let count14 = 0;
    let count20 = 0;
    let previous = -Infinity;
    for (const bin of point.bins) {
      if (!Array.isArray(bin) || bin.length !== 3) return false;
      const [temperature, hours14, hours20] = bin;
      if (!Number.isFinite(temperature) || temperature < -90 || temperature > 60 ||
          temperature <= previous || !Number.isInteger(hours14) || !Number.isInteger(hours20) ||
          hours14 < 0 || hours20 <= 0 || hours14 > hours20) return false;
      previous = temperature;
      count14 += hours14;
      count20 += hours20;
    }
    return count14 === 336 && count20 === 480;
  });
}

/** Compress repeated distributions while preserving their aggregation weights. */
export function mergeThermalExposure(values: unknown[]): ThermalExposure[] | undefined {
  if (!values.length || !values.every(validThermalExposure)) return undefined;
  const unique = new Map<string, ThermalExposure>();
  for (const points of values) for (const point of points) {
    const key = JSON.stringify([point.version, point.elevationM, point.bins]);
    const existing = unique.get(key);
    unique.set(key, existing
      ? { ...existing, weight: (existing.weight ?? 1) + (point.weight ?? 1) }
      : { ...point });
  }
  const merged = [...unique.values()];
  return validThermalExposure(merged) ? merged : undefined;
}

/** Diagnostic scenario only: the fixed hourly lapse assumption failed findings
 * validation and must never feed production scores. Recount threshold crossings
 * after shifting every bin, never shift a count.
 * Mixed parents retain the existing mean-temperature / maximum-exposure rule,
 * but each source is corrected from its own elevation before aggregation.
 */
export function diagnosticThermalExposureAtElevation(exposure: ThermalExposure[], altitudeM: number) {
  const result = Object.fromEntries(THERMAL_FIELDS.map((field) => [field, 0])) as
    Record<typeof THERMAL_FIELDS[number], number>;
  const totalWeight = exposure.reduce((sum, point) => sum + (point.weight ?? 1), 0);
  for (const point of exposure) {
    const delta = thermalLapseDeltaC(point.elevationM, altitudeM);
    for (const days of [14, 20] as const) {
      let total = 0;
      let frost = 0;
      let heat = 0;
      for (const [temperature, hours14, hours20] of point.bins) {
        const hours = days === 14 ? hours14 : hours20;
        const local = temperature + delta;
        total += local * hours;
        if (local <= 0) frost += hours;
        if (local >= HEAT_HOUR_THRESHOLD_C) heat += hours;
      }
      result[`temperatureAvg${days}dC`] += total * (point.weight ?? 1) / (days * 24 * totalWeight);
      result[`frostHours${days}d`] = Math.max(result[`frostHours${days}d`], frost);
      result[`heatHours${days}d`] = Math.max(result[`heatHours${days}d`], heat);
    }
  }
  return result;
}

/** Keep optional diagnostic distributions out of public prediction details. */
export function withoutThermalExposure<T extends object>(values: T): T {
  const result: T & { thermalExposure?: unknown } = { ...values };
  delete result.thermalExposure;
  return result;
}
