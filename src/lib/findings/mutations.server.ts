import "server-only";

import { getCatalogueSpecies } from "@/data/catalogue";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import type { FindingDraft, FindingPhotoUpload } from "@/src/lib/findings/types";

export async function beginFinding(ownerId: string, draft: FindingDraft) {
  if (!getCatalogueSpecies(draft.speciesId)) throw new Error("Unknown catalogue species");
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("begin_user_finding", {
    p_owner_id: ownerId,
    p_client_report_id: draft.clientReportId,
    p_species_id: draft.speciesId,
    p_observed_at: draft.observedAt,
    p_longitude: draft.longitude,
    p_latitude: draft.latitude,
    p_keep_exact: draft.locationMode === "private_exact",
    p_accuracy_m: draft.accuracyM,
    p_quantity_band: draft.quantityBand,
    p_private_notes: draft.privateNotes,
    p_visibility: draft.visibility,
    p_show_alias: draft.showAlias,
  });
  if (error || !data?.[0]) throw new Error(error?.message ?? "Could not begin finding");
  return { id: data[0].finding_id as string, cellId: data[0].public_cell_id as string, state: data[0].publication_state as string };
}

export async function assertFindingOwner(findingId: string, ownerId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("user_findings").select("id,revision,visibility,publication_state")
    .eq("id", findingId).eq("owner_id", ownerId).maybeSingle();
  if (error || !data) return null;
  return data as { id: string; revision: number; visibility: "private" | "public"; publication_state: string };
}

export async function grantFindingMapAccess(findingId: string, ownerId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("grant_finding_map_access", {
    p_finding_id: findingId,
    p_user_id: ownerId,
  });
  if (error) throw new Error("Could not grant finding map access");
  return data as string | null;
}

export async function publishFinding(findingId: string, ownerId: string, photos: Array<FindingPhotoUpload & { path: string; width: number; height: number; byteSize: number }>) {
  const admin = createSupabaseAdminClient();
  const owned = await assertFindingOwner(findingId, ownerId);
  if (!owned || owned.publication_state !== "draft") throw new Error("Finding is not an editable draft");
  if (photos.length) {
    const { error: photoError } = await admin.from("user_finding_photos").insert(photos.map((photo) => ({
      id: photo.id, finding_id: findingId, storage_path: photo.path,
      position: photo.position, width: photo.width, height: photo.height, byte_size: photo.byteSize,
    })));
    if (photoError) throw new Error("Could not attach processed photos");
  }
  const { error } = await admin.from("user_findings").update({ publication_state: "published", updated_at: new Date().toISOString() })
    .eq("id", findingId).eq("owner_id", ownerId).eq("publication_state", "draft");
  if (error) throw new Error("Could not publish finding");
  const consensus = await admin.rpc("recompute_user_finding_consensus", { p_finding_id: findingId });
  if (consensus.error) throw new Error("Could not initialize validation status");
  return grantFindingMapAccess(findingId, ownerId);
}

export async function voteOnFinding(findingId: string, voterId: string, speciesId: string) {
  if (!getCatalogueSpecies(speciesId)) throw new Error("Unknown catalogue species");
  const admin = createSupabaseAdminClient();
  const { data: finding } = await admin.from("user_findings").select("revision").eq("id", findingId).maybeSingle();
  if (!finding) throw new Error("Finding is not open for validation");
  const { error } = await admin.from("user_finding_votes").upsert({ finding_id: findingId, revision: finding.revision, voter_id: voterId, species_id: speciesId, updated_at: new Date().toISOString() }, { onConflict: "finding_id,revision,voter_id" });
  if (error) throw new Error(error.message);
}

export async function flagFinding(findingId: string, reporterId: string, reason: string, detail?: string) {
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin.from("user_finding_flags").select("id", { count: "exact", head: true }).eq("reporter_id", reporterId).gte("created_at", since);
  if ((count ?? 0) >= 25) throw new Error("Daily moderation report limit reached");
  const { error } = await admin.from("user_finding_flags").upsert({ finding_id: findingId, reporter_id: reporterId, reason, detail: detail || null, status: "open" }, { onConflict: "finding_id,reporter_id" });
  if (error) throw new Error("Could not submit report");
}
