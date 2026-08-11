import { createAdminClient, finiteNumber, json } from "../_shared/pipeline.ts";

const supportedResolutions = new Set([250, 500, 1000, 2500, 5000, 10000]);

function numberParam(searchParams: URLSearchParams, name: string) {
  const rawValue = searchParams.get(name);
  if (rawValue === null || rawValue.trim() === "") return undefined;
  return finiteNumber(Number(rawValue));
}

function bbox(searchParams: URLSearchParams) {
  const west = numberParam(searchParams, "west");
  const south = numberParam(searchParams, "south");
  const east = numberParam(searchParams, "east");
  const north = numberParam(searchParams, "north");
  if ([west, south, east, north].some((value) => value === undefined)) return null;
  if (!(west! < east! && south! < north!)) return null;
  if (east! - west! > 4 || north! - south! > 3) return null;
  return { west: west!, south: south!, east: east!, north: north! };
}

Deno.serve(async (request) => {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, { Allow: "GET" });
  const url = new URL(request.url);
  const bounds = bbox(url.searchParams);
  if (!bounds) return json({ error: "Invalid or excessive bounding box" }, 400);
  const requestedLimit = Number(url.searchParams.get("limit") ?? 1000);
  const limit = Math.min(Math.max(Number.isInteger(requestedLimit) ? requestedLimit : 1000, 1), 1000);
  const resolution = Number(url.searchParams.get("resolution") ?? 250);
  if (!Number.isInteger(resolution) || !supportedResolutions.has(resolution)) {
    return json({ error: "Invalid map resolution" }, 400);
  }

  try {
    const supabase = createAdminClient();
    if (url.searchParams.get("mode") === "habitat") {
      const forestTerms = [...new Set(url.searchParams.getAll("forest").map((term) => term.trim().toLowerCase()).filter(Boolean))];
      const altitudeMin = numberParam(url.searchParams, "altitudeMin");
      const altitudeMax = numberParam(url.searchParams, "altitudeMax");
      const phMin = numberParam(url.searchParams, "phMin");
      const phMax = numberParam(url.searchParams, "phMax");
      const validTerm = (term: string) => term.length >= 3 && term.length <= 80 && /^[\p{L}\p{N} .'-]+$/u.test(term);
      if (!forestTerms.length || forestTerms.length > 24 || forestTerms.some((term) => !validTerm(term))) {
        return json({ error: "Invalid forest habitat terms" }, 400);
      }
      if (altitudeMin === undefined || altitudeMax === undefined || altitudeMin < 0 || altitudeMin >= altitudeMax || altitudeMax > 4000) {
        return json({ error: "Invalid habitat altitude range" }, 400);
      }
      if ((phMin === undefined) !== (phMax === undefined) || (phMin !== undefined && (phMin < 0 || phMax! > 14 || phMin >= phMax!))) {
        return json({ error: "Invalid habitat soil pH range" }, 400);
      }

      const { data, error } = await supabase.rpc("read_potential_habitat_cells", {
        p_west: bounds.west,
        p_south: bounds.south,
        p_east: bounds.east,
        p_north: bounds.north,
        p_grid_size_m: resolution,
        p_forest_terms: forestTerms,
        p_altitude_min: altitudeMin,
        p_altitude_max: altitudeMax,
        p_ph_min: phMin ?? null,
        p_ph_max: phMax ?? null,
        p_limit: limit
      });
      if (error) throw error;
      const cells = (data ?? []).map((row: Record<string, unknown>) => ({
        cellId: row.cell_id,
        regionId: row.region_id,
        gridSizeM: row.grid_size_m,
        bounds: [[row.west, row.south], [row.east, row.north]],
        coverage: row.coverage,
        eligibleCellCount: row.eligible_cell_count,
        sourceResolutionM: row.source_resolution_m,
        confidence: row.confidence,
        source: row.sources
      }));
      return json({ cells, truncated: cells.length === limit, bounds, resolution }, 200, {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
      });
    }

    const rpc = resolution === 250
      ? "read_latest_cell_environment"
      : resolution >= 2500
        ? "read_precomputed_cell_environment"
        : "read_aggregated_cell_environment";
    const rpcParams = {
      p_west: bounds.west,
      p_south: bounds.south,
      p_east: bounds.east,
      p_north: bounds.north,
      p_limit: limit,
      ...(resolution === 250 ? {} : { p_grid_size_m: resolution })
    };
    const { data, error } = await supabase.rpc(rpc, rpcParams);
    if (error) throw error;
    const cells = (data ?? []).map((row: Record<string, unknown>) => ({
      cellId: row.cell_id,
      regionId: row.region_id,
      gridSizeM: row.grid_size_m,
      bounds: [[row.west, row.south], [row.east, row.north]],
      observedAt: row.observed_at,
      source: row.sources,
      sourceResolutionM: row.source_resolution_m,
      confidence: row.confidence,
      stale: row.stale,
      unavailableFields: row.unavailable_fields,
      values: row.values
    }));
    return json({ cells, truncated: cells.length === limit, bounds, resolution }, 200, {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600"
    });
  } catch (error) {
    console.error("Unable to read spatial environment", error);
    return json({ error: "Unable to load spatial environment" }, 500);
  }
});
