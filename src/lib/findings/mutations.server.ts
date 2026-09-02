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

export async function publishFinding(findingId: string, ownerId: string, photos: Array<FindingPhotoUpload & {
  path: string;
  width: number;
  height: number;
  byteSize: number;
  contentSha256: string;
  perceptualHash: string;
  duplicateReviewState: "clear" | "exact_self" | "near";
}>) {
  const admin = createSupabaseAdminClient();
  const owned = await assertFindingOwner(findingId, ownerId);
  if (!owned || owned.publication_state !== "draft") throw new Error("Finding is not an editable draft");
  if (photos.length) {
    const { error: photoError } = await admin.from("user_finding_photos").insert(photos.map((photo) => ({
      id: photo.id, finding_id: findingId, storage_path: photo.path,
      position: photo.position, width: photo.width, height: photo.height, byte_size: photo.byteSize,
      content_sha256: photo.contentSha256,
      perceptual_hash: photo.perceptualHash,
      duplicate_review_state: photo.duplicateReviewState,
    })));
    if (photoError) throw new Error("Could not attach processed photos");
  }
  const { data: accessUntil, error } = await admin.rpc("publish_user_finding", {
    p_finding_id: findingId,
    p_owner_id: ownerId,
  });
  if (error) {
    if (photos.length) await admin.from("user_finding_photos").delete().in("id", photos.map((photo) => photo.id));
    if (error.message.includes("Daily public finding limit reached")) {
      throw new Error("Has arribat al límit de publicacions públiques d’avui. Les troballes privades continuen disponibles.");
    }
    if (error.message.includes("temporarily paused")) {
      throw new Error("La publicació pública d’aquest compte està temporalment pausada.");
    }
    throw new Error("No s’ha pogut publicar la troballa.");
  }
  const duplicateStates = new Set(photos.map((photo) => photo.duplicateReviewState).filter((state) => state !== "clear"));
  for (const duplicateState of duplicateStates) {
    const { error: signalError } = await admin.from("finding_abuse_signals").insert({
      finding_id: findingId,
      user_id: ownerId,
      kind: duplicateState === "near" ? "near_duplicate" : "repeated_content",
      metadata: { source: "photo_fingerprint" },
      status: "open",
    });
    if (signalError && signalError.code !== "23505") {
      console.error("[findings] duplicate review signal failed", { findingId, code: signalError.code });
    }
  }
  const consensus = await admin.rpc("recompute_user_finding_consensus", { p_finding_id: findingId });
  if (consensus.error) console.error("[findings] consensus initialization failed", { findingId, code: consensus.error.code });
  return accessUntil as string | null;
}

export async function updateFindingPrivacy(
  findingId: string,
  ownerId: string,
  visibility?: "private" | "public",
  showAlias?: boolean,
) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("update_owner_finding_privacy", {
    p_finding_id: findingId,
    p_owner_id: ownerId,
    p_visibility: visibility ?? null,
    p_show_alias: showAlias ?? null,
  });
  if (error) throw new Error("Could not update finding privacy");
  return data as string | null;
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
