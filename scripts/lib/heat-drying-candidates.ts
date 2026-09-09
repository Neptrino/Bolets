import type { ConditionSnapshot, SpeciesProfile } from "../../src/lib/types";

/** Frozen count-based control for reproducing the pre-intensity experiments.
 * Other ecological parameters are still checked against stored score controls. */
export function countBasedSpecies(profile: SpeciesProfile): SpeciesProfile {
  const species = structuredClone(profile);
  if (species.modelConfig.status === "supported" && species.modelConfig.model === "hydrothermal-v2") {
    delete species.modelConfig.temperature.heatIntensityWidthC;
    species.modelConfig.version = "hydrothermal-v2-priors-2026-09a";
  }
  return species;
}

/** Offline scoring sensitivity only. Never persist these synthetic input fields. */
export const HEAT_DRYING_CANDIDATES = [
  { name: "baseline", etCoefficient: 0.5 },
  { name: "et-075", etCoefficient: 0.75 },
  { name: "heat-3c", etCoefficient: 0.5, heatWidthC: 3 },
  { name: "heat-6c", etCoefficient: 0.5, heatWidthC: 6 },
  { name: "et-075-heat-3c", etCoefficient: 0.75, heatWidthC: 3 },
  { name: "et-075-heat-6c", etCoefficient: 0.75, heatWidthC: 6 },
] as const;

export type HeatDryingCandidate = {
  name: string;
  etCoefficient: number;
  heatWidthC?: number;
};

/** One hour at 33 C is six times one hour at 28 C; no recency or lapse change. */
export function heatEquivalentHours(temperatures: readonly number[], widthC: number) {
  if (!Number.isFinite(widthC) || widthC <= 0 || temperatures.some((t) => !Number.isFinite(t))) {
    throw new RangeError("Heat severity requires finite temperatures and a positive width");
  }
  return temperatures.reduce((sum, temperature) => sum + Math.max(0, temperature - 27) / widthC, 0);
}

export function heatDryingSnapshot(
  snapshot: ConditionSnapshot,
  candidate: HeatDryingCandidate,
  controlledTemperatures?: readonly number[],
): ConditionSnapshot {
  if (!Number.isFinite(candidate.etCoefficient) || candidate.etCoefficient < 0) {
    throw new RangeError("ET coefficient must be finite and nonnegative");
  }
  const values = { ...snapshot.values };
  // The production scorer deducts 0.5 ET0. Rescaling only its private input
  // reproduces the candidate coefficient while using the exact shared engine.
  for (const field of ["evapotranspiration7dMm", "evapotranspiration14dMm",
    "evapotranspiration21dMm", "evapotranspiration26dMm", "evapotranspiration30dMm"] as const) {
    if (values[field] !== undefined) values[field] *= candidate.etCoefficient / 0.5;
  }
  if (candidate.heatWidthC !== undefined && controlledTemperatures !== undefined) {
    if (controlledTemperatures.length !== 480) throw new RangeError("Heat comparison requires all 480 hours");
    values.heatHours14d = heatEquivalentHours(controlledTemperatures.slice(-336), candidate.heatWidthC);
    values.heatHours20d = heatEquivalentHours(controlledTemperatures, candidate.heatWidthC);
  }
  return { ...snapshot, values };
}
