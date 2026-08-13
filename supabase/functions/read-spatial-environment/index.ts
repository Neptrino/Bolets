import { createAdminClient, finiteNumber, json } from "../_shared/pipeline.ts";
import { mergeHabitatScoringValues } from "../_shared/habitat-scoring-values.ts";
import { scoringValues } from "../_shared/scoring-values.ts";

const supportedResolutions = new Set([250, 1000, 2500, 5000, 10000]);
const maximumRequestAreaDegrees = new Map([
  [250, 0.05],
  [1000, 0.5],
  [2500, 2],
  [5000, 6],
  [10000, 12.5],
]);

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

async function readCellHistory(
  supabase: ReturnType<typeof createAdminClient>,
  cellId: string,
  days: number,
) {
  const { data: cell, error: cellError } = await supabase
    .from("spatial_cells")
    .select("cell_id,region_id,weather_point_id")
    .eq("cell_id", cellId)
    .eq("static_verified", true)
    .maybeSingle();
  if (cellError) throw cellError;
  if (!cell?.weather_point_id) return null;

  const { data: atmospherePoint, error: atmospherePointError } = await supabase
    .from("weather_grid_points")
    .select("soil_point_id")
    .eq("point_id", cell.weather_point_id)
    .maybeSingle();
  if (atmospherePointError) throw atmospherePointError;

  const atmosphereQuery = supabase
    .from("weather_grid_snapshots")
    .select("snapshot_date,observed_at,sources,source_resolution_m,confidence,unavailable_fields,values")
    .eq("point_id", cell.weather_point_id)
    .order("snapshot_date", { ascending: false })
    .limit(days);
  const soilQuery = atmospherePoint?.soil_point_id
    ? supabase
      .from("weather_grid_snapshots")
      .select("snapshot_date,observed_at,sources,source_resolution_m,confidence,unavailable_fields,values")
      .eq("point_id", atmospherePoint.soil_point_id)
      .order("snapshot_date", { ascending: false })
      .limit(days)
    : Promise.resolve({ data: [], error: null });
  const [{ data: atmosphereSnapshots, error: atmosphereError }, { data: soilSnapshots, error: soilError }] =
    await Promise.all([atmosphereQuery, soilQuery]);
  if (atmosphereError) throw atmosphereError;
  if (soilError) throw soilError;
  const soilByDate = new Map((soilSnapshots ?? []).map((snapshot) => [snapshot.snapshot_date, snapshot]));

  return {
    cellId: cell.cell_id,
    regionId: cell.region_id,
    snapshots: (atmosphereSnapshots ?? []).reverse().map((atmosphere) => {
      const soil = soilByDate.get(atmosphere.snapshot_date);
      return {
        observedAt: soil && soil.observed_at > atmosphere.observed_at ? soil.observed_at : atmosphere.observed_at,
        source: [...(soil?.sources ?? []), ...atmosphere.sources],
        sourceResolutionM: Math.max(atmosphere.source_resolution_m, soil?.source_resolution_m ?? 0),
        confidence: atmosphere.confidence === "limited" || soil?.confidence === "limited"
          ? "limited"
          : atmosphere.confidence === "unknown" || soil?.confidence === "unknown"
            ? "unknown"
            : atmosphere.confidence,
        unavailableFields: [...atmosphere.unavailable_fields, ...(soil?.unavailable_fields ?? [])],
        values: { ...(soil?.values ?? {}), ...atmosphere.values },
      };
    }),
  };
}

type HabitatRequest = {
  speciesId?: string;
  profileKey?: string;
  forestTerms: string[];
  altitudeMin: number;
  altitudeMax: number;
  altitudeCoreMin?: number;
  altitudeCoreMax?: number;
  phMin?: number;
  phMax?: number;
  weightedAltitude: boolean;
};

