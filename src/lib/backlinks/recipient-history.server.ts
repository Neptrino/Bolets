import "server-only";

import { normalizeEmail } from "@/src/lib/backlinks/policy";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function isBacklinkRecipientReserved(
  email: string | null,
  excluding: { outboxId?: string; prospectId?: string } = {},
) {
  const recipient = email ? normalizeEmail(email) : null;
  if (!recipient) return false;
  let query = createSupabaseAdminClient()
    .from("backlink_outbox")
    .select("id")
    .eq("message_kind", "initial")
    .eq("recipient", recipient)
    .neq("status", "cancelled");
  if (excluding.outboxId) query = query.neq("id", excluding.outboxId);
  if (excluding.prospectId) query = query.neq("prospect_id", excluding.prospectId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

export async function suppressOtherBacklinkProspectsForRecipient(
  email: string,
  sentProspectId: string,
  now = new Date(),
) {
  const recipient = normalizeEmail(email);
  if (!recipient) return 0;
  const { data, error } = await createSupabaseAdminClient()
    .from("backlink_prospects")
    .update({
      status: "suppressed",
      status_reason: "recipient-already-contacted",
      next_action_at: null,
      updated_at: now.toISOString(),
    })
    .eq("contact_email", recipient)
    .neq("id", sentProspectId)
    .eq("send_count", 0)
    .in("status", ["discovered", "ready", "failed"])
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}
