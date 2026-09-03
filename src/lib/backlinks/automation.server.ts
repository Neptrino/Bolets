import "server-only";

import { randomUUID } from "node:crypto";

import { BACKLINK_CAMPAIGNS, type BacklinkCampaign } from "@/data/backlink-campaigns";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { SITE_URL } from "@/src/lib/seo";
import { searchBraveWeb } from "@/src/lib/backlinks/brave.server";
import { inspectPublicPage } from "@/src/lib/backlinks/crawler.server";
import { backlinkDomainKey } from "@/src/lib/backlinks/domain-control";
import { isBacklinkSuppressed, readSuppressedBacklinkDomains } from "@/src/lib/backlinks/suppression.server";
import {
  automaticEligibility,
  buildOutreachMessage,
  createUnsubscribeToken,
  explainCandidateScore,
  isRoleMailbox,
  normalizeCandidateUrl,
} from "@/src/lib/backlinks/policy";
import {
  BRAVE_RESULTS_PER_PAGE,
  nextBacklinkCampaignCursor,
  nextBraveSearchOffset,
  planBacklinkSearches,
  parseBacklinkSearchOffsets,
} from "@/src/lib/backlinks/search-pagination";
import type { BacklinkSettings } from "@/src/lib/backlinks/types";

type ProspectRow = {
  id: string;
  campaign_id: string;
  page_url: string;
  domain: string;
  page_title: string;
  organization: string;
  contact_email: string | null;
  target_url: string;
  target_title: string;
  status: string;
  send_count: number;
  first_sent_at: string | null;
  linked_at: string | null;
};

function settingsFromRow(row: Record<string, unknown>): BacklinkSettings {
  return {
    enabled: row.enabled === true,
    autoSend: row.auto_send === true,
    dailySendLimit: Number(row.daily_send_limit),
    minimumScore: Number(row.minimum_score),
    domainCooldownDays: Number(row.domain_cooldown_days),
    campaignCursor: Number(row.campaign_cursor),
    searchOffsets: parseBacklinkSearchOffsets(row.search_offsets),
    lastRunAt: typeof row.last_run_at === "string" ? row.last_run_at : null,
  };
}

async function readSettings() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("backlink_automation_settings").select("*").eq("singleton", true).single();
  if (error) throw error;
  return settingsFromRow(data as Record<string, unknown>);
}

async function mapLimit<T, R>(items: T[], limit: number, task: (item: T, index: number) => Promise<R>) {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]!, index);
    }
  }));
  return results;
}

