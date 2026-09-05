export const BACKLINK_DISCOVERY_BUDGET_MS = 12 * 60_000;
export const BACKLINK_RUN_STALE_AFTER_MS = 30 * 60_000;

type BacklinkRunRecord = Record<string, unknown> & {
  completed_at?: unknown;
  detail?: unknown;
  started_at?: unknown;
  status?: unknown;
};

export function isBacklinkRunStale(run: BacklinkRunRecord, now = new Date()) {
  if (run.status !== "running" || typeof run.started_at !== "string") return false;
  const startedAt = Date.parse(run.started_at);
  return Number.isFinite(startedAt) && now.getTime() - startedAt >= BACKLINK_RUN_STALE_AFTER_MS;
}

export function displayBacklinkRun<T extends BacklinkRunRecord>(run: T | null, now = new Date()): T | null {
  if (!run || !isBacklinkRunStale(run, now)) return run;
  const startedAt = Date.parse(String(run.started_at));
  return {
    ...run,
    status: "failed",
    detail: "El procés es va interrompre abans de completar el cicle; les dades desades continuen sent segures.",
    completed_at: new Date(startedAt + BACKLINK_RUN_STALE_AFTER_MS).toISOString(),
  } as T;
}
