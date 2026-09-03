import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { backlinkDomainKey, backlinkSuppressionDomainValues } from "@/src/lib/backlinks/domain-control";

export async function isBacklinkSuppressed(email: string | null, domain: string) {
  const admin = createSupabaseAdminClient();
  const domainValues = backlinkSuppressionDomainValues(domain);
  const domainQuery = admin.from("backlink_suppressions").select("id")
    .eq("kind", "domain").in("value", domainValues).limit(1);
  if (!email) {
    const { data, error } = await domainQuery;
    if (error) throw error;
    return Boolean(data?.length);
  }
  const [emailResult, domainResult] = await Promise.all([
    admin.from("backlink_suppressions").select("id").eq("kind", "email").eq("value", email).limit(1),
    domainQuery,
  ]);
  if (emailResult.error) throw emailResult.error;
  if (domainResult.error) throw domainResult.error;
  return Boolean(emailResult.data?.length || domainResult.data?.length);
}

export async function readSuppressedBacklinkDomains() {
  const { data, error } = await createSupabaseAdminClient()
    .from("backlink_suppressions")
    .select("value")
    .eq("kind", "domain");
  if (error) throw error;
  return new Set((data ?? []).map((row) => backlinkDomainKey(row.value)));
}
