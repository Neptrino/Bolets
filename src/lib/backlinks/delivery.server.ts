import "server-only";

import { BACKLINK_CAMPAIGNS } from "@/data/backlink-campaigns";
import { buildOutreachMessage, createUnsubscribeToken, normalizeEmail } from "@/src/lib/backlinks/policy";
import {
  isBacklinkRecipientReserved,
  suppressOtherBacklinkProspectsForRecipient,
} from "@/src/lib/backlinks/recipient-history.server";
import { isBacklinkSuppressed } from "@/src/lib/backlinks/suppression.server";
import type { BacklinkSettings } from "@/src/lib/backlinks/types";
import { SITE_URL } from "@/src/lib/seo";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

async function sentInLastDay() {
  const { count, error } = await createSupabaseAdminClient()
    .from("backlink_outbox")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", new Date(Date.now() - 86_400_000).toISOString());
  if (error) throw error;
  return count ?? 0;
}

export async function dispatchBacklinkOutbox(settings: BacklinkSettings) {
  if (!settings.autoSend) return { sent: 0, failed: 0 };
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BACKLINK_EMAIL_FROM;
  const replyTo = process.env.BACKLINK_REPLY_TO;
  const secret = process.env.BACKLINK_UNSUBSCRIBE_SECRET;
  if (!apiKey || !from || !secret) throw new Error("Backlink email delivery is not configured");
  const available = Math.max(0, settings.dailySendLimit - await sentInLastDay());
  if (!available) return { sent: 0, failed: 0 };
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("backlink_outbox")
    .select("id,prospect_id,message_kind,recipient,subject,body_text,dedupe_key,attempt_count")
    .eq("status", "pending").eq("message_kind", "initial").lte("deliver_after", new Date().toISOString())
    .order("created_at", { ascending: true }).limit(available);
  if (error) throw error;
  let sent = 0;
  let failed = 0;
  for (const message of data ?? []) {
    const { data: claimed, error: claimError } = await admin.from("backlink_outbox").update({
      status: "sending", updated_at: new Date().toISOString(),
    }).eq("id", message.id).eq("status", "pending").select("id").maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) continue;
    const { data: prospect, error: prospectError } = await admin.from("backlink_prospects")
      .select("domain,status,manual_decision,contact_email,send_count,campaign_id,organization,page_title,page_url")
      .eq("id", message.prospect_id)
      .maybeSingle();
    if (prospectError) throw prospectError;
    const campaign = prospect ? BACKLINK_CAMPAIGNS.find((candidate) => candidate.id === prospect.campaign_id) : null;
    const recipientReserved = await isBacklinkRecipientReserved(message.recipient, { outboxId: message.id });
    const blocked = !prospect
      || !campaign
      || prospect.status !== "ready"
      || prospect.manual_decision === "excluded"
      || normalizeEmail(prospect.contact_email ?? "") !== message.recipient
      || prospect.send_count > 0
      || recipientReserved
      || await isBacklinkSuppressed(message.recipient, prospect.domain);
    if (blocked) {
      const reason = recipientReserved ? "recipient-already-contacted" : "prospect-not-sendable";
      const { error: cancellationError } = await admin.from("backlink_outbox").update({
        status: "cancelled", last_error: reason, updated_at: new Date().toISOString(),
      }).eq("id", message.id).eq("status", "sending");
      if (cancellationError) throw cancellationError;
      if (prospect && recipientReserved) {
        const { error: suppressionError } = await admin.from("backlink_prospects").update({
          status: "suppressed", status_reason: reason, next_action_at: null, updated_at: new Date().toISOString(),
        }).eq("id", message.prospect_id).eq("send_count", 0);
        if (suppressionError) throw suppressionError;
      }
      continue;
    }
    const token = createUnsubscribeToken(message.prospect_id, message.recipient, secret);
    const unsubscribeUrl = `${SITE_URL}/api/backlinks/unsubscribe?token=${encodeURIComponent(token)}`;
    const outboundMessage = buildOutreachMessage({
      campaign, unsubscribeUrl, organization: prospect.organization,
      pageTitle: prospect.page_title, pageUrl: prospect.page_url,
    });
    await admin.from("backlink_outbox").update({
      attempt_count: message.attempt_count + 1,
      subject: outboundMessage.subject,
      body_text: outboundMessage.text,
      updated_at: new Date().toISOString(),
    }).eq("id", message.id).eq("status", "sending");
    let safeToRetry = false;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": message.dedupe_key },
        body: JSON.stringify({
          from, to: [message.recipient], reply_to: replyTo || undefined,
          subject: outboundMessage.subject, text: outboundMessage.text, html: outboundMessage.html,
          headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
          tags: [{ name: "category", value: "backlink_outreach" }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        safeToRetry = response.status === 429 || response.status >= 500;
        throw new Error(`Resend returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
      }
      const provider = await response.json() as { id?: string };
      const now = new Date().toISOString();
      await admin.from("backlink_outbox").update({
        status: "sent", provider_message_id: provider.id ?? null,
        last_error: null, sent_at: now, updated_at: now,
      }).eq("id", message.id);
      await admin.from("backlink_prospects").update({
        status: "sent", status_reason: "initial-sent",
        send_count: 1, first_sent_at: now, last_sent_at: now,
        next_action_at: null,
        updated_at: now,
      }).eq("id", message.prospect_id);
      await suppressOtherBacklinkProspectsForRecipient(message.recipient, message.prospect_id, new Date(now));
      sent += 1;
    } catch (sendError) {
      await admin.from("backlink_outbox").update({
        status: safeToRetry && message.attempt_count + 1 < 5 ? "pending" : "failed",
        last_error: (sendError instanceof Error ? sendError.message : "Delivery failed").slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq("id", message.id);
      failed += 1;
    }
  }
  return { sent, failed };
}
