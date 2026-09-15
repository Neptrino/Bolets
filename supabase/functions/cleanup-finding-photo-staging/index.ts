import {
  createAdminClient,
  json,
  requireServiceRole,
  verifyIngestionRequest,
} from "../_shared/pipeline.ts";

const CHUNK_SIZE = 500;
const MAX_CHUNKS = 10;

// Both readers only return objects older than 72 hours, so a photo lost to a
// failed publish step can still be recovered for three days before it is swept.
const SWEEPS = [
  { bucket: "finding-photo-staging", reader: "read_stale_finding_photo_staging" },
  { bucket: "finding-photos", reader: "read_orphaned_finding_photos" },
] as const;

async function sweep(supabase: ReturnType<typeof createAdminClient>, bucket: string, reader: string) {
  let removed = 0;
  for (let chunk = 0; chunk < MAX_CHUNKS; chunk += 1) {
    const { data, error } = await supabase.rpc(reader, { p_limit: CHUNK_SIZE });
    if (error) throw error;
    const paths = (data ?? []).map((row: { storage_path: string }) => row.storage_path);
    if (!paths.length) break;
    const deletion = await supabase.storage.from(bucket).remove(paths);
    if (deletion.error) throw deletion.error;
    removed += paths.length;
    if (paths.length < CHUNK_SIZE) break;
  }
  return removed;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  const supabase = createAdminClient();
  const trusted = requireServiceRole(request) || await verifyIngestionRequest(request, supabase);
  if (!trusted) return json({ error: "Unauthorized cleanup request" }, 401);
  const removed: Record<string, number> = {};
  try {
    for (const { bucket, reader } of SWEEPS) removed[bucket] = await sweep(supabase, bucket, reader);
    return json({ removed });
  } catch (error) {
    console.error("Finding photo cleanup failed", { message: error instanceof Error ? error.message : String(error) });
    return json({ error: "Finding photo cleanup failed" }, 500);
  }
});
