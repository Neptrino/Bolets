import { fetchJsonWithRetry } from "@/src/lib/fetch-json";
import { PREDICTION_CACHE_VERSION } from "@/src/lib/model-versions";
import type {
  GlobalSpeciesScore,
  PredictionCell,
  PredictionMapCell,
} from "@/src/lib/types";

export function fetchPredictionCellDetail(
  speciesId: string,
  cell: PredictionMapCell,
  signal: AbortSignal,
) {
  const [[west, south], [east, north]] = cell.cellBounds;
  const params = new URLSearchParams({
    species: speciesId,
    west: String(west),
    south: String(south),
    east: String(east),
    north: String(north),
    limit: "16",
    resolution: String(cell.gridSizeM),
    cell: cell.cellId,
    v: PREDICTION_CACHE_VERSION,
  });
  return fetchJsonWithRetry<{
    cell: PredictionCell | null;
    topSpecies?: GlobalSpeciesScore[];
    score?: number | null;
  }>(`/api/predictions?${params}`, signal);
}
