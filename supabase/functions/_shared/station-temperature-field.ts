import { haversineKm, type XemaStation } from "./xema-rain.ts";
import type { StationTemperatureHour } from "./xema-temperature.ts";

export const STATION_TEMPERATURE_VERSION = "xema-arome-blend-v2";
export const STATION_TEMPERATURE_MAX_LAG_HOURS = 12;

/** Only a contiguous unpublished tail is tolerated, never an older coverage gap. */
export function stationTemperatureTailLag(supported: boolean[]): number | undefined {
  const firstMissing = supported.indexOf(false);
  if (firstMissing < 0) return 0;
  const lag = supported.length - firstMissing;
  return lag <= STATION_TEMPERATURE_MAX_LAG_HOURS && supported.slice(firstMissing).every((v) => !v)
    ? lag : undefined;
}

export const STATION_TEMPERATURE_CODES = ["CG", "DG", "DP", "MS", "W9", "YA", "ZC", "ZD"] as const;

export const STATION_BIAS_EXPERIMENT = {
  version: "xema-temperature-diurnal-shadow-v1",
  maxDistanceKm: 50,
  maxElevationDifferenceM: 600,
  distanceScaleKm: 25,
  elevationScaleM: 400,
  minimumDonors: 2,
  minimumDaysPerHour: 5,
  maximumAbsoluteBiasC: 3,
} as const;

export const STATION_DONOR_TAPER = { distanceKm: 10, elevationM: 100 } as const;
export type StationDonorTaper = { distanceKm: number; elevationM: number };

/** C1 fade to zero before the existing hard support limit, without extending it. */
function edgeWeight(remaining: number, width: number) {
  const x = Math.max(0, Math.min(1, remaining / width));
  return x * x * (3 - 2 * x);
}

export function stationTemperatureDonors(
  stations: XemaStation[], target: Pick<XemaStation, "station_code" | "latitude" | "longitude" | "altitude_m">,
  taper?: StationDonorTaper,
) {
  const config = STATION_BIAS_EXPERIMENT;
  if (taper && (!(taper.distanceKm > 0 && taper.distanceKm <= config.maxDistanceKm) ||
    !(taper.elevationM > 0 && taper.elevationM <= config.maxElevationDifferenceM))) throw new Error("Invalid station donor taper");
  return stations.filter((other) => other.station_code !== target.station_code).flatMap((other) => {
    const distance = haversineKm(target.latitude, target.longitude, other.latitude, other.longitude);
    const elevation = Math.abs(target.altitude_m - other.altitude_m);
    if (distance > config.maxDistanceKm || elevation > config.maxElevationDifferenceM) return [];
    let weight = Math.exp(-0.5 * ((distance / config.distanceScaleKm) ** 2 + (elevation / config.elevationScaleM) ** 2));
    if (taper) weight *= edgeWeight(config.maxDistanceKm - distance, taper.distanceKm) *
      edgeWeight(config.maxElevationDifferenceM - elevation, taper.elevationM);
    if (weight <= 0) return [];
    return [{ code: other.station_code, weight, elevationM: other.altitude_m, distanceKm: distance }];
  });
}

/** Complete-hour observation interpolation shared by production and replay. */
export function createStationObservedTemperature(
  observations: StationTemperatureHour[], stations: XemaStation[], lapseCPerKm: 0 | 6.5 = 6.5,
  taper?: StationDonorTaper,
) {
  const lookup = new Map<string, number>();
  for (const hour of observations) {
    const key = `${hour.stationCode}|${hour.hour}`;
    if (!Number.isFinite(hour.temperatureC) || (lookup.has(key) && lookup.get(key) !== hour.temperatureC)) {
      throw new Error("Invalid or conflicting station temperature hour");
    }
    lookup.set(key, hour.temperatureC);
  }
  return (target: Pick<XemaStation, "station_code" | "latitude" | "longitude" | "altitude_m">) => {
    if (![target.latitude, target.longitude, target.altitude_m].every(Number.isFinite)) throw new Error("Invalid interpolation target");
    const donors = stationTemperatureDonors(stations, target, taper);
    return (hour: number) => {
      const eligible = donors.flatMap((donor) => {
        const observed = lookup.get(`${donor.code}|${hour}`);
        if (observed === undefined) return [];
        const adjustmentC = -(target.altitude_m - donor.elevationM) * lapseCPerKm / 1000;
        return [{ ...donor, temperatureC: observed + adjustmentC, adjustmentC }];
      });
      if (eligible.length < STATION_BIAS_EXPERIMENT.minimumDonors) return undefined;
      const weight = eligible.reduce((sum, donor) => sum + donor.weight, 0);
      return {
        temperatureC: eligible.reduce((sum, donor) => sum + donor.weight * donor.temperatureC, 0) / weight,
        donors: eligible.map((donor) => ({ ...donor, normalizedWeight: donor.weight / weight })),
      };
    };
  };
}

export const STATION_MODEL_BLEND_EXPERIMENT = {
  version: "xema-arome-equal-blend-shadow-v1",
  stationWeight: 0.5,
  lapseCPerKm: 6.5,
  maximumModelElevationAdjustmentC: 6,
} as const;

export function stationModelBlendConfig(mode = "original") {
  if (!["original", "tapered"].includes(mode)) throw new Error("Unknown station blend mode");
  return { ...STATION_MODEL_BLEND_EXPERIMENT,
    version: mode === "tapered" ? "xema-arome-equal-blend-tapered-shadow-v2" : STATION_MODEL_BLEND_EXPERIMENT.version,
    donorTaper: mode === "tapered" ? STATION_DONOR_TAPER : undefined };
}

/** Hourly shift used only with a complete, observation-supported blend. */
export function modelTemperatureAtElevation(temperatureC: number | undefined, sourceM: number, targetM: number) {
  if (temperatureC === undefined || ![temperatureC, sourceM, targetM].every(Number.isFinite)) return undefined;
  const config = STATION_MODEL_BLEND_EXPERIMENT;
  const delta = Math.max(-config.maximumModelElevationAdjustmentC,
    Math.min(config.maximumModelElevationAdjustmentC, (sourceM - targetM) * config.lapseCPerKm / 1000));
  return temperatureC + delta;
}

/** Both inputs must already represent the same elevation and time interval. */
export function blendStationModelTemperature(modelC: number | undefined, stationC: number | undefined) {
  if (modelC === undefined || stationC === undefined || ![modelC, stationC].every(Number.isFinite)) return undefined;
  const weight = STATION_MODEL_BLEND_EXPERIMENT.stationWeight;
  return modelC * (1 - weight) + stationC * weight;
}
