import { createAdminClient, json } from "../_shared/pipeline.ts";
import { regionIds } from "../_shared/regions.ts";

Deno.serve(async (request) => {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405, { Allow: "GET" });
  const regionId = new URL(request.url).searchParams.get("region");
  if (!regionId || !regionIds.has(regionId)) return json({ error: "Unknown region" }, 400);

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("environment_snapshots")
      .select("region_id, observed_at, sources, confidence, stale, unavailable_fields, values")
      .eq("region_id", regionId)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ error: "No environmental snapshot" }, 404);
    const stale = data.stale || Date.now() - new Date(data.observed_at).getTime() > 36 * 60 * 60 * 1000;
    return json({
      regionId: data.region_id,
      observedAt: data.observed_at,
      source: data.sources,
      confidence: stale && data.confidence === "high" ? "moderate" : data.confidence,
      stale,
      unavailableFields: data.unavailable_fields,
      values: data.values
    }, 200, { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" });
  } catch (error) {
    console.error("Unable to read environmental snapshot", error);
    return json({ error: "Unable to load environmental snapshot" }, 500);
  }
});
