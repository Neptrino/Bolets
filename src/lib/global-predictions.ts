import { habitatScoringValues } from "@/supabase/functions/_shared/habitat-scoring-values";
import type { GlobalGridSizeM } from "@/src/lib/global-map";
import { habitatProfileKey } from "@/src/lib/habitat";
import { PREDICTION_CACHE_VERSION } from "@/src/lib/model-versions";
import { spatialGlobalEnvironmentResponseSchema } from "@/src/lib/schema";
import { calculateSuitability, missingModelFields } from "@/src/lib/scoring";
import { edibleSpecies } from "@/src/lib/species-collections";
import type {
  ConditionSnapshot,
  GlobalPredictionMapCell,
  GlobalSpeciesScore,
  SpatialBounds,
  SpeciesProfile,
  SuitabilityResult,
} from "@/src/lib/types";
import { z } from "zod";

export {
  GLOBAL_MINIMUM_GRID_SIZE_M,
  GLOBAL_SPECIES_ID,
  isGlobalGridSize,
} from "@/src/lib/global-map";
export type { GlobalGridSizeM } from "@/src/lib/global-map";

/**
 * The combined map answers "is anything worth picking likely here", so it
 * covers the edible catalogue with a live fruiting model. Seasonality needs no
 * extra filter: phenology already multiplies each score, so out-of-season
 * species suppress themselves without applying the calendar twice.
 */
export const globalCandidateSpecies = edibleSpecies.filter(
  (species) => species.predictionMode === "current",
);

function hashKey(input: string) {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Busts the server Data Cache entry whenever the candidate set or any habitat
 * profile changes without waiting for a manual PREDICTION_CACHE_VERSION bump.
 */
export const globalSpeciesSetKey = hashKey(
  globalCandidateSpecies
    .map((species) => `${species.speciesId}|${habitatProfileKey(species)}`)
    .sort()
    .join(";"),
);

type GlobalEnvironmentPayload = z.infer<typeof spatialGlobalEnvironmentResponseSchema>;
type GlobalEnvironmentCell = GlobalEnvironmentPayload["cells"][number];

async function fetchGlobalEnvironment(
  bounds: SpatialBounds,
  limit: number,
  gridSizeM: GlobalGridSizeM,
): Promise<GlobalEnvironmentPayload> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error("Spatial environment service is not configured");
  }
  const query = new URLSearchParams({
    west: String(bounds.west),
    south: String(bounds.south),
    east: String(bounds.east),
    north: String(bounds.north),
    limit: String(Math.min(Math.max(Math.round(limit), 1), 1000)),
    resolution: String(gridSizeM),
    includeHabitat: "all",
    view: "score",
    viewVersion: PREDICTION_CACHE_VERSION,
    setVersion: globalSpeciesSetKey,
  });
  const response = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/read-spatial-environment?${query}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        apikey: process.env.SUPABASE_ANON_KEY,
      },
      cache: "force-cache",
      next: { revalidate: 300 },
    },
  );
  if (!response.ok) throw new Error(`Spatial environment service returned ${response.status}`);
  return spatialGlobalEnvironmentResponseSchema.parse(await response.json());
}

type CandidateSlot = { species: SpeciesProfile; slot: number };

/**
 * Maps every candidate species to its cache slot, failing loudly when the
 * cache does not carry a complete, catalogue-matching profile. Scoring with a
 * stale or missing habitat profile would silently misattribute cells, so the
 * remedy is operational: rerun scripts/precompute-coarse-habitat.mjs.
 */
export function resolveCandidateSlots(
  habitatProfiles: GlobalEnvironmentPayload["habitatProfiles"],
): CandidateSlot[] {
  const profilesBySpecies = new Map(
    habitatProfiles.map((profile) => [profile.speciesId, profile]),
  );
  return globalCandidateSpecies.map((species) => {
    const profile = profilesBySpecies.get(species.speciesId);
    if (!profile || !profile.complete || profile.profileKey !== habitatProfileKey(species)) {
      throw new Error(
        `Cached habitat profile for ${species.speciesId} is missing or out of date; rerun the coarse habitat precompute`,
      );
    }
    return { species, slot: profile.slot };
  });
}

