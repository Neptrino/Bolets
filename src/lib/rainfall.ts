import type { ConditionSnapshot, SpeciesProfile } from "@/src/lib/types";

const RECENT_EFFECTIVE_RAIN_TARGET_MM = 15;
const DRY_SPELL_MEMORY_DAYS = 14;
const REFERENCE_ET_LOSS_SHARE = 0.5;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function moisturePreferenceScore(value: number, preference: string) {
  const normalized = preference.toLowerCase();
  const target = normalized.includes("alta") ? 0.32 : normalized.includes("baixa") ? 0.16 : 0.24;
  return clampScore(100 - (Math.abs(value - target) / 0.2) * 100);
}

function priorMoistureDependency(value: string) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("essencial") || normalized.includes("molt important")) return 0.85;
  if (normalized.includes("moderad")) return 0.55;
  if (normalized.includes("important")) return 0.7;
  return 0.65;
}

export type RainfallSuitabilityComponents = {
  recentPulse: number;
  antecedentWaterBalance: number;
  drySpellRetention: number;
  soilMoistureMean: number;
  soilMoistureFloor: number;
  soilMoistureTrend: number;
  antecedentReadiness: number;
  effectiveTrigger: number;
  score: number;
};

export const rainfallRequiredFields = [
  "rainfall3dMm",
  "rainfall7dMm",
  "rainfallPrevious23dMm",
  "rainfall30dMm",
  "drySpellDays",
  "evapotranspiration3dMm",
  "evapotranspiration7dMm",
  "evapotranspiration30dMm",
  "soilMoistureMin7d",
  "soilMoistureAvg7d",
  "soilMoistureTrend7d",
] as const satisfies readonly (keyof ConditionSnapshot["values"])[];

export function missingRainfallFields(values: ConditionSnapshot["values"]) {
  return rainfallRequiredFields.filter((field) => values[field] === undefined);
}

/**
 * Combines a recent rain trigger with the state left by the previous month.
 * ET0 is deliberately discounted because it is reference-crop atmospheric
 * demand, not a direct measurement of water lost from the forest floor.
 */
export function rainfallSuitability(
  species: SpeciesProfile,
  values: ConditionSnapshot["values"],
): RainfallSuitabilityComponents | null {
  if (missingRainfallFields(values).length) return null;

  const rainfall3d = values.rainfall3dMm!;
  const rainfall7d = values.rainfall7dMm!;
  const antecedentRainfall = values.rainfallPrevious23dMm!;
  const et3d = values.evapotranspiration3dMm!;
  const et7d = values.evapotranspiration7dMm!;
  const antecedentEt = Math.max(0, values.evapotranspiration30dMm! - et7d);
  const olderRecentRainfall = Math.max(0, rainfall7d - rainfall3d);
  const olderRecentEt = Math.max(0, et7d - et3d);
  const recentEffectiveRain =
    Math.max(0, rainfall3d - et3d * REFERENCE_ET_LOSS_SHARE) +
    Math.max(0, olderRecentRainfall - olderRecentEt * REFERENCE_ET_LOSS_SHARE) * 0.5;
  const recentPulse = clampScore((recentEffectiveRain / RECENT_EFFECTIVE_RAIN_TARGET_MM) * 100);

  const antecedentWaterBalance = antecedentEt > 0
    ? clampScore((antecedentRainfall / antecedentEt) * 100)
    : antecedentRainfall > 0 ? 100 : 0;
  const drySpellRetention = clampScore((1 - values.drySpellDays! / DRY_SPELL_MEMORY_DAYS) * 100);
  const soilMoistureMean = moisturePreferenceScore(
    values.soilMoistureAvg7d!,
    species.ecologicalConfig.climate.soilMoisture,
  );
  const soilMoistureFloor = moisturePreferenceScore(
    values.soilMoistureMin7d!,
    species.ecologicalConfig.climate.soilMoisture,
  );
  const soilMoistureTrend = clampScore(50 + values.soilMoistureTrend7d! * 1000);
  const antecedentReadiness =
    soilMoistureMean * 0.3 +
    soilMoistureFloor * 0.15 +
    soilMoistureTrend * 0.15 +
    antecedentWaterBalance * 0.25 +
    drySpellRetention * 0.15;

  // Rain 8–30 days ago can retain a limited signal while the soil remains wet,
  // but cannot substitute indefinitely for a new rainfall pulse.
  const carryoverTrigger = antecedentWaterBalance * (drySpellRetention / 100) * 0.5;
  const effectiveTrigger = Math.max(recentPulse, carryoverTrigger);
  const dependency = priorMoistureDependency(species.ecologicalConfig.rainfall.priorMoisture);
  const readinessModifier = (1 - dependency) + dependency * (antecedentReadiness / 100);
  const score = Math.round(clampScore(effectiveTrigger * readinessModifier) * 100) / 100;

  return {
    recentPulse,
    antecedentWaterBalance,
    drySpellRetention,
    soilMoistureMean,
    soilMoistureFloor,
    soilMoistureTrend,
    antecedentReadiness,
    effectiveTrigger,
    score,
  };
}
