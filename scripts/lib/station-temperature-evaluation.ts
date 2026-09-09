import { haversineKm, type XemaStation } from "../../supabase/functions/_shared/xema-rain.ts";
import { type StationTemperatureHour } from "../../supabase/functions/_shared/xema-temperature.ts";

export type TemperaturePair = StationTemperatureHour & { modelC: number };

export function normalizeArchivedTemperature(input: unknown, station: XemaStation) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("AROME location must be an object");
  const value = input as {
    latitude: number; longitude: number; elevation: number; utc_offset_seconds: number;
    hourly_units?: { temperature_2m?: string };
    hourly?: { time?: unknown[]; temperature_2m?: unknown[] };
  };
  if (![value.latitude, value.longitude, value.elevation].every(Number.isFinite) ||
    haversineKm(station.latitude, station.longitude, value.latitude, value.longitude) > 10) {
    throw new Error("AROME location metadata does not match the requested station");
  }
  const times = value.hourly?.time;
  const temperatures = value.hourly?.temperature_2m;
  if (value.utc_offset_seconds !== 0 || value.hourly_units?.temperature_2m !== "°C" ||
    !Array.isArray(times) || !Array.isArray(temperatures) || times.length !== temperatures.length) {
    throw new Error("AROME hourly axis or units invalid");
  }
  const hours = new Map<number, number>();
  let previous = -Infinity;
  times.forEach((at, i) => {
    const ms = typeof at === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:00(?::00(?:\.000)?)?Z?$/.test(at)
      ? Date.parse(at.replace(/Z$/, "") + "Z") : NaN;
    if (!Number.isFinite(ms) || ms <= previous || new Date(ms).toISOString().slice(0, 16) !== String(at).slice(0, 16)) {
      throw new Error("AROME invalid, unordered or duplicate UTC hour");
    }
    previous = ms;
    const temperature = temperatures[i];
    if (typeof temperature === "number" && Number.isFinite(temperature) && temperature >= -50 && temperature <= 60) {
      hours.set(ms, temperature);
    }
  });
  return { latitude: value.latitude, longitude: value.longitude, elevation: value.elevation, hours };
}
export { STATION_BIAS_EXPERIMENT, STATION_DONOR_TAPER, stationTemperatureDonors, type StationDonorTaper } from "../../supabase/functions/_shared/station-temperature-field.ts";
import { STATION_BIAS_EXPERIMENT, stationTemperatureDonors } from "../../supabase/functions/_shared/station-temperature-field.ts";
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

export function temperatureMetrics(pairs: TemperaturePair[], predictions = pairs.map((pair) => pair.modelC)) {
  if (predictions.length !== pairs.length || predictions.some((value) => !Number.isFinite(value))) {
    throw new Error("Temperature predictions must align with every observed pair");
  }
  const errors = pairs.map((pair, i) => predictions[i] - pair.temperatureC);
  const count = (predicate: (value: number) => boolean, values: number[]) => values.filter(predicate).length;
  const observed = pairs.map((pair) => pair.temperatureC);
  const heat = (value: number) => value >= 27;
  const frost = (value: number) => value <= 0;
  return {
    pairedHours: pairs.length,
    validatedHours: pairs.filter((pair) => pair.validation === "validated").length,
    provisionalHours: pairs.filter((pair) => pair.validation === "provisional").length,
    biasC: mean(errors),
    maeC: mean(errors.map(Math.abs)),
    rmseC: errors.length ? Math.sqrt(mean(errors.map((e) => e * e))!) : null,
    // Fixed UTC blocks, explicitly not station sunrise/sunset classifications.
    daytime08To18UtcBiasC: mean(errors.filter((_, i) => {
      const hour = new Date(pairs[i].hour).getUTCHours();
      return hour >= 8 && hour < 18;
    })),
    otherHoursBiasC: mean(errors.filter((_, i) => {
      const hour = new Date(pairs[i].hour).getUTCHours();
      return hour < 8 || hour >= 18;
    })),
    observedHeatHours: count(heat, observed),
    predictedHeatHours: count(heat, predictions),
    heatFalsePositiveHours: pairs.filter((pair, i) => heat(predictions[i]) && !heat(pair.temperatureC)).length,
    heatFalseNegativeHours: pairs.filter((pair, i) => !heat(predictions[i]) && heat(pair.temperatureC)).length,
    observedFrostHours: count(frost, observed),
    predictedFrostHours: count(frost, predictions),
    frostFalsePositiveHours: pairs.filter((pair, i) => frost(predictions[i]) && !frost(pair.temperatureC)).length,
    frostFalseNegativeHours: pairs.filter((pair, i) => !frost(predictions[i]) && frost(pair.temperatureC)).length,
  };
}

