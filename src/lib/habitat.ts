import { getSpecies } from "@/data/species";
import { altitudeHabitatEnvelope, altitudeSuitabilityScore } from "@/src/lib/altitude";
import { getOccurrenceSupport } from "@/src/lib/occurrences";
import {
  HABITAT_MODEL_VERSION,
  PREDICTION_CACHE_VERSION,
} from "@/src/lib/model-versions";
import { spatialHabitatResponseSchema } from "@/src/lib/schema";
import type { ConditionSnapshot, PotentialHabitatCell, SpatialBounds, SpatialGridSizeM, SpeciesProfile } from "@/src/lib/types";

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

export function habitatProfileKey(species: SpeciesProfile) {
  const phRange = species.ecologicalConfig.soil.phRange;
  return [
    HABITAT_MODEL_VERSION,
    species.modelConfig.version,
    habitatForestTerms(species).sort().join(","),
    species.ecologicalConfig.habitat.altitude.join("-"),
    phRange?.join("-") ?? "any-ph",
  ].join("|");
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

  const altitude = values.altitudeM === undefined
    ? "unknown"
    : altitudeSuitabilityScore(values.altitudeM, species.ecologicalConfig.habitat.altitude) > 0 ? "compatible" : "incompatible";

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
  const [habitat, occurrenceEvidence] = await Promise.all([
    getPotentialHabitatCoverage(speciesId, bounds, limit, gridSizeM),
    getOccurrenceSupport(speciesId, bounds)
  ]);
  return { ...habitat, occurrenceEvidence };
}

export async function getPotentialHabitatCoverage(
  speciesId: string,
  bounds: SpatialBounds,
  limit = 1000,
  gridSizeM: SpatialGridSizeM = 5000
) {
  const species = getSpecies(speciesId);
  if (!species) throw new Error("Unknown species");
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) throw new Error("Spatial habitat service is not configured");

  const [altitudeCoreMin, altitudeCoreMax] = species.ecologicalConfig.habitat.altitude;
  const [altitudeMin, altitudeMax] = altitudeHabitatEnvelope(species.ecologicalConfig.habitat.altitude);
  const query = new URLSearchParams({
    mode: "habitat",
    modelVersion: HABITAT_MODEL_VERSION,
    readerVersion: PREDICTION_CACHE_VERSION,
    west: String(bounds.west),
    south: String(bounds.south),
    east: String(bounds.east),
    north: String(bounds.north),
    limit: String(Math.min(Math.max(Math.round(limit), 1), 1000)),
    resolution: String(gridSizeM),
    speciesId,
    habitatProfileKey: habitatProfileKey(species),
    altitudeMin: String(altitudeMin),
    altitudeMax: String(altitudeMax),
    altitudeCoreMin: String(altitudeCoreMin),
    altitudeCoreMax: String(altitudeCoreMax)
  });
  for (const term of habitatForestTerms(species)) query.append("forest", term);
  const phRange = species.ecologicalConfig.soil.phRange;
  if (phRange) {
    query.set("phMin", String(phRange[0]));
    query.set("phMax", String(phRange[1]));
  }

  const assetBaseUrl = process.env.HABITAT_ASSET_BASE_URL;
  if (assetBaseUrl) {
    try {
      const base = assetBaseUrl.endsWith("/") ? assetBaseUrl : `${assetBaseUrl}/`;
      const boundsKey = [bounds.west, bounds.south, bounds.east, bounds.north]
        .map((value) => value.toFixed(4))
        .join(",");
      const assetUrl = new URL(
        `${HABITAT_MODEL_VERSION}/${encodeURIComponent(speciesId)}/${gridSizeM}/${boundsKey}.json`,
        base,
      );
      const assetResponse = await fetch(assetUrl, {
        cache: "force-cache",
        next: { revalidate: 31_536_000 },
      });
      if (assetResponse.ok) {
        const asset = spatialHabitatResponseSchema.parse(await assetResponse.json());
        const cells: PotentialHabitatCell[] = asset.cells.map((cell) => ({
          speciesId,
          cellId: cell.cellId,
          regionId: cell.regionId,
          gridSizeM: cell.gridSizeM,
          cellBounds: cell.bounds,
          coverage: cell.coverage,
          altitudeWeightedCoverage: cell.altitudeWeightedCoverage ?? cell.coverage,
          eligibleCellCount: cell.eligibleCellCount,
          sourceResolutionM: cell.sourceResolutionM,
          confidence: cell.confidence,
          source: cell.source,
        }));
        return { cells, truncated: asset.truncated, modelVersion: HABITAT_MODEL_VERSION };
      }
    } catch (error) {
      console.error("Unable to read the configured habitat asset cache", error);
    }
  }

  const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/read-spatial-environment?${query}`, {
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      apikey: process.env.SUPABASE_ANON_KEY
    },
    // Static habitat is versioned by both model and profile keys in the URL.
    // Keep the service read in the Data Cache for the same lifetime advertised
    // by the public route instead of repeating an expensive spatial query.
    cache: "force-cache",
    next: { revalidate: 86_400 },
  });
  if (!response.ok) throw new Error(`Spatial habitat service returned ${response.status}`);
  const payload = spatialHabitatResponseSchema.parse(await response.json());
  const cells: PotentialHabitatCell[] = payload.cells.map((cell) => ({
    speciesId,
    cellId: cell.cellId,
    regionId: cell.regionId,
    gridSizeM: cell.gridSizeM,
    cellBounds: cell.bounds,
    coverage: cell.coverage,
    altitudeWeightedCoverage: cell.altitudeWeightedCoverage ?? cell.coverage,
    eligibleCellCount: cell.eligibleCellCount,
    sourceResolutionM: cell.sourceResolutionM,
    confidence: cell.confidence,
    source: cell.source
  }));
  return { cells, truncated: payload.truncated, modelVersion: HABITAT_MODEL_VERSION };
}
