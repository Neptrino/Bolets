export type BacklinkSettings = {
  enabled: boolean;
  autoSend: boolean;
  dailySendLimit: number;
  minimumScore: number;
  domainCooldownDays: number;
  campaignCursor: number;
  searchOffsets: Record<string, number>;
  lastRunAt: string | null;
};

export type BacklinkStatus = "discovered" | "ready" | "sent" | "linked" | "lost" | "suppressed" | "failed";

export type BacklinkManualDecision = "approved" | "excluded";

export type BacklinkScoreFactorId =
  | "base"
  | "topic-relevance"
  | "institutional-domain"
  | "role-mailbox"
  | "external-link-propensity"
  | "content-freshness"
  | "existing-link"
  | "low-quality-signal";

export type BacklinkScoreExplanation = {
  version: "backlink-score-v1" | "backlink-score-v2" | "backlink-score-v3";
  rawScore: number;
  finalScore: number;
  factors: Array<{
    id: BacklinkScoreFactorId;
    points: number;
    evidence: string[];
  }>;
};

export type BacklinkProspectSort = "updated" | "title" | "status" | "score" | "domain" | "checked" | "sent";

export type BacklinkSortDirection = "asc" | "desc";

export type BacklinkProspect = {
  id: string;
  campaignId: string;
  pageUrl: string;
  domain: string;
  pageTitle: string;
  organization: string;
  contactEmail: string | null;
  targetUrl: string;
  targetTitle: string;
  score: number;
  status: BacklinkStatus;
  statusReason: string | null;
  manualDecision: BacklinkManualDecision | null;
  manualNote: string | null;
  manualDecidedAt: string | null;
  sendCount: number;
  lastSentAt: string | null;
  linkedAt: string | null;
  lastCheckedAt: string | null;
  updatedAt: string;
  emailPreview: {
    recipient: string;
    subject: string;
    body: string;
  } | null;
};

export type BacklinkProspectPage = {
  items: BacklinkProspect[];
  page: number;
  pageSize: number;
  total: number;
};

export type BacklinkDelivery = {
  id: string;
  kind: "initial" | "follow_up";
  recipient: string;
  subject: string;
  body: string;
  status: "pending" | "sending" | "sent" | "failed" | "cancelled";
  attemptCount: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type BacklinkProspectAction = {
  id: string;
  action: "manual_approve" | "manual_exclude" | "restore_automatic" | "contact_update" | "rescan";
  note: string;
  previousStatus: BacklinkStatus;
  nextStatus: BacklinkStatus;
  previousContactEmail: string | null;
  nextContactEmail: string | null;
  previousScore: number | null;
  nextScore: number | null;
  createdAt: string;
};

export type BacklinkProspectDetail = BacklinkProspect & {
  searchQuery: string;
  contactSourceUrl: string | null;
  outboundLinkCount: number | null;
  contentPublishedAt: string | null;
  contentModifiedAt: string | null;
  scoreExplanation: BacklinkScoreExplanation | null;
  existingLink: boolean;
  linkRel: string | null;
  linkAnchor: string | null;
  nextActionAt: string | null;
  firstSentAt: string | null;
  lostAt: string | null;
  discoveredAt: string;
  domainSuppressed: boolean;
  deliveries: BacklinkDelivery[];
  actions: BacklinkProspectAction[];
};

export type BacklinkSearchContext = {
  campaignId: string;
  label: string;
  query: string;
  offset: number;
  pageCount: number;
};

export type BacklinkDashboard = {
  settings: BacklinkSettings;
  prospectPage: BacklinkProspectPage;
  counts: Record<string, number>;
  recentRun: {
    status: string;
    discoveredCount: number;
    inspectedCount: number;
    addedCount: number;
    sentCount: number;
    linkedCount: number;
    failedCount: number;
    detail: string | null;
    startedAt: string;
    completedAt: string | null;
    searches: BacklinkSearchContext[];
    searchInferred: boolean;
  } | null;
  nextSearches: BacklinkSearchContext[];
  configured: {
    search: boolean;
    delivery: boolean;
    unsubscribe: boolean;
  };
};
