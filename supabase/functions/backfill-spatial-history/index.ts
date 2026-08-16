import {
  createAdminClient,
  finishRun,
  json,
  startRun,
  verifyIngestionRequest,
} from "../_shared/pipeline.ts";
import {
  configureOpenMeteoHistoricalRequest,
  fetchOpenMeteoLocations,
  normalizeOpenMeteoAt,
  type OpenMeteoLocation,
} from "../_shared/open-meteo.ts";
import {
  buildStationCorrectedPrecipitation,
  madridHourKey,
  normalizeStationMatrixRow,
  STATION_RAIN_SOURCE_VERSION,
  type StationHourSeries,
} from "../_shared/xema-rain.ts";

const XEMA_GAUGE_SOURCE = "Meteocat XEMA station gauges";

/**
 * Gauge hours reaching back to the start of the earliest 30-day window the
 * backfill will renormalize, within the matrix RPC's 2000-hour cap.
 */
function gaugeMatrixHours(earliestTargetAt: string, referenceAt: string) {
  const spanHours = Math.ceil(
    (Date.parse(referenceAt) - Date.parse(earliestTargetAt)) / 3_600_000,
  );
  return Math.min(2000, Math.max(1, spanHours + 744));
}

async function fetchGaugeMatrix(
  supabase: ReturnType<typeof createAdminClient>,
  hours: number,
) {
  const { data, error } = await supabase.rpc("get_xema_rain_matrix", { p_hours: hours });
  if (error) {
    console.error("Gauge matrix read failed; backfill keeps model rain", { message: error.message });
    return [];
  }
  return (Array.isArray(data) ? data : [])
    .map(normalizeStationMatrixRow)
    .filter((station): station is StationHourSeries => station !== undefined);
}

/**
 * Applies station-rain-v1 to a historical response before renormalization,
 * mirroring the live refresh: the epoch hourly axis is translated to the
 * gauge matrix's Europe/Madrid keys, gauge inverse-distance hours replace the
 * model series where the network is dense enough, and everything else keeps
 * model semantics.
 */
// Every location in a batch shares the same hourly axis, and Intl-based key
// formatting is expensive enough that translating it repeatedly exhausts the
// worker's CPU budget (observed as WORKER_RESOURCE_LIMIT), so keys are
// memoised per epoch hour.
const hourKeyByEpoch = new Map<number, string>();

function cachedMadridHourKey(epochSeconds: number) {
  const cached = hourKeyByEpoch.get(epochSeconds);
  if (cached !== undefined) return cached;
  const key = madridHourKey(epochSeconds) ?? "";
  if (hourKeyByEpoch.size >= 100_000) hourKeyByEpoch.clear();
  hourKeyByEpoch.set(epochSeconds, key);
  return key;
}

function applyStationRain(
  location: OpenMeteoLocation,
  stations: StationHourSeries[],
  latitude: number,
  longitude: number,
) {
  const times = Array.isArray(location.hourly?.time) ? location.hourly.time as unknown[] : [];
  const precipitation = Array.isArray(location.hourly?.precipitation)
    ? location.hourly.precipitation as unknown[]
    : [];
  if (!times.length || !stations.length) return { gaugeCoverage: 0, applied: false };
  const localKeys = times.map((time) =>
    typeof time === "number" ? cachedMadridHourKey(time) : ""
  );
  const corrected = buildStationCorrectedPrecipitation(
    localKeys,
    precipitation,
    stations,
    latitude,
    longitude,
  );
  if (location.hourly) location.hourly.precipitation = corrected.series;
  const gaugeCoverage = corrected.totalHours
    ? Math.round((corrected.gaugeHours / corrected.totalHours) * 100) / 100
    : 0;
  return { gaugeCoverage, applied: gaugeCoverage > 0 };
}

type HistoricalProfile = "atmosphere" | "soil";

type WeatherPoint = {
  point_id: string;
  requested_lat: number;
  requested_lon: number;
  requested_elevation_m: number | null;
  native_resolution_m: number;
};

type HistoricalSnapshot = {
  point_id: string;
  snapshot_date: string;
  observed_at: string;
  sources: string[];
  source_resolution_m: number;
  confidence: "high" | "moderate" | "limited" | "unknown";
  stale: boolean;
  unavailable_fields: string[];
  values: Record<string, unknown>;
  run_id: string | null;
};

const PROVIDER_BATCH_SIZE = 50;
const COMPLETE_CURSOR = "__complete__";
const MAX_BACKFILL_AGE_DAYS = 7;
const LEGACY_ATMOSPHERE_KEYS = [
  "frostHours7d",
  "frostHours10d",
  "temperatureAvg24hC",
  "temperatureMin24hC",
  "temperatureMax24hC",
  "temperatureMin7dC",
  "temperatureAvg10dC",
  "temperatureMin10dC",
  "temperatureMax10dC",
] as const;

