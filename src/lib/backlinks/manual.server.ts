import "server-only";

import { BACKLINK_CAMPAIGNS } from "@/data/backlink-campaigns";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { inspectPublicPage } from "@/src/lib/backlinks/crawler.server";
import {
  automaticEligibility,
  buildOutreachMessage,
  createUnsubscribeToken,
  explainCandidateScore,
  isRoleMailbox,
  normalizeEmail,
} from "@/src/lib/backlinks/policy";
import {
  backlinkRescanMode,
  isValidManualContact,
  manualApprovalBlocker,
} from "@/src/lib/backlinks/manual-policy";
import { isBacklinkRecipientReserved } from "@/src/lib/backlinks/recipient-history.server";
import { isBacklinkSuppressed } from "@/src/lib/backlinks/suppression.server";
import { SITE_URL } from "@/src/lib/seo";
import type { BacklinkStatus } from "@/src/lib/backlinks/types";

type ManualAction = "manual_approve" | "manual_exclude" | "restore_automatic" | "contact_update" | "rescan";

type ProspectRow = {
  id: string;
  campaign_id: string;
  page_url: string;
  domain: string;
  page_title: string;
  organization: string;
  contact_email: string | null;
  contact_source_url: string | null;
  score: number;
  status: BacklinkStatus;
  existing_link: boolean;
  linked_at: string | null;
  lost_at: string | null;
  next_action_at: string | null;
  send_count: number;
  manual_decision: "approved" | "excluded" | null;
};

type SettingsRow = {
  minimum_score: number;
  domain_cooldown_days: number;
};

export type BacklinkManualErrorCode =
  | "already-contacted"
  | "delivery-in-progress"
  | "domain-cooldown"
  | "domain-not-blocked"
  | "domain-pending"
  | "existing-link"
  | "invalid-contact"
  | "missing-config"
  | "not-found"
  | "protected-suppression"
  | "recipient-used"
  | "rescan-failed"
  | "suppressed";

export class BacklinkManualActionError extends Error {
  constructor(public readonly code: BacklinkManualErrorCode) {
    super(code);
  }
}

function fail(code: BacklinkManualErrorCode): never {
  throw new BacklinkManualActionError(code);
}

async function readProspect(id: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("backlink_prospects")
    .select("id,campaign_id,page_url,domain,page_title,organization,contact_email,contact_source_url,score,status,existing_link,linked_at,lost_at,next_action_at,send_count,manual_decision")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) fail("not-found");
  return data as ProspectRow;
}

async function readSettings() {
  const { data, error } = await createSupabaseAdminClient()
    .from("backlink_automation_settings")
    .select("minimum_score,domain_cooldown_days")
    .eq("singleton", true)
    .single();
  if (error) throw error;
  return data as SettingsRow;
}

function assertUncontacted(row: ProspectRow) {
  if (row.send_count > 0 || ["sent", "linked", "lost"].includes(row.status)) fail("already-contacted");
}

async function domainCoolingDown(row: ProspectRow, days: number) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await createSupabaseAdminClient()
    .from("backlink_prospects")
    .select("id")
    .eq("domain", row.domain)
    .neq("id", row.id)
    .gte("last_sent_at", since)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

