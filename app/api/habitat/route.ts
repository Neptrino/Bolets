import { getSpecies } from "@/data/species";
import { getPotentialHabitatCells } from "@/src/lib/habitat";
import { isSpatialGridSize } from "@/src/lib/map-grid";
import { parseMapQuery } from "@/src/lib/map-query";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const speciesId = params.get("species") ?? "";
  if (!getSpecies(speciesId)) return Response.json({ error: "Unknown species" }, { status: 400 });
  const query = parseMapQuery(params, 5000);
  if (!query) {
    return Response.json({ error: "Invalid or excessive bounding box" }, { status: 400 });
  }
  if (!isSpatialGridSize(query.resolution)) {
    return Response.json({ error: "Invalid map resolution" }, { status: 400 });
  }

  try {
    const result = await getPotentialHabitatCells(
      speciesId,
      query.bounds,
      query.limit ?? 1000,
      query.resolution
    );
    return Response.json(result, {
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" }
    });
  } catch (error) {
    console.error("Unable to calculate potential habitat cells", error);
    return Response.json({ error: "Potential habitat cells are temporarily unavailable" }, { status: 503 });
  }
}
