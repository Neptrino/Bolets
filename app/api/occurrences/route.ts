import { getSpecies } from "@/data/species";
import { jsonResponse } from "@/src/lib/json-response";
import { parseMapQuery } from "@/src/lib/map-query";
import { getOccurrenceSupport } from "@/src/lib/occurrences";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const speciesId = params.get("species") ?? "";
  if (!getSpecies(speciesId)) {
    return Response.json({ error: "Unknown species" }, { status: 400 });
  }

  const query = parseMapQuery(params, 10_000);
  if (!query) {
    return Response.json(
      { error: "Invalid or excessive bounding box" },
      { status: 400 },
    );
  }

  const result = await getOccurrenceSupport(speciesId, query.bounds);
  return jsonResponse(
    request,
    {
      available: result.available,
      cells: result.cells.map((cell) => ({
        bounds: cell.bounds,
        recordCount: cell.recordCount,
      })),
    },
    {
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