async function domainHasPendingOutreach(row: ProspectRow) {
  const { data, error } = await createSupabaseAdminClient()
    .from("backlink_outbox")
    .select("id,backlink_prospects!inner(domain)")
    .eq("status", "pending")
    .eq("backlink_prospects.domain", row.domain)
    .neq("prospect_id", row.id)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

async function recordAction(input: {
  row: ProspectRow;
  action: ManualAction;
  note: string;
  nextStatus: BacklinkStatus;
  nextContactEmail?: string | null;
  previousScore?: number;
  nextScore?: number;
  userId: string;
}) {
  const nextContactEmail = input.nextContactEmail === undefined
    ? input.row.contact_email
    : input.nextContactEmail;
  const { error } = await createSupabaseAdminClient().from("backlink_prospect_actions").insert({
    prospect_id: input.row.id,
    action: input.action,
    note: input.note,
    previous_status: input.row.status,
    next_status: input.nextStatus,
    previous_contact_email: input.row.contact_email,
    next_contact_email: nextContactEmail,
    previous_score: input.previousScore,
    next_score: input.nextScore,
    actor_user_id: input.userId,
  });
  if (error) throw error;
}

async function automaticStatus(row: ProspectRow, email: string | null, settings: SettingsRow) {
  if (row.existing_link) return { status: "linked" as const, reason: "existing-link" };
  if (!email) return { status: "discovered" as const, reason: "missing-contact" };
  if (!isRoleMailbox(email)) return { status: "discovered" as const, reason: "personal-mailbox" };
  if (await isBacklinkSuppressed(email, row.domain)) return { status: "suppressed" as const, reason: "suppression-list" };
  if (await isBacklinkRecipientReserved(email, { prospectId: row.id })) {
    return { status: "suppressed" as const, reason: "recipient-already-contacted" };
  }
  if (row.score < settings.minimum_score) return { status: "discovered" as const, reason: "low-score" };
  if (await domainCoolingDown(row, settings.domain_cooldown_days)) {
    return { status: "discovered" as const, reason: "domain-cooldown" };
  }
  if (await domainHasPendingOutreach(row)) return { status: "discovered" as const, reason: "domain-pending" };
  return { status: "ready" as const, reason: "policy-passed" };
}

export async function approveBacklinkProspect(id: string, note: string, userId: string) {
  const [row, settings] = await Promise.all([readProspect(id), readSettings()]);
  const blocker = manualApprovalBlocker({
    contactEmail: row.contact_email,
    existingLink: row.existing_link,
    sendCount: row.send_count,
    status: row.status,
  });
  if (blocker) fail(blocker);
  const email = row.contact_email && normalizeEmail(row.contact_email);
  if (!email) fail("invalid-contact");
  if (await isBacklinkSuppressed(email, row.domain)) fail("suppressed");
  if (await isBacklinkRecipientReserved(email, { prospectId: row.id })) fail("recipient-used");
  if (await domainCoolingDown(row, settings.domain_cooldown_days)) fail("domain-cooldown");
  if (await domainHasPendingOutreach(row)) fail("domain-pending");
  const now = new Date().toISOString();
  const { error } = await createSupabaseAdminClient().from("backlink_prospects").update({
    status: "ready",
    status_reason: "manual-approval",
    manual_decision: "approved",
    manual_note: note,
    manual_decided_at: now,
    manual_decided_by: userId,
    next_action_at: now,
    updated_at: now,
  }).eq("id", row.id).eq("send_count", 0);
  if (error) throw error;
  await recordAction({ row, action: "manual_approve", note, nextStatus: "ready", userId });
}

export async function excludeBacklinkProspect(id: string, note: string, userId: string) {
  const row = await readProspect(id);
  assertUncontacted(row);
  const admin = createSupabaseAdminClient();
  const { data: sending, error: sendingError } = await admin.from("backlink_outbox")
    .select("id").eq("prospect_id", row.id).eq("status", "sending").limit(1);
  if (sendingError) throw sendingError;
  if (sending?.length) fail("delivery-in-progress");
  const now = new Date().toISOString();
  const { error } = await admin.from("backlink_prospects").update({
    status: "suppressed",
    status_reason: "manual-exclusion",
    manual_decision: "excluded",
    manual_note: note,
    manual_decided_at: now,
    manual_decided_by: userId,
    next_action_at: null,
    updated_at: now,
  }).eq("id", row.id).eq("send_count", 0);
  if (error) throw error;
  const { error: cancelError } = await admin.from("backlink_outbox").update({
    status: "cancelled",
    last_error: "manual-exclusion",
    updated_at: now,
  }).eq("prospect_id", row.id).eq("status", "pending");
  if (cancelError) throw cancelError;
  await recordAction({ row, action: "manual_exclude", note, nextStatus: "suppressed", userId });
}

export async function restoreAutomaticBacklinkDecision(id: string, note: string, userId: string) {
  const [row, settings] = await Promise.all([readProspect(id), readSettings()]);
  assertUncontacted(row);
  const email = row.contact_email && normalizeEmail(row.contact_email);
  const decision = await automaticStatus(row, email, settings);
  const now = new Date().toISOString();
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("backlink_prospects").update({
    status: decision.status,
    status_reason: decision.reason,
    manual_decision: null,
    manual_note: null,
    manual_decided_at: null,
    manual_decided_by: null,
    next_action_at: decision.status === "ready" ? now : null,
    updated_at: now,
  }).eq("id", row.id).eq("send_count", 0);
  if (error) throw error;
  if (decision.status !== "ready") {
    const { error: cancelError } = await admin.from("backlink_outbox").update({
      status: "cancelled",
      last_error: "automatic-policy",
      updated_at: now,
    }).eq("prospect_id", row.id).eq("status", "pending");
    if (cancelError) throw cancelError;
  }
  await recordAction({ row, action: "restore_automatic", note, nextStatus: decision.status, userId });
}

async function pendingMessageForContact(row: ProspectRow, email: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("backlink_outbox")
    .select("id,status,attempt_count,message_kind")
    .eq("prospect_id", row.id);
  if (error) throw error;
  if ((data ?? []).some((message) => message.attempt_count > 0 || ["sending", "sent", "failed"].includes(message.status))) {
    fail("already-contacted");
  }
  const pending = (data ?? []).find((message) => message.status === "pending" && message.message_kind === "initial");
  if (!pending) return;
  const campaign = BACKLINK_CAMPAIGNS.find((item) => item.id === row.campaign_id);
  const secret = process.env.BACKLINK_UNSUBSCRIBE_SECRET;
  if (!campaign || !secret) fail("missing-config");
  const token = createUnsubscribeToken(row.id, email, secret);
  const message = buildOutreachMessage({
    campaign,
    organization: row.organization,
    pageTitle: row.page_title,
    pageUrl: row.page_url,
    unsubscribeUrl: `${SITE_URL}/baixa-comunicacions?token=${encodeURIComponent(token)}`,
  });
  const { error: updateError } = await admin.from("backlink_outbox").update({
    recipient: email,
    subject: message.subject,
    body_text: message.text,
    last_error: null,
    updated_at: new Date().toISOString(),
  }).eq("id", pending.id).eq("status", "pending").eq("attempt_count", 0);
  if (updateError?.code === "23505") fail("recipient-used");
  if (updateError) throw updateError;
}

export async function updateBacklinkContact(id: string, rawEmail: string, note: string, userId: string) {
  const [row, settings] = await Promise.all([readProspect(id), readSettings()]);
  assertUncontacted(row);
  const email = normalizeEmail(rawEmail);
  if (!email) fail("invalid-contact");
  if (await isBacklinkSuppressed(email, row.domain)) fail("suppressed");
  if (await isBacklinkRecipientReserved(email, { prospectId: row.id })) fail("recipient-used");
  await pendingMessageForContact(row, email);
  const automatic = await automaticStatus(row, email, settings);
  const nextStatus = row.manual_decision === "approved"
    ? "ready"
    : row.manual_decision === "excluded" ? "suppressed" : automatic.status;
  const reason = row.manual_decision === "approved"
    ? "manual-approval"
    : row.manual_decision === "excluded" ? "manual-exclusion" : automatic.reason;
  const now = new Date().toISOString();
  const { error } = await createSupabaseAdminClient().from("backlink_prospects").update({
    contact_email: email,
    contact_source_url: null,
    status: nextStatus,
    status_reason: reason,
    next_action_at: nextStatus === "ready" ? now : null,
    updated_at: now,
  }).eq("id", row.id).eq("send_count", 0);
  if (error) throw error;
  await recordAction({
    row,
    action: "contact_update",
    note,
    nextStatus,
    nextContactEmail: email,
    userId,
  });
}

async function hasManualContact(row: ProspectRow) {
  const { data, error } = await createSupabaseAdminClient()
    .from("backlink_prospect_actions")
    .select("id")
    .eq("prospect_id", row.id)
    .eq("action", "contact_update")
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

async function manualApprovalStatus(row: ProspectRow, email: string | null, settings: SettingsRow) {
  if (!email || !isValidManualContact(email)) {
    return { status: "discovered" as const, reason: "manual-approval-invalid-contact" };
  }
  if (await isBacklinkSuppressed(email, row.domain)) {
    return { status: "suppressed" as const, reason: "suppression-list" };
  }
  if (await isBacklinkRecipientReserved(email, { prospectId: row.id })) {
    return { status: "suppressed" as const, reason: "recipient-already-contacted" };
  }
  if (await domainCoolingDown(row, settings.domain_cooldown_days)) {
    return { status: "discovered" as const, reason: "domain-cooldown" };
  }
  if (await domainHasPendingOutreach(row)) {
    return { status: "discovered" as const, reason: "domain-pending" };
  }
  return { status: "ready" as const, reason: "manual-approval" };
}

export async function rescanBacklinkProspect(id: string, userId: string) {
  const [row, settings] = await Promise.all([readProspect(id), readSettings()]);
  const campaign = BACKLINK_CAMPAIGNS.find((item) => item.id === row.campaign_id);
  if (!campaign) fail("missing-config");
  let page: Awaited<ReturnType<typeof inspectPublicPage>>;
  try {
    page = await inspectPublicPage(row.page_url, row.page_title);
  } catch {
    fail("rescan-failed");
  }
  const manualContact = await hasManualContact(row);
  const detectedEmail = page.emails.find(isRoleMailbox) ?? page.emails[0] ?? null;
  const contactEmail = manualContact ? row.contact_email : detectedEmail;
  const contactSourceUrl = manualContact ? row.contact_source_url : page.contactSourceUrl;
  const domain = new URL(page.finalUrl).hostname;
  const rescannedRow: ProspectRow = {
    ...row,
    contact_email: contactEmail,
    contact_source_url: contactSourceUrl,
    domain,
    existing_link: Boolean(page.existingLink),
  };
  const candidateInput = {
    campaign,
    pageUrl: page.finalUrl,
    title: page.title,
    pageText: page.pageText,
    contactEmail,
    outboundLinkCount: page.outboundLinkCount,
    contentPublishedAt: page.contentPublishedAt,
    contentModifiedAt: page.contentModifiedAt,
    hasExistingLink: Boolean(page.existingLink),
  };
  const scoreExplanation = explainCandidateScore(candidateInput);
  const policy = automaticEligibility(candidateInput, settings.minimum_score);
  rescannedRow.score = policy.score;

  let decision: { status: BacklinkStatus; reason: string };
  const mode = backlinkRescanMode({
    existingLink: Boolean(page.existingLink),
    manualDecision: row.manual_decision,
    sendCount: row.send_count,
    status: row.status,
  });
  if (mode === "verified-link") {
    decision = { status: "linked", reason: "verified-link" };
  } else if (mode === "contacted") {
    decision = row.status === "linked" || row.status === "lost"
      ? { status: "lost", reason: "link-removed" }
      : { status: "sent", reason: "awaiting-link" };
  } else if (mode === "manual-excluded") {
    decision = { status: "suppressed", reason: "manual-exclusion" };
  } else if (mode === "manual-approved") {
    decision = await manualApprovalStatus(rescannedRow, contactEmail, settings);
  } else {
    decision = await automaticStatus(rescannedRow, contactEmail, settings);
  }

  const now = new Date().toISOString();
  const admin = createSupabaseAdminClient();
  if (row.send_count === 0) {
    if (decision.status === "ready" && contactEmail) {
      await pendingMessageForContact({
        ...rescannedRow,
        page_title: page.title,
        organization: page.organization,
      }, contactEmail);
    } else {
      const { error: cancelError } = await admin.from("backlink_outbox").update({
        status: "cancelled",
        last_error: "rescan-policy",
        updated_at: now,
      }).eq("prospect_id", row.id).eq("status", "pending");
      if (cancelError) throw cancelError;
    }
  }

  const { error } = await admin.from("backlink_prospects").update({
    domain,
    page_title: page.title,
    organization: page.organization,
    contact_email: contactEmail,
    contact_source_url: contactSourceUrl,
    outbound_link_count: page.outboundLinkCount,
    content_published_at: page.contentPublishedAt,
    content_modified_at: page.contentModifiedAt,
    score_explanation: scoreExplanation,
    score: policy.score,
    status: decision.status,
    status_reason: decision.reason,
    existing_link: Boolean(page.existingLink),
    link_rel: page.existingLink?.rel ?? null,
    link_anchor: page.existingLink?.anchor ?? null,
    linked_at: page.existingLink ? row.linked_at ?? now : row.linked_at,
    lost_at: decision.status === "lost" ? row.lost_at ?? now : null,
    last_checked_at: now,
    next_action_at: decision.status === "ready" ? now : decision.status === "sent" ? row.next_action_at : null,
    updated_at: now,
  }).eq("id", row.id);
  if (error) throw error;
  await recordAction({
    row,
    action: "rescan",
    note: `Reescaneig manual: ${row.score} → ${policy.score} punts; ${page.outboundLinkCount} enllaços editorials externs.`,
    nextStatus: decision.status,
    nextContactEmail: contactEmail,
    previousScore: row.score,
    nextScore: policy.score,
    userId,
  });
}