function habitatRequest(searchParams: URLSearchParams): HabitatRequest | string {
  const speciesId = searchParams.get("speciesId")?.trim();
  const profileKey = searchParams.get("habitatProfileKey")?.trim();
  const forestTerms = [...new Set(searchParams.getAll("forest").map((term) => term.trim().toLowerCase()).filter(Boolean))];
  const altitudeMin = numberParam(searchParams, "altitudeMin");
  const altitudeMax = numberParam(searchParams, "altitudeMax");
  const altitudeCoreMin = numberParam(searchParams, "altitudeCoreMin");
  const altitudeCoreMax = numberParam(searchParams, "altitudeCoreMax");
  const phMin = numberParam(searchParams, "phMin");
  const phMax = numberParam(searchParams, "phMax");
  const validTerm = (term: string) => term.length >= 3 && term.length <= 80 && /^[\p{L}\p{N} .'-]+$/u.test(term);
  if (!forestTerms.length || forestTerms.length > 24 || forestTerms.some((term) => !validTerm(term))) {
    return "Invalid forest habitat terms";
  }
  if (altitudeMin === undefined || altitudeMax === undefined || altitudeMin < 0 || altitudeMin >= altitudeMax || altitudeMax > 4000) {
    return "Invalid habitat altitude range";
  }
  if ((altitudeCoreMin === undefined) !== (altitudeCoreMax === undefined)) {
    return "Invalid habitat altitude core";
  }
  const weightedAltitude = altitudeCoreMin !== undefined && altitudeCoreMax !== undefined;
  if (weightedAltitude && (altitudeCoreMin < 0 || altitudeCoreMin >= altitudeCoreMax ||
    altitudeCoreMax > 4000 || altitudeCoreMin < altitudeMin || altitudeCoreMax > altitudeMax)) {
    return "Invalid habitat altitude core";
  }
  if ((phMin === undefined) !== (phMax === undefined) || (phMin !== undefined && (phMin < 0 || phMax! > 14 || phMin >= phMax!))) {
    return "Invalid habitat soil pH range";
  }
  return {
    speciesId, profileKey,
    forestTerms, altitudeMin, altitudeMax, altitudeCoreMin, altitudeCoreMax,
    phMin, phMax, weightedAltitude,
  };
}

async function readHabitatRows(
  supabase: ReturnType<typeof createAdminClient>,
  bounds: NonNullable<ReturnType<typeof bbox>>,
  resolution: number,
  limit: number,
  habitat: HabitatRequest,
) {
  let rpc = "read_potential_habitat_cells";
  if (habitat.weightedAltitude) {
    if (resolution === 250) {
      rpc = "read_weighted_potential_habitat_cells";
    } else {
      rpc = "read_weighted_coarse_potential_habitat_cells";
    }
  }
  const result = await supabase.rpc(rpc, {
    p_west: bounds.west,
    p_south: bounds.south,
    p_east: bounds.east,
    p_north: bounds.north,
    p_grid_size_m: resolution,
    p_forest_terms: habitat.forestTerms,
    p_altitude_min: habitat.weightedAltitude ? habitat.altitudeCoreMin : habitat.altitudeMin,
    p_altitude_max: habitat.weightedAltitude ? habitat.altitudeCoreMax : habitat.altitudeMax,
    p_ph_min: habitat.phMin ?? null,
    p_ph_max: habitat.phMax ?? null,
    p_limit: limit,
  });
  return {
    ...result,
    complete: !result.error && (result.data?.length ?? 0) < limit,
  };
}

async function readHabitatRowsForBounds(
  supabase: ReturnType<typeof createAdminClient>,
  bounds: NonNullable<ReturnType<typeof bbox>>,
  resolution: number,
  limit: number,
  habitat: HabitatRequest,
) {
  if (resolution >= 1000 && habitat.speciesId && habitat.profileKey) {
    const { data: complete, error: completionError } = await supabase.rpc(
      "species_habitat_profile_complete",
      { p_species_id: habitat.speciesId, p_profile_key: habitat.profileKey },
    );
    if (completionError) return { data: null, error: completionError, complete: false };
    if (complete) {
      const cached = await supabase.rpc("read_cached_species_habitat_cells", {
        p_species_id: habitat.speciesId,
        p_profile_key: habitat.profileKey,
        p_west: bounds.west,
        p_south: bounds.south,
        p_east: bounds.east,
        p_north: bounds.north,
        p_grid_size_m: resolution,
        p_limit: limit,
      });
      return {
        ...cached,
        complete: !cached.error && (cached.data?.length ?? 0) < limit,
      };
    }
  }

  const width = bounds.east - bounds.west;
  const height = bounds.north - bounds.south;
  const requestArea = width * height;
  if (requestArea < 1) return readHabitatRows(supabase, bounds, resolution, limit, habitat);

  // The free-plan database can time out when a single aggregation scans most
  // of northern Catalonia. Partition only the database work; the returned
  // cells still use the requested grid and exact 250 m evidence.
  const tileCount = Math.min(Math.ceil(requestArea / 0.5), 10);
  const splitLongitude = width >= height;
  const tileResults = await Promise.all(Array.from({ length: tileCount }, (_, index) => {
    const startRatio = index / tileCount;
    const endRatio = (index + 1) / tileCount;
    const tileBounds = splitLongitude
      ? {
          west: bounds.west + width * startRatio,
          south: bounds.south,
          east: bounds.west + width * endRatio,
          north: bounds.north,
        }
      : {
          west: bounds.west,
          south: bounds.south + height * startRatio,
          east: bounds.east,
          north: bounds.south + height * endRatio,
        };
    return readHabitatRows(supabase, tileBounds, resolution, limit, habitat);
  }));
  const failed = tileResults.find((result) => result.error);
  if (failed) return failed;

  const rowsById = new Map<string, Record<string, unknown>>();
  for (const result of tileResults) {
    for (const row of result.data ?? []) rowsById.set(String(row.cell_id), row);
  }
  return {
    ...tileResults[0],
    data: [...rowsById.values()],
    error: null,
    complete: tileResults.every((result) => result.complete),
  };
}

Deno.serve(async (request) => {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, { Allow: "GET" });
  const url = new URL(request.url);
  if (url.searchParams.get("mode") === "history") {
    const cellId = url.searchParams.get("cell")?.trim();
    const requestedDays = Number(url.searchParams.get("days") ?? 7);
    const days = Number.isInteger(requestedDays) ? Math.min(Math.max(requestedDays, 1), 7) : 7;
    if (!cellId || cellId.length > 160) return json({ error: "Invalid cell history request" }, 400);
    try {
      const history = await readCellHistory(createAdminClient(), cellId, days);
      if (!history) return json({ error: "Cell history not found" }, 404);
      return json(history, 200, {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      });
    } catch (error) {
      console.error("Unable to read spatial environment history", error);
      return json({ error: "Unable to load spatial environment history" }, 500);
    }
  }
  const bounds = bbox(url.searchParams);
  if (!bounds) return json({ error: "Invalid or excessive bounding box" }, 400);
  const requestedLimit = Number(url.searchParams.get("limit") ?? 1000);
  const limit = Math.min(Math.max(Number.isInteger(requestedLimit) ? requestedLimit : 1000, 1), 1000);
  const resolution = Number(url.searchParams.get("resolution") ?? 250);
  if (!Number.isInteger(resolution) || !supportedResolutions.has(resolution)) {
    return json({ error: "Invalid map resolution" }, 400);
  }
  const requestArea = (bounds.east - bounds.west) * (bounds.north - bounds.south);
  if (requestArea > maximumRequestAreaDegrees.get(resolution)!) {
    return json({ error: "Bounding box is too large for this resolution" }, 400);
  }

  try {
    const supabase = createAdminClient();
    if (url.searchParams.get("mode") === "habitat") {
      const habitat = habitatRequest(url.searchParams);
      if (typeof habitat === "string") return json({ error: habitat }, 400);
      const habitatResult = await readHabitatRowsForBounds(supabase, bounds, resolution, limit, habitat);
      const { data, error } = habitatResult;
      if (error) throw error;
      const rows = data ?? [];
      const cells = rows.slice(0, limit).map((row: Record<string, unknown>) => ({
        cellId: row.cell_id,
        regionId: row.region_id,
        gridSizeM: row.grid_size_m,
        bounds: [[row.west, row.south], [row.east, row.north]],
        coverage: row.coverage,
        altitudeWeightedCoverage: row.altitude_weighted_coverage ?? row.coverage,
        eligibleCellCount: row.eligible_cell_count,
        sourceResolutionM: row.source_resolution_m,
        confidence: row.confidence,
        source: row.sources
      }));
      const truncated = !habitatResult.complete || rows.length > limit;
      return json({ cells, truncated, bounds, resolution }, 200, {
        "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800"
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
    const includeHabitat = url.searchParams.get("includeHabitat") === "true";
    const habitat = includeHabitat ? habitatRequest(url.searchParams) : null;
    if (typeof habitat === "string") return json({ error: habitat }, 400);
    const [environmentResult, habitatResult] = await Promise.all([
      supabase.rpc(rpc, rpcParams),
      habitat ? readHabitatRowsForBounds(supabase, bounds, resolution, limit, habitat) : Promise.resolve(null),
    ]);
    const { data, error } = environmentResult;
    if (error) throw error;
    // Habitat is a required scoring input when requested. Never turn a failed
    // habitat read into a successful response full of misleading null scores.
    if (habitatResult?.error) throw habitatResult.error;
    const habitatRows = habitatResult ? habitatResult.data ?? [] : null;
    const habitatRowsByCellId = new Map(
      (habitatRows ?? []).map((row: Record<string, unknown>) => [row.cell_id, row]),
    );
    const completeHabitatCoverage = habitatResult?.complete ?? false;
    const scoreOnly = url.searchParams.get("view") === "score";
    const cells = (data ?? []).map((row: Record<string, unknown>) => {
      const baseValues = scoreOnly ? scoringValues(row.values) : row.values;
      let values = baseValues && typeof baseValues === "object" && !Array.isArray(baseValues)
        ? { ...(baseValues as Record<string, unknown>) }
        : {};
      if (includeHabitat) {
        values = mergeHabitatScoringValues(
          values,
          habitatRowsByCellId.get(row.cell_id) as Record<string, unknown> | undefined,
          completeHabitatCoverage,
        );
      }
      return {
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
        values,
      };
    });
    return json({ cells, truncated: cells.length === limit, bounds, resolution }, 200, {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
    });
  } catch (error) {
    console.error("Unable to read spatial environment", error);
    return json({ error: "Unable to load spatial environment" }, 500);
  }
});
