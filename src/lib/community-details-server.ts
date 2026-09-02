import "server-only";

import { getCatalogueSpecies } from "@/data/catalogue";
import { APP_ROLES, userHasAppRole } from "@/src/lib/auth/roles";
import {
  resolveAdministratorAccess,
  resolveContributorAccess,
  type ContributorAccessRow,
} from "@/src/lib/contributions";
import { requireOperationalSession } from "@/src/lib/operational-status-session";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export const ADMIN_USERS_PAGE_SIZE = 30;
export const ADMIN_FINDINGS_PAGE_SIZE = 40;
export const ADMIN_REPORTS_PAGE_SIZE = 40;

export type AdminUserListItem = {
  id: string;
  maskedEmail: string;
  alias: string | null;
  role: "admin" | "member";
  mapAccess: {
    active: boolean;
    level: "administrator" | "public" | "finding" | "contributor";
    minimumResolutionM: 250 | 1000 | 2500;
    expiresAt: string | null;
    revokedAt: string | null;
  };
  createdAt: string;
  lastSignInAt: string | null;
  providers: string[];
  contributions: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  submittedFindings: number;
  publicFindings: number;
  privateFindings: number;
  draftFindings: number;
};

export type AdminUsersPage = {
  items: AdminUserListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminFindingFilters = {
  flagged?: "open";
  publicationState?: "draft" | "published" | "hidden";
  verificationStatus?: "not_verifiable" | "pending" | "community_supported" | "contested";
  visibility?: "private" | "public";
};

export type AdminFindingListItem = {
  id: string;
  reporterLabel: string;
  reportedSpeciesId: string;
  reportedSpeciesName: string;
  observedOn: string;
  createdAt: string;
  visibility: "private" | "public";
  publicationState: "draft" | "published" | "hidden";
  verificationStatus: "not_verifiable" | "pending" | "community_supported" | "contested";
  consensusSpeciesName: string | null;
  voteCount: number;
  consensusVoteCount: number;
  openFlagCount: number;
};

export type AdminFindingsPage = {
  items: AdminFindingListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminReportStatus = "open" | "resolved" | "dismissed";

export type AdminReportListItem = {
  id: string;
  findingId: string;
  findingSpeciesName: string;
  findingObservedOn: string;
  findingVisibility: "private" | "public";
  findingPublicationState: "draft" | "published" | "hidden";
  reporterLabel: string;
  reason: "spam" | "privacy" | "unsafe" | "other";
  detail: string | null;
  status: AdminReportStatus;
  createdAt: string;
  resolvedAt: string | null;
};

export type AdminReportsPage = {
  items: AdminReportListItem[];
  page: number;
  pageSize: number;
  total: number;
};

type FindingActivityRow = {
  owner_id: string | null;
  publication_state: "draft" | "published" | "hidden";
  visibility: "private" | "public";
};

type UserAccessRow = ContributorAccessRow & {
  user_id: string;
};

type ContributionActivityRow = {
  user_id: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
};

type FindingListRow = FindingActivityRow & {
  id: string;
  reported_species_id: string;
  observed_on: string;
  created_at: string;
  verification_status: AdminFindingListItem["verificationStatus"];
  consensus_species_id: string | null;
  vote_count: number;
  consensus_vote_count: number;
};

type ReportRow = {
  id: string;
  finding_id: string;
  reporter_id: string;
  reason: AdminReportListItem["reason"];
  detail: string | null;
  status: AdminReportStatus;
  created_at: string;
  resolved_at: string | null;
};

export function maskAdminEmail(email: string | undefined) {
  if (!email) return "Sense correu";
  const separator = email.lastIndexOf("@");
  if (separator <= 0) return "Correu no disponible";
  const local = email.slice(0, separator);
  const domain = email.slice(separator + 1);
  const visibleLocal = local.length === 1
    ? local
    : `${local[0]}${local.length > 2 ? "…" : ""}${local.at(-1)}`;
  return `${visibleLocal}@${domain}`;
}

function userProviders(appMetadata: Record<string, unknown>) {
  const providers = appMetadata.providers;
  if (Array.isArray(providers)) {
    return providers.filter((provider): provider is string => typeof provider === "string");
  }
  return typeof appMetadata.provider === "string" ? [appMetadata.provider] : [];
}

function speciesName(speciesId: string | null) {
  return speciesId
    ? getCatalogueSpecies(speciesId)?.identity.commonName ?? speciesId
    : null;
}

function latestAccessExpiry(access: ReturnType<typeof resolveContributorAccess>) {
  const candidates = [access.oneKmActiveUntil, access.fineActiveUntil]
    .filter((value): value is string => value !== null);
  return candidates.reduce<string | null>((latest, value) => (
    !latest || Date.parse(value) > Date.parse(latest) ? value : latest
  ), null);
}

export async function readAdminUsersPage(page: number): Promise<AdminUsersPage> {
  await requireOperationalSession();
  const admin = createSupabaseAdminClient();
  const safePage = Math.max(1, Math.floor(page));
  const usersResult = await admin.auth.admin.listUsers({
    page: safePage,
    perPage: ADMIN_USERS_PAGE_SIZE,
  });
  if (usersResult.error) throw new Error(`Could not read registered users: ${usersResult.error.message}`);

  const users = usersResult.data.users;
  const userIds = users.map((user) => user.id);
  const [activityResult, profileResult, accessResult, contributionResult] = userIds.length > 0
    ? await Promise.all([
      admin.from("user_findings")
        .select("owner_id,visibility,publication_state")
        .in("owner_id", userIds),
      admin.from("finding_profiles")
        .select("user_id,public_alias")
        .in("user_id", userIds),
      admin.from("contributor_access")
        .select("user_id,active_until,one_km_active_until,revoked_at")
        .in("user_id", userIds),
      admin.from("contribution_requests")
        .select("user_id,status")
        .in("user_id", userIds),
    ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  if (activityResult.error || profileResult.error || accessResult.error || contributionResult.error) {
    throw new Error("Could not read user activity");
  }

  const activities = new Map<string, FindingActivityRow[]>();
  for (const row of activityResult.data as FindingActivityRow[]) {
    if (!row.owner_id) continue;
    activities.set(row.owner_id, [...(activities.get(row.owner_id) ?? []), row]);
  }
  const aliases = new Map((profileResult.data as Array<{ user_id: string; public_alias: string | null }>)
    .map((profile) => [profile.user_id, profile.public_alias]));
  const accesses = new Map((accessResult.data as UserAccessRow[])
    .map((access) => [access.user_id, access]));
  const contributions = new Map<string, ContributionActivityRow[]>();
  for (const contribution of contributionResult.data as ContributionActivityRow[]) {
    contributions.set(contribution.user_id, [...(contributions.get(contribution.user_id) ?? []), contribution]);
  }

  return {
    items: users.map((user) => {
      const rows = activities.get(user.id) ?? [];
      const submitted = rows.filter((row) => row.publication_state === "published");
      const userContributions = contributions.get(user.id) ?? [];
      const administrator = userHasAppRole(user, APP_ROLES.admin);
      const access = administrator
        ? resolveAdministratorAccess()
        : resolveContributorAccess(accesses.get(user.id) ?? null);
      return {
        id: user.id,
        maskedEmail: maskAdminEmail(user.email),
        alias: aliases.get(user.id) ?? null,
        role: administrator ? "admin" : "member",
        mapAccess: {
          active: access.active,
          level: administrator ? "administrator" : access.level,
          minimumResolutionM: access.minimumResolutionM,
          expiresAt: administrator ? null : latestAccessExpiry(access),
          revokedAt: access.revokedAt,
        },
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        providers: userProviders(user.app_metadata),
        contributions: {
          total: userContributions.length,
          pending: userContributions.filter((contribution) => contribution.status === "pending").length,
          approved: userContributions.filter((contribution) => contribution.status === "approved").length,
          rejected: userContributions.filter((contribution) => contribution.status === "rejected").length,
        },
        submittedFindings: submitted.length,
        publicFindings: submitted.filter((row) => row.visibility === "public").length,
        privateFindings: submitted.filter((row) => row.visibility === "private").length,
        draftFindings: rows.filter((row) => row.publication_state === "draft").length,
      };
    }),
    page: safePage,
    pageSize: ADMIN_USERS_PAGE_SIZE,
    total: usersResult.data.total ?? users.length,
  };
}

export async function readAdminFindingsPage(
  page: number,
  filters: AdminFindingFilters,
): Promise<AdminFindingsPage> {
  await requireOperationalSession();
  const admin = createSupabaseAdminClient();
  const safePage = Math.max(1, Math.floor(page));
  const offset = (safePage - 1) * ADMIN_FINDINGS_PAGE_SIZE;
  let flaggedIds: string[] | null = null;
  if (filters.flagged === "open") {
    const flaggedResult = await admin.from("user_finding_flags")
      .select("finding_id")
      .eq("status", "open")
      .limit(1000);
    if (flaggedResult.error) throw new Error("Could not read open moderation flags");
    flaggedIds = [...new Set((flaggedResult.data as Array<{ finding_id: string }>).map((row) => row.finding_id))];
    if (flaggedIds.length === 0) {
      return { items: [], page: safePage, pageSize: ADMIN_FINDINGS_PAGE_SIZE, total: 0 };
    }
  }

  let query = admin.from("user_findings")
    .select("id,owner_id,reported_species_id,observed_on,created_at,visibility,publication_state,verification_status,consensus_species_id,vote_count,consensus_vote_count", { count: "exact" })
    .order("created_at", { ascending: false });
  if (filters.publicationState) query = query.eq("publication_state", filters.publicationState);
  if (filters.visibility) query = query.eq("visibility", filters.visibility);
  if (filters.verificationStatus) query = query.eq("verification_status", filters.verificationStatus);
  if (flaggedIds) query = query.in("id", flaggedIds);

  const { data, error, count } = await query.range(offset, offset + ADMIN_FINDINGS_PAGE_SIZE - 1);
  if (error) throw new Error(`Could not read finding details: ${error.message}`);
  const rows = data as FindingListRow[];
  const findingIds = rows.map((row) => row.id);
  const ownerIds = [...new Set(rows.flatMap((row) => row.owner_id ? [row.owner_id] : []))];
  const [profileResult, flagResult] = await Promise.all([
    ownerIds.length > 0
      ? admin.from("finding_profiles").select("user_id,public_alias").in("user_id", ownerIds)
      : Promise.resolve({ data: [], error: null }),
    findingIds.length > 0
      ? admin.from("user_finding_flags").select("finding_id,status").in("finding_id", findingIds).eq("status", "open")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profileResult.error || flagResult.error) throw new Error("Could not read finding context");

  const aliases = new Map((profileResult.data as Array<{ user_id: string; public_alias: string | null }>)
    .map((profile) => [profile.user_id, profile.public_alias]));
  const openFlags = new Map<string, number>();
  for (const flag of flagResult.data as Array<{ finding_id: string; status: string }>) {
    openFlags.set(flag.finding_id, (openFlags.get(flag.finding_id) ?? 0) + 1);
  }

  return {
    items: rows.map((row) => ({
      id: row.id,
      reporterLabel: row.owner_id
        ? aliases.get(row.owner_id) ?? `Usuari ${row.owner_id.slice(0, 8)}`
        : "Compte eliminat",
      reportedSpeciesId: row.reported_species_id,
      reportedSpeciesName: speciesName(row.reported_species_id)!,
      observedOn: row.observed_on,
      createdAt: row.created_at,
      visibility: row.visibility,
      publicationState: row.publication_state,
      verificationStatus: row.verification_status,
      consensusSpeciesName: speciesName(row.consensus_species_id),
      voteCount: row.vote_count,
      consensusVoteCount: row.consensus_vote_count,
      openFlagCount: openFlags.get(row.id) ?? 0,
    })),
    page: safePage,
    pageSize: ADMIN_FINDINGS_PAGE_SIZE,
    total: count ?? rows.length,
  };
}

export async function readAdminReportsPage(
  page: number,
  status?: AdminReportStatus,
): Promise<AdminReportsPage> {
  await requireOperationalSession();
  const admin = createSupabaseAdminClient();
  const safePage = Math.max(1, Math.floor(page));
  const offset = (safePage - 1) * ADMIN_REPORTS_PAGE_SIZE;
  let query = admin.from("user_finding_flags")
    .select("id,finding_id,reporter_id,reason,detail,status,created_at,resolved_at", { count: "exact" })
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error, count } = await query.range(offset, offset + ADMIN_REPORTS_PAGE_SIZE - 1);
  if (error) throw new Error(`Could not read moderation reports: ${error.message}`);
  const rows = data as ReportRow[];
  const findingIds = [...new Set(rows.map((row) => row.finding_id))];
  const reporterIds = [...new Set(rows.map((row) => row.reporter_id))];
  const [findingResult, profileResult] = await Promise.all([
    findingIds.length > 0
      ? admin.from("user_findings")
        .select("id,reported_species_id,observed_on,visibility,publication_state")
        .in("id", findingIds)
      : Promise.resolve({ data: [], error: null }),
    reporterIds.length > 0
      ? admin.from("finding_profiles")
        .select("user_id,public_alias")
        .in("user_id", reporterIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (findingResult.error || profileResult.error) throw new Error("Could not read moderation report context");

  const findings = new Map((findingResult.data as Array<{
    id: string;
    reported_species_id: string;
    observed_on: string;
    visibility: "private" | "public";
    publication_state: "draft" | "published" | "hidden";
  }>).map((finding) => [finding.id, finding]));
  const aliases = new Map((profileResult.data as Array<{ user_id: string; public_alias: string | null }>)
    .map((profile) => [profile.user_id, profile.public_alias]));

  return {
    items: rows.flatMap((row): AdminReportListItem[] => {
      const finding = findings.get(row.finding_id);
      if (!finding) return [];
      return [{
        id: row.id,
        findingId: row.finding_id,
        findingSpeciesName: speciesName(finding.reported_species_id)!,
        findingObservedOn: finding.observed_on,
        findingVisibility: finding.visibility,
        findingPublicationState: finding.publication_state,
        reporterLabel: aliases.get(row.reporter_id) ?? `Usuari ${row.reporter_id.slice(0, 8)}`,
        reason: row.reason,
        detail: row.detail,
        status: row.status,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
      }];
    }),
    page: safePage,
    pageSize: ADMIN_REPORTS_PAGE_SIZE,
    total: count ?? rows.length,
  };
}
