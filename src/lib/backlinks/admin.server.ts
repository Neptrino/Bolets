import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { readUnsubscribeToken } from "@/src/lib/backlinks/policy";
import type { BacklinkDashboard, BacklinkProspect, BacklinkSettings } from "@/src/lib/backlinks/types";

function mapSettings(row: Record<string, unknown>): BacklinkSettings {
  return {
    enabled: row.enabled === true,
    autoSend: row.auto_send === true,
    dailySendLimit: Number(row.daily_send_limit),
    minimumScore: Number(row.minimum_score),
    domainCooldownDays: Number(row.domain_cooldown_days),
    followUpDelayDays: Number(row.follow_up_delay_days),
    campaignCursor: Number(row.campaign_cursor),
    lastRunAt: typeof row.last_run_at === "string" ? row.last_run_at : null,
  };
}

function mapProspect(row: Record<string, unknown>): BacklinkProspect {
  return {
    id: String(row.id), campaignId: String(row.campaign_id), pageUrl: String(row.page_url),
    domain: String(row.domain), pageTitle: String(row.page_title), organization: String(row.organization),
    contactEmail: typeof row.contact_email === "string" ? row.contact_email : null,
    targetUrl: String(row.target_url), targetTitle: String(row.target_title), score: Number(row.score),
    status: row.status as BacklinkProspect["status"],
    statusReason: typeof row.status_reason === "string" ? row.status_reason : null,
    sendCount: Number(row.send_count), lastSentAt: typeof row.last_sent_at === "string" ? row.last_sent_at : null,
    linkedAt: typeof row.linked_at === "string" ? row.linked_at : null,
    lastCheckedAt: typeof row.last_checked_at === "string" ? row.last_checked_at : null,
  };
}

export function backlinkConfiguration() {
  return {
    search: Boolean(process.env.BRAVE_SEARCH_API_KEY),
    delivery: Boolean(process.env.RESEND_API_KEY && process.env.BACKLINK_EMAIL_FROM),
    unsubscribe: Boolean(process.env.BACKLINK_UNSUBSCRIBE_SECRET),
  };
}

export async function readBacklinkDashboard(): Promise<BacklinkDashboard> {
  const admin = createSupabaseAdminClient();
  const [settingsResult, prospectsResult, statusesResult, runResult] = await Promise.all([
    admin.from("backlink_automation_settings").select("*").eq("singleton", true).single(),
    admin.from("backlink_prospects").select("*").order("updated_at", { ascending: false }).limit(100),
    admin.from("backlink_prospects").select("status"),
    admin.from("backlink_automation_runs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (settingsResult.error) throw settingsResult.error;
  if (prospectsResult.error) throw prospectsResult.error;
  if (statusesResult.error) throw statusesResult.error;
  if (runResult.error) throw runResult.error;
  const counts: Record<string, number> = {};
  for (const row of statusesResult.data ?? []) counts[row.status] = (counts[row.status] ?? 0) + 1;
  const run = runResult.data;
  return {
    settings: mapSettings(settingsResult.data as Record<string, unknown>),
    prospects: (prospectsResult.data ?? []).map((row) => mapProspect(row as Record<string, unknown>)),
    counts,
    recentRun: run ? {
      status: run.status, discoveredCount: run.discovered_count, inspectedCount: run.inspected_count,
      sentCount: run.sent_count, linkedCount: run.linked_count, failedCount: run.failed_count,
      detail: run.detail, startedAt: run.started_at, completedAt: run.completed_at,
    } : null,
    configured: backlinkConfiguration(),
  };
}

export async function updateBacklinkSettings(input: {
  enabled: boolean;
  autoSend: boolean;
  dailySendLimit: number;
  minimumScore: number;
  userId: string;
}) {
  const { error } = await createSupabaseAdminClient().from("backlink_automation_settings").update({
    enabled: input.enabled,
    auto_send: input.autoSend,
    daily_send_limit: input.dailySendLimit,
    minimum_score: input.minimumScore,
    updated_by: input.userId,
    updated_at: new Date().toISOString(),
  }).eq("singleton", true);
  if (error) throw error;
}

export async function suppressBacklinkToken(token: string) {
  const secret = process.env.BACKLINK_UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error("Backlink unsubscribe is unavailable");
  const payload = readUnsubscribeToken(token, secret);
  if (!payload) return false;
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("backlink_suppressions").upsert({
    kind: "email", value: payload.email, reason: "opt_out",
  }, { onConflict: "kind,value", ignoreDuplicates: true });
  if (error) throw error;
  await Promise.all([
    admin.from("backlink_prospects").update({
      status: "suppressed", status_reason: "recipient-opt-out", next_action_at: null, updated_at: now,
    }).eq("contact_email", payload.email),
    admin.from("backlink_outbox").update({
      status: "cancelled", last_error: "recipient-opt-out", updated_at: now,
    }).eq("recipient", payload.email).eq("status", "pending"),
  ]);
  return true;
}
