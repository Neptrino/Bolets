import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.3";

export type PipelineName = "regional-environment" | "spatial-environment" | "spatial-atmosphere" | "spatial-atmosphere-shadow" | "spatial-soil" | "spatial-soil-satellite" | "spatial-static-import" | "species-occurrences" | "station-rain";
export type TriggerType = "cron" | "manual" | "import";

export function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) throw new Error("Missing Supabase server credentials");
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

export async function verifyIngestionRequest(request: Request, supabase: ReturnType<typeof createAdminClient>) {
  return verifyNamedToken(request, supabase, "x-ingestion-token", "ingestion");
}

export async function verifyNamedToken(
  request: Request,
  supabase: ReturnType<typeof createAdminClient>,
  headerName: string,
  secretName: string
) {
  const token = request.headers.get(headerName);
  if (!token) return false;
  const { data, error } = await supabase.from("pipeline_secrets").select("secret_hash").eq("name", secretName).maybeSingle();
  if (error || !data?.secret_hash) return false;
  return constantTimeEqual(await sha256(token), data.secret_hash);
}

export function requireServiceRole(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) return false;
  try {
    const token = authorization.slice(7);
    const payload = JSON.parse(atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")));
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

export async function startRun(
  supabase: ReturnType<typeof createAdminClient>,
  pipeline: PipelineName,
  triggerType: TriggerType,
  snapshotDate: string,
  metadata: Record<string, unknown> = {}
) {
  const { data, error } = await supabase.from("ingestion_runs").insert({
    pipeline,
    trigger_type: triggerType,
    status: "running",
    snapshot_date: snapshotDate,
    metadata
  }).select("id").single();
  if (error || !data) throw new Error(`Unable to start ${pipeline} run: ${error?.message ?? "unknown error"}`);
  return data.id as string;
}

export async function finishRun(
  supabase: ReturnType<typeof createAdminClient>,
  runId: string,
  status: "succeeded" | "partial" | "failed" | "skipped",
  values: { rowsRead?: number; rowsWritten?: number; errorMessage?: string; metadata?: Record<string, unknown> }
) {
  const { error } = await supabase.from("ingestion_runs").update({
    status,
    completed_at: new Date().toISOString(),
    rows_read: values.rowsRead ?? 0,
    rows_written: values.rowsWritten ?? 0,
    error_message: values.errorMessage,
    metadata: values.metadata ?? {}
  }).eq("id", runId);
  if (error) {
    console.error("Unable to finish ingestion run", { runId, error: error.message });
    return false;
  }
  return true;
}

/**
 * Rebuild coarse conditions once the two observed spatial streams are both
 * complete. The database function makes this idempotent, so every final batch
 * can safely make the request without creating another full rebuild.
 */
export async function refreshSpatialLevelConditionsAfterIngestion(
  supabase: ReturnType<typeof createAdminClient>,
  snapshotDate: string,
) {
  const { data, error } = await supabase.rpc(
    "refresh_spatial_level_conditions_after_ingestion",
    { p_snapshot_date: snapshotDate },
  );
  if (error) {
    console.error("Unable to refresh coarse spatial conditions after ingestion", {
      snapshotDate,
      message: error.message,
    });
    return false;
  }
  return data === true;
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers }
  });
}

export function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
