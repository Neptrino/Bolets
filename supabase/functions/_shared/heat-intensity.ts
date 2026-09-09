import { validThermalExposure } from "./thermal-exposure.ts";

export const HEAT_DEGREE_FIELDS = ["heatDegreeHours14d", "heatDegreeHours20d"] as const;
export type HeatDegreeHours = Record<typeof HEAT_DEGREE_FIELDS[number], number>;

/** Degrees above 27 C summed over complete hours; never lapse-correct here. */
export function heatDegreeHoursFromTemperatures(series: readonly number[] | undefined): HeatDegreeHours | undefined {
  if (!series || series.length !== 480 || series.some((t) => !Number.isFinite(t) || t < -90 || t > 60)) return undefined;
  return {
    heatDegreeHours14d: series.slice(-336).reduce((n, t) => n + Math.max(0, t - 27), 0),
    heatDegreeHours20d: series.reduce((n, t) => n + Math.max(0, t - 27), 0),
  };
}

export function validHeatDegreeHours(value: Record<string, unknown>): boolean {
  return HEAT_DEGREE_FIELDS.every((key) => typeof value[key] === "number" && Number.isFinite(value[key]) &&
    Number(value[key]) >= 0 && Number(value[key]) <= 33 * (key.endsWith("14d") ? 336 : 480)) &&
    Number(value.heatDegreeHours14d) <= Number(value.heatDegreeHours20d) + 1e-8;
}

/** Older raw snapshots can recover intensity from their exact, controlled bins.
 * Corrected station estimates must supply their own intensity; never reuse the
 * provider distribution after changing the temperature reference. */
export function heatDegreeHours(values: Record<string, unknown>): HeatDegreeHours | undefined {
  if (validHeatDegreeHours(values)) return {
    heatDegreeHours14d: Number(values.heatDegreeHours14d), heatDegreeHours20d: Number(values.heatDegreeHours20d),
  };
  const exposure = values.thermalExposure;
  if (values.thermalReferenceElevationM !== undefined || !validThermalExposure(exposure)) return undefined;
  const result = { heatDegreeHours14d: 0, heatDegreeHours20d: 0 };
  const totalWeight = exposure.reduce((sum, point) => sum + (point.weight ?? 1), 0);
  for (const days of [14, 20] as const) {
    let maximumHeat = 0, maximumFrost = 0;
    let weightedMean = 0;
    for (const point of exposure) {
      let heat = 0, frost = 0, degree = 0;
      for (const [temperature, count14, count20] of point.bins) {
        const count = days === 14 ? count14 : count20;
        if (temperature >= 27) heat += count;
        if (temperature <= 0) frost += count;
        degree += Math.max(0, temperature - 27) * count;
        weightedMean += temperature * count * (point.weight ?? 1) / totalWeight / (days * 24);
      }
      maximumHeat = Math.max(maximumHeat, heat);
      maximumFrost = Math.max(maximumFrost, frost);
      result[`heatDegreeHours${days}d`] = Math.max(result[`heatDegreeHours${days}d`], degree);
    }
    if (values[`heatHours${days}d`] !== maximumHeat || values[`frostHours${days}d`] !== maximumFrost) return undefined;
    const mean = values[`temperatureAvg${days}dC`];
    if (typeof mean !== "number" || !Number.isFinite(mean) || Math.abs(mean - weightedMean) > 0.02) return undefined;
  }
  return result;
}