function scoreCandidate(
  cell: GlobalEnvironmentCell,
  { species, slot }: CandidateSlot,
): SuitabilityResult {
  const coverage = cell.habitatCoverages ? cell.habitatCoverages[slot - 1] : 0;
  const weighted = cell.habitatWeightedCoverages
    ? cell.habitatWeightedCoverages[slot - 1]
    : 0;
  if (coverage === undefined || weighted === undefined) {
    throw new Error(
      `Cached habitat arrays for cell ${cell.cellId} do not cover slot ${slot}`,
    );
  }
  const summary = habitatScoringValues({
    coverage,
    altitudeWeightedCoverage: weighted,
  });
  if (!summary) {
    throw new Error(`Cached habitat coverage for cell ${cell.cellId} is invalid`);
  }
  const values: ConditionSnapshot["values"] = { ...cell.values };
  // The species-agnostic environment payload must not leak another profile's
  // habitat context into this candidate's scoring inputs.
  delete values.forestTypes;
  delete values.treeSpecies;
  values.habitatCoveragePercent = summary.habitatCoveragePercent;
  values.habitatAltitudeSuitability = summary.habitatAltitudeSuitability;
  const missingFields = missingModelFields(species, values);
  const unavailableFields = [...new Set([...cell.unavailableFields, ...missingFields])];
  return calculateSuitability(species, {
    regionId: cell.regionId,
    observedAt: cell.observedAt,
    source: cell.source,
    confidence: cell.confidence,
    stale: cell.stale,
    unavailableFields,
    values,
  });
}

export function rankGlobalSpeciesScores(
  scored: { species: SpeciesProfile; result: SuitabilityResult }[],
): GlobalSpeciesScore[] {
  return scored
    .filter((item) => item.result.score !== null && item.result.score > 0)
    .sort((left, right) =>
      right.result.score! - left.result.score! ||
      (right.result.fruitingConditionsScore ?? 0) - (left.result.fruitingConditionsScore ?? 0) ||
      left.species.identity.commonName.localeCompare(right.species.identity.commonName, "ca"),
    )
    .map(({ species, result }) => ({
      speciesId: species.speciesId,
      score: result.score!,
      fruitingConditionsScore: result.fruitingConditionsScore,
      effectiveHabitatCoverage: result.effectiveHabitatCoverage,
    }));
}

function combineCell(
  cell: GlobalEnvironmentCell,
  candidates: CandidateSlot[],
): { mapCell: GlobalPredictionMapCell; ranking: GlobalSpeciesScore[] } {
  const scored = candidates.map((candidate) => ({
    species: candidate.species,
    result: scoreCandidate(cell, candidate),
  }));
  // Dynamic inputs are shared across the cell, so one candidate's withheld
  // score means the shared snapshot cannot support a combined reading either.
  const withheld = scored.some((item) => item.result.score === null);
  const ranking = withheld ? [] : rankGlobalSpeciesScores(scored);
  const top = ranking[0];
  const topResult = top
    ? scored.find((item) => item.species.speciesId === top.speciesId)!.result
    : null;
  return {
    mapCell: {
      cellId: cell.cellId,
      gridSizeM: cell.gridSizeM,
      cellBounds: cell.bounds,
      score: withheld ? null : top?.score ?? 0,
      habitatCoverage: topResult?.rawHabitatCoverage ?? null,
      topSpeciesId: top?.speciesId ?? null,
    },
    ranking,
  };
}

export async function getGlobalPredictionCells(
  bounds: SpatialBounds,
  limit = 1000,
  gridSizeM: GlobalGridSizeM = 1000,
) {
  const payload = await fetchGlobalEnvironment(bounds, limit, gridSizeM);
  const candidates = resolveCandidateSlots(payload.habitatProfiles);
  const cells = payload.cells.map((cell) => combineCell(cell, candidates).mapCell);
  return { cells, truncated: payload.truncated };
}

export async function getGlobalCellRanking(
  cellId: string,
  bounds: SpatialBounds,
  gridSizeM: GlobalGridSizeM,
) {
  const payload = await fetchGlobalEnvironment(bounds, 16, gridSizeM);
  const candidates = resolveCandidateSlots(payload.habitatProfiles);
  const cell = payload.cells.find((candidate) => candidate.cellId === cellId);
  if (!cell) return null;
  return combineCell(cell, candidates);
}

/**
 * Regional fallback reading for the map page before any cell is selected.
 * Candidates whose regional score is withheld or zero are skipped: this is a
 * display summary over an aggregated snapshot, not a per-cell scoring
 * contract, and attributing a hard zero to one species would be meaningless.
 */
export function bestRegionalSuitability(snapshot: ConditionSnapshot) {
  let best: { species: SpeciesProfile; result: SuitabilityResult } | null = null;
  for (const species of globalCandidateSpecies) {
    const missingFields = missingModelFields(species, snapshot.values);
    const unavailableFields = [
      ...new Set([...snapshot.unavailableFields, ...missingFields]),
    ];
    const result = calculateSuitability(species, { ...snapshot, unavailableFields });
    if (result.score === null || result.score === 0) continue;
    if (
      !best ||
      result.score > (best.result.score ?? 0) ||
      (result.score === best.result.score &&
        (result.fruitingConditionsScore ?? 0) > (best.result.fruitingConditionsScore ?? 0))
    ) {
      best = { species, result };
    }
  }
  return best;
}
