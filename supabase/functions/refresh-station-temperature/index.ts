import { createAdminClient, finishRun, json, requireServiceRole, startRun, verifyIngestionRequest } from "../_shared/pipeline.ts";
import { attachStationTemperatureBatch } from "../_shared/station-temperature-backfill.ts";

const PIPELINE = "station-temperature-publication-v3";
Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  const db = createAdminClient();
  if (!requireServiceRole(request) && !await verifyIngestionRequest(request, db)) return json({ error: "Unauthorized" }, 401);
  let runId: string | undefined;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: atmosphere, error: atmosphereError } = await db.from("pipeline_cursors").select("snapshot_date,last_cell_id,updated_at")
      .eq("pipeline", "spatial-atmosphere").maybeSingle();
    if (atmosphereError) throw atmosphereError;
    if (atmosphere?.snapshot_date !== today || atmosphere.last_cell_id !== "__complete__") return json({ waiting: "atmosphere" });
    const { data: cursor, error: cursorError } = await db.from("pipeline_cursors").select("snapshot_date,last_cell_id,updated_at")
      .eq("pipeline", PIPELINE).maybeSingle();
    if (cursorError) throw cursorError;
    const sameGeneration = cursor?.snapshot_date === today && Date.parse(cursor.updated_at) >= Date.parse(atmosphere.updated_at);
    if (sameGeneration && cursor.last_cell_id === "__complete__") return json({ complete: true });
    const last = sameGeneration ? cursor.last_cell_id : "";
    runId = await startRun(db, "station-temperature", "cron", today, { phase: "attach-frozen-temperature", last });
    const batch = await attachStationTemperatureBatch(db, last, today);
    if (!batch.ready) {
      await finishRun(db, runId, "partial", { metadata: { waiting: "complete-station-window" } });
      return json({ waiting: "station-window" });
    }
    if (batch.complete) {
      const { data, error } = await db.rpc("request_station_temperature_republication");
      if (error) throw error;
      if (!data) {
        await finishRun(db, runId, "partial", { metadata: { waiting: "condition-publication" } });
        return json({ waiting: "condition-publication" });
      }
    }
    // Repeated concurrent batches attach identical frozen references. Never
    // advance over a competing cursor or overwrite a newer atmosphere row.
    const next = { pipeline: PIPELINE, snapshot_date: today, last_cell_id: batch.complete ? "__complete__" : batch.next, updated_at: new Date().toISOString() };
    const { error: writeError } = cursor
      ? await db.from("pipeline_cursors").update(next).eq("pipeline", PIPELINE).eq("snapshot_date", cursor.snapshot_date).eq("last_cell_id", cursor.last_cell_id)
      : await db.from("pipeline_cursors").upsert(next, { onConflict: "pipeline", ignoreDuplicates: true });
    if (writeError) throw writeError;
    await finishRun(db, runId, "succeeded", { rowsWritten: batch.attached, metadata: batch });
    return json(batch);
  } catch (error) {
    if (runId) await finishRun(db, runId, "failed", { errorMessage: error instanceof Error ? error.message : "Temperature attachment failed" });
    return json({ error: "Temperature attachment failed", runId }, 500);
  }
});
