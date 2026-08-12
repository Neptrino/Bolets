import { getSpecies } from "@/data/species";
import {
  getPotentialHabitatCells,
  getPotentialHabitatCoverage,
} from "@/src/lib/habitat";
import { isSpatialGridSize } from "@/src/lib/map-grid";
import { mapBoundsFitResolution, parseMapQuery } from "@/src/lib/map-query";
import { toPotentialHabitatMapCell } from "@/src/lib/habitat-map";
import { jsonResponse } from "@/src/lib/json-response";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const speciesId = params.get("species") ?? "";
  const compact = params.get("view") === "map";
  if (!getSpecies(speciesId)) return Response.json({ error: "Unknown species" }, { status: 400 });
  const query = parseMapQuery(params, 5000);
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
    // Historical occurrence support is an optional context layer. Map reads
    // load it separately so a slow evidence lookup cannot delay the primary
    // habitat grid. Full API consumers retain the combined response.
    const result = compact
      ? await getPotentialHabitatCoverage(
          speciesId,
          query.bounds,
          query.limit ?? 1000,
          query.resolution,
        )
      : await getPotentialHabitatCells(
          speciesId,
          query.bounds,
          query.limit ?? 1000,
          query.resolution,
        );
    const response = compact
      ? {
          ...result,
          cells: result.cells.map(toPotentialHabitatMapCell),
        }
      : result;
    return jsonResponse(request, response, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      }
    });
  } catch (error) {
    console.error("Unable to calculate potential habitat cells", error);
    return Response.json({ error: "Potential habitat cells are temporarily unavailable" }, { status: 503 });
  }
}
