import { createAdminClient, finishRun, json, startRun, verifyIngestionRequest } from "../_shared/pipeline.ts";
import {
  configureOpenMeteoRequest,
  fetchOpenMeteoLocations,
  normalizeOpenMeteo,
  OpenMeteoRequestError,
  type OpenMeteoEgressLane,
  type OpenMeteoLocation,
} from "../_shared/open-meteo.ts";
import { estimateOpenMeteoRequestUnits, recordOpenMeteoUsage } from "../_shared/provider-budget.ts";
import { regions } from "../_shared/regions.ts";

const REGIONAL_EGRESS_LANES = ["cloudflare", "aws"] as const;

async function fetchRegionalLocations(
  supabase: ReturnType<typeof createAdminClient>,
  weatherUrl: URL,
): Promise<{ locations: OpenMeteoLocation[]; egressLane: OpenMeteoEgressLane }> {
  let lastError: unknown;
  for (const egressLane of REGIONAL_EGRESS_LANES) {
    const { data: laneState, error: laneStateError } = await supabase
      .from("open_meteo_egress_lanes")
      .select("blocked_until")
      .eq("lane", egressLane)
      .maybeSingle();
    if (laneStateError) {
      throw new Error(`Unable to read ${egressLane} egress state: ${laneStateError.message}`);
    }
    if (
      laneState?.blocked_until
      && Date.parse(laneState.blocked_until) > Date.now()
    ) continue;

    await recordOpenMeteoUsage(
      supabase,
      "regional-environment",
      estimateOpenMeteoRequestUnits(weatherUrl, regions.length),
    );
    try {
      const locations = await fetchOpenMeteoLocations(weatherUrl, "regional environment", {
        attempts: 1,
        egressLane,
      });
      if (locations.length !== regions.length) {
        throw new Error(
          `Open-Meteo returned ${locations.length} of ${regions.length} requested regional locations`,
        );
      }
      const { error: successError } = await supabase.rpc("record_open_meteo_egress_success", {
        p_lane: egressLane,
      });
      if (successError) {
        throw new Error(`Unable to record ${egressLane} egress success: ${successError.message}`);
      }
      return { locations, egressLane };
    } catch (error) {
      lastError = error;
      if (error instanceof OpenMeteoRequestError && error.status === 429) {
        const { error: deferError } = await supabase.rpc("defer_open_meteo_egress_lane", {
          p_lane: egressLane,
          p_http_status: error.status,
          p_retry_after_seconds: error.retryAfterSeconds ?? null,
          p_error: error.message,
        });
        if (deferError) {
          throw new Error(`Unable to defer ${egressLane} egress: ${deferError.message}`);
        }
      }
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("No regional Open-Meteo relay lane is currently available");
}

Deno.serve(async (request) => {
  let runId: string | undefined;
  try {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
    const supabase = createAdminClient();
    if (!await verifyIngestionRequest(request, supabase)) return json({ error: "Unauthorized ingestion request" }, 401);

    const snapshotDate = new Date().toISOString().slice(0, 10);
    const body = await request.json().catch(() => ({})) as { trigger?: "cron" | "manual" };
    runId = await startRun(supabase, "regional-environment", body.trigger === "manual" ? "manual" : "cron", snapshotDate, {
      provider: "open-meteo",
      locations: regions.length
    });

    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.searchParams.set("latitude", regions.map((region) => region.latitude).join(","));
    weatherUrl.searchParams.set("longitude", regions.map((region) => region.longitude).join(","));
    weatherUrl.searchParams.set("elevation", regions.map((region) => region.altitudeM).join(","));
    configureOpenMeteoRequest(weatherUrl);

    const { locations, egressLane } = await fetchRegionalLocations(supabase, weatherUrl);

    const observedAt = new Date().toISOString();
    const rows = locations.map((location, index) => {
      const region = regions[index];
      const normalized = normalizeOpenMeteo(location);
      const values = {
        ...normalized.values,
        altitudeM: region.altitudeM
      };
      return {
        region_id: region.id,
        snapshot_date: snapshotDate,
        observed_at: observedAt,
        sources: ["Open-Meteo"],
        confidence: normalized.unavailableFields.length ? "limited" : "moderate",
        stale: false,
        unavailable_fields: normalized.unavailableFields,
        values
      };
    });

    const { error: staleError } = await supabase.from("environment_snapshots").update({ stale: true }).lt("snapshot_date", snapshotDate).eq("stale", false);
    if (staleError) throw staleError;
    const { error } = await supabase.from("environment_snapshots").upsert(rows, { onConflict: "region_id,snapshot_date" });
    if (error) throw error;
    await supabase.from("pipeline_sources").update({ status: "active", status_detail: "Latest regional batch completed.", checked_at: observedAt, updated_at: observedAt }).eq("source_id", "open-meteo");
    await finishRun(supabase, runId, rows.some((row) => row.unavailable_fields.length) ? "partial" : "succeeded", {
      rowsRead: locations.length,
      rowsWritten: rows.length,
      metadata: {
        observedAt,
        egressLane,
        unavailableRegions: rows.filter((row) => row.unavailable_fields.length).map((row) => row.region_id),
      },
    });
    return json({ runId, refreshed: rows.length, observedAt, snapshotDate });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Regional environmental refresh failed", { runId, message });
    try {
      const supabase = createAdminClient();
      if (runId) await finishRun(supabase, runId, "failed", { errorMessage: message });
      await supabase.from("pipeline_sources").update({ status: "degraded", status_detail: message, checked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("source_id", "open-meteo");
    } catch (finishError) {
      console.error("Unable to record failed regional run", finishError);
    }
    return json({ error: "Regional environmental refresh failed", runId }, 500);
  }
});