function modelFor(profile: HistoricalProfile) {
  return profile === "atmosphere" ? "arome_france" : "best_match";
}

function batchSizeFor(profile: HistoricalProfile) {
  return profile === "atmosphere" ? 400 : 500;
}

function cursorFor(profile: HistoricalProfile, snapshotDate: string) {
  return `spatial-history-${profile}-${snapshotDate}`;
}

function validSnapshotDate(value: unknown, now = new Date()) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const target = Date.parse(`${value}T00:00:00Z`);
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(target) && target < today && target >= today - MAX_BACKFILL_AGE_DAYS * 86_400_000;
}

function targetAt(snapshot: HistoricalSnapshot) {
  const weatherObservedAt = snapshot.values.weatherObservedAt;
  if (typeof weatherObservedAt === "string" && Number.isFinite(Date.parse(weatherObservedAt))) {
    return weatherObservedAt;
  }
  return snapshot.observed_at;
}

function removeLegacyAtmosphereValues(values: Record<string, unknown>) {
  const result = { ...values };
  for (const key of LEGACY_ATMOSPHERE_KEYS) delete result[key];
  return result;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

async function fetchHistoricalWeather(
  points: WeatherPoint[],
  profile: HistoricalProfile,
  earliestTargetAt: string,
  referenceAt: string,
) {
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
    configureOpenMeteoHistoricalRequest(url, profile, earliestTargetAt, referenceAt);
    results.push(...await fetchOpenMeteoLocations(url, `${profile} historical backfill`));
  }
  if (results.length !== points.length) {
    throw new Error(`Open-Meteo returned ${results.length} of ${points.length} historical locations`);
  }
  return results;
}

