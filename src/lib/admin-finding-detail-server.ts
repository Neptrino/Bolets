import "server-only";

import { z } from "zod";

import { getCatalogueSpecies } from "@/data/catalogue";
import { requireOperationalSession } from "@/src/lib/operational-status-session";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export type AdminFindingDetail = {
  id: string;
  reporterLabel: string;
  reportedSpeciesName: string;
  consensusSpeciesName: string | null;
  observedOn: string;
  createdAt: string;
  updatedAt: string;
  publicCellId: string;
  visibility: "private" | "public";
  publicationState: "draft" | "published" | "hidden";
  showAlias: boolean;
  revision: number;
  verificationStatus: "not_verifiable" | "pending" | "community_supported" | "contested";
  voteCount: number;
  consensusVoteCount: number;
  openFlagCount: number;
  resolvedFlagCount: number;
  publicPhotoCount: number;
};

type FindingDetailRow = {
  id: string;
  owner_id: string | null;
  reported_species_id: string;
  observed_on: string;
  created_at: string;
  updated_at: string;
  public_cell_id: string;
  visibility: AdminFindingDetail["visibility"];
  publication_state: AdminFindingDetail["publicationState"];
  show_alias: boolean;
  revision: number;
  verification_status: AdminFindingDetail["verificationStatus"];
  consensus_species_id: string | null;
  vote_count: number;
  consensus_vote_count: number;
};

function speciesName(speciesId: string | null) {
  return speciesId
    ? getCatalogueSpecies(speciesId)?.identity.commonName ?? speciesId
    : null;
}

export async function readAdminFindingDetail(id: string): Promise<AdminFindingDetail | null> {
  await requireOperationalSession();
  if (!z.uuid().safeParse(id).success) return null;

  const admin = createSupabaseAdminClient();
  const findingResult = await admin.from("user_findings")
    .select("id,owner_id,reported_species_id,observed_on,created_at,updated_at,public_cell_id,visibility,publication_state,show_alias,revision,verification_status,consensus_species_id,vote_count,consensus_vote_count")
    .eq("id", id)
    .maybeSingle();
  if (findingResult.error) throw new Error(`Could not read admin finding detail: ${findingResult.error.message}`);
  if (!findingResult.data) return null;

  const row = findingResult.data as FindingDetailRow;
  const [profileResult, flagsResult, photosResult] = await Promise.all([
    row.owner_id
      ? admin.from("finding_profiles").select("public_alias").eq("user_id", row.owner_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    admin.from("user_finding_flags").select("status").eq("finding_id", id),
    admin.from("user_finding_photos").select("id").eq("finding_id", id).eq("is_public", true),
  ]);
  if (profileResult.error || flagsResult.error || photosResult.error) {
    throw new Error("Could not read admin finding context");
  }

  const flags = flagsResult.data as Array<{ status: "open" | "resolved" | "dismissed" }>;
  return {
    id: row.id,
    reporterLabel: row.owner_id
      ? profileResult.data?.public_alias ?? `Usuari ${row.owner_id.slice(0, 8)}`
      : "Compte eliminat",
    reportedSpeciesName: speciesName(row.reported_species_id)!,
    consensusSpeciesName: speciesName(row.consensus_species_id),
    observedOn: row.observed_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publicCellId: row.public_cell_id,
    visibility: row.visibility,
    publicationState: row.publication_state,
    showAlias: row.show_alias,
    revision: row.revision,
    verificationStatus: row.verification_status,
    voteCount: row.vote_count,
    consensusVoteCount: row.consensus_vote_count,
    openFlagCount: flags.filter((flag) => flag.status === "open").length,
    resolvedFlagCount: flags.filter((flag) => flag.status !== "open").length,
    publicPhotoCount: photosResult.data.length,
  };
}
