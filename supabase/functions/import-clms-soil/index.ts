import {
  createAdminClient,
  finishRun,
  json,
  requireServiceRole,
  startRun,
  verifyNamedToken,
} from "../_shared/pipeline.ts";
import { normalizeClmsImport } from "../_shared/clms-soil.ts";

const SOURCE_IDS = [
  "copernicus-clms-ssm-1km-v1",
  "copernicus-clms-swi-1km-v2",
];

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
    .in("source_id", SOURCE_IDS);
  if (error) {
    console.error("Unable to update CLMS source state", { message: error.message });
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
    const trusted = requireServiceRole(request) || await verifyNamedToken(
      request,
      supabase,
      "x-clms-import-token",
      "clms-soil-import",
    );
    if (!trusted) return json({ error: "Trusted CLMS import authorization required" }, 403);

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 1_500_000) return json({ error: "CLMS import payload is too large" }, 413);
    const payload = normalizeClmsImport(await request.json());
    const snapshotDate = payload.manifest.snapshot_date;
    runId = await startRun(supabase, "spatial-soil-satellite", "import", snapshotDate, {
      source: "Copernicus CLMS SSM v1 + SWI v2",
      batchIndex: payload.batchIndex,
      batchCount: payload.batchCount,
      expectedSamples: payload.expectedSamples,
      nativeResolutionM: 1000,
      samplingSpacingM: 2500,
      scoringEnabled: false,
    });

    const { data, error } = await supabase.rpc("upsert_clms_soil_shadow", {
      p_manifest: payload.manifest,
      p_samples: payload.samples,
      p_run_id: runId,
      p_reset: payload.batchIndex === 0,
      p_expected_samples: payload.expectedSamples,
    });
    if (error) throw error;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("CLMS import returned an invalid write result");
    }
    const result = data as Record<string, unknown>;
    const samplesWritten = Number(result.samplesWritten);
    let samplesStoredForDate = Number(result.samplesStoredForDate);
    if (!Number.isInteger(samplesWritten) || samplesWritten !== payload.samples.length ||
        !Number.isInteger(samplesStoredForDate) || samplesStoredForDate < samplesWritten ||
        samplesStoredForDate > payload.expectedSamples) {
      throw new Error("CLMS import returned inconsistent sample counts");
    }

    const lastBatch = payload.batchIndex === payload.batchCount - 1;
    let canonicalSampleCount: number | undefined;
    let complete = false;
    if (lastBatch) {
      const { data: finalizedData, error: finalizedError } = await supabase.rpc("finalize_clms_soil_shadow", {
        p_snapshot_date: snapshotDate,
        p_expected_samples: payload.expectedSamples,
      });
      if (finalizedError) throw finalizedError;
      if (!finalizedData || typeof finalizedData !== "object" || Array.isArray(finalizedData)) {
        throw new Error("CLMS import returned an invalid completion result");
      }
      const finalized = finalizedData as Record<string, unknown>;
      canonicalSampleCount = Number(finalized.canonicalSampleCount);
      samplesStoredForDate = Number(finalized.samplesStoredForDate);
      complete = finalized.complete === true;
      if (!Number.isInteger(canonicalSampleCount) || canonicalSampleCount < 1 ||
          !Number.isInteger(samplesStoredForDate) || samplesStoredForDate < samplesWritten ||
          samplesStoredForDate > payload.expectedSamples) {
        throw new Error("CLMS import returned inconsistent completion counts");
      }
    }
    if (lastBatch) {
      await updateSourceState(
        supabase,
        complete ? "active" : "degraded",
        complete
          ? `Latest validated shadow import contains ${samplesStoredForDate} canonical samples for ${snapshotDate}; production scoring remains on Open-Meteo soil moisture.`
          : `Shadow import for ${snapshotDate} stored ${samplesStoredForDate} of ${payload.expectedSamples} expected samples and must be resumed.`,
      );
    }

    await finishRun(supabase, runId, lastBatch && !complete ? "partial" : "succeeded", {
      rowsRead: payload.samples.length,
      rowsWritten: samplesWritten,
      metadata: {
        snapshotDate,
        batchIndex: payload.batchIndex,
        batchCount: payload.batchCount,
        samplesStoredForDate,
        expectedSamples: payload.expectedSamples,
        canonicalSampleCount,
        complete,
        scoringEnabled: false,
      },
    });
    return json({
      runId,
      snapshotDate,
      samplesWritten,
      samplesStoredForDate,
      canonicalSampleCount,
      complete,
      scoringEnabled: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("CLMS soil shadow import failed", { runId, message });
    if (supabase) {
      if (runId) {
        await finishRun(supabase, runId, "failed", { errorMessage: message });
      }
      await updateSourceState(
        supabase,
        "degraded",
        "The latest CLMS shadow import failed validation or storage and will not affect production scoring.",
      );
    }
    return json({ error: "CLMS soil shadow import failed", runId }, 500);
  }
});
