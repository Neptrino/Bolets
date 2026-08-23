import { createAdminClient, finiteNumber, json } from "../_shared/pipeline.ts";
import {
  aggregateEnvironmentRows,
  type EnvironmentSnapshotRow,
} from "../_shared/environment-aggregation.ts";
import { geologicalSubstrateEvidence } from "../_shared/geology.ts";
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

async function readCellForecast(
  supabase: ReturnType<typeof createAdminClient>,
  pointIds: string[],
) {
  if (!pointIds.length) return null;
  const expectedHorizons = [0, 24, 48, 72, 96, 120];
  const { data: candidates, error } = await supabase
    .from("weather_grid_forecasts")
    .select("point_id,snapshot_date,generated_at,valid_at,horizon_hours,sources,source_resolution_m,confidence,unavailable_fields,values")
    .in("point_id", pointIds)
    .order("snapshot_date", { ascending: false })
    .order("generated_at", { ascending: false })
    .order("horizon_hours", { ascending: true })
    // Retention keeps three issues and every issue now has six horizons.
    // Keep enough rows to fall back when either newer issue is incomplete.
    .limit(18 * pointIds.length);
  if (error) throw error;
  type ForecastRow = NonNullable<typeof candidates>[number];
  const groups = new Map<string, ForecastRow[]>();
  for (const candidate of candidates ?? []) {
    const key = `${candidate.snapshot_date}:${candidate.generated_at}`;
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }
  const rows = [...groups.values()].find((group) =>
    group.length === expectedHorizons.length * pointIds.length &&
    expectedHorizons.every((horizon) => pointIds.every((pointId) =>
      group.some((row) => row.point_id === pointId && row.horizon_hours === horizon))) &&
    group.every((row) => row.unavailable_fields.length === 0)
  );
  if (!rows) return null;
  const aggregateHorizon = (horizonHours: number) => {
    const horizonRows = rows.filter((row) => row.horizon_hours === horizonHours);
    const aggregate = aggregateEnvironmentRows(horizonRows.map((row) => ({
      observed_at: row.valid_at,
      sources: row.sources,
      source_resolution_m: row.source_resolution_m,
      confidence: row.confidence,
      unavailable_fields: row.unavailable_fields,
      values: row.values,
    })));
    return {
      validAt: aggregate.observedAt,
      horizonHours,
      pointCount: horizonRows.length,
      source: aggregate.source,
      sourceResolutionM: aggregate.sourceResolutionM,
      confidence: aggregate.confidence,
      unavailableFields: aggregate.unavailableFields,
      values: aggregate.values,
    };
  };
  return {
    generatedAt: rows[0].generated_at,
    baseline: aggregateHorizon(0),
    snapshots: expectedHorizons.slice(1).map(aggregateHorizon),
  };
}

async function readHistoryCellSupport(
  supabase: ReturnType<typeof createAdminClient>,
  cellId: string,
  resolution: number,
) {
  if (resolution === 250) {
    const { data: cell, error: cellError } = await supabase
      .from("spatial_cells")
      .select("cell_id,region_id,weather_point_id,confidence")
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
    return {
      cellId: cell.cell_id,
      regionId: cell.region_id,
      weatherPointIds: [cell.weather_point_id],
      soilPointIds: atmospherePoint?.soil_point_id ? [atmospherePoint.soil_point_id] : [],
      staticConfidence: cell.confidence,
    };
  }

  const { data: cell, error } = await supabase
    .from("spatial_cell_levels")
    .select("cell_id,region_id,weather_point_ids,soil_point_ids,confidence,condition_observed_at,condition_snapshot_date")
    .eq("cell_id", cellId)
    .eq("grid_size_m", resolution)
    .maybeSingle();
  if (error) throw error;
  if (!cell?.weather_point_ids?.length) return null;
  return {
    cellId: cell.cell_id,
    regionId: cell.region_id,
    weatherPointIds: cell.weather_point_ids,
    soilPointIds: cell.soil_point_ids ?? [],
    staticConfidence: cell.confidence,
    publishedObservedAt: cell.condition_observed_at,
    publishedSnapshotDate: cell.condition_snapshot_date,
  };
}

function minimumConfidence(...confidences: Array<EnvironmentSnapshotRow["confidence"] | null | undefined>) {
  const order: EnvironmentSnapshotRow["confidence"][] = ["unknown", "limited", "moderate", "high"];
  return confidences.reduce<EnvironmentSnapshotRow["confidence"]>((lowest, confidence) =>
    confidence && order.indexOf(confidence) < order.indexOf(lowest) ? confidence : lowest,
  "high");
}

async function readPointHistory(
  supabase: ReturnType<typeof createAdminClient>,
  pointIds: string[],
  days: number,
) {
  if (!pointIds.length) return [];
  const { data, error } = await supabase
    .from("weather_grid_snapshots")
    .select("point_id,snapshot_date,observed_at,sources,source_resolution_m,confidence,unavailable_fields,values")
    .in("point_id", pointIds)
    .order("snapshot_date", { ascending: false })
    .limit(days * pointIds.length);
  if (error) throw error;
  return data ?? [];
}

