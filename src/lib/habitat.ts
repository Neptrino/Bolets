import type { z } from "zod";
import { getSpecies } from "@/data/species";
import { altitudeHabitatEnvelope } from "@/src/lib/altitude";
import { getOccurrenceSupport } from "@/src/lib/occurrences";
import {
  HABITAT_MODEL_VERSION,
  PREDICTION_CACHE_VERSION,
} from "@/src/lib/model-versions";
import { spatialHabitatResponseSchema } from "@/src/lib/schema";
import type { PotentialHabitatCell, SpatialBounds, SpatialGridSizeM, SpeciesProfile } from "@/src/lib/types";
import { spatialServiceConfig } from "@/src/lib/spatial-service-auth.server";

type SpatialHabitatResponse = z.infer<typeof spatialHabitatResponseSchema>;

function toPotentialHabitatResponse(
  speciesId: string,
  response: SpatialHabitatResponse,
) {
  const cells: PotentialHabitatCell[] = response.cells.map((cell) => ({
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
  return { cells, truncated: response.truncated, modelVersion: HABITAT_MODEL_VERSION };
}

function normaliseTerm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
    habitatForestTerms(species).sort().join(","),
    species.ecologicalConfig.habitat.altitude.join("-"),
    phRange?.join("-") ?? "any-ph",
  ].join("|");
}

// The habitat gate itself is implemented once, in SQL, where the prediction
// path executes it (supabase/migrations/*_taper_habitat_soil_ph.sql and the
// packed-scoring readers it replaces). A TypeScript mirror used to live here
// but diverged from the SQL in matching semantics, input vocabulary, and
// missing-evidence handling, so it was removed rather than reconciled.
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
  const spatialService = spatialServiceConfig(gridSizeM);

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
  if (assetBaseUrl && gridSizeM >= 2500) {
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
        return toPotentialHabitatResponse(speciesId, asset);
      }
    } catch (error) {
      console.error("Unable to read the configured habitat asset cache", error);
    }
  }

  const response = await fetch(`${spatialService.url}/functions/v1/read-spatial-environment?${query}`, {
    headers: {
      Authorization: `Bearer ${spatialService.key}`,
      apikey: spatialService.key
    },
    // Static habitat is versioned by both model and profile keys in the URL.
    // Keep the service read in the Data Cache for the same lifetime advertised
    // by the public route instead of repeating an expensive spatial query.
    cache: "force-cache",
    next: { revalidate: 86_400 },
  });
  if (!response.ok) throw new Error(`Spatial habitat service returned ${response.status}`);
  const payload = spatialHabitatResponseSchema.parse(await response.json());
  return toPotentialHabitatResponse(speciesId, payload);
}
