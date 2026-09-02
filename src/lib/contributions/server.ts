import "server-only";

import type { User } from "@supabase/supabase-js";
import {
  contributionRequestInputSchema,
  type ContributionMediaSummary,
  type ContributionRequestInput,
  type ContributionRequestSummary,
  type ContributorAccessSummary,
} from "@/src/lib/contributions";
import { protectContributionMedia } from "@/src/lib/contributions/media.server";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const REQUEST_WINDOW_DAYS = 30;
const REQUEST_WINDOW_LIMIT = 3;

type ContributionRequestRow = {
  id: string;
  user_id: string;
  kind: ContributionRequestSummary["kind"];
  description: string;
  evidence_url: string | null;
  finding_id: string | null;
  media_credit: string | null;
  media_rights_confirmed_at: string | null;
  status: ContributionRequestSummary["status"];
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type ContributionMediaRow = {
  id: string;
  request_id: string;
  storage_path: string;
  position: number;
  width: number;
  height: number;
};

function mediaSummary(row: ContributionMediaRow): ContributionMediaSummary {
  return {
    id: row.id,
    width: row.width,
    height: row.height,
    position: row.position,
    url: `/api/contributions/${row.request_id}/media/${row.id}`,
  };
}

function requestSummary(row: ContributionRequestRow, mediaCount = 0): ContributionRequestSummary {
  return {
    id: row.id,
    kind: row.kind,
    description: row.description,
    evidenceUrl: row.evidence_url,
    findingId: row.finding_id,
    mediaCount,
    status: row.status,
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

async function readRequestMedia(requestIds: string[]) {
  const rowsByRequest = new Map<string, ContributionMediaRow[]>();
  if (!requestIds.length) return rowsByRequest;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("contribution_request_media")
    .select("id,request_id,storage_path,position,width,height")
    .in("request_id", requestIds)
    .order("position");
  if (error) throw error;
  for (const row of data as ContributionMediaRow[]) {
    rowsByRequest.set(row.request_id, [...(rowsByRequest.get(row.request_id) ?? []), row]);
  }
  return rowsByRequest;
}

export async function readContributorAccess(userId: string): Promise<ContributorAccessSummary> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("contributor_access")
    .select("active_until,revoked_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  const activeUntil = data?.active_until ?? null;
  return {
    authenticated: true,
    active: Boolean(
      activeUntil
      && !data?.revoked_at
      && new Date(activeUntil).getTime() > Date.now(),
    ),
    activeUntil,
    revokedAt: data?.revoked_at ?? null,
  };
}

export async function listUserContributionRequests(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("contribution_requests")
    .select("id,user_id,kind,description,evidence_url,finding_id,media_credit,media_rights_confirmed_at,status,review_note,reviewed_at,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  const rows = data as ContributionRequestRow[];
  const media = await readRequestMedia(rows.map((row) => row.id));
  return rows.map((row) => requestSummary(row, media.get(row.id)?.length ?? 0));
}

async function validateFindingEvidence(userId: string, findingId: string) {
  const admin = createSupabaseAdminClient();
  const { data: finding, error: findingError } = await admin
    .from("user_findings")
    .select("id")
    .eq("id", findingId)
    .eq("owner_id", userId)
    .eq("publication_state", "published")
    .eq("visibility", "public")
    .maybeSingle();
  if (findingError) throw findingError;
  if (!finding) throw new Error("La troballa ha de ser teva, pública i enviada.");

  const { count, error: photoError } = await admin
    .from("user_finding_photos")
    .select("id", { count: "exact", head: true })
    .eq("finding_id", findingId)
    .eq("is_public", true);
  if (photoError) throw photoError;
  if (!count) throw new Error("La troballa necessita almenys una fotografia pública.");
}

export async function createContributionRequest(userId: string, input: ContributionRequestInput) {
  const parsed = contributionRequestInputSchema.parse(input);
  const admin = createSupabaseAdminClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - REQUEST_WINDOW_DAYS);

  const [{ count: recentCount, error: countError }, { data: pending, error: pendingError }] = await Promise.all([
    admin
      .from("contribution_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since.toISOString()),
    admin
      .from("contribution_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle(),
  ]);
  if (countError) throw countError;
  if (pendingError) throw pendingError;
  if (pending) throw new Error("Ja tens una aportació pendent de revisió.");
  if ((recentCount ?? 0) >= REQUEST_WINDOW_LIMIT) {
    throw new Error("Has arribat al límit de tres sol·licituds en trenta dies.");
  }

  if (parsed.findingId) {
    if (parsed.kind !== "useful_finding") {
      throw new Error("Només les troballes útils poden adjuntar una troballa del quadern.");
    }
    await validateFindingEvidence(userId, parsed.findingId);
  }

  const { data, error } = await admin
    .from("contribution_requests")
    .insert({
      user_id: userId,
      kind: parsed.kind,
      description: parsed.description,
      evidence_url: parsed.evidenceUrl,
      finding_id: parsed.findingId,
      media_credit: parsed.mediaCredit,
      media_rights_confirmed_at: parsed.mediaRightsConfirmed ? new Date().toISOString() : null,
    })
    .select("id,user_id,kind,description,evidence_url,finding_id,media_credit,media_rights_confirmed_at,status,review_note,reviewed_at,created_at")
    .single();
  if (error) throw error;
  const row = data as ContributionRequestRow;
  try {
    if (parsed.media.length) await protectContributionMedia(userId, row.id, parsed.media);
  } catch (mediaError) {
    const removal = await admin.from("contribution_requests").delete().eq("id", row.id).eq("user_id", userId);
    if (removal.error) console.error("Unable to roll back contribution request", removal.error);
    throw mediaError;
  }
  return requestSummary(row, parsed.media.length);
}

export type AdminContributionRequest = ContributionRequestSummary & {
  userId: string;
  userEmail: string;
  mediaCredit: string | null;
  mediaRightsConfirmedAt: string | null;
  media: ContributionMediaSummary[];
};

export async function readAdminContributionRequests() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("contribution_requests")
    .select("id,user_id,kind,description,evidence_url,finding_id,media_credit,media_rights_confirmed_at,status,review_note,reviewed_at,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = data as ContributionRequestRow[];
  const media = await readRequestMedia(rows.map((row) => row.id));
  const emails = new Map<string, string>();
  await Promise.all([...new Set(rows.map((row) => row.user_id))].map(async (userId) => {
    const result = await admin.auth.admin.getUserById(userId);
    emails.set(userId, result.data.user?.email ?? "Compte sense correu");
  }));
  return rows.map((row) => ({
    ...requestSummary(row, media.get(row.id)?.length ?? 0),
    userId: row.user_id,
    userEmail: emails.get(row.user_id) ?? "Compte desconegut",
    mediaCredit: row.media_credit,
    mediaRightsConfirmedAt: row.media_rights_confirmed_at,
    media: (media.get(row.id) ?? []).map(mediaSummary),
  }));
}

export type AdminContributorAccess = {
  userId: string;
  userEmail: string;
  activeUntil: string;
  active: boolean;
  revokedAt: string | null;
  revokeReason: string | null;
};

export async function readAdminContributorAccessList() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("contributor_access")
    .select("user_id,active_until,revoked_at,revoke_reason")
    .order("active_until", { ascending: false })
    .limit(100);
  if (error) throw error;
  return Promise.all((data ?? []).map(async (row) => {
    const user = await admin.auth.admin.getUserById(row.user_id);
    return {
      userId: row.user_id,
      userEmail: user.data.user?.email ?? "Compte sense correu",
      activeUntil: row.active_until,
      active: !row.revoked_at && new Date(row.active_until).getTime() > Date.now(),
      revokedAt: row.revoked_at,
      revokeReason: row.revoke_reason,
    } satisfies AdminContributorAccess;
  }));
}

export async function reviewContributionRequest(
  requestId: string,
  decision: "approved" | "rejected",
  reviewNote: string | null,
  reviewer: User,
) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("review_contribution_request", {
    p_request_id: requestId,
    p_decision: decision,
    p_review_note: reviewNote,
    p_reviewer_id: reviewer.id,
  });
  if (error) throw error;
  return data as string | null;
}

export async function revokeContributorAccess(userId: string, reason: string, reviewer: User) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("revoke_contributor_access", {
    p_user_id: userId,
    p_reason: reason,
    p_reviewer_id: reviewer.id,
  });
  if (error) throw error;
  return data === true;
}
