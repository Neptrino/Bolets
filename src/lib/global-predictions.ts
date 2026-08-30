import { cataloniaSpatialBounds } from "@/data/regions";
import { habitatScoringValues } from "@/supabase/functions/_shared/habitat-scoring-values";
import type { GlobalGridSizeM } from "@/src/lib/global-map";
import { habitatProfileKey } from "@/src/lib/habitat";
import { PREDICTION_CACHE_VERSION } from "@/src/lib/model-versions";
import { requestBucketDegreesForGrid } from "@/src/lib/map-query";
import { spatialGlobalEnvironmentResponseSchema } from "@/src/lib/schema";
import { calculateSuitability, missingModelFields } from "@/src/lib/scoring";
import { edibleSpecies } from "@/src/lib/species-collections";
import type {
  ConditionSnapshot,
  GlobalPredictionMapCell,
  GlobalSpeciesScore,
  PredictionCell,
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

// A stalled environment read must not hold a server-rendered territory page
// open forever. Callers treat an aborted read as unavailable rather than
// manufacturing a prediction.
const GLOBAL_ENVIRONMENT_TIMEOUT_MS = 5_000;
// A 2×2 group keeps the shared payload modest while letting four canonical
// public buckets reuse one upstream environment read.
const GLOBAL_MAP_SHARD_FACTOR = 2;
const GLOBAL_MAP_SHARD_LIMIT = 1000;
const GLOBAL_MAP_READ_SHAPE_VERSION = "global-map-shard-2x2-coalesced-v1";
const globalEnvironmentInFlight = new Map<string, Promise<GlobalEnvironmentPayload>>();

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
  readShapeVersion?: string,
): Promise<GlobalEnvironmentPayload> {
  const baseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) {
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
    ...(readShapeVersion ? { readShapeVersion } : {}),
  });
  const url = `${baseUrl}/functions/v1/read-spatial-environment?${query}`;
  const pending = globalEnvironmentInFlight.get(url);
  if (pending) return pending;

  const task = (async () => {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      cache: "force-cache",
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(GLOBAL_ENVIRONMENT_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Spatial environment service returned ${response.status}`);
    return spatialGlobalEnvironmentResponseSchema.parse(await response.json());
  })();
  globalEnvironmentInFlight.set(url, task);
  try {
    return await task;
  } finally {
    if (globalEnvironmentInFlight.get(url) === task) {
      globalEnvironmentInFlight.delete(url);
    }
  }
}

const stableCoordinate = (value: number) =>
  Math.round(value * 1_000_000) / 1_000_000;

function globalMapReadBounds(
  bounds: SpatialBounds,
  gridSizeM: GlobalGridSizeM,
) {
  const bucketDegrees = requestBucketDegreesForGrid(gridSizeM);
  const tolerance = 1e-6;
  if (
    bounds.east - bounds.west > bucketDegrees + tolerance ||
    bounds.north - bounds.south > bucketDegrees + tolerance
  ) {
    return bounds;
  }

  const shardDegrees = bucketDegrees * GLOBAL_MAP_SHARD_FACTOR;
  const west = Math.max(
    cataloniaSpatialBounds.west,
    stableCoordinate(Math.floor(bounds.west / shardDegrees) * shardDegrees),
  );
  const south = Math.max(
    cataloniaSpatialBounds.south,
    stableCoordinate(Math.floor(bounds.south / shardDegrees) * shardDegrees),
  );
  return {
    west,
    south,
    east: Math.min(
      cataloniaSpatialBounds.east,
      stableCoordinate(west + shardDegrees),
    ),
    north: Math.min(
      cataloniaSpatialBounds.north,
      stableCoordinate(south + shardDegrees),
    ),
  };
}

function cellsForBounds(cells: GlobalEnvironmentCell[], bounds: SpatialBounds) {
  const centreLongitude = (bounds.west + bounds.east) / 2;
  const centreLatitude = (bounds.south + bounds.north) / 2;
  const distanceFromCentre = (cell: GlobalEnvironmentCell) => {
    const [[west, south], [east, north]] = cell.bounds;
    return ((west + east) / 2 - centreLongitude) ** 2
      + ((south + north) / 2 - centreLatitude) ** 2;
  };
  return cells
    .filter((cell) => {
      const [[west, south], [east, north]] = cell.bounds;
      return east >= bounds.west && west <= bounds.east
        && north >= bounds.south && south <= bounds.north;
    })
    .sort((left, right) =>
      distanceFromCentre(left) - distanceFromCentre(right)
      || left.cellId.localeCompare(right.cellId),
    );
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
  speciesSet: SpeciesProfile[] = globalCandidateSpecies,
): CandidateSlot[] {
  const profilesBySpecies = new Map(
    habitatProfiles.map((profile) => [profile.speciesId, profile]),
  );
  return speciesSet.map((species) => {
    const profile = profilesBySpecies.get(species.speciesId);
    if (!profile || !profile.complete || profile.profileKey !== habitatProfileKey(species)) {
      throw new Error(
        `Cached habitat profile for ${species.speciesId} is missing or out of date; rerun the coarse habitat precompute`,
      );
    }
    return { species, slot: profile.slot };
  });
}

function scoreCandidateCell(
  cell: GlobalEnvironmentCell,
  { species, slot }: CandidateSlot,
): { result: SuitabilityResult; values: ConditionSnapshot["values"]; unavailableFields: string[] } {
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
  const result = calculateSuitability(species, {
    regionId: cell.regionId,
    observedAt: cell.observedAt,
    source: cell.source,
    confidence: cell.confidence,
    stale: cell.stale,
    unavailableFields,
    values,
  });
  return { result, values, unavailableFields };
}

function scoreCandidate(
  cell: GlobalEnvironmentCell,
  candidate: CandidateSlot,
): SuitabilityResult {
  return scoreCandidateCell(cell, candidate).result;
}

function toCandidatePredictionCell(
  cell: GlobalEnvironmentCell,
  candidate: CandidateSlot,
): PredictionCell {
  const { species } = candidate;
  const { result, values, unavailableFields } = scoreCandidateCell(cell, candidate);
  return {
    speciesId: species.speciesId,
    cellId: cell.cellId,
    regionId: cell.regionId,
    observedAt: cell.observedAt,
    gridSizeM: cell.gridSizeM,
    cellBounds: cell.bounds,
    score: result.score,
    fruitingConditionsScore: result.fruitingConditionsScore,
    opportunityIndex: result.opportunityIndex,
    effectiveHabitatCoverage: result.effectiveHabitatCoverage,
    label: result.label,
    sourceResolutionM: cell.sourceResolutionM,
    confidence: cell.confidence,
    stale: cell.stale,
    source: cell.source,
    unavailableFields,
    values,
    modelVersion: result.modelVersion,
    components: result.components,
    occurrenceEvidence: null,
    occurrenceEvidenceStatus: "unavailable",
  };
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
  const readBounds = globalMapReadBounds(bounds, gridSizeM);
  const sharded = Object.keys(bounds).some(
    (key) => bounds[key as keyof SpatialBounds] !== readBounds[key as keyof SpatialBounds],
  );
  const normalizedLimit = Math.min(Math.max(Math.round(limit), 1), 1000);
  const payload = await fetchGlobalEnvironment(
    readBounds,
    sharded ? GLOBAL_MAP_SHARD_LIMIT : normalizedLimit,
    gridSizeM,
    sharded ? GLOBAL_MAP_READ_SHAPE_VERSION : undefined,
  );
  const candidates = resolveCandidateSlots(payload.habitatProfiles);
  const sourceCells = sharded
    ? cellsForBounds(payload.cells, bounds)
    : payload.cells;
  const cells = sourceCells
    .slice(0, normalizedLimit)
    .map((cell) => combineCell(cell, candidates).mapCell);
  return {
    cells,
    truncated: payload.truncated || (sharded && sourceCells.length > normalizedLimit),
  };
}

/**
 * Scores a requested subset of edible live-model species from one shared
 * environment payload. Territorial summaries use this to avoid fetching the
 * same 1 km weather cell once per local species.
 */
export async function getCandidatePredictionCells(
  bounds: SpatialBounds,
  speciesIds: string[],
  limit = 1000,
  gridSizeM: GlobalGridSizeM = 1000,
) {
  const requestedIds = new Set(speciesIds);
  const requestedSpecies = globalCandidateSpecies.filter((species) =>
    requestedIds.has(species.speciesId)
  );
  if (requestedSpecies.length !== requestedIds.size) {
    throw new Error("Territorial candidate set contains an unsupported species");
  }

  const payload = await fetchGlobalEnvironment(bounds, limit, gridSizeM);
  const candidates = resolveCandidateSlots(payload.habitatProfiles, requestedSpecies);
  const cellsBySpecies = Object.fromEntries(
    candidates.map((candidate) => [candidate.species.speciesId, [] as PredictionCell[]]),
  ) as Record<string, PredictionCell[]>;

  for (const cell of payload.cells) {
    for (const candidate of candidates) {
      cellsBySpecies[candidate.species.speciesId]!.push(
        toCandidatePredictionCell(cell, candidate),
      );
    }
  }

  return { cellsBySpecies, truncated: payload.truncated };
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
