import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/src/lib/supabase/server";
import { clearContributorDetailCapability } from "@/src/lib/contributions/capability.server";

export async function DELETE() {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Inicia sessió." }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const { data: findings, error } = await admin.from("user_findings").select("id,visibility,publication_state").eq("owner_id", user.id);
  if (error) return Response.json({ error: "No s’ha pogut preparar l’eliminació." }, { status: 500 });
  const ids = (findings ?? []).map((finding) => finding.id);
  const { data: photos } = ids.length ? await admin.from("user_finding_photos").select("storage_path").in("finding_id", ids) : { data: [] };
  const paths = (photos ?? []).map((photo) => photo.storage_path);
  if (paths.length) await admin.storage.from("finding-photos").remove(paths);
  if (ids.length) {
    await admin.from("user_finding_photos").delete().in("finding_id", ids);
    await admin.from("user_finding_private_details").delete().in("finding_id", ids);
  }
  const retainedIds = (findings ?? []).filter((finding) => finding.visibility === "public" && finding.publication_state === "published").map((finding) => finding.id);
  const removedIds = (findings ?? []).filter((finding) => !retainedIds.includes(finding.id)).map((finding) => finding.id);
  if (removedIds.length) await admin.from("user_findings").delete().in("id", removedIds);
  if (retainedIds.length) await admin.from("user_findings").update({ owner_id: null, show_alias: false, updated_at: new Date().toISOString() }).in("id", retainedIds);
  const { data: affectedVotes } = await admin.from("user_finding_votes").select("finding_id").eq("voter_id", user.id);
  await admin.from("user_finding_votes").delete().eq("voter_id", user.id);
  for (const findingId of [...new Set((affectedVotes ?? []).map((vote) => vote.finding_id))]) {
    await admin.rpc("recompute_user_finding_consensus", { p_finding_id: findingId });
  }
  const session = await createSupabaseServerClient();
  await session.auth.signOut({ scope: "global" });
  await clearContributorDetailCapability();
  const deletion = await admin.auth.admin.deleteUser(user.id);
  if (deletion.error) return Response.json({ error: "No s’ha pogut eliminar el compte completament." }, { status: 500 });
  return Response.json({ ok: true });
}
