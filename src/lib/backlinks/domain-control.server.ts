import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import {
  adminDomainSuppressionReason,
  backlinkDomainKey,
  backlinkDomainMatchFilter,
  backlinkSuppressionDomainValues,
  isAdminDomainSuppression,
} from "@/src/lib/backlinks/domain-control";
import { BacklinkManualActionError } from "@/src/lib/backlinks/manual.server";

async function readProspectDomain(id: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("backlink_prospects")
    .select("domain")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new BacklinkManualActionError("not-found");
  return backlinkDomainKey(data.domain);
}

export async function blockBacklinkDomain(prospectId: string, note: string) {
  const domain = await readProspectDomain(prospectId);
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data: existingSuppression, error: readSuppressionError } = await admin
    .from("backlink_suppressions")
    .select("reason")
    .eq("kind", "domain")
    .in("value", backlinkSuppressionDomainValues(domain))
    .limit(1)
    .maybeSingle();
  if (readSuppressionError) throw readSuppressionError;
  if (!existingSuppression || isAdminDomainSuppression(existingSuppression.reason)) {
    const { error: suppressionError } = await admin.from("backlink_suppressions").upsert({
      kind: "domain",
      value: domain,
      reason: adminDomainSuppressionReason(note),
    }, { onConflict: "kind,value" });
    if (suppressionError) throw suppressionError;
  }

  const { data: affected, error: prospectError } = await admin.from("backlink_prospects")
    .update({
      status: "suppressed",
      status_reason: "domain-manual-block",
      next_action_at: null,
      updated_at: now,
    })
    .or(backlinkDomainMatchFilter(domain))
    .or("manual_decision.is.null,manual_decision.eq.approved")
    .eq("send_count", 0)
    .in("status", ["discovered", "ready", "failed"])
    .select("id");
  if (prospectError) throw prospectError;
  const prospectIds = (affected ?? []).map((row) => row.id);
  if (prospectIds.length) {
    const { error: cancelError } = await admin.from("backlink_outbox").update({
      status: "cancelled",
      last_error: "domain-manual-block",
      updated_at: now,
    }).in("prospect_id", prospectIds).eq("status", "pending");
    if (cancelError) throw cancelError;
  }
  return domain;
}

export async function allowBacklinkDomain(prospectId: string) {
  const domain = await readProspectDomain(prospectId);
  const admin = createSupabaseAdminClient();
  const { data: suppression, error: readError } = await admin.from("backlink_suppressions")
    .select("id,reason")
    .eq("kind", "domain")
    .in("value", backlinkSuppressionDomainValues(domain))
    .limit(1)
    .maybeSingle();
  if (readError) throw readError;
  if (!suppression) throw new BacklinkManualActionError("domain-not-blocked");
  if (!isAdminDomainSuppression(suppression.reason)) {
    throw new BacklinkManualActionError("protected-suppression");
  }
  const { error: deleteError } = await admin.from("backlink_suppressions")
    .delete()
    .eq("id", suppression.id);
  if (deleteError) throw deleteError;
  const { error: prospectError } = await admin.from("backlink_prospects").update({
    status: "discovered",
    status_reason: "domain-allowed-needs-rescan",
    next_action_at: null,
    updated_at: new Date().toISOString(),
  })
    .or(backlinkDomainMatchFilter(domain))
    .eq("send_count", 0)
    .eq("status_reason", "domain-manual-block");
  if (prospectError) throw prospectError;
  return domain;
}
