import { getCatalogueSpecies } from "@/data/catalogue";
import { jsonResponse } from "@/src/lib/json-response";
import { parseMapQuery } from "@/src/lib/map-query";
import { readPublicFindingCells } from "@/src/lib/findings/reads.server";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = parseMapQuery(params, 10_000);
  if (!query || query.resolution !== 10_000) {
    return Response.json({ error: "Cal demanar una casella pública vàlida de 10 km." }, { status: 400 });
  }
  const speciesId = params.get("species");
  if (speciesId && speciesId !== "all" && !getCatalogueSpecies(speciesId)) {
    return Response.json({ error: "Espècie desconeguda." }, { status: 400 });
  }
  try {
    const cells = await readPublicFindingCells(query.bounds, speciesId === "all" ? null : speciesId);
    return jsonResponse(request, { cells }, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=1800" },
    });
  } catch {
    return Response.json({ error: "Les troballes no estan disponibles ara mateix." }, { status: 503 });
  }
}
