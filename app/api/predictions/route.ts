import { getSpecies } from "@/data/species";
import { isSpatialGridSize } from "@/src/lib/map-grid";
import { mapBoundsFitResolution, parseMapQuery } from "@/src/lib/map-query";
import { getPredictionCells } from "@/src/lib/predictions";
import { jsonResponse } from "@/src/lib/json-response";
import { withoutInternalModelVersion } from "@/src/lib/public-response";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const speciesId = params.get("species") ?? "";
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
