import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export type CommunityStatus = {
  registeredUsers: number;
  submittedFindings: number;
  submittedFindingsLast7Days: number;
  publicFindings: number;
  privateFindings: number;
  draftFindings: number;
  pendingVerificationFindings: number;
  openModerationFlags: number;
};

type CountResult = {
  count: number | null;
  error: { message: string } | null;
};

function requiredCount(label: string, result: CountResult) {
  if (result.error) {
    throw new Error(`${label} count failed: ${result.error.message}`);
  }
  return result.count ?? 0;
}

export async function readCommunityStatus(
  now = new Date(),
): Promise<CommunityStatus> {
  const admin = createSupabaseAdminClient();
  const recentSince = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000).toISOString();

  const [
    users,
    submitted,
    recentSubmitted,
    publicFindings,
    privateFindings,
    drafts,
    pendingVerification,
    openFlags,
  ] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
    admin.from("user_findings")
      .select("id", { count: "exact", head: true })
      .eq("publication_state", "published"),
    admin.from("user_findings")
      .select("id", { count: "exact", head: true })
      .eq("publication_state", "published")
      .gte("created_at", recentSince),
    admin.from("user_findings")
      .select("id", { count: "exact", head: true })
      .eq("publication_state", "published")
      .eq("visibility", "public"),
    admin.from("user_findings")
      .select("id", { count: "exact", head: true })
      .eq("publication_state", "published")
      .eq("visibility", "private"),
    admin.from("user_findings")
      .select("id", { count: "exact", head: true })
      .eq("publication_state", "draft"),
    admin.from("user_findings")
      .select("id", { count: "exact", head: true })
      .eq("publication_state", "published")
      .eq("visibility", "public")
      .eq("verification_status", "pending"),
    admin.from("user_finding_flags")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
  ]);

  if (users.error) {
    throw new Error(`Registered user count failed: ${users.error.message}`);
  }

  return {
    registeredUsers: users.data.total ?? users.data.users.length,
    submittedFindings: requiredCount("Submitted finding", submitted),
    submittedFindingsLast7Days: requiredCount("Recent finding", recentSubmitted),
    publicFindings: requiredCount("Public finding", publicFindings),
    privateFindings: requiredCount("Private finding", privateFindings),
    draftFindings: requiredCount("Draft finding", drafts),
    pendingVerificationFindings: requiredCount("Pending verification", pendingVerification),
    openModerationFlags: requiredCount("Open moderation flag", openFlags),
  };
}
