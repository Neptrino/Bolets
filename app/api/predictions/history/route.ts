import { getSpecies } from "@/data/species";
import { jsonResponse } from "@/src/lib/json-response";
import { getPredictionCellHistory } from "@/src/lib/predictions";
import { predictionCellHistoryRequestSchema } from "@/src/lib/prediction-history";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = predictionCellHistoryRequestSchema.safeParse({
    speciesId: body?.speciesId,
    cellId: body?.cellId,
    regionId: body?.regionId,
    values: JSON.stringify(body?.values),
  });
  if (!parsed.success) return Response.json({ error: "Invalid cell history request" }, { status: 400 });

  const species = getSpecies(parsed.data.speciesId);
  if (!species) return Response.json({ error: "Unknown species" }, { status: 400 });
  if (species.predictionMode === "habitat_only") {
    return Response.json({ error: "Current fruiting predictions are not available for this species" }, { status: 422 });
  }

  try {
    const timeline = await getPredictionCellHistory(parsed.data.speciesId, parsed.data);
    return jsonResponse(request, timeline, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Unable to calculate prediction history", error);
    return Response.json({ error: "Prediction history is temporarily unavailable" }, { status: 503 });
  }
}
