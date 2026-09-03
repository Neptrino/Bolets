import "server-only";

import { BACKLINK_CAMPAIGNS } from "@/data/backlink-campaigns";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { buildOutreachMessage, readUnsubscribeToken } from "@/src/lib/backlinks/policy";
import { SITE_URL } from "@/src/lib/seo";
import { BACKLINK_STATUSES, type BacklinkTableQuery } from "@/src/lib/backlinks/admin-table";
import { backlinkSuppressionDomainValues } from "@/src/lib/backlinks/domain-control";
import {
  BACKLINK_SEARCHES_PER_RUN,
  parseBacklinkSearchOffsets,
  planBacklinkSearches,
} from "@/src/lib/backlinks/search-pagination";
import type {
  BacklinkDashboard,
  BacklinkDelivery,
  BacklinkProspect,
  BacklinkProspectAction,
  BacklinkProspectDetail,
  BacklinkProspectSort,
  BacklinkScoreExplanation,
  BacklinkSearchContext,
  BacklinkSettings,
} from "@/src/lib/backlinks/types";

const BACKLINK_PAGE_SIZE = 20;

function searchContext(campaignId: string, query: string, offset: number, pageCount: number): BacklinkSearchContext {
  const campaign = BACKLINK_CAMPAIGNS.find((candidate) => candidate.id === campaignId);
  return { campaignId, label: campaign?.shortLabel ?? query, query, offset, pageCount };
}

function recordedSearches(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const row = candidate as Record<string, unknown>;
    if (typeof row.campaignId !== "string" || typeof row.query !== "string"
      || !Number.isInteger(row.offset) || !Number.isInteger(row.pageCount)) return [];
    return [searchContext(row.campaignId, row.query, Number(row.offset), Number(row.pageCount))];
  });
}

const SORT_COLUMNS: Record<BacklinkProspectSort, string> = {
  updated: "updated_at",
  title: "page_title",
  status: "status",
  score: "score",
  domain: "domain",
  checked: "last_checked_at",
  sent: "last_sent_at",
};

