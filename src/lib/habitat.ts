import { getSpecies } from "@/data/species";
import { getOccurrenceSupport } from "@/src/lib/occurrences";
import { spatialHabitatResponseSchema } from "@/src/lib/schema";
import type { ConditionSnapshot, PotentialHabitatCell, SpatialBounds, SpatialGridSizeM, SpeciesProfile } from "@/src/lib/types";

const HABITAT_MODEL_VERSION = "habitat-static-v2";

export type HabitatGateId = "forest" | "altitude" | "soilPh";
export type HabitatGateState = "compatible" | "incompatible" | "unknown";

export interface HabitatAssessment {
  eligible: boolean;
  complete: boolean;
  gates: Record<HabitatGateId, HabitatGateState>;
}

function normaliseTerm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function termsOverlap(observed: string[], preferred: string[]) {
  const candidates = observed.map(normaliseTerm).filter(Boolean);
  const targets = preferred.map(normaliseTerm).filter(Boolean);
  return candidates.some((candidate) => targets.some((target) =>
    candidate === target || candidate.includes(target) || target.includes(candidate)
  ));
}

export function habitatForestTerms(species: SpeciesProfile) {
  const terms = species.ecologicalConfig.habitat.forestTypes.flatMap((forestType) => {
    const normalised = normaliseTerm(forestType);
    const firstWord = normalised.split(" ")[0];
    return firstWord && firstWord !== normalised ? [normalised, firstWord] : [normalised];
  });
  return [...new Set(terms.filter((term) => term.length >= 3))];
}

export function assessPotentialHabitat(
  species: SpeciesProfile,
  values: Pick<ConditionSnapshot["values"], "altitudeM" | "forestTypes" | "treeSpecies" | "soilPh">
): HabitatAssessment {
  const observedForest = [...(values.forestTypes ?? []), ...(values.treeSpecies ?? [])];
  const preferredForest = [
    ...species.ecologicalConfig.habitat.forestTypes,
    ...species.ecologicalConfig.habitat.treeAssociations,
    ...species.ecologicalConfig.habitat.hosts
  ];
  const forest = observedForest.length
    ? termsOverlap(observedForest, preferredForest) ? "compatible" : "incompatible"
    : "unknown";

  const [altitudeMin, altitudeMax] = species.ecologicalConfig.habitat.altitude;
  const altitude = values.altitudeM === undefined
    ? "unknown"
    : values.altitudeM >= altitudeMin && values.altitudeM <= altitudeMax ? "compatible" : "incompatible";

  const phRange = species.ecologicalConfig.soil.phRange;
  const soilPh = !phRange
    ? "compatible"
    : values.soilPh === undefined
      ? "unknown"
      : values.soilPh >= phRange[0] && values.soilPh <= phRange[1] ? "compatible" : "incompatible";

  const gates = { forest, altitude, soilPh } satisfies HabitatAssessment["gates"];
  const complete = Object.values(gates).every((state) => state !== "unknown");
  return {
    eligible: complete && Object.values(gates).every((state) => state === "compatible"),
    complete,
    gates
  };
}

export async function getPotentialHabitatCells(
  speciesId: string,
  bounds: SpatialBounds,
  limit = 1000,
  gridSizeM: SpatialGridSizeM = 5000
) {
  const species = getSpecies(speciesId);
  if (!species) throw new Error("Unknown species");
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) throw new Error("Spatial habitat service is not configured");

  const [altitudeMin, altitudeMax] = species.ecologicalConfig.habitat.altitude;
  const query = new URLSearchParams({
    mode: "habitat",
    west: String(bounds.west),
    south: String(bounds.south),
    east: String(bounds.east),
    north: String(bounds.north),
    limit: String(Math.min(Math.max(Math.round(limit), 1), 1000)),
    resolution: String(gridSizeM),
    altitudeMin: String(altitudeMin),
    altitudeMax: String(altitudeMax)
  });
  for (const term of habitatForestTerms(species)) query.append("forest", term);
  const phRange = species.ecologicalConfig.soil.phRange;
  if (phRange) {
    query.set("phMin", String(phRange[0]));
    query.set("phMax", String(phRange[1]));
  }

  const habitatRequest = fetch(`${process.env.SUPABASE_URL}/functions/v1/read-spatial-environment?${query}`, {
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      apikey: process.env.SUPABASE_ANON_KEY
    },
    cache: "no-store"
  });
  const [response, occurrenceEvidence] = await Promise.all([
    habitatRequest,
    getOccurrenceSupport(speciesId, bounds)
  ]);
  if (!response.ok) throw new Error(`Spatial habitat service returned ${response.status}`);
  const payload = spatialHabitatResponseSchema.parse(await response.json());
  const cells: PotentialHabitatCell[] = payload.cells.map((cell) => ({
    speciesId,
    cellId: cell.cellId,
    regionId: cell.regionId,
    gridSizeM: cell.gridSizeM,
    cellBounds: cell.bounds,
    coverage: cell.coverage,
    eligibleCellCount: cell.eligibleCellCount,
    sourceResolutionM: cell.sourceResolutionM,
    confidence: cell.confidence,
    source: cell.source
  }));
  return { cells, truncated: payload.truncated, modelVersion: HABITAT_MODEL_VERSION, occurrenceEvidence };
}
