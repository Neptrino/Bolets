import { getSpecies } from "@/data/species";
import {
  getPotentialHabitatCells,
  getPotentialHabitatCoverage,
} from "@/src/lib/habitat";
import { parseSpatialMapQuery } from "@/src/lib/map-query";
import { toPotentialHabitatMapCell } from "@/src/lib/habitat-map";
import { jsonResponse } from "@/src/lib/json-response";
import { withoutInternalModelVersion } from "@/src/lib/public-response";
import { proxyDevelopmentPublicDataGet } from "@/src/lib/development-public-data-proxy";

export async function GET(request: Request) {
  const proxied = await proxyDevelopmentPublicDataGet(request, "/api/habitat");
  if (proxied) return proxied;

  const params = new URL(request.url).searchParams;
  const speciesId = params.get("species") ?? "";
  const compact = params.get("view") === "map";
  if (!getSpecies(speciesId)) return Response.json({ error: "Unknown species" }, { status: 400 });
  const parsedQuery = parseSpatialMapQuery(params, 5000);
  if ("error" in parsedQuery) {
    return Response.json({ error: parsedQuery.error }, { status: 400 });
  }
  const { query } = parsedQuery;

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
    return jsonResponse(request, withoutInternalModelVersion(response), {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      }
    });
  } catch (error) {
    console.error("Unable to calculate potential habitat cells", error);
    return Response.json({ error: "Potential habitat cells are temporarily unavailable" }, { status: 503 });
  }
}
