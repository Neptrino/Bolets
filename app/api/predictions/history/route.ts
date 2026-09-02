import { getSpecies } from "@/data/species";
import { jsonResponse } from "@/src/lib/json-response";
import { predictionModelVersion } from "@/src/lib/model-versions";
import {
  developmentForecastSimulation,
  developmentTimelineSimulation,
} from "@/src/lib/prediction-forecast-simulation";
import { getPredictionCellHistory } from "@/src/lib/predictions";
import { predictionCellHistoryRequestSchema } from "@/src/lib/prediction-history";
import { calculateSuitability, missingModelFields } from "@/src/lib/scoring";
import {
  detailedMapAccessDenied,
  hasContributorDetailCapability,
  isDetailedMapResolution,
  PRIVATE_MAP_HEADERS,
} from "@/src/lib/contributions/capability.server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = predictionCellHistoryRequestSchema.safeParse({
    speciesId: body?.speciesId,
    cellId: body?.cellId,
    gridSizeM: body?.gridSizeM,
    regionId: body?.regionId,
    values: JSON.stringify(body?.values),
  });
  if (!parsed.success) return Response.json({ error: "Invalid cell history request" }, { status: 400 });
  const detailed = isDetailedMapResolution(parsed.data.gridSizeM);
  if (detailed && !await hasContributorDetailCapability()) return detailedMapAccessDenied();

  const species = getSpecies(parsed.data.speciesId);
  if (!species) return Response.json({ error: "Unknown species" }, { status: 400 });
  if (species.predictionMode === "habitat_only") {
    return Response.json({ error: "Current fruiting predictions are not available for this species" }, { status: 422 });
  }

  const developmentTimeline = () => {
    const observedAt = new Date().toISOString();
    const unavailableFields = missingModelFields(species, parsed.data.values);
    const result = calculateSuitability(species, {
      regionId: parsed.data.regionId,
      observedAt,
      source: ["Simulació local · dades fictícies"],
      confidence: "unknown",
      stale: false,
      unavailableFields,
      values: parsed.data.values,
    });
    if (result.score === null) return null;
    return developmentTimelineSimulation(
      {
        observedAt,
        score: result.score,
        fruitingConditionsScore: result.fruitingConditionsScore,
        opportunityIndex: result.opportunityIndex,
      },
      predictionModelVersion(species.modelConfig.version),
      `${parsed.data.speciesId}:${parsed.data.cellId}`,
      { generatedAt: observedAt },
    );
  };

  try {
    const history = await getPredictionCellHistory(parsed.data.speciesId, parsed.data);
    const { simulated, timeline } = developmentForecastSimulation(
      history,
      `${parsed.data.speciesId}:${parsed.data.cellId}`,
    );
    const localTimeline = !simulated && timeline.observed.length === 0
      ? developmentTimeline()
      : null;
    const responseTimeline = localTimeline?.timeline ?? timeline;
    return jsonResponse(request, responseTimeline, {
      headers: {
        ...(detailed ? PRIVATE_MAP_HEADERS : { "Cache-Control": simulated || localTimeline?.simulated
          ? "no-store"
          : "public, max-age=60, s-maxage=300, stale-while-revalidate=600" }),
      },
    });
  } catch (error) {
    const localTimeline = developmentTimeline();
    if (localTimeline?.simulated) {
      return jsonResponse(request, localTimeline.timeline, {
        headers: detailed ? PRIVATE_MAP_HEADERS : { "Cache-Control": "no-store" },
      });
    }
    console.error("Unable to calculate prediction history", error);
    return Response.json({ error: "Prediction history is temporarily unavailable" }, { status: 503 });
  }
}
