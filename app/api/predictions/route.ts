import { getSpecies } from "@/data/species";
import {
  GLOBAL_SPECIES_ID,
  getGlobalCellRanking,
  isGlobalGridSize,
} from "@/src/lib/global-predictions";
import {
  mapBoundsFitResolution,
  parseMapQuery,
  parseSpatialMapQuery,
} from "@/src/lib/map-query";
import { proxyDevelopmentPublicDataGet } from "@/src/lib/development-public-data-proxy";
import { getPredictionCells } from "@/src/lib/predictions";
import {
  getPredictionMapTimelineFrame,
  isPredictionTimelineOffset,
} from "@/src/lib/prediction-map-timeline";
import {
  getCachedGlobalMapPredictionCells,
  getCachedSpeciesMapPredictionCells,
} from "@/src/lib/prediction-response-cache";
import { jsonResponse } from "@/src/lib/json-response";
import { withoutInternalModelVersion } from "@/src/lib/public-response";
import {
  detailedMapAccessDenied,
  hasMapResolutionCapability,
  isDetailedMapResolution,
  PRIVATE_MAP_HEADERS,
} from "@/src/lib/contributions/capability.server";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=600",
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
  const detailed = isDetailedMapResolution(query.resolution);
  if (detailed && !await hasMapResolutionCapability(query.resolution)) return detailedMapAccessDenied();
  const proxied = await proxyDevelopmentPublicDataGet(
    request,
    "/api/predictions",
    process.env,
    { privateResponse: detailed },
  );
  if (proxied) return proxied;
  const responseHeaders = detailed ? PRIVATE_MAP_HEADERS : CACHE_HEADERS;
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
        { headers: responseHeaders },
      );
    }
    const result = await getCachedGlobalMapPredictionCells(
      query.bounds,
      query.limit ?? 1000,
      query.resolution,
    );
    return jsonResponse(request, result, { headers: responseHeaders });
  } catch (error) {
    console.error("Unable to calculate combined prediction cells", error);
    return Response.json({ error: "Prediction cells are temporarily unavailable" }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const speciesId = params.get("species") ?? "";
  const timelineOffset = Number(params.get("time") ?? 0);
  if (!isPredictionTimelineOffset(timelineOffset)) {
    return Response.json({ error: "Invalid prediction timeline offset" }, { status: 400 });
  }
  if (timelineOffset === 0) {
    const proxied = await proxyDevelopmentPublicDataGet(request, "/api/predictions");
    if (proxied) return proxied;
  }
  if (timelineOffset !== 0) {
    const species = speciesId === GLOBAL_SPECIES_ID ? null : getSpecies(speciesId);
    if (speciesId !== GLOBAL_SPECIES_ID && !species) {
      return Response.json({ error: "Unknown species" }, { status: 400 });
    }
    if (species?.predictionMode === "habitat_only") {
      return Response.json(
        { error: "Current fruiting predictions are not available for this species" },
        { status: 422 },
      );
    }
    if (params.has("cell")) {
      return Response.json({ error: "Timeline cell details are not available" }, { status: 400 });
    }
    const parsedTimelineQuery = parseSpatialMapQuery(params, 5000);
    if ("error" in parsedTimelineQuery) {
      return Response.json({ error: parsedTimelineQuery.error }, { status: 400 });
    }
    const { query } = parsedTimelineQuery;
    try {
      const result = await getPredictionMapTimelineFrame(
        speciesId,
        query.bounds,
        query.limit ?? 1000,
        query.resolution,
        timelineOffset,
      );
      return jsonResponse(request, result, {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
        },
      });
    } catch (error) {
      console.error("Unable to calculate prediction timeline frame", error);
      return Response.json(
        { error: "Prediction timeline frame is temporarily unavailable" },
        { status: 503 },
      );
    }
  }
  if (speciesId === GLOBAL_SPECIES_ID) return globalPredictions(request, params);
  const species = getSpecies(speciesId);
  if (!species) return Response.json({ error: "Unknown species" }, { status: 400 });
  if (species.predictionMode === "habitat_only") {
    return Response.json(
      { error: "Current fruiting predictions are not available for this species" },
      { status: 422 },
    );
  }
  const parsedQuery = parseSpatialMapQuery(params, 250);
  const compact = params.get("view") === "map";
  const requestedCellId = params.get("cell");
  if ("error" in parsedQuery) {
    return Response.json({ error: parsedQuery.error }, { status: 400 });
  }
  const { query } = parsedQuery;
  const detailed = isDetailedMapResolution(query.resolution);
  if (detailed && !await hasMapResolutionCapability(query.resolution)) return detailedMapAccessDenied();
  const proxied = await proxyDevelopmentPublicDataGet(
    request,
    "/api/predictions",
    process.env,
    { privateResponse: detailed },
  );
  if (proxied) return proxied;
  const responseHeaders = detailed ? PRIVATE_MAP_HEADERS : CACHE_HEADERS;
  try {
    const limit = query.limit ?? (requestedCellId ? 16 : 1000);
    const result = compact && !requestedCellId
      ? await getCachedSpeciesMapPredictionCells(
        speciesId,
        query.bounds,
        limit,
        query.resolution,
      )
      : await getPredictionCells(
        speciesId,
        query.bounds,
        limit,
        query.resolution,
        compact,
      );
    const publicResult = {
      ...result,
      cells: result.cells.map((cell) => withoutInternalModelVersion(cell)),
    };
    if (requestedCellId) {
      const cell = publicResult.cells.find((candidate) => candidate.cellId === requestedCellId);
      return cell
        ? jsonResponse(request, { cell }, { headers: responseHeaders })
        : Response.json({ error: "Prediction cell not found" }, { status: 404 });
    }
    return jsonResponse(request, publicResult, { headers: responseHeaders });
  } catch (error) {
    console.error("Unable to calculate prediction cells", error);
    return Response.json({ error: "Prediction cells are temporarily unavailable" }, { status: 503 });
  }
}
