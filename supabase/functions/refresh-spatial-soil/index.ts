import { createAdminClient, finiteNumber, finishRun, json, startRun, verifyIngestionRequest } from "../_shared/pipeline.ts";
import { configureOpenMeteoRequest, fetchOpenMeteoLocations, normalizeOpenMeteo, type OpenMeteoLocation } from "../_shared/open-meteo.ts";

type SoilPoint = {
  point_id: string;
  requested_lat: number;
  requested_lon: number;
  requested_elevation_m: number | null;
  native_resolution_m: number;
};

const BATCH_SIZE = 50;
const PROVIDER_BATCH_SIZE = 50;
const COMPLETE_CURSOR = "__complete__";
const CURSOR_PIPELINE = "spatial-soil";

async function fetchSoil(points: SoilPoint[]) {
  const results: OpenMeteoLocation[] = [];
  for (let start = 0; start < points.length; start += PROVIDER_BATCH_SIZE) {
    const batch = points.slice(start, start + PROVIDER_BATCH_SIZE);
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", batch.map((point) => point.requested_lat).join(","));
    url.searchParams.set("longitude", batch.map((point) => point.requested_lon).join(","));
    if (batch.every((point) => point.requested_elevation_m !== null)) {
      url.searchParams.set("elevation", batch.map((point) => point.requested_elevation_m).join(","));
    }
    configureOpenMeteoRequest(url, "soil");
    results.push(...await fetchOpenMeteoLocations(url, "soil"));
  }
  if (results.length !== points.length) throw new Error(`Open-Meteo returned ${results.length} of ${points.length} soil locations`);
  return results;
}

Deno.serve(async (request) => {
  let runId: string | undefined;
  try {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
    const supabase = createAdminClient();
    if (!await verifyIngestionRequest(request, supabase)) return json({ error: "Unauthorized ingestion request" }, 401);
    const today = new Date().toISOString().slice(0, 10);
    const body = await request.json().catch(() => ({})) as { trigger?: "cron" | "manual" };
    const { data: cursor, error: cursorError } = await supabase.from("pipeline_cursors").select("snapshot_date,last_cell_id").eq("pipeline", CURSOR_PIPELINE).maybeSingle();
    if (cursorError) throw cursorError;
    const lastPointId = cursor?.snapshot_date === today ? cursor.last_cell_id as string | null : null;
    if (lastPointId === COMPLETE_CURSOR) return json({ refreshed: 0, complete: true, snapshotDate: today });

    runId = await startRun(supabase, "spatial-soil", body.trigger === "manual" ? "manual" : "cron", today, { batchSize: BATCH_SIZE });
    let query = supabase.from("weather_grid_points").select("point_id,requested_lat,requested_lon,requested_elevation_m,native_resolution_m").eq("model", "best_match").order("point_id").limit(BATCH_SIZE);
    if (lastPointId) query = query.gt("point_id", lastPointId);
    const { data, error: pointError } = await query;
    if (pointError) throw pointError;
    const points = (data ?? []) as SoilPoint[];
    if (!points.length) {
      await supabase.from("pipeline_cursors").upsert({ pipeline: CURSOR_PIPELINE, snapshot_date: today, last_cell_id: COMPLETE_CURSOR, updated_at: new Date().toISOString() });
      await finishRun(supabase, runId, "skipped", { metadata: { reason: lastPointId ? "Daily soil refresh completed" : "No soil grid points" } });
      return json({ runId, refreshed: 0, complete: true, snapshotDate: today });
    }

    const weather = await fetchSoil(points);
    const observedAt = new Date().toISOString();
    const rows = points.map((point, index) => {
      const location = weather[index];
      const normalized = normalizeOpenMeteo(location, location, "soil");
      return {
        point_id: point.point_id,
        snapshot_date: today,
        observed_at: observedAt,
        sources: ["Open-Meteo soil moisture"],
        source_resolution_m: point.native_resolution_m,
        confidence: normalized.unavailableFields.length ? "limited" : "moderate",
        stale: false,
        unavailable_fields: normalized.unavailableFields,
        values: {
          ...normalized.values,
          soilMoistureResolutionM: 9000,
          soilGridLatitude: finiteNumber(location.latitude),
          soilGridLongitude: finiteNumber(location.longitude)
        },
        run_id: runId
      };
    });
    const { error } = await supabase.from("weather_grid_snapshots").upsert(rows, { onConflict: "point_id,snapshot_date" });
    if (error) throw error;
    await supabase.from("pipeline_cursors").upsert({ pipeline: CURSOR_PIPELINE, snapshot_date: today, last_cell_id: points.at(-1)?.point_id, updated_at: observedAt });
    await finishRun(supabase, runId, rows.some((row) => row.unavailable_fields.length) ? "partial" : "succeeded", {
      rowsRead: points.length,
      rowsWritten: rows.length,
      metadata: { firstPointId: points[0].point_id, lastPointId: points.at(-1)?.point_id, soilMoistureResolutionM: 9000 }
    });
    return json({ runId, refreshed: rows.length, complete: rows.length < BATCH_SIZE, snapshotDate: today });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Spatial soil refresh failed", { runId, message });
    try {
      if (runId) await finishRun(createAdminClient(), runId, "failed", { errorMessage: message });
    } catch (finishError) {
      console.error("Unable to record failed soil refresh", finishError);
    }
    return json({ error: "Spatial soil refresh failed", runId }, 500);
  }
});
