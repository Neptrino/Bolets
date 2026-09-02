import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Content-Type": "image/webp",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ requestId: string; mediaId: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) return new Response(null, { status: 401, headers: PRIVATE_HEADERS });
  const { requestId, mediaId } = await context.params;
  const admin = createSupabaseAdminClient();
  const [{ data: contribution, error: contributionError }, { data: media, error: mediaError }] = await Promise.all([
    admin.from("contribution_requests").select("user_id").eq("id", requestId).maybeSingle(),
    admin.from("contribution_request_media").select("storage_path").eq("id", mediaId).eq("request_id", requestId).maybeSingle(),
  ]);
  if (contributionError || mediaError) return new Response(null, { status: 503, headers: PRIVATE_HEADERS });
  if (!contribution || !media) return new Response(null, { status: 404, headers: PRIVATE_HEADERS });
  const isAdmin = user.app_metadata?.app_role === "admin";
  if (contribution.user_id !== user.id && !isAdmin) {
    return new Response(null, { status: 404, headers: PRIVATE_HEADERS });
  }

  const download = await admin.storage.from("contribution-media").download(media.storage_path);
  if (download.error || !download.data) return new Response(null, { status: 404, headers: PRIVATE_HEADERS });
  return new Response(await download.data.arrayBuffer(), { headers: PRIVATE_HEADERS });
}
