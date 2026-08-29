import {
  createAdminClient,
  json,
  requireServiceRole,
  verifyIngestionRequest,
} from "../_shared/pipeline.ts";

const CHUNK_SIZE = 500;
const MAX_CHUNKS = 10;

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
  const supabase = createAdminClient();
  const trusted = requireServiceRole(request) || await verifyIngestionRequest(request, supabase);
  if (!trusted) return json({ error: "Unauthorized cleanup request" }, 401);
  let removed = 0;
  try {
    for (let chunk = 0; chunk < MAX_CHUNKS; chunk += 1) {
      const { data, error } = await supabase.rpc("read_stale_finding_photo_staging", { p_limit: CHUNK_SIZE });
      if (error) throw error;
      const paths = (data ?? []).map((row: { storage_path: string }) => row.storage_path);
      if (!paths.length) break;
      const deletion = await supabase.storage.from("finding-photo-staging").remove(paths);
      if (deletion.error) throw deletion.error;
      removed += paths.length;
      if (paths.length < CHUNK_SIZE) break;
    }
    return json({ removed });
  } catch (error) {
    console.error("Finding staging cleanup failed", { message: error instanceof Error ? error.message : String(error) });
    return json({ error: "Finding staging cleanup failed" }, 500);
  }
});
