export type BacklinkSettings = {
  enabled: boolean;
  autoSend: boolean;
  dailySendLimit: number;
  minimumScore: number;
  domainCooldownDays: number;
  followUpDelayDays: number;
  campaignCursor: number;
  lastRunAt: string | null;
};

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
  status: "discovered" | "ready" | "sent" | "linked" | "lost" | "suppressed" | "failed";
  statusReason: string | null;
  sendCount: number;
  lastSentAt: string | null;
  linkedAt: string | null;
  lastCheckedAt: string | null;
};

export type BacklinkDashboard = {
  settings: BacklinkSettings;
  prospects: BacklinkProspect[];
  counts: Record<string, number>;
  recentRun: {
    status: string;
    discoveredCount: number;
    inspectedCount: number;
    sentCount: number;
    linkedCount: number;
    failedCount: number;
    detail: string | null;
    startedAt: string;
    completedAt: string | null;
  } | null;
  configured: {
    search: boolean;
    delivery: boolean;
    unsubscribe: boolean;
  };
};