async function domainCoolingDown(domain: string, days: number) {
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await admin
    .from("backlink_prospects")
    .select("id")
    .eq("domain", domain)
    .gte("last_sent_at", since)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

async function domainHasPendingOutreach(domain: string) {
  const admin = createSupabaseAdminClient();
  const { data: prospects, error: prospectError } = await admin
    .from("backlink_prospects").select("id").eq("domain", domain);
  if (prospectError) throw prospectError;
  const ids = (prospects ?? []).map((row) => row.id);
  if (!ids.length) return false;
  const { data, error } = await admin.from("backlink_outbox").select("id")
    .in("prospect_id", ids).in("status", ["pending", "sending"]).limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

async function discoverCampaign(
  campaign: BacklinkCampaign,
  settings: BacklinkSettings,
  queryText: string,
  offset: number,
  suppressedDomains: ReadonlySet<string>,
) {
  const admin = createSupabaseAdminClient();
  const search = await searchBraveWeb(queryText, offset);
  const normalizedCandidates = search.results.flatMap((result) => {
    const pageUrl = result.url ? normalizeCandidateUrl(result.url) : null;
    return pageUrl ? [{ pageUrl }] : [];
  });
  const candidates = [...new Map(normalizedCandidates.map((candidate) => [candidate.pageUrl, candidate])).values()]
    .filter((candidate) => !suppressedDomains.has(backlinkDomainKey(new URL(candidate.pageUrl).hostname)));
  const urls = candidates.map((candidate) => candidate.pageUrl);
  const existing = urls.length
    ? await admin.from("backlink_prospects").select("page_url").in("page_url", urls)
    : { data: [], error: null };
  if (existing.error) throw existing.error;
  const known = new Set((existing.data ?? []).map((row) => row.page_url));
  const fresh = candidates.filter((candidate) => !known.has(candidate.pageUrl)).slice(0, BRAVE_RESULTS_PER_PAGE);
  let inspected = 0;
  let failed = 0;

  await mapLimit(fresh, 2, async (candidate) => {
    try {
      // Search-provider results are transient discovery hints. Persist only facts
      // independently fetched from the public target page.
      const page = await inspectPublicPage(candidate.pageUrl, "Recurs públic sobre bolets");
      inspected += 1;
      const contactEmail = page.emails.find(isRoleMailbox) ?? page.emails[0] ?? null;
      const pageUrl = normalizeCandidateUrl(page.finalUrl) ?? candidate.pageUrl;
      const domain = new URL(pageUrl).hostname;
      const candidateInput = {
        campaign,
        pageUrl,
        title: page.title,
        pageText: page.pageText,
        contactEmail,
        outboundLinkCount: page.outboundLinkCount,
        contentPublishedAt: page.contentPublishedAt, contentModifiedAt: page.contentModifiedAt,
        hasExistingLink: Boolean(page.existingLink),
      };
      const scoreExplanation = explainCandidateScore(candidateInput);
      const policy = automaticEligibility(candidateInput, settings.minimumScore);
      const suppressed = await isBacklinkSuppressed(contactEmail, domain);
      const coolingDown = policy.eligible ? await domainCoolingDown(domain, settings.domainCooldownDays) : false;
      const status = page.existingLink ? "linked" : suppressed ? "suppressed" : policy.eligible && !coolingDown ? "ready" : "discovered";
      const reason = suppressed ? "suppression-list" : coolingDown ? "domain-cooldown" : policy.reason;
      const now = new Date().toISOString();
      const { error } = await admin.from("backlink_prospects").insert({
        campaign_id: campaign.id,
        search_query: queryText,
        page_url: pageUrl,
        domain,
        page_title: page.title,
        snippet: "",
        organization: page.organization,
        contact_email: contactEmail,
        contact_source_url: page.contactSourceUrl,
        outbound_link_count: page.outboundLinkCount,
        content_published_at: page.contentPublishedAt, content_modified_at: page.contentModifiedAt,
        score_explanation: scoreExplanation,
        target_url: new URL(campaign.targetPath, SITE_URL).toString(),
        target_title: campaign.targetTitle,
        score: policy.score,
        status,
        status_reason: reason,
        existing_link: Boolean(page.existingLink),
        link_rel: page.existingLink?.rel ?? null,
        link_anchor: page.existingLink?.anchor ?? null,
        linked_at: page.existingLink ? now : null,
        last_checked_at: now,
        next_action_at: status === "ready" ? now : null,
      });
      if (error) throw error;
    } catch (error) {
      failed += 1;
      console.warn("Backlink prospect inspection failed", {
        pageUrl: candidate.pageUrl,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
  return { discovered: fresh.length, inspected, failed, moreResultsAvailable: search.moreResultsAvailable };
}

function campaignFor(row: ProspectRow) {
  return BACKLINK_CAMPAIGNS.find((campaign) => campaign.id === row.campaign_id) ?? null;
}

async function queueMessage(row: ProspectRow, settings: BacklinkSettings) {
  const email = row.contact_email;
  const campaign = campaignFor(row);
  const secret = process.env.BACKLINK_UNSUBSCRIBE_SECRET;
  if (!email || !campaign || !secret) return false;
  if (await isBacklinkSuppressed(email, row.domain)) {
    await createSupabaseAdminClient().from("backlink_prospects").update({
      status: "suppressed", status_reason: "suppression-list", next_action_at: null, updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    return false;
  }
  if (
    await domainCoolingDown(row.domain, settings.domainCooldownDays)
    || await domainHasPendingOutreach(row.domain)
  ) return false;
  const token = createUnsubscribeToken(row.id, email, secret);
  const unsubscribeUrl = `${SITE_URL}/baixa-comunicacions?token=${encodeURIComponent(token)}`;
  const message = buildOutreachMessage({
    campaign,
    organization: row.organization,
    pageTitle: row.page_title,
    pageUrl: row.page_url,
    unsubscribeUrl,
  });
  const { error } = await createSupabaseAdminClient().from("backlink_outbox").insert({
    prospect_id: row.id,
    message_kind: "initial",
    recipient: email,
    subject: message.subject,
    body_text: message.text,
    dedupe_key: `backlink-initial-${row.id}`,
  });
  if (!error) return true;
  if (error.code !== "23505") throw error;
  const { data: restored, error: restoreError } = await createSupabaseAdminClient()
    .from("backlink_outbox")
    .update({
      recipient: email,
      subject: message.subject,
      body_text: message.text,
      status: "pending",
      deliver_after: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("prospect_id", row.id)
    .eq("message_kind", "initial")
    .eq("status", "cancelled")
    .eq("attempt_count", 0)
    .select("id");
  if (restoreError) throw restoreError;
  return Boolean(restored?.length);
}

async function verifyProspects() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("backlink_prospects")
    .select("id,campaign_id,page_url,domain,page_title,organization,contact_email,target_url,target_title,status,send_count,first_sent_at,linked_at")
    .in("status", ["sent", "linked", "lost"])
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(8);
  if (error) throw error;
  let linked = 0;
  let failed = 0;
  for (const row of (data ?? []) as ProspectRow[]) {
    try {
      const page = await inspectPublicPage(row.page_url, row.page_title);
      const now = new Date().toISOString();
      if (page.existingLink) {
        await admin.from("backlink_prospects").update({
          status: "linked", status_reason: "verified-link", existing_link: true,
          link_rel: page.existingLink.rel, link_anchor: page.existingLink.anchor,
          linked_at: row.linked_at ?? now, lost_at: null, next_action_at: null,
          last_checked_at: now, updated_at: now,
        }).eq("id", row.id);
        linked += row.status === "linked" ? 0 : 1;
      } else {
        const wasLinked = row.status === "linked";
        await admin.from("backlink_prospects").update({
          status: wasLinked ? "lost" : "sent",
          status_reason: wasLinked ? "link-removed" : "awaiting-link",
          existing_link: false, link_rel: null, link_anchor: null,
          lost_at: wasLinked ? now : null, last_checked_at: now, updated_at: now,
        }).eq("id", row.id);
      }
    } catch {
      failed += 1;
    }
  }
  return { linked, failed };
}

async function queueReady(settings: BacklinkSettings) {
  if (!settings.autoSend) return 0;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("backlink_prospects")
    .select("id,campaign_id,page_url,domain,page_title,organization,contact_email,target_url,target_title,status,send_count,first_sent_at,linked_at")
    .eq("status", "ready")
    .order("score", { ascending: false })
    .limit(settings.dailySendLimit);
  if (error) throw error;
  let queued = 0;
  for (const row of (data ?? []) as ProspectRow[]) queued += await queueMessage(row, settings) ? 1 : 0;
  return queued;
}

async function sentInLastDay() {
  const { count, error } = await createSupabaseAdminClient()
    .from("backlink_outbox")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", new Date(Date.now() - 86_400_000).toISOString());
  if (error) throw error;
  return count ?? 0;
}

async function dispatchOutbox(settings: BacklinkSettings) {
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
      .select("domain,status,manual_decision,contact_email,send_count")
      .eq("id", message.prospect_id)
      .maybeSingle();
    if (prospectError) throw prospectError;
    const blocked = !prospect
      || prospect.status !== "ready"
      || prospect.manual_decision === "excluded"
      || prospect.contact_email !== message.recipient
      || prospect.send_count > 0
      || await isBacklinkSuppressed(message.recipient, prospect.domain);
    if (blocked) {
      await admin.from("backlink_outbox").update({
        status: "cancelled", last_error: "prospect-not-sendable", updated_at: new Date().toISOString(),
      }).eq("id", message.id).eq("status", "sending");
      continue;
    }
    const token = createUnsubscribeToken(message.prospect_id, message.recipient, secret);
    const unsubscribeUrl = `${SITE_URL}/api/backlinks/unsubscribe?token=${encodeURIComponent(token)}`;
    await admin.from("backlink_outbox").update({
      attempt_count: message.attempt_count + 1,
      updated_at: new Date().toISOString(),
    }).eq("id", message.id).eq("status", "sending");
    let safeToRetry = false;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": message.dedupe_key },
        body: JSON.stringify({
          from, to: [message.recipient], reply_to: replyTo || undefined,
          subject: message.subject, text: message.body_text,
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

export async function runBacklinkAutomation() {
  const admin = createSupabaseAdminClient();
  const settings = await readSettings();
  if (!settings.enabled) {
    const { data: run, error: runError } = await admin.from("backlink_automation_runs")
      .insert({ status: "disabled" }).select("id").single();
    if (runError) throw runError;
    await admin.from("backlink_automation_runs").update({ completed_at: new Date().toISOString(), detail: "Automation is paused" }).eq("id", run.id);
    return { status: "disabled", discovered: 0, inspected: 0, queued: 0, sent: 0, linked: 0, failed: 0 };
  }
  const leaseToken = randomUUID();
  const now = new Date();
  const { data: lease, error: leaseError } = await admin.from("backlink_automation_settings").update({
    lease_token: leaseToken,
    lease_until: new Date(now.getTime() + 25 * 60_000).toISOString(),
  }).eq("singleton", true).lt("lease_until", now.toISOString()).select("singleton");
  if (leaseError) throw leaseError;
  if (!lease?.length) {
    return { status: "busy", discovered: 0, inspected: 0, queued: 0, sent: 0, linked: 0, failed: 0 };
  }
  const searchPlans = planBacklinkSearches(BACKLINK_CAMPAIGNS, settings.campaignCursor, settings.searchOffsets);
  const suppressedDomains = await readSuppressedBacklinkDomains();
  const searches = searchPlans.map((plan) => plan.search);
  const firstSearch = searches[0]!;
  const { data: run, error: runError } = await admin.from("backlink_automation_runs")
    .insert({
      status: "running",
      campaign_id: firstSearch.campaignId,
      search_query: firstSearch.query,
      search_offset: firstSearch.offset,
      search_page_count: 0,
      searches,
    }).select("id").single();
  if (runError) {
    await admin.from("backlink_automation_settings").update({ lease_token: null, lease_until: new Date(0).toISOString() })
      .eq("singleton", true).eq("lease_token", leaseToken);
    throw runError;
  }
  let discovered = 0, inspected = 0, queued = 0, sent = 0, linked = 0, failed = 0, searchedPageCount = 0;
  const nextCampaignCursor = nextBacklinkCampaignCursor(settings.campaignCursor, BACKLINK_CAMPAIGNS.length, searchPlans.length);
  let nextSearchOffsets = settings.searchOffsets;
  const errors: string[] = [];
  try {
    for (const { campaign, offsetKey, search } of searchPlans) {
      try {
        const discovery = await discoverCampaign(campaign, settings, search.query, search.offset, suppressedDomains);
        searchedPageCount += 1;
        search.pageCount = 1;
        discovered += discovery.discovered; inspected += discovery.inspected; failed += discovery.failed;
        const nextOffset = nextBraveSearchOffset(search.offset, discovery.moreResultsAvailable);
        nextSearchOffsets = { ...nextSearchOffsets, [offsetKey]: nextOffset };
      } catch (error) {
        failed += 1;
        errors.push(`${campaign.id}: ${error instanceof Error ? error.message : "Discovery failed"}`);
      }
    }
    const verification = await verifyProspects();
    linked += verification.linked; failed += verification.failed;
    queued += await queueReady(settings);
    const delivery = await dispatchOutbox(settings);
    sent += delivery.sent; failed += delivery.failed;
    const status = errors.length ? "partial" : "succeeded";
    const completedAt = new Date().toISOString();
    await admin.from("backlink_automation_runs").update({
      status, discovered_count: discovered, inspected_count: inspected, queued_count: queued,
      sent_count: sent, linked_count: linked, failed_count: failed,
      search_page_count: searchedPageCount,
      searches,
      detail: errors.join(" · ").slice(0, 1000) || null, completed_at: completedAt,
    }).eq("id", run.id);
    await admin.from("backlink_automation_settings").update({
      campaign_cursor: nextCampaignCursor,
      search_offsets: nextSearchOffsets,
      last_run_at: completedAt, updated_at: completedAt,
      lease_token: null, lease_until: new Date(0).toISOString(),
    }).eq("singleton", true).eq("lease_token", leaseToken);
    return { status, discovered, inspected, queued, sent, linked, failed };
  } catch (error) {
    await admin.from("backlink_automation_runs").update({
      status: "failed", discovered_count: discovered, inspected_count: inspected,
      queued_count: queued, sent_count: sent, linked_count: linked, failed_count: failed + 1,
      search_page_count: searchedPageCount,
      searches,
      detail: (error instanceof Error ? error.message : "Automation failed").slice(0, 1000),
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    await admin.from("backlink_automation_settings").update({ lease_token: null, lease_until: new Date(0).toISOString() })
      .eq("singleton", true).eq("lease_token", leaseToken);
    throw error;
  }
}
