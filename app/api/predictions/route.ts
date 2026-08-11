import { getSpecies } from "@/data/species";
import { isSpatialGridSize } from "@/src/lib/map-grid";
import { parseMapQuery } from "@/src/lib/map-query";
import { getPredictionCells } from "@/src/lib/predictions";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const speciesId = params.get("species") ?? "";
  if (!getSpecies(speciesId)) return Response.json({ error: "Unknown species" }, { status: 400 });
  const query = parseMapQuery(params, 250);
  const compact = params.get("view") === "map";
  const requestedCellId = params.get("cell");
  if (!query) {
    return Response.json({ error: "Invalid or excessive bounding box" }, { status: 400 });
  }
  if (!isSpatialGridSize(query.resolution)) {
    return Response.json({ error: "Invalid map resolution" }, { status: 400 });
  }
  try {
    const result = await getPredictionCells(
      speciesId,
      query.bounds,
      query.limit ?? (requestedCellId ? 16 : 1000),
      query.resolution,
      compact
    );
    const headers = { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" };
    if (requestedCellId) {
      const cell = result.cells.find((candidate) => candidate.cellId === requestedCellId);
      return cell
        ? Response.json({ cell }, { headers })
        : Response.json({ error: "Prediction cell not found" }, { status: 404 });
    }
    return Response.json(result, { headers });
  } catch (error) {
    console.error("Unable to calculate prediction cells", error);
    return Response.json({ error: "Prediction cells are temporarily unavailable" }, { status: 503 });
  }
}
