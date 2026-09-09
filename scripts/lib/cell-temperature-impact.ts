import { calculateSuitability } from "../../src/lib/scoring";
import { terrainThermalCorrection } from "../../src/lib/hydrothermal-v2";
import type { ConditionSnapshot, SpeciesProfile } from "../../src/lib/types";

const HOUR = 3_600_000;
const THERMAL_FIELDS = ["temperatureAvg14dC", "temperatureAvg20dC", "heatHours14d", "heatHours20d", "frostHours14d", "frostHours20d"] as const;
export type ThermalControl = {
  latitude: number;
  longitude: number;
  elevationM: number;
  hours: Map<number, number>;
};

function thermalAggregates(temperatures: number[]) {
  const fourteen = temperatures.slice(-336);
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  return {
    temperatureAvg14dC: mean(fourteen),
    temperatureAvg20dC: mean(temperatures),
    heatHours14d: fourteen.filter((value) => value >= 27).length,
    heatHours20d: temperatures.filter((value) => value >= 27).length,
    frostHours14d: fourteen.filter((value) => value <= 0).length,
    frostHours20d: temperatures.filter((value) => value <= 0).length,
  };
}

function summary(species: SpeciesProfile, snapshot: ConditionSnapshot) {
  const score = calculateSuitability(species, snapshot);
  return {
    score: score.opportunityIndex,
    conditions: score.fruitingConditionsScore,
    modelVersion: score.modelVersion,
    components: Object.fromEntries(score.components.map((component) => [component.id, component.score])),
    inputMean20dC: snapshot.values.temperatureAvg20dC,
    thermalReferenceElevationM: snapshot.values.weatherElevationM,
    cellMean20dC: terrainThermalCorrection(snapshot.values).temperatureAvg20dC ?? snapshot.values.temperatureAvg20dC,
    heatHours20d: snapshot.values.heatHours20d,
    frostHours20d: snapshot.values.frostHours20d,
  };
}

/**
 * Offline temperature-only what-if, anchored to the exact stored 480 hours.
 * Unsupported bias hours retain baseline. Bad control data withholds only the
 * comparison, never the production baseline. No water/phenology/habitat change.
 */
export function compareCellTemperature(
  species: SpeciesProfile,
  snapshot: ConditionSnapshot,
  source: ThermalControl,
  biasAtInstant: (hour: number) => number | undefined,
) {
  return replayCellTemperature(species, snapshot, source, biasAtInstant, "bias");
}

/** Complete estimated series already at cell elevation: do not apply lapse twice. */
export function compareCellObservedTemperature(
  species: SpeciesProfile, snapshot: ConditionSnapshot, source: ThermalControl,
  temperatureAtInstant: (hour: number) => number | undefined,
) {
  return replayCellTemperature(species, snapshot, source, temperatureAtInstant, "cell-estimate");
}

function replayCellTemperature(
  species: SpeciesProfile, snapshot: ConditionSnapshot, source: ThermalControl,
  atInstant: (hour: number) => number | undefined, mode: "bias" | "cell-estimate",
) {
  const baseline = summary(species, snapshot);
  const unavailable = (reason: string) => ({ status: "unavailable" as const, reason, baseline });
  if (snapshot.stale || baseline.score === null) return unavailable("baseline-unavailable");
  const values = snapshot.values;
  const time = values.weatherObservedAt ? Date.parse(values.weatherObservedAt) : NaN;
  if (!Number.isFinite(time) || time % HOUR !== 0) return unavailable("missing-weather-valid-hour");
  if (!["Météo-France AROME France", "Météo-France AROME France historical forecast"].includes(values.weatherModel ?? "") || values.atmosphericResolutionM !== 2500 ||
    !Number.isFinite(source.latitude) || !Number.isFinite(source.longitude) || !Number.isFinite(source.elevationM) ||
    values.weatherGridLatitude === undefined || Math.abs(values.weatherGridLatitude - source.latitude) > 1e-5 ||
    values.weatherGridLongitude === undefined || Math.abs(values.weatherGridLongitude - source.longitude) > 1e-5 ||
    values.weatherElevationM === undefined || Math.abs(values.weatherElevationM - source.elevationM) > 0.01) {
    return unavailable("representative-source-mismatch");
  }
  const hours = Array.from({ length: 480 }, (_, i) => time - (479 - i) * HOUR);
  const original = hours.map((hour) => source.hours.get(hour));
  if (original.some((temperature) => temperature === undefined || !Number.isFinite(temperature))) {
    return unavailable("incomplete-control-window");
  }
  const temperatures = original as number[];
  const control = thermalAggregates(temperatures);
  if (THERMAL_FIELDS.some((field) => values[field] === undefined ||
    Math.abs(values[field]! - control[field]) > (field.startsWith("temperature") ? 0.02 : 0))) {
    return unavailable("stored-thermal-control-mismatch");
  }
  const estimates = hours.map((hour) => atInstant(hour));
  if (mode === "cell-estimate" && (estimates.some((value) => value === undefined) || !Number.isFinite(values.altitudeM))) {
    return unavailable("incomplete-cell-temperature-estimate");
  }
  if (estimates.some((value) => value !== undefined && (!Number.isFinite(value) ||
    (mode === "bias" ? Math.abs(value) > 3 : value < -50 || value > 60)))) {
    return unavailable(mode === "bias" ? "invalid-station-bias" : "invalid-cell-temperature-estimate");
  }
  const adjustments = estimates.map((value, i) => value === undefined ? undefined : mode === "bias" ? value : value - temperatures[i]);
  const corrected = thermalAggregates(temperatures.map((value, i) => value + (adjustments[i] ?? 0)));
  const scenario: ConditionSnapshot = { ...snapshot, values: { ...values, ...corrected } };
  if (mode === "cell-estimate") scenario.values.weatherElevationM = values.altitudeM;
  // Any retained distribution describes the original series only.
  delete scenario.values.thermalExposure;
  delete scenario.values.heatDegreeHours14d;
  delete scenario.values.heatDegreeHours20d;
  const outcome = summary(species, scenario);
  if (outcome.score === null) return unavailable("scenario-unavailable");
  for (const component of ["water", "habitatCoverage", "altitude", "phenology"]) {
    if (baseline.components[component] !== outcome.components[component]) throw new Error("Temperature scenario changed a protected scoring component");
  }
  return {
    status: "available" as const,
    confidence: "limited" as const,
    methodVersion: mode === "bias" ? "cell-temperature-impact-shadow-v1" : "cell-observed-temperature-impact-shadow-v1",
    baseline,
    scenario: outcome,
    control,
    corrected,
    supportedHours: adjustments.filter((bias) => bias !== undefined).length,
    totalHours: 480,
    meanAppliedBiasC: adjustments.reduce<number>((sum, bias) => sum + (bias ?? 0), 0) / 480,
    minimumAppliedBiasC: Math.min(...adjustments.map((bias) => bias ?? 0)),
    maximumAppliedBiasC: Math.max(...adjustments.map((bias) => bias ?? 0)),
    scoreChange: outcome.score - baseline.score!,
  };
}

/** Biases from interval centres bracketing an instantaneous model sample. */
export function intervalBiasAtInstant(at: (hour: number) => number | undefined, instant: number) {
  const before = at(instant - HOUR);
  const after = at(instant);
  return before !== undefined && after !== undefined ? (before + after) / 2 : undefined;
}
