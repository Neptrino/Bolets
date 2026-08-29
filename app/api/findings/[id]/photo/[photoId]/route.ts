import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string; photoId: string }> }) {
  const { id, photoId } = await context.params;
  const admin = createSupabaseAdminClient();
  const { data: photo } = await admin.from("user_finding_photos").select("storage_path,user_findings!inner(owner_id,visibility,publication_state)")
    .eq("id", photoId).eq("finding_id", id).maybeSingle();
  if (!photo) return new Response(null, { status: 404 });
  const finding = Array.isArray(photo.user_findings) ? photo.user_findings[0] : photo.user_findings;
  const publiclyReadable = finding?.visibility === "public" && finding?.publication_state === "published";
  if (!publiclyReadable) {
    const user = await getAuthenticatedUser();
    if (!user || finding?.owner_id !== user.id) return new Response(null, { status: 404 });
  }
  const download = await admin.storage.from("finding-photos").download(photo.storage_path);
  if (download.error || !download.data) return new Response(null, { status: 404 });
  return new Response(download.data.stream(), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": publiclyReadable ? "public, max-age=86400, s-maxage=86400" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