function mapSettings(row: Record<string, unknown>): BacklinkSettings {
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

function mapProspect(row: Record<string, unknown>): BacklinkProspect {
  const prospect = {
    id: String(row.id), campaignId: String(row.campaign_id), pageUrl: String(row.page_url),
    domain: String(row.domain), pageTitle: String(row.page_title), organization: String(row.organization),
    contactEmail: typeof row.contact_email === "string" ? row.contact_email : null,
    targetUrl: String(row.target_url), targetTitle: String(row.target_title), score: Number(row.score),
    status: row.status as BacklinkProspect["status"],
    statusReason: typeof row.status_reason === "string" ? row.status_reason : null,
    manualDecision: typeof row.manual_decision === "string"
      ? row.manual_decision as BacklinkProspect["manualDecision"]
      : null,
    manualNote: typeof row.manual_note === "string" ? row.manual_note : null,
    manualDecidedAt: typeof row.manual_decided_at === "string" ? row.manual_decided_at : null,
    sendCount: Number(row.send_count), lastSentAt: typeof row.last_sent_at === "string" ? row.last_sent_at : null,
    linkedAt: typeof row.linked_at === "string" ? row.linked_at : null,
    lastCheckedAt: typeof row.last_checked_at === "string" ? row.last_checked_at : null,
    updatedAt: String(row.updated_at),
  };
  const campaign = BACKLINK_CAMPAIGNS.find((item) => item.id === prospect.campaignId);
  const emailPreview = prospect.status === "ready" && prospect.contactEmail && campaign
    ? buildOutreachMessage({
      campaign,
      organization: prospect.organization,
      pageTitle: prospect.pageTitle,
      pageUrl: prospect.pageUrl,
      unsubscribeUrl: new URL("/baixa-comunicacions?token=[enllaç-segur-únic]", SITE_URL).toString(),
    })
    : null;
  return {
    ...prospect,
    emailPreview: emailPreview ? {
      recipient: prospect.contactEmail!,
      subject: emailPreview.subject,
      body: emailPreview.text,
      html: emailPreview.html,
    } : null,
  };
}

export function backlinkConfiguration() {
  return {
    search: Boolean(process.env.BRAVE_SEARCH_API_KEY),
    delivery: Boolean(process.env.RESEND_API_KEY && process.env.BACKLINK_EMAIL_FROM),
    unsubscribe: Boolean(process.env.BACKLINK_UNSUBSCRIBE_SECRET),
  };
}

function searchableTerm(value: string) {
  return value.replace(/[^\p{L}\p{N}\s.@:+\/-]/gu, " ").replace(/\s+/g, " ").trim();
}

export async function readBacklinkDashboard(table: BacklinkTableQuery): Promise<BacklinkDashboard> {
  const admin = createSupabaseAdminClient();
  const requestedPage = Math.max(1, Math.floor(table.page));
  const search = searchableTerm(table.search);
  const readProspects = async (page: number) => {
    const offset = (page - 1) * BACKLINK_PAGE_SIZE;
    let query = admin.from("backlink_prospects").select("*", { count: "exact" });
    if (table.status) query = query.eq("status", table.status);
    else query = query.neq("status", "suppressed");
    if (search) {
      const pattern = `%${search}%`;
      query = query.or([
        `page_title.ilike.${pattern}`,
        `domain.ilike.${pattern}`,
        `organization.ilike.${pattern}`,
        `contact_email.ilike.${pattern}`,
      ].join(","));
    }
    return query
      .order(SORT_COLUMNS[table.sort], { ascending: table.direction === "asc", nullsFirst: false })
      .order("id", { ascending: false })
      .range(offset, offset + BACKLINK_PAGE_SIZE - 1);
  };
  const [settingsResult, initialProspectsResult, statusCountResults, runResult] = await Promise.all([
    admin.from("backlink_automation_settings").select("*").eq("singleton", true).single(),
    readProspects(requestedPage),
    Promise.all(BACKLINK_STATUSES.map(async (status) => ({
      status,
      result: await admin.from("backlink_prospects").select("id", { count: "exact", head: true }).eq("status", status),
    }))),
    admin.from("backlink_automation_runs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (settingsResult.error) throw settingsResult.error;
  if (initialProspectsResult.error) throw initialProspectsResult.error;
  const statusCountError = statusCountResults.find(({ result }) => result.error)?.result.error;
  if (statusCountError) throw statusCountError;
  if (runResult.error) throw runResult.error;
  const total = initialProspectsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / BACKLINK_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const prospectsResult = page === requestedPage ? initialProspectsResult : await readProspects(page);
  if (prospectsResult.error) throw prospectsResult.error;
  const counts = Object.fromEntries(statusCountResults.map(({ status, result }) => [status, result.count ?? 0]));
  const run = runResult.data;
  const additionsResult = run?.started_at
    ? await admin.from("backlink_prospects").select("id", { count: "exact", head: true })
      .gte("discovered_at", run.started_at)
      .lte("discovered_at", run.completed_at ?? new Date().toISOString())
    : null;
  if (additionsResult?.error) throw additionsResult.error;
  const settings = mapSettings(settingsResult.data as Record<string, unknown>);
  const previousCursor = Math.max(0, settings.campaignCursor - BACKLINK_SEARCHES_PER_RUN);
  const previousPlan = planBacklinkSearches(BACKLINK_CAMPAIGNS, previousCursor, settings.searchOffsets)[0]!;
  const exactSearches = recordedSearches(run?.searches);
  const legacySearch = run && typeof run.campaign_id === "string" && typeof run.search_query === "string" && typeof run.search_offset === "number"
    ? [searchContext(run.campaign_id, run.search_query, run.search_offset, Number(run.search_page_count ?? 1))]
    : [];
  const inferredSearches = run && run.status !== "disabled" ? [searchContext(
    previousPlan.campaign.id,
    previousPlan.search.query,
    Math.max(0, previousPlan.search.offset - 1),
    1,
  )] : [];
  const searches = exactSearches.length ? exactSearches : legacySearch.length ? legacySearch : inferredSearches;
  return {
    settings,
    prospectPage: {
      items: (prospectsResult.data ?? []).map((row) => mapProspect(row as Record<string, unknown>)),
      page,
      pageSize: BACKLINK_PAGE_SIZE,
      total,
    },
    counts,
    recentRun: run ? {
      status: run.status, discoveredCount: run.discovered_count, inspectedCount: run.inspected_count,
      addedCount: additionsResult?.count ?? 0,
      sentCount: run.sent_count, linkedCount: run.linked_count, failedCount: run.failed_count,
      detail: run.detail, startedAt: run.started_at, completedAt: run.completed_at,
      searches,
      searchInferred: !exactSearches.length && !legacySearch.length && Boolean(inferredSearches.length),
    } : null,
    nextSearches: planBacklinkSearches(
      BACKLINK_CAMPAIGNS,
      settings.campaignCursor,
      settings.searchOffsets,
      1,
    ).map(({ campaign, search }) => searchContext(
      campaign.id,
      search.query,
      search.offset,
      search.pageCount,
    )),
    configured: backlinkConfiguration(),
  };
}

function mapDelivery(row: Record<string, unknown>): BacklinkDelivery {
  return {
    id: String(row.id),
    kind: row.message_kind as BacklinkDelivery["kind"],
    recipient: String(row.recipient),
    subject: String(row.subject),
    body: String(row.body_text),
    status: row.status as BacklinkDelivery["status"],
    attemptCount: Number(row.attempt_count),
    lastError: typeof row.last_error === "string" ? row.last_error : null,
    sentAt: typeof row.sent_at === "string" ? row.sent_at : null,
    createdAt: String(row.created_at),
  };
}

function mapProspectAction(row: Record<string, unknown>): BacklinkProspectAction {
  return {
    id: String(row.id),
    action: row.action as BacklinkProspectAction["action"],
    note: String(row.note),
    previousStatus: row.previous_status as BacklinkProspectAction["previousStatus"],
    nextStatus: row.next_status as BacklinkProspectAction["nextStatus"],
    previousContactEmail: typeof row.previous_contact_email === "string" ? row.previous_contact_email : null,
    nextContactEmail: typeof row.next_contact_email === "string" ? row.next_contact_email : null,
    previousScore: typeof row.previous_score === "number" ? row.previous_score : null,
    nextScore: typeof row.next_score === "number" ? row.next_score : null,
    createdAt: String(row.created_at),
  };
}

const SCORE_FACTOR_IDS = new Set([
  "base", "topic-relevance", "institutional-domain", "role-mailbox",
  "external-link-propensity", "content-freshness", "existing-link", "low-quality-signal",
]);

function mapScoreExplanation(value: unknown): BacklinkScoreExplanation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const explanation = value as Record<string, unknown>;
  if (!["backlink-score-v1", "backlink-score-v2", "backlink-score-v3"].includes(String(explanation.version))
    || typeof explanation.rawScore !== "number"
    || typeof explanation.finalScore !== "number"
    || !Array.isArray(explanation.factors)) return null;
  const factors = explanation.factors.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const factor = value as Record<string, unknown>;
    if (typeof factor.id !== "string" || !SCORE_FACTOR_IDS.has(factor.id)
      || typeof factor.points !== "number" || !Array.isArray(factor.evidence)
      || !factor.evidence.every((item) => typeof item === "string")) return [];
    return [{
      id: factor.id as BacklinkScoreExplanation["factors"][number]["id"],
      points: factor.points,
      evidence: factor.evidence as string[],
    }];
  });
  if (factors.length !== explanation.factors.length) return null;
  return {
    version: explanation.version as BacklinkScoreExplanation["version"],
    rawScore: explanation.rawScore,
    finalScore: explanation.finalScore,
    factors,
  };
}

export async function readBacklinkProspectDetail(id: string): Promise<BacklinkProspectDetail | null> {
  const admin = createSupabaseAdminClient();
  const [prospectResult, deliveriesResult, actionsResult] = await Promise.all([
    admin.from("backlink_prospects").select("*").eq("id", id).maybeSingle(),
    admin.from("backlink_outbox").select("*").eq("prospect_id", id).order("created_at", { ascending: false }),
    admin.from("backlink_prospect_actions").select("*").eq("prospect_id", id).order("created_at", { ascending: false }),
  ]);
  if (prospectResult.error) throw prospectResult.error;
  if (deliveriesResult.error) throw deliveriesResult.error;
  if (actionsResult.error) throw actionsResult.error;
  if (!prospectResult.data) return null;
  const row = prospectResult.data as Record<string, unknown>;
  const { data: domainSuppression, error: suppressionError } = await admin.from("backlink_suppressions")
    .select("id")
    .eq("kind", "domain")
    .in("value", backlinkSuppressionDomainValues(String(row.domain)))
    .limit(1)
    .maybeSingle();
  if (suppressionError) throw suppressionError;
  return {
    ...mapProspect(row),
    searchQuery: String(row.search_query),
    contactSourceUrl: typeof row.contact_source_url === "string" ? row.contact_source_url : null,
    outboundLinkCount: typeof row.outbound_link_count === "number" ? row.outbound_link_count : null,
    contentPublishedAt: typeof row.content_published_at === "string" ? row.content_published_at : null,
    contentModifiedAt: typeof row.content_modified_at === "string" ? row.content_modified_at : null,
    scoreExplanation: mapScoreExplanation(row.score_explanation),
    existingLink: row.existing_link === true,
    linkRel: typeof row.link_rel === "string" ? row.link_rel : null,
    linkAnchor: typeof row.link_anchor === "string" ? row.link_anchor : null,
    nextActionAt: typeof row.next_action_at === "string" ? row.next_action_at : null,
    firstSentAt: typeof row.first_sent_at === "string" ? row.first_sent_at : null,
    lostAt: typeof row.lost_at === "string" ? row.lost_at : null,
    discoveredAt: String(row.discovered_at),
    domainSuppressed: Boolean(domainSuppression),
    updatedAt: String(row.updated_at),
    deliveries: (deliveriesResult.data ?? []).map((delivery) => mapDelivery(delivery as Record<string, unknown>)),
    actions: (actionsResult.data ?? []).map((action) => mapProspectAction(action as Record<string, unknown>)),
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
