import {
  createAdminClient,
  finishRun,
  json,
  requireServiceRole,
  startRun,
  verifyIngestionRequest,
} from "../_shared/pipeline.ts";
import {
  aggregateXemaRainHours,
  fetchXemaRows,
  normalizeXemaStation,
  XEMA_PAGE_LIMIT,
  XEMA_RETENTION_DAYS,
  xemaRainReadingsUrl,
  xemaStationsUrl,
} from "../_shared/xema-rain.ts";

const SOURCE_ID = "meteocat-xema-rain";
const DEFAULT_WINDOW_HOURS = 48;
const MAX_WINDOW_HOURS = 14 * 24;
const MAX_READING_PAGES = 12;
const UPSERT_CHUNK_SIZE = 1000;

type ImportRequest = {
  trigger?: unknown;
  hours?: unknown;
  endAt?: unknown;
};

function importWindow(body: ImportRequest) {
  const hours = body.hours === undefined ? DEFAULT_WINDOW_HOURS : Number(body.hours);
  if (!Number.isInteger(hours) || hours < 1 || hours > MAX_WINDOW_HOURS) {
    throw new Error(`XEMA import hours must be an integer between 1 and ${MAX_WINDOW_HOURS}`);
  }
  const explicitEnd = body.endAt !== undefined;
  const endMilliseconds = explicitEnd ? Date.parse(String(body.endAt)) : Date.now();
  if (!Number.isFinite(endMilliseconds)) throw new Error("XEMA import endAt must be an ISO timestamp");
  // Round the window to whole hours so re-runs land on identical rows.
  const endHour = Math.ceil(endMilliseconds / 3_600_000) * 3_600_000;
  return {
    startAt: new Date(endHour - hours * 3_600_000).toISOString(),
    endAt: new Date(endHour).toISOString(),
    explicitEnd,
  };
}

async function updateSourceState(
  supabase: ReturnType<typeof createAdminClient>,
  status: "active" | "degraded",
  detail: string,
) {
  const checkedAt = new Date().toISOString();
  const { error } = await supabase
    .from("pipeline_sources")
    .update({
      status,
      status_detail: detail.slice(0, 500),
      checked_at: checkedAt,
      updated_at: checkedAt,
    })
    .eq("source_id", SOURCE_ID);
  if (error) {
    console.error("Unable to update XEMA source state", { message: error.message });
  }
}

Deno.serve(async (request) => {
  let runId: string | undefined;
  let supabase: ReturnType<typeof createAdminClient> | undefined;
  try {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
    }
    supabase = createAdminClient();
    const trusted = requireServiceRole(request) || await verifyIngestionRequest(request, supabase);
    if (!trusted) return json({ error: "Unauthorized ingestion request" }, 401);

    const body = request.headers.get("content-type")?.includes("application/json")
      ? (await request.json().catch(() => ({}))) as ImportRequest
      : {};
    const window = importWindow(body);
    runId = await startRun(
      supabase,
      "station-rain",
      body.trigger === "cron" ? "cron" : "manual",
      window.endAt.slice(0, 10),
      { source: "Meteocat XEMA semi-hourly precipitation", startAt: window.startAt, endAt: window.endAt, scoringEnabled: false },
    );

    const stationRows = await fetchXemaRows(xemaStationsUrl(), "station metadata");
    const stations = stationRows
      .map(normalizeXemaStation)
      .filter((station): station is NonNullable<typeof station> => station !== undefined);
    if (stations.length < 50) {
      throw new Error(`XEMA station metadata returned only ${stations.length} usable stations`);
    }
    const updatedAt = new Date().toISOString();
    const { error: stationError } = await supabase
      .from("xema_stations")
      .upsert(
        stations.map((station) => ({ ...station, updated_at: updatedAt })),
        { onConflict: "station_code" },
      );
    if (stationError) throw stationError;

    const readings: unknown[] = [];
    for (let page = 0; page < MAX_READING_PAGES; page += 1) {
      const rows = await fetchXemaRows(
        xemaRainReadingsUrl(window.startAt, window.endAt, page * XEMA_PAGE_LIMIT),
        "rain readings",
      );
      readings.push(...rows);
      if (rows.length < XEMA_PAGE_LIMIT) break;
      if (page === MAX_READING_PAGES - 1) {
        throw new Error("XEMA rain readings exceeded the paging budget; narrow the import window");
      }
    }

    const knownStations = new Set(stations.map((station) => station.station_code));
    const hours = aggregateXemaRainHours(readings);
    const storableHours = hours.filter((hour) => knownStations.has(hour.station_code));
    for (let offset = 0; offset < storableHours.length; offset += UPSERT_CHUNK_SIZE) {
      const chunk = storableHours
        .slice(offset, offset + UPSERT_CHUNK_SIZE)
        .map((hour) => ({ ...hour, run_id: runId }));
      const { error: hourError } = await supabase
        .from("xema_station_rain_hours")
        .upsert(chunk, { onConflict: "station_code,hour_start" });
      if (hourError) throw hourError;
    }

    // Retention keeps the shadow table a bounded operational window. Backfill
    // calls pass endAt explicitly and must not prune what they just wrote.
    if (!window.explicitEnd) {
      const retentionEdge = new Date(Date.now() - XEMA_RETENTION_DAYS * 86_400_000).toISOString();
      const { error: retentionError } = await supabase
        .from("xema_station_rain_hours")
        .delete()
        .lt("hour_start", retentionEdge);
      if (retentionError) throw retentionError;
    }

    const reportingStations = new Set(storableHours.map((hour) => hour.station_code)).size;
    await updateSourceState(
      supabase,
      "active",
      `Stored ${storableHours.length} station hours from ${reportingStations} stations for ${window.startAt} to ${window.endAt}; production rain windows remain on the model provider.`,
    );
    await finishRun(supabase, runId, "succeeded", {
      rowsRead: readings.length,
      rowsWritten: storableHours.length,
      metadata: {
        startAt: window.startAt,
        endAt: window.endAt,
        stationsListed: stations.length,
        stationsReporting: reportingStations,
        hoursSkippedUnknownStation: hours.length - storableHours.length,
        scoringEnabled: false,
      },
    });
    return json({
      runId,
      startAt: window.startAt,
      endAt: window.endAt,
      stationsListed: stations.length,
      stationsReporting: reportingStations,
      hoursWritten: storableHours.length,
      scoringEnabled: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("XEMA station rain import failed", { runId, message });
    if (supabase) {
      if (runId) {
        await finishRun(supabase, runId, "failed", { errorMessage: message });
      }
      await updateSourceState(
        supabase,
        "degraded",
        "The latest XEMA station rain import failed; the shadow window may be stale and production scoring is unaffected.",
      );
    }
    return json({ error: "XEMA station rain import failed", runId }, 500);
  }
});
