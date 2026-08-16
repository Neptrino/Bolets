import { createAdminClient, finiteNumber, finishRun, json, refreshSpatialLevelConditionsAfterIngestion, startRun, verifyIngestionRequest } from "../_shared/pipeline.ts";
import { configureOpenMeteoRequest, configureOpenMeteoSeamlessPrecipitationRequest, fetchOpenMeteoLocations, normalizeOpenMeteo, type OpenMeteoLocation, type RequestProfile } from "../_shared/open-meteo.ts";
import {
  buildStationCorrectedPrecipitation,
  normalizeStationMatrixRow,
  STATION_RAIN_SOURCE_VERSION,
  type StationHourSeries,
} from "../_shared/xema-rain.ts";

type WeatherPoint = {
  point_id: string;
  requested_lat: number;
  requested_lon: number;
  requested_elevation_m: number | null;
  native_resolution_m: number;
  model: string;
};

const BATCH_SIZE = 400;
const PROVIDER_BATCH_SIZE = 50;
const COMPLETE_CURSOR = "__complete__";
const CURSOR_PIPELINE = "spatial-atmosphere";

async function fetchWeather(points: WeatherPoint[], profile: RequestProfile) {
  const results: OpenMeteoLocation[] = [];
  for (let start = 0; start < points.length; start += PROVIDER_BATCH_SIZE) {
    const batch = points.slice(start, start + PROVIDER_BATCH_SIZE);
    const url = new URL(profile === "atmosphere"
      ? "https://api.open-meteo.com/v1/meteofrance"
      : "https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", batch.map((point) => point.requested_lat).join(","));
    url.searchParams.set("longitude", batch.map((point) => point.requested_lon).join(","));
    if (batch.every((point) => point.requested_elevation_m !== null)) {
      url.searchParams.set("elevation", batch.map((point) => point.requested_elevation_m).join(","));
    }
    if (profile === "atmosphere") url.searchParams.set("models", "arome_france");
    configureOpenMeteoRequest(url, profile);
    results.push(...await fetchOpenMeteoLocations(url, profile));
  }
  if (results.length !== points.length) throw new Error(`Open-Meteo ${profile} request returned ${results.length} of ${points.length} spatial locations`);
  return results;
}

/**
 * Past precipitation from the seamless Météo-France blend on the identical
 * hourly axis as the AROME request. A failure degrades to AROME rain for
 * this run instead of blocking the daily thermal refresh.
 */
