import { getSpecies } from "@/data/species";
import { getOccurrenceSupport } from "@/src/lib/occurrences";
import { boundsCentre, boundsContain } from "@/src/lib/map-grid";
import { spatialEnvironmentResponseSchema } from "@/src/lib/schema";
import { calculateSuitability } from "@/src/lib/scoring";
import type { CoordinateBounds, HistoricalOccurrenceEvidence, OccurrenceEvidenceStatus, OccurrenceSupportCell, PredictionCell, PredictionMapCell, SpatialBounds, SpatialGridSizeM, SuitabilityResult } from "@/src/lib/types";

export function toPredictionMapCell(
  speciesId: string,
  cell: Pick<PredictionCell, "cellId" | "regionId" | "gridSizeM"> & { bounds: CoordinateBounds },
  result: Pick<SuitabilityResult, "score" | "label">
): PredictionMapCell {
  return {
    speciesId,
    cellId: cell.cellId,
    regionId: cell.regionId,
    gridSizeM: cell.gridSizeM,
    cellBounds: cell.bounds,
    score: result.score,
    label: result.label
  };
}

export function findOccurrenceEvidence(
  cellBounds: CoordinateBounds,
  supportCells: OccurrenceSupportCell[]
): HistoricalOccurrenceEvidence | null {
  const [longitude, latitude] = boundsCentre(cellBounds);
  const support = supportCells.find((candidate) => boundsContain(candidate.bounds, longitude, latitude));
  if (!support) return null;
  return {
    supportCellId: support.supportCellId,
    gridSizeM: support.gridSizeM,
    recordCount: support.recordCount,
    observedYearMin: support.observedYearMin,
    observedYearMax: support.observedYearMax,
    observedMonths: support.observedMonths,
    sources: support.sources
  };
}

export function resolveOccurrenceEvidence(
  cellBounds: CoordinateBounds,
  supportCells: OccurrenceSupportCell[],
  available: boolean
): { occurrenceEvidence: HistoricalOccurrenceEvidence | null; occurrenceEvidenceStatus: OccurrenceEvidenceStatus } {
  if (!available) return { occurrenceEvidence: null, occurrenceEvidenceStatus: "unavailable" };
  const occurrenceEvidence = findOccurrenceEvidence(cellBounds, supportCells);
  return {
    occurrenceEvidence,
    occurrenceEvidenceStatus: occurrenceEvidence ? "supported" : "no-records"
  };
}

export async function getPredictionCells(speciesId: string, bounds: SpatialBounds, limit = 1000, gridSizeM: SpatialGridSizeM = 250, compact = false) {
  const species = getSpecies(speciesId);
  if (!species) throw new Error("Unknown species");
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) throw new Error("Spatial environment service is not configured");
  const query = new URLSearchParams({
    west: String(bounds.west), south: String(bounds.south), east: String(bounds.east), north: String(bounds.north),
    limit: String(Math.min(Math.max(Math.round(limit), 1), 1000)), resolution: String(gridSizeM)
  });
  const environmentRequest = fetch(`${process.env.SUPABASE_URL}/functions/v1/read-spatial-environment?${query}`, {
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`, apikey: process.env.SUPABASE_ANON_KEY },
    cache: "no-store"
  });
  const occurrenceRequest = compact
    ? Promise.resolve({ available: false, cells: [] as OccurrenceSupportCell[] })
    : getOccurrenceSupport(speciesId, bounds);
  const [response, occurrenceSupport] = await Promise.all([environmentRequest, occurrenceRequest]);
  if (!response.ok) throw new Error(`Spatial environment service returned ${response.status}`);
  const payload = spatialEnvironmentResponseSchema.parse(await response.json());
  const cells = payload.cells.map((cell) => {
    const result = calculateSuitability(species, cell);
    const mapCell = toPredictionMapCell(speciesId, cell, result);
    if (compact) return mapCell;
    const evidence = resolveOccurrenceEvidence(cell.bounds, occurrenceSupport.cells, occurrenceSupport.available);
    return {
      ...mapCell,
      observedAt: cell.observedAt,
      sourceResolutionM: cell.sourceResolutionM,
      confidence: cell.confidence,
      stale: cell.stale,
      source: cell.source,
      unavailableFields: cell.unavailableFields,
      values: cell.values,
      modelVersion: result.modelVersion,
      factors: result.contributions,
      ...evidence
    } satisfies PredictionCell;
  });
  return { cells, truncated: payload.truncated };
}
