import { getSpecies } from "@/data/species";
import {
  GLOBAL_SPECIES_ID,
  getGlobalCellRanking,
  getGlobalPredictionCells,
  isGlobalGridSize,
} from "@/src/lib/global-predictions";
import { isSpatialGridSize } from "@/src/lib/map-grid";
import { mapBoundsFitResolution, parseMapQuery } from "@/src/lib/map-query";
import { getPredictionCells } from "@/src/lib/predictions";
import { jsonResponse } from "@/src/lib/json-response";
import { withoutInternalModelVersion } from "@/src/lib/public-response";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
};

// Every species with a positive score in the cell is worth listing, but the
// payload stays bounded; below 8 the list is already exhaustive in practice.
const GLOBAL_TOP_SPECIES_LIMIT = 8;

async function globalPredictions(request: Request, params: URLSearchParams) {
  const query = parseMapQuery(params, 1000);
  const requestedCellId = params.get("cell");
  if (!query) {
    return Response.json({ error: "Invalid or excessive bounding box" }, { status: 400 });
  }
  if (!isGlobalGridSize(query.resolution)) {
    return Response.json(
      { error: "The combined map requires a resolution of 1 km or coarser" },
      { status: 400 },
    );
  }
  if (!mapBoundsFitResolution(query.bounds, query.resolution)) {
    return Response.json({ error: "Bounding box is too large for this resolution" }, { status: 400 });
  }
  try {
    if (requestedCellId) {
      const detail = await getGlobalCellRanking(requestedCellId, query.bounds, query.resolution);
      if (!detail) return Response.json({ error: "Prediction cell not found" }, { status: 404 });
      const topSpecies = detail.ranking.slice(0, GLOBAL_TOP_SPECIES_LIMIT);
      const topSpeciesId = detail.mapCell.topSpeciesId;
      let cell = null;
      if (topSpeciesId) {
        // The detail card reuses the full single-species contract for the
        // attributed top species: components, evidence, and history support.
        const result = await getPredictionCells(
          topSpeciesId,
          query.bounds,
          16,
          query.resolution,
          false,
        );
        const detailCell = result.cells.find(
          (candidate) => candidate.cellId === requestedCellId,
        );
        cell = detailCell ? withoutInternalModelVersion(detailCell) : null;
      }
      // The combined score travels alongside the detail cell so a verified
      // zero stays distinguishable from a withheld reading when cell is null.
      return jsonResponse(
        request,
        { cell, topSpecies, score: detail.mapCell.score },
        { headers: CACHE_HEADERS },
      );
    }
    const result = await getGlobalPredictionCells(
      query.bounds,
      query.limit ?? 1000,
      query.resolution,
    );
    return jsonResponse(request, result, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("Unable to calculate combined prediction cells", error);
    return Response.json({ error: "Prediction cells are temporarily unavailable" }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const speciesId = params.get("species") ?? "";
  if (speciesId === GLOBAL_SPECIES_ID) return globalPredictions(request, params);
  const species = getSpecies(speciesId);
  if (!species) return Response.json({ error: "Unknown species" }, { status: 400 });
  if (species.predictionMode === "habitat_only") {
    return Response.json(
      { error: "Current fruiting predictions are not available for this species" },
      { status: 422 },
    );
  }
  const query = parseMapQuery(params, 250);
  const compact = params.get("view") === "map";
  const requestedCellId = params.get("cell");
  if (!query) {
    return Response.json({ error: "Invalid or excessive bounding box" }, { status: 400 });
  }
  if (!isSpatialGridSize(query.resolution)) {
    return Response.json({ error: "Invalid map resolution" }, { status: 400 });
  }
  if (!mapBoundsFitResolution(query.bounds, query.resolution)) {
    return Response.json({ error: "Bounding box is too large for this resolution" }, { status: 400 });
  }
  try {
    const result = await getPredictionCells(
      speciesId,
      query.bounds,
      query.limit ?? (requestedCellId ? 16 : 1000),
      query.resolution,
      compact
    );
    const headers = {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    };
    const publicResult = {
      ...result,
      cells: result.cells.map((cell) => withoutInternalModelVersion(cell)),
    };
    if (requestedCellId) {
      const cell = publicResult.cells.find((candidate) => candidate.cellId === requestedCellId);
      return cell
        ? jsonResponse(request, { cell }, { headers })
        : Response.json({ error: "Prediction cell not found" }, { status: 404 });
    }
    return jsonResponse(request, publicResult, { headers });
  } catch (error) {
    console.error("Unable to calculate prediction cells", error);
    return Response.json({ error: "Prediction cells are temporarily unavailable" }, { status: 503 });
  }
}