function groupHistoryRows<T extends { snapshot_date: string }>(rows: T[]) {
  const groups = new Map<string, T[]>();
  for (const row of rows) groups.set(row.snapshot_date, [...(groups.get(row.snapshot_date) ?? []), row]);
  return groups;
}

async function readCellHistory(
  supabase: ReturnType<typeof createAdminClient>,
  cellId: string,
  resolution: number,
  days: number,
) {
  const cell = await readHistoryCellSupport(supabase, cellId, resolution);
  if (!cell) return null;

  const [atmosphereSnapshots, soilSnapshots, forecast] = await Promise.all([
    readPointHistory(supabase, cell.weatherPointIds, days),
    readPointHistory(supabase, cell.soilPointIds, days),
    cell.soilPointIds.length
      ? readCellForecast(supabase, cell.soilPointIds).catch((error: unknown) => {
        console.error("Unable to read spatial forecast; returning observed history only", {
          cellId,
          message: error instanceof Error ? error.message : "Unknown forecast read error",
        });
        return null;
      })
      : Promise.resolve(null),
  ]);
  const atmosphereByDate = groupHistoryRows(atmosphereSnapshots);
  const soilByDate = groupHistoryRows(soilSnapshots);
  const completeAtmosphereDates = [...atmosphereByDate]
    .filter(([, rows]) => new Set(rows.map((row) => row.point_id)).size === cell.weatherPointIds.length)
    .filter(([snapshotDate]) => !cell.publishedSnapshotDate || snapshotDate <= cell.publishedSnapshotDate)
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-days);

  return {
    cellId: cell.cellId,
    regionId: cell.regionId,
    forecast,
    snapshots: completeAtmosphereDates.map(([snapshotDate, atmosphereRows]) => {
      const soilRows = soilByDate.get(snapshotDate) ?? [];
      const completeSoilRows = !cell.soilPointIds.length ||
          new Set(soilRows.map((row) => row.point_id)).size === cell.soilPointIds.length
        ? soilRows
        : [];
      const aggregate = aggregateEnvironmentRows(
        [...atmosphereRows, ...completeSoilRows] as EnvironmentSnapshotRow[],
      );
      return {
        observedAt: aggregate.observedAt,
        source: aggregate.source,
        sourceResolutionM: aggregate.sourceResolutionM,
        confidence: minimumConfidence(aggregate.confidence, cell.staticConfidence),
        unavailableFields: aggregate.unavailableFields,
        values: aggregate.values,
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
  altitudeCoreMin: number;
  altitudeCoreMax: number;
  phMin?: number;
  phMax?: number;
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
  // The weighted readers are the only supported gate, so the core band that
  // anchors their altitude taper is required.
  if (altitudeCoreMin === undefined || altitudeCoreMax === undefined ||
    altitudeCoreMin < 0 || altitudeCoreMin >= altitudeCoreMax ||
    altitudeCoreMax > 4000 || altitudeCoreMin < altitudeMin || altitudeCoreMax > altitudeMax) {
    return "Invalid habitat altitude core";
  }
  if ((phMin === undefined) !== (phMax === undefined) || (phMin !== undefined && (phMin < 0 || phMax! > 14 || phMin >= phMax!))) {
    return "Invalid habitat soil pH range";
  }
  return {
    speciesId, profileKey,
    forestTerms, altitudeMin, altitudeMax, altitudeCoreMin, altitudeCoreMax,
    phMin, phMax,
  };
}

async function readHabitatRows(
  supabase: ReturnType<typeof createAdminClient>,
  bounds: NonNullable<ReturnType<typeof bbox>>,
  resolution: number,
  limit: number,
  habitat: HabitatRequest,
) {
  const rpc = resolution === 250
    ? "read_weighted_potential_habitat_cells"
    : "read_weighted_coarse_potential_habitat_cells";
  const result = await supabase.rpc(rpc, {
    p_west: bounds.west,
    p_south: bounds.south,
    p_east: bounds.east,
    p_north: bounds.north,
    p_grid_size_m: resolution,
    p_forest_terms: habitat.forestTerms,
    p_altitude_min: habitat.altitudeCoreMin,
    p_altitude_max: habitat.altitudeCoreMax,
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
    const resolution = Number(url.searchParams.get("resolution") ?? 250);
    const requestedDays = Number(url.searchParams.get("days") ?? 7);
    const days = Number.isInteger(requestedDays) ? Math.min(Math.max(requestedDays, 1), 7) : 7;
    if (!cellId || cellId.length > 160 || !Number.isInteger(resolution) || !supportedResolutions.has(resolution)) {
      return json({ error: "Invalid cell history request" }, 400);
    }
    try {
      const history = await readCellHistory(createAdminClient(), cellId, resolution, days);
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
      : resolution >= 1000
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
    const includeHabitatParam = url.searchParams.get("includeHabitat");
    const includeHabitat = includeHabitatParam === "true";
    // "all" attaches every species' cached coverage arrays to each cell so the
    // combined prediction map scores the whole catalogue from one response.
    const includeAllHabitat = includeHabitatParam === "all";
    if (includeAllHabitat && resolution < 1000) {
      return json({ error: "All-species habitat requires a coarse resolution" }, 400);
    }
    const habitat = includeHabitat ? habitatRequest(url.searchParams) : null;
    if (typeof habitat === "string") return json({ error: habitat }, 400);
    const [environmentResult, habitatResult, allHabitatResult, habitatProfilesResult] = await Promise.all([
      supabase.rpc(rpc, rpcParams),
      habitat ? readHabitatRowsForBounds(supabase, bounds, resolution, limit, habitat) : Promise.resolve(null),
      includeAllHabitat
        ? supabase.rpc("read_all_cached_species_habitat_cells", {
            p_west: bounds.west,
            p_south: bounds.south,
            p_east: bounds.east,
            p_north: bounds.north,
            p_grid_size_m: resolution,
            p_limit: limit,
          })
        : Promise.resolve(null),
      includeAllHabitat
        ? supabase.from("species_habitat_profiles").select("species_id,slot,profile_key,complete")
        : Promise.resolve(null),
    ]);
    const { data, error } = environmentResult;
    if (error) throw error;
    // Habitat is a required scoring input when requested. Never turn a failed
    // habitat read into a successful response full of misleading null scores.
    if (habitatResult?.error) throw habitatResult.error;
    if (allHabitatResult?.error) throw allHabitatResult.error;
    if (habitatProfilesResult?.error) throw habitatProfilesResult.error;
    const allHabitatRows = (allHabitatResult?.data ?? []) as Record<string, unknown>[];
    if (allHabitatResult && allHabitatRows.length >= limit) {
      // A truncated all-slots read cannot be told apart from verified zeros,
      // so it must fail loudly rather than score absent species as zero.
      throw new Error("All-species habitat read was truncated");
    }
    const allHabitatByCellId = new Map(allHabitatRows.map((row) => [row.cell_id, row]));
    const habitatProfiles = includeAllHabitat
      ? ((habitatProfilesResult?.data ?? []) as Record<string, unknown>[]).map((row) => ({
          speciesId: row.species_id,
          slot: row.slot,
          profileKey: row.profile_key,
          complete: row.complete,
        }))
      : undefined;
    const habitatRows = habitatResult ? habitatResult.data ?? [] : null;
    const habitatRowsByCellId = new Map(
      (habitatRows ?? []).map((row: Record<string, unknown>) => [row.cell_id, row]),
    );
    const completeHabitatCoverage = habitatResult?.complete ?? false;
    const scoreOnly = url.searchParams.get("view") === "score";
    const environmentRows = (data ?? []) as Record<string, unknown>[];
    const geologyResult = scoreOnly || !environmentRows.length
      ? null
      : await supabase.rpc("read_spatial_geology_evidence", {
          p_cell_ids: environmentRows.map((row) => String(row.cell_id)),
          p_grid_size_m: resolution,
        });
    if (geologyResult?.error) throw geologyResult.error;
    const geologyByCellId = new Map(
      ((geologyResult?.data ?? []) as Record<string, unknown>[])
        .map((row) => [String(row.cell_id), row]),
    );
    const cells = environmentRows.map((row) => {
      const baseValues = scoreOnly ? scoringValues(row.values) : row.values;
      let values = baseValues && typeof baseValues === "object" && !Array.isArray(baseValues)
        ? { ...(baseValues as Record<string, unknown>) }
        : {};
      if (!scoreOnly) {
        const geology = geologicalSubstrateEvidence(
          geologyByCellId.get(String(row.cell_id)),
          resolution,
        );
        if (geology) values.geologicalSubstrate = geology;
      }
      if (includeHabitat) {
        values = mergeHabitatScoringValues(
          values,
          habitatRowsByCellId.get(row.cell_id) as Record<string, unknown> | undefined,
          completeHabitatCoverage,
        );
      }
      const allHabitat = includeAllHabitat
        ? allHabitatByCellId.get(row.cell_id)
        : undefined;
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
        // A cell without a cached row carries verified zeros for every slot;
        // the arrays are omitted rather than materialised as 52 zeros.
        ...(allHabitat
          ? {
              habitatCoverages: allHabitat.coverages,
              habitatWeightedCoverages: allHabitat.weighted_coverages,
            }
          : {}),
      };
    });
    return json({
      cells,
      truncated: cells.length === limit,
      bounds,
      resolution,
      ...(habitatProfiles ? { habitatProfiles } : {}),
    }, 200, {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
    });
  } catch (error) {
    console.error("Unable to read spatial environment", error);
    return json({ error: "Unable to load spatial environment" }, 500);
  }
});