async function fetchSeamlessPrecipitation(points: WeatherPoint[]) {
  try {
    const results: OpenMeteoLocation[] = [];
    for (let start = 0; start < points.length; start += PROVIDER_BATCH_SIZE) {
      const batch = points.slice(start, start + PROVIDER_BATCH_SIZE);
      const url = new URL("https://api.open-meteo.com/v1/meteofrance");
      url.searchParams.set("latitude", batch.map((point) => point.requested_lat).join(","));
      url.searchParams.set("longitude", batch.map((point) => point.requested_lon).join(","));
      configureOpenMeteoSeamlessPrecipitationRequest(url);
      results.push(...await fetchOpenMeteoLocations(url, "seamless precipitation"));
    }
    if (results.length !== points.length) return undefined;
    return results;
  } catch (error) {
    console.error("Seamless precipitation fetch failed; keeping AROME rain for this run", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return undefined;
  }
}

async function fetchGaugeMatrix(supabase: ReturnType<typeof createAdminClient>) {
  const { data, error } = await supabase.rpc("get_xema_rain_matrix", { p_hours: 744 });
  if (error) {
    console.error("Gauge matrix read failed; past rain falls back to the model blend", { message: error.message });
    return [];
  }
  return (Array.isArray(data) ? data : [])
    .map(normalizeStationMatrixRow)
    .filter((station): station is StationHourSeries => station !== undefined);
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
    const lastCellId = cursor?.snapshot_date === today ? cursor.last_cell_id as string | null : null;
    if (lastCellId === COMPLETE_CURSOR) {
      const conditionsRefreshed = await refreshSpatialLevelConditionsAfterIngestion(supabase, today);
      return json({ refreshed: 0, complete: true, conditionsRefreshed, snapshotDate: today });
    }

    runId = await startRun(supabase, "spatial-atmosphere", body.trigger === "manual" ? "manual" : "cron", today, { batchSize: BATCH_SIZE, model: "arome_france" });

    let query = supabase.from("weather_grid_points").select("point_id,requested_lat,requested_lon,requested_elevation_m,native_resolution_m,model").eq("model", "arome_france").order("point_id").limit(BATCH_SIZE);
    if (lastCellId) query = query.gt("point_id", lastCellId);
    const { data, error: pointError } = await query;
    if (pointError) throw pointError;
    const points = (data ?? []) as WeatherPoint[];
    if (!points.length) {
      await supabase.from("pipeline_cursors").upsert({ pipeline: CURSOR_PIPELINE, snapshot_date: today, last_cell_id: COMPLETE_CURSOR, updated_at: new Date().toISOString() });
      await finishRun(supabase, runId, "skipped", { metadata: { reason: lastCellId ? "Daily spatial refresh completed" : "No weather grid points" } });
      const conditionsRefreshed = await refreshSpatialLevelConditionsAfterIngestion(supabase, today);
      return json({ runId, refreshed: 0, complete: true, conditionsRefreshed, snapshotDate: today });
    }

    const weather = await fetchWeather(points, "atmosphere");
    const seamless = await fetchSeamlessPrecipitation(points);
    const gaugeStations = await fetchGaugeMatrix(supabase);
    const observedAt = new Date().toISOString();
    const rows = points.map((point, index) => {
      const location = weather[index];
      // station-rain-v1: replace past precipitation before normalization so
      // every rain window, wet-day count and dry-spell length recomputes
      // from one corrected series. Thermal fields stay untouched AROME.
      const aromeTimes = Array.isArray(location.hourly?.time) ? location.hourly.time as unknown[] : [];
      const seamlessHourly = seamless?.[index]?.hourly;
      const seamlessTimes = Array.isArray(seamlessHourly?.time) ? seamlessHourly.time as unknown[] : undefined;
      const seamlessPrecipitation = Array.isArray(seamlessHourly?.precipitation)
        ? seamlessHourly.precipitation as unknown[]
        : undefined;
      const seamlessAligned = seamlessTimes !== undefined && seamlessPrecipitation !== undefined &&
        JSON.stringify(seamlessTimes) === JSON.stringify(aromeTimes);
      const fallbackSeries = seamlessAligned && seamlessPrecipitation
        ? seamlessPrecipitation
        : (Array.isArray(location.hourly?.precipitation) ? location.hourly.precipitation as unknown[] : []);
      const corrected = buildStationCorrectedPrecipitation(
        aromeTimes,
        fallbackSeries,
        gaugeStations,
        point.requested_lat,
        point.requested_lon,
      );
      if (location.hourly) location.hourly.precipitation = corrected.series;
      const gaugeCoverage = corrected.totalHours
        ? Math.round((corrected.gaugeHours / corrected.totalHours) * 100) / 100
        : 0;
      const normalized = normalizeOpenMeteo(location, location, "atmosphere");
      const values = {
        ...normalized.values,
        weatherModel: "Météo-France AROME France",
        precipitationSource: STATION_RAIN_SOURCE_VERSION,
        precipitationFallbackModel: seamlessAligned ? "meteofrance_seamless" : "arome_france",
        precipitationGaugeCoverage: gaugeCoverage,
        atmosphericResolutionM: 2500,
        soilMoistureResolutionM: 9000,
        weatherGridLatitude: finiteNumber(location.latitude),
        weatherGridLongitude: finiteNumber(location.longitude),
        weatherElevationM: finiteNumber(location.elevation)
      };
      return {
        point_id: point.point_id,
        snapshot_date: today,
        observed_at: observedAt,
        sources: [
          "Météo-France AROME via Open-Meteo",
          ...(seamlessAligned ? ["Météo-France seamless precipitation via Open-Meteo"] : []),
          ...(gaugeCoverage > 0 ? ["Meteocat XEMA station gauges"] : []),
        ],
        source_resolution_m: point.native_resolution_m,
        confidence: normalized.unavailableFields.length ? "limited" : "moderate",
        stale: false,
        unavailable_fields: normalized.unavailableFields,
        values,
        run_id: runId
      };
    });

    const { error } = await supabase.from("weather_grid_snapshots").upsert(rows, { onConflict: "point_id,snapshot_date" });
    if (error) throw error;
    const complete = points.length < BATCH_SIZE;
    await supabase.from("pipeline_cursors").upsert({
      pipeline: CURSOR_PIPELINE,
      snapshot_date: today,
      last_cell_id: complete ? COMPLETE_CURSOR : points.at(-1)?.point_id,
      updated_at: observedAt
    });
    await finishRun(supabase, runId, rows.some((row) => row.unavailable_fields.length) ? "partial" : "succeeded", {
      rowsRead: points.length,
      rowsWritten: rows.length,
      metadata: {
        firstPointId: points[0].point_id,
        lastPointId: points.at(-1)?.point_id,
        atmosphericModel: "arome_france",
        precipitationSource: STATION_RAIN_SOURCE_VERSION,
        precipitationFallbackModel: seamless ? "meteofrance_seamless" : "arome_france",
        gaugeStationCount: gaugeStations.length,
        atmosphericResolutionM: 2500,
        soilMoistureResolutionM: 9000
      }
    });
    const conditionsRefreshed = complete
      ? await refreshSpatialLevelConditionsAfterIngestion(supabase, today)
      : false;
    return json({ runId, refreshed: rows.length, complete, conditionsRefreshed, snapshotDate: today });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Spatial environmental refresh failed", { runId, message });
    try {
      if (runId) await finishRun(createAdminClient(), runId, "failed", { errorMessage: message });
    } catch (finishError) {
      console.error("Unable to record failed spatial refresh", finishError);
    }
    return json({ error: "Spatial environmental refresh failed", runId }, 500);
  }
});
