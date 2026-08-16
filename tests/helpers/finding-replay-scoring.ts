import { getSpecies } from "@/data/species";
import {
  extremeTemperatureMultiplier,
  missingHydrothermalFields,
  temperatureSuitability,
  waterSuitability,
} from "@/src/lib/hydrothermal";
import {
  calibrate,
  habitatWeight,
  missingHydrothermalFieldsV2,
  waterSuitabilityV2,
} from "@/src/lib/hydrothermal-v2";
import { phenologySuitability } from "@/src/lib/scoring";
import type { ConditionSnapshot, PredictionCell } from "@/src/lib/types";

/**
 * Scoring helpers shared by the manual finding-replay tool and the diagnostic
 * evaluation harness, so both resolve cells and decompose scores identically.
 */

export type ReplayLocation = {
  latitude: number;
  longitude: number;
};

export const STATIC_HABITAT_FIELDS = [
  "altitudeM",
  "habitatAltitudeSuitability",
  "habitatCoveragePercent",
  "forestTypes",
  "treeSpecies",
  "soilPh",
  "soilTexture",
  "soilSubstrate",
  "geologicalSubstrate",
] as const;

export function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function contains(cell: PredictionCell, location: ReplayLocation) {
  const [[west, south], [east, north]] = cell.cellBounds;
  return location.longitude >= west && location.longitude <= east &&
    location.latitude >= south && location.latitude <= north;
}

export async function predictionCell(
  location: ReplayLocation,
  speciesId: string,
  appUrl: string,
) {
  const radius = 0.004;
  const params = new URLSearchParams({
    species: speciesId,
    west: String(location.longitude - radius),
    south: String(location.latitude - radius),
    east: String(location.longitude + radius),
    north: String(location.latitude + radius),
    resolution: "250",
    limit: "64",
  });
  const response = await fetch(`${appUrl}/api/predictions?${params}`);
  if (!response.ok) throw new Error(`Prediction API returned ${response.status}`);
  const payload = await response.json() as { cells?: PredictionCell[] };
  if (!Array.isArray(payload.cells)) {
    throw new Error("Prediction API returned an invalid historical-replay payload");
  }
  const cell = payload.cells.find((candidate) => contains(candidate, location));
  if (!cell) throw new Error("No canonical 250 m cell contains one private finding");
  return cell;
}

export function definedValues(
  values: ConditionSnapshot["values"],
): ConditionSnapshot["values"] {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as ConditionSnapshot["values"];
}

export function staticValues(cell: PredictionCell): ConditionSnapshot["values"] {
  const values: ConditionSnapshot["values"] = {};
  for (const field of STATIC_HABITAT_FIELDS) {
    const value = cell.values[field];
    if (value !== undefined) Object.assign(values, { [field]: value });
  }
  return values;
}

/** Required-field check that follows whichever model version scores a species. */
export function missingFieldsForModel(
  profile: NonNullable<ReturnType<typeof getSpecies>>,
  values: ConditionSnapshot["values"],
) {
  const model = profile.modelConfig;
  if (model.status !== "supported") return [];
  return model.model === "hydrothermal-v2"
    ? missingHydrothermalFieldsV2(values, model.water, model.temperature)
    : missingHydrothermalFields(values, model.water, model.temperature);
}

/**
 * Recomputes every hydrothermal component from raw model functions rather than
 * the rounded published scores, so component attribution keeps full precision.
 */
export function rawDiagnostics(
  profile: NonNullable<ReturnType<typeof getSpecies>>,
  observedAt: string,
  values: ConditionSnapshot["values"],
) {
  const habitat = values.habitatCoveragePercent === undefined
    ? null
    : Math.max(0, Math.min(1, values.habitatCoveragePercent / 100));
  const altitude = values.habitatAltitudeSuitability === undefined
    ? null
    : Math.max(0, Math.min(1, values.habitatAltitudeSuitability / 100));
  const effectiveHabitat = habitat === null || altitude === null
    ? habitat === 0 || altitude === 0 ? 0 : null
    : habitat * altitude;
  if (profile.modelConfig.status !== "supported") {
    return {
      habitat,
      altitude,
      effectiveHabitat,
      habitatFactor: effectiveHabitat,
      phenology: null,
      water: null,
      temperature: null,
      extremes: null,
      fruitingConditions: null,
      opportunity: null,
    };
  }
  const model = profile.modelConfig;
  const phenology = phenologySuitability(
    observedAt,
    model.phenology.monthlyAnchors,
  );
  const waterDetails = model.model === "hydrothermal-v2"
    ? waterSuitabilityV2(values, model.water)
    : waterSuitability(values, model.water);
  const water = waterDetails?.score ?? null;
  const temperature = temperatureSuitability(values, model.temperature);
  const extremes = extremeTemperatureMultiplier(values, model.temperature);
  const rawFruitingConditions = [phenology, water, temperature, extremes].every(
    (value) => value !== null,
  )
    ? phenology! *
      water! ** model.water.waterExponent *
      temperature! ** (1 - model.water.waterExponent) *
      extremes!
    : null;
  const fruitingConditions = rawFruitingConditions === null
    ? null
    : model.model === "hydrothermal-v2"
      ? calibrate(rawFruitingConditions, model.combination.calibrationGamma)
      : rawFruitingConditions;
  const habitatFactor = effectiveHabitat === null
    ? null
    : model.model === "hydrothermal-v2"
      ? habitatWeight(effectiveHabitat, model.combination.habitatExponent)
      : effectiveHabitat;
  const opportunity = fruitingConditions === null || habitatFactor === null
    ? null
    : habitatFactor * fruitingConditions;
  return {
    habitat,
    altitude,
    effectiveHabitat,
    habitatFactor,
    phenology,
    water,
    waterDetails,
    temperature,
    extremes,
    fruitingConditions,
    opportunity,
  };
}
