import { createAdminClient, finishRun, json, requireServiceRole, startRun, verifyIngestionRequest } from "../_shared/pipeline.ts";
import { fetchXemaRows, normalizeXemaStation, xemaStationsUrl } from "../_shared/xema-rain.ts";
import { aggregateXemaTemperatureHours, xemaTemperatureDayUrl } from "../_shared/xema-temperature.ts";
import { STATION_TEMPERATURE_CODES } from "../_shared/station-temperature-field.ts";

const SOURCE = "meteocat-xema-temperature";
Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  const db = createAdminClient();
  if (!requireServiceRole(request) && !await verifyIngestionRequest(request, db)) return json({ error: "Unauthorized ingestion request" }, 401);
  let runId: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    const { data: existing, error: readError } = await db.from("xema_temperature_days").select("day").gte("day", new Date(Date.now() - 31 * 86_400_000).toISOString().slice(0, 10)).limit(32);
    if (readError) throw readError;
    const days = body.days === undefined ? (existing?.length === 32 ? 3 : 32) : Number(body.days);
    if (!Number.isInteger(days) || days < 1 || days > 32) return json({ error: "days must be between 1 and 32" }, 400);
    runId = await startRun(db, "station-temperature", body.trigger === "cron" ? "cron" : "manual", new Date().toISOString().slice(0, 10),
      { quality: "published", stationCodes: STATION_TEMPERATURE_CODES, days });
    const metadata = await fetchXemaRows(xemaStationsUrl(), "temperature station metadata");
    const stations = metadata.map(normalizeXemaStation).filter((s): s is NonNullable<typeof s> =>
      !!s && (STATION_TEMPERATURE_CODES as readonly string[]).includes(s.station_code));
    if (stations.length !== STATION_TEMPERATURE_CODES.length) throw new Error("Incomplete evaluated station pool");
    stations.sort((a, b) => a.station_code.localeCompare(b.station_code));
    const today = Date.parse(new Date().toISOString().slice(0, 10));
    let count = 0;
    // Bounded concurrency; each day replaces its full normalized state, so a
    // newly invalidated reading cannot survive from an earlier import.
    for (let offset = 0; offset < days; offset += 3) {
      const rows = await Promise.all(Array.from({ length: Math.min(3, days - offset) }, async (_, i) => {
        const day = new Date(today - (offset + i) * 86_400_000).toISOString().slice(0, 10);
        const raw = await fetchXemaRows(xemaTemperatureDayUrl(day, [...STATION_TEMPERATURE_CODES]), "temperature readings");
        if (raw.length >= 10000) throw new Error("Truncated station day");
        const aggregate = aggregateXemaTemperatureHours(raw, "published");
        count += aggregate.hours.length;
        return { day, stations, hours: aggregate.hours, raw_readings: raw,
          quality: aggregate.qualityCounts, run_id: runId, fetched_at: new Date().toISOString() };
      }));
      const { error } = await db.from("xema_temperature_days").upsert(rows, { onConflict: "day" });
      if (error) throw error;
    }
    const edge = new Date(today - 35 * 86_400_000).toISOString();
    for (const [table, field] of [["xema_temperature_days", "day"], ["thermal_model_windows", "created_at"], ["station_temperature_windows", "created_at"]]) {
      const { error } = await db.from(table).delete().lt(field, field === "day" ? edge.slice(0, 10) : edge);
      if (error) throw error;
    }
    await db.from("pipeline_sources").update({ status: "active", checked_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      status_detail: `Published XEMA temperature: ${count} complete hours across ${days} days; provisional readings accepted. Frozen into subsequent atmospheric publications.` }).eq("source_id", SOURCE);
    await finishRun(db, runId, "succeeded", { rowsWritten: count, metadata: { days, stations: stations.length, quality: "published" } });
    return json({ runId, days, hours: count, stations: stations.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Station temperature import failed";
    if (runId) await finishRun(db, runId, "failed", { errorMessage: message });
    await db.from("pipeline_sources").update({ status: "degraded", checked_at: new Date().toISOString(),
      status_detail: "Temperature import failed; existing frozen publications remain valid and unsupported cells retain AROME." }).eq("source_id", SOURCE);
    console.error("Station temperature import failed", { message, runId });
    return json({ error: "Station temperature import failed", runId }, 500);
  }
});