/** Reusable offline field. A target never contributes its own observation. */
export function createStationTemperatureBias(
  pairs: TemperaturePair[], stations: XemaStation[], splitAt: number,
  mode: "diurnal" | "contemporaneous" = "diurnal",
) {
  const config = STATION_BIAS_EXPERIMENT;
  const training = new Map<string, number[]>();
  for (const pair of pairs) {
    if (mode === "diurnal" && pair.hour >= splitAt) continue;
    const key = `${pair.stationCode}|${mode === "diurnal" ? new Date(pair.hour).getUTCHours() : pair.hour}`;
    const values = training.get(key) ?? [];
    values.push(pair.temperatureC - pair.modelC);
    training.set(key, values);
  }
  return (target: Pick<XemaStation, "station_code" | "latitude" | "longitude" | "altitude_m">) => {
    const donors = stationTemperatureDonors(stations, target);
    return (at: number) => {
      const hour = mode === "diurnal" ? new Date(at).getUTCHours() : at;
      const eligible = donors.flatMap((donor) => {
        const values = training.get(`${donor.code}|${hour}`) ?? [];
        const minimumSamples = mode === "diurnal" ? config.minimumDaysPerHour : 1;
        return values.length >= minimumSamples ? [{ ...donor, bias: mean(values)! }] : [];
      });
      if (eligible.length < config.minimumDonors) return undefined;
      const bias = eligible.reduce((sum, donor) => sum + donor.weight * donor.bias, 0) /
        eligible.reduce((sum, donor) => sum + donor.weight, 0);
      return { biasC: Math.max(-config.maximumAbsoluteBiasC, Math.min(config.maximumAbsoluteBiasC, bias)), donorCodes: eligible.map((donor) => donor.code) };
    };
  };
}

/** Offline station evaluation: earlier-date fitting or same-hour peer inputs. */
export function evaluateStationBias(
  pairs: TemperaturePair[], stations: XemaStation[], splitAt: number,
  mode: "diurnal" | "contemporaneous" = "diurnal",
) {
  const config = STATION_BIAS_EXPERIMENT;
  const field = createStationTemperatureBias(pairs, stations, splitAt, mode);
  const stationResults = stations.map((target) => {
    const at = field(target);
    const test = pairs.filter((pair) => pair.stationCode === target.station_code && pair.hour >= splitAt);
    let supportedHours = 0;
    const corrected = test.map((pair) => {
      const adjustment = at(pair.hour);
      if (adjustment) supportedHours++;
      return pair.modelC + (adjustment?.biasC ?? 0);
    });
    return { stationCode: target.station_code, supportedHours, baseline: temperatureMetrics(test), corrected: temperatureMetrics(test, corrected) };
  });
  const active = stationResults.filter((row) => row.baseline.pairedHours > 0);
  return {
    config: { ...config, version: mode === "diurnal" ? config.version : "xema-temperature-contemporaneous-shadow-v1" },
    mode,
    splitAt: new Date(splitAt).toISOString(),
    validation: mode === "diurnal"
      ? "Leave one station out; train before split, evaluate after split; fixed parameters, no tuning"
      : "Leave one station out; same-hour peer observations are inputs, fixed spatial weights; evaluate dates after split. This is retrospective observation anchoring, not a forecast or time-held-out observation test.",
    stations: stationResults,
    summary: {
      stations: active.length,
      testedHours: active.reduce((sum, row) => sum + row.baseline.pairedHours, 0),
      supportedHours: active.reduce((sum, row) => sum + row.supportedHours, 0),
      baselineMeanStationMaeC: mean(active.map((row) => row.baseline.maeC!)),
      correctedMeanStationMaeC: mean(active.map((row) => row.corrected.maeC!)),
      baselineMeanAbsoluteHeatCountError: mean(active.map((row) => Math.abs(row.baseline.predictedHeatHours - row.baseline.observedHeatHours))),
      correctedMeanAbsoluteHeatCountError: mean(active.map((row) => Math.abs(row.corrected.predictedHeatHours - row.corrected.observedHeatHours))),
      baselineHeatClassificationErrors: active.reduce((sum, row) => sum + row.baseline.heatFalsePositiveHours + row.baseline.heatFalseNegativeHours, 0),
      correctedHeatClassificationErrors: active.reduce((sum, row) => sum + row.corrected.heatFalsePositiveHours + row.corrected.heatFalseNegativeHours, 0),
      baselineMeanAbsoluteFrostCountError: mean(active.map((row) => Math.abs(row.baseline.predictedFrostHours - row.baseline.observedFrostHours))),
      correctedMeanAbsoluteFrostCountError: mean(active.map((row) => Math.abs(row.corrected.predictedFrostHours - row.corrected.observedFrostHours))),
      baselineFrostClassificationErrors: active.reduce((sum, row) => sum + row.baseline.frostFalsePositiveHours + row.baseline.frostFalseNegativeHours, 0),
      correctedFrostClassificationErrors: active.reduce((sum, row) => sum + row.corrected.frostFalsePositiveHours + row.corrected.frostFalseNegativeHours, 0),
    },
  };
}
