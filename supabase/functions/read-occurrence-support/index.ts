import { createAdminClient, finiteNumber, json } from "../_shared/pipeline.ts";

function numberParam(searchParams: URLSearchParams, name: string) {
  const rawValue = searchParams.get(name);
  if (rawValue === null || rawValue.trim() === "") return undefined;
  return finiteNumber(Number(rawValue));
}

function parseBounds(searchParams: URLSearchParams) {
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
  const bounds = parseBounds(url.searchParams);
  if (!bounds) return json({ error: "Invalid or excessive bounding box" }, 400);

  const speciesId = url.searchParams.get("species")?.trim() ?? "";
  if (!/^[a-z0-9-]{3,80}$/.test(speciesId)) return json({ error: "Invalid species identifier" }, 400);

  const requestedLimit = Number(url.searchParams.get("limit") ?? 1000);
  const limit = Math.min(Math.max(Number.isInteger(requestedLimit) ? requestedLimit : 1000, 1), 1000);

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("read_species_occurrence_support", {
      p_species_id: speciesId,
      p_west: bounds.west,
      p_south: bounds.south,
      p_east: bounds.east,
      p_north: bounds.north,
      p_limit: limit
    });
    if (error) throw error;

    const cells = (data ?? []).map((row: Record<string, unknown>) => ({
      cellId: row.cell_id,
      gridSizeM: row.grid_size_m,
      bounds: [[row.west, row.south], [row.east, row.north]],
      recordCount: row.record_count,
      observedYearMin: row.observed_year_min,
      observedYearMax: row.observed_year_max,
      observedMonths: row.observed_months,
      sources: row.sources
    }));

    return json({ cells, truncated: cells.length === limit, bounds, speciesId }, 200, {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
    });
  } catch (error) {
    console.error("Unable to read historical occurrence support", error);
    return json({ error: "Unable to load historical occurrence support" }, 500);
  }
});