Deno.serve(async (request) => {
  let runId: string | undefined;
  try {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
    const supabase = createAdminClient();
    if (!await verifyIngestionRequest(request, supabase)) return json({ error: "Unauthorized ingestion request" }, 401);
    const body = await request.json().catch(() => ({})) as {
      snapshotDate?: string;
      profile?: HistoricalProfile;
    };
    if (!validSnapshotDate(body.snapshotDate) || !["atmosphere", "soil"].includes(body.profile ?? "")) {
      return json({ error: "A valid snapshotDate from the previous seven days and profile are required" }, 400);
    }
    const snapshotDate = body.snapshotDate!;
    const profile = body.profile!;
    const cursorPipeline = cursorFor(profile, snapshotDate);
    const batchSize = batchSizeFor(profile);
    const { data: cursor, error: cursorError } = await supabase
      .from("pipeline_cursors")
      .select("snapshot_date,last_cell_id")
      .eq("pipeline", cursorPipeline)
      .maybeSingle();
    if (cursorError) throw cursorError;
    const lastPointId = cursor?.snapshot_date === snapshotDate
      ? cursor.last_cell_id as string | null
      : null;
    if (lastPointId === COMPLETE_CURSOR) {
      return json({ backfilled: 0, complete: true, profile, snapshotDate });
    }

    runId = await startRun(
      supabase,
      profile === "atmosphere" ? "spatial-atmosphere" : "spatial-soil",
      "manual",
      snapshotDate,
      { backfill: true, batchSize, model: modelFor(profile) },
    );
    let pointQuery = supabase
      .from("weather_grid_points")
      .select("point_id,requested_lat,requested_lon,requested_elevation_m,native_resolution_m")
      .eq("model", modelFor(profile))
      .order("point_id")
      .limit(batchSize);
    if (lastPointId) pointQuery = pointQuery.gt("point_id", lastPointId);
    const { data: pointData, error: pointError } = await pointQuery;
    if (pointError) throw pointError;
    const points = (pointData ?? []) as WeatherPoint[];
    if (!points.length) {
      const completedAt = new Date().toISOString();
      const { error: saveCursorError } = await supabase.from("pipeline_cursors").upsert({
        pipeline: cursorPipeline,
        snapshot_date: snapshotDate,
        last_cell_id: COMPLETE_CURSOR,
        updated_at: completedAt,
      });
      if (saveCursorError) throw saveCursorError;
      await finishRun(supabase, runId, "skipped", {
        metadata: { backfill: true, reason: "Historical backfill completed" },
      });
      return json({ runId, backfilled: 0, complete: true, profile, snapshotDate });
    }

    const { data: snapshotData, error: snapshotError } = await supabase
      .from("weather_grid_snapshots")
      .select("point_id,snapshot_date,observed_at,sources,source_resolution_m,confidence,stale,unavailable_fields,values,run_id")
      .eq("snapshot_date", snapshotDate)
      // A 400-id `in` filter exceeds the Data API URL budget. Point ids are
      // read in deterministic lexical order, so the matching inclusive range
      // selects the same batch without an oversized request URL.
      .gte("point_id", points[0].point_id)
      .lte("point_id", points.at(-1)!.point_id)
      .order("point_id");
    if (snapshotError) throw snapshotError;
    const snapshots = (snapshotData ?? []) as HistoricalSnapshot[];
    const byPointId = new Map(snapshots.map((snapshot) => [snapshot.point_id, snapshot]));
    if (snapshots.length !== points.length) {
      throw new Error(`Historical snapshot coverage is incomplete (${snapshots.length} of ${points.length})`);
    }
    const targets = snapshots.map(targetAt);
    const earliestTargetAt = targets.reduce((earliest, candidate) =>
      Date.parse(candidate) < Date.parse(earliest) ? candidate : earliest);
    const referenceAt = new Date().toISOString();
    const locations = await fetchHistoricalWeather(points, profile, earliestTargetAt, referenceAt);
    // station-rain-v1: historical model precipitation is replaced with gauge
    // hours before renormalization, so backfilled days carry the same rain
    // source as freshly ingested ones instead of a mixed-source seam.
    const gaugeStations = profile === "atmosphere"
      ? await fetchGaugeMatrix(supabase, gaugeMatrixHours(earliestTargetAt, referenceAt))
      : [];
    const rows = points.map((point, index) => {
      const snapshot = byPointId.get(point.point_id)!;
      const originalTargetAt = targetAt(snapshot);
      const stationRain = profile === "atmosphere"
        ? applyStationRain(locations[index], gaugeStations, point.requested_lat, point.requested_lon)
        : { gaugeCoverage: 0, applied: false };
      const normalized = normalizeOpenMeteoAt(locations[index], originalTargetAt, profile);
      if (normalized.unavailableFields.length) {
        throw new Error(
          `Historical ${profile} inputs are incomplete for ${point.point_id}: ${normalized.unavailableFields.join(", ")}`,
        );
      }
      const preservedValues = profile === "atmosphere"
        ? removeLegacyAtmosphereValues(snapshot.values)
        : snapshot.values;
      return {
        point_id: snapshot.point_id,
        snapshot_date: snapshot.snapshot_date,
        observed_at: snapshot.observed_at,
        // The provider source remains unchanged; run_id records the backfill
        // transformation without repeating provenance text in every grid row.
        sources: stationRain.applied
          ? [...new Set([...snapshot.sources, XEMA_GAUGE_SOURCE])]
          : snapshot.sources,
        source_resolution_m: snapshot.source_resolution_m,
        confidence: "moderate",
        stale: snapshot.stale,
        unavailable_fields: normalized.unavailableFields,
        values: {
          ...preservedValues,
          ...normalized.values,
          ...(profile === "atmosphere"
            ? {
                precipitationSource: stationRain.applied
                  ? STATION_RAIN_SOURCE_VERSION
                  : "arome_france",
                precipitationFallbackModel: "arome_france",
                precipitationGaugeCoverage: stationRain.gaugeCoverage,
              }
            : {}),
          weatherObservedAt: originalTargetAt,
        },
        run_id: runId,
      };
    });

    const { error: upsertError } = await supabase
      .from("weather_grid_snapshots")
      .upsert(rows, { onConflict: "point_id,snapshot_date" });
    if (upsertError) throw upsertError;
    const complete = points.length < batchSize;
    const updatedAt = new Date().toISOString();
    const { error: saveCursorError } = await supabase.from("pipeline_cursors").upsert({
      pipeline: cursorPipeline,
      snapshot_date: snapshotDate,
      last_cell_id: complete ? COMPLETE_CURSOR : points.at(-1)?.point_id,
      updated_at: updatedAt,
    });
    if (saveCursorError) throw saveCursorError;
    await finishRun(supabase, runId, "succeeded", {
      rowsRead: points.length,
      rowsWritten: rows.length,
      metadata: {
        backfill: true,
        profile,
        firstPointId: points[0].point_id,
        lastPointId: points.at(-1)?.point_id,
      },
    });
    return json({ runId, backfilled: rows.length, complete, profile, snapshotDate });
  } catch (error) {
    const message = errorMessage(error);
    console.error("Spatial history backfill failed", { runId, message });
    try {
      if (runId) await finishRun(createAdminClient(), runId, "failed", { errorMessage: message });
    } catch (finishError) {
      console.error("Unable to record failed spatial history backfill", finishError);
    }
    return json({ error: "Spatial history backfill failed", runId }, 500);
  }
});
