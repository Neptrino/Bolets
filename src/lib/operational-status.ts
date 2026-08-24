export type OperationalState = "healthy" | "running" | "attention" | "critical";

export type PipelineSourceStatus = {
  sourceId: string;
  title: string;
  sourceKind: string;
  refreshCadence: string;
  enabled: boolean;
  status: "active" | "degraded" | "blocked" | "disabled";
  statusDetail: string | null;
  checkedAt: string;
};

export type PipelineCursorStatus = {
  pipeline: string;
  snapshotDate: string;
  lastCellId: string | null;
  updatedAt: string;
};

export type AtmosphereJobStatus = {
  snapshotDate: string;
  jobKind: "precipitation-fallback" | "atmosphere";
  status: "pending" | "running" | "succeeded";
  egressLane: "direct" | "cloudflare" | "aws" | null;
  shards: number;
  expectedPoints: number;
  rowsWritten: number;
  maxAttemptCount: number;
  lastError: string | null;
  updatedAt: string;
};

export type ProviderBudgetStatus = {
  provider: string;
  consumer: string;
  windowKind: "minute" | "hour" | "day";
  windowStart: string;
  estimatedUnits: number;
  updatedAt: string;
};

export type RollingStateStatus = {
  stream: string;
  stateCount: number;
  coverageStart: string | null;
  oldestLastHour: string | null;
  newestLastHour: string | null;
  updatedAt: string | null;
};

export type WeatherSnapshotStatus = {
  latestDate: string | null;
  rowCount: number;
  staleCount: number;
  observedAt: string | null;
  createdAt: string | null;
};

export type IngestionRunStatus = {
  id: string;
  pipeline: string;
  triggerType: string;
  status: "running" | "succeeded" | "partial" | "failed" | "skipped";
  snapshotDate: string | null;
  startedAt: string;
  completedAt: string | null;
  rowsRead: number;
  rowsWritten: number;
  errorMessage: string | null;
};

export type OperationalStatus = {
  generatedAt: string;
  currentDate: string;
  sources: PipelineSourceStatus[];
  cursors: PipelineCursorStatus[];
  jobs: AtmosphereJobStatus[];
  budgets: ProviderBudgetStatus[];
  rollingStates: RollingStateStatus[];
  weatherSnapshot: WeatherSnapshotStatus;
  recentRuns: IngestionRunStatus[];
};

export type OperationalSummary = {
  state: OperationalState;
  label: string;
  detail: string;
  unresolvedFailures: IngestionRunStatus[];
  activeJobs: AtmosphereJobStatus[];
};

const STATE_LABELS: Record<OperationalState, string> = {
  healthy: "Operatiu",
  running: "Sincronitzant",
  attention: "Cal revisar",
  critical: "Intervenció necessària",
};

const NON_PUBLISHING_SOURCE_IDS = new Set([
  "copernicus-clms-ssm-1km-v1",
  "copernicus-clms-swi-1km-v2",
]);

export function sourceAffectsPublishedData(source: PipelineSourceStatus) {
  return source.enabled && !NON_PUBLISHING_SOURCE_IDS.has(source.sourceId);
}

function startOfUtcDate(date: string) {
  return Date.parse(`${date}T00:00:00.000Z`);
}

function ageInDays(date: string | null, currentDate: string) {
  if (!date) return Number.POSITIVE_INFINITY;
  return Math.floor((startOfUtcDate(currentDate) - startOfUtcDate(date)) / 86_400_000);
}

export function summarizeOperationalStatus(
  status: OperationalStatus,
  now = new Date(status.generatedAt),
): OperationalSummary {
  const publishingSources = status.sources.filter(sourceAffectsPublishedData);
  const blockedSources = publishingSources.filter((source) => source.status === "blocked");
  const degradedSources = publishingSources.filter((source) => source.status === "degraded");
  const activeJobs = status.jobs.filter(
    (job) => job.snapshotDate === status.currentDate && job.status !== "succeeded",
  );
  const publishedAtmosphere = status.cursors.find(
    (cursor) => cursor.pipeline === "spatial-atmosphere" && cursor.lastCellId === "__complete__",
  );
  const recentWindow = now.getTime() - 24 * 60 * 60 * 1_000;
  const unresolvedFailures = status.recentRuns.filter((run) => {
    if (run.status !== "failed" && run.status !== "partial") {
      return false;
    }
    if (Date.parse(run.startedAt) < recentWindow) return false;
    return !status.recentRuns.some(
      (later) => later.pipeline === run.pipeline
        && later.status === "succeeded"
        && Date.parse(later.startedAt) > Date.parse(run.startedAt),
    );
  });
  const publishedAtmosphereAge = ageInDays(
    publishedAtmosphere?.snapshotDate ?? null,
    status.currentDate,
  );

  if (blockedSources.length > 0 || publishedAtmosphereAge > 1 || status.weatherSnapshot.staleCount > 0) {
    return {
      state: "critical",
      label: STATE_LABELS.critical,
      detail: blockedSources.length > 0
        ? `${blockedSources.length} font${blockedSources.length === 1 ? "" : "s"} habilitada${blockedSources.length === 1 ? "" : "s"} està bloquejada.`
        : publishedAtmosphereAge > 1
          ? "La darrera generació atmosfèrica completada té més d'un dia de retard."
          : `${status.weatherSnapshot.staleCount} punts de l'última atmosfera estan marcats com a obsolets.`,
      unresolvedFailures,
      activeJobs,
    };
  }

  if (unresolvedFailures.length > 0 || degradedSources.length > 0) {
    return {
      state: "attention",
      label: STATE_LABELS.attention,
      detail: unresolvedFailures.length > 0
        ? `${unresolvedFailures.length} execució${unresolvedFailures.length === 1 ? "" : "ns"} recent${unresolvedFailures.length === 1 ? "" : "s"} encara no té una recuperació posterior.`
        : `${degradedSources.length} font${degradedSources.length === 1 ? "" : "s"} habilitada${degradedSources.length === 1 ? "" : "s"} informa d'un estat degradat.`,
      unresolvedFailures,
      activeJobs,
    };
  }

  if (activeJobs.length > 0) {
    return {
      state: "running",
      label: STATE_LABELS.running,
      detail: "La generació d'avui està en curs i encara té fragments pendents.",
      unresolvedFailures,
      activeJobs,
    };
  }

  return {
    state: "healthy",
    label: STATE_LABELS.healthy,
    detail: "Les dades publicades són vigents i no hi ha incidències obertes.",
    unresolvedFailures,
    activeJobs,
  };
}

function escapePrometheusLabel(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll('"', '\\"');
}

function labels(values: Record<string, string | null | undefined>) {
  const pairs = Object.entries(values)
    .filter((entry): entry is [string, string] => entry[1] !== null && entry[1] !== undefined)
    .map(([key, value]) => `${key}="${escapePrometheusLabel(value)}"`);
  return pairs.length > 0 ? `{${pairs.join(",")}}` : "";
}

function timestampSeconds(value: string | null) {
  if (!value) return 0;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1_000) : 0;
}

export function operationalStatusPrometheus(status: OperationalStatus) {
  const summary = summarizeOperationalStatus(status);
  const lines = [
    "# HELP bolets_operational_status Current overall status (exactly one state is 1).",
    "# TYPE bolets_operational_status gauge",
    ...(["healthy", "running", "attention", "critical"] as OperationalState[]).map(
      (state) => `bolets_operational_status${labels({ state })} ${summary.state === state ? 1 : 0}`,
    ),
    "# HELP bolets_pipeline_source_status Current state of each configured data source.",
    "# TYPE bolets_pipeline_source_status gauge",
    ...status.sources.map((source) => `bolets_pipeline_source_status${labels({ source: source.sourceId, status: source.status, enabled: String(source.enabled) })} 1`),
    "# HELP bolets_pipeline_cursor_updated_timestamp_seconds Last cursor update as a Unix timestamp.",
    "# TYPE bolets_pipeline_cursor_updated_timestamp_seconds gauge",
    ...status.cursors.map((cursor) => `bolets_pipeline_cursor_updated_timestamp_seconds${labels({ pipeline: cursor.pipeline, snapshot_date: cursor.snapshotDate, complete: String(cursor.lastCellId === "__complete__") })} ${timestampSeconds(cursor.updatedAt)}`),
    "# HELP bolets_pipeline_generation_age_days Age in UTC days of each completed pipeline generation.",
    "# TYPE bolets_pipeline_generation_age_days gauge",
    ...status.cursors
      .filter((cursor) => cursor.lastCellId === "__complete__")
      .map((cursor) => `bolets_pipeline_generation_age_days${labels({ pipeline: cursor.pipeline })} ${Math.max(0, ageInDays(cursor.snapshotDate, status.currentDate))}`),
    "# HELP bolets_spatial_jobs Number of atmosphere shards by status and egress lane.",
    "# TYPE bolets_spatial_jobs gauge",
    ...status.jobs.map((job) => `bolets_spatial_jobs${labels({ snapshot_date: job.snapshotDate, kind: job.jobKind, status: job.status, lane: job.egressLane ?? "unassigned" })} ${job.shards}`),
    "# HELP bolets_spatial_job_points Expected and written points for atmosphere shards.",
    "# TYPE bolets_spatial_job_points gauge",
    ...status.jobs.flatMap((job) => [
      `bolets_spatial_job_points${labels({ snapshot_date: job.snapshotDate, kind: job.jobKind, status: job.status, lane: job.egressLane ?? "unassigned", measure: "expected" })} ${job.expectedPoints}`,
      `bolets_spatial_job_points${labels({ snapshot_date: job.snapshotDate, kind: job.jobKind, status: job.status, lane: job.egressLane ?? "unassigned", measure: "written" })} ${job.rowsWritten}`,
    ]),
    "# HELP bolets_provider_budget_units Conservatively reserved provider request units.",
    "# TYPE bolets_provider_budget_units gauge",
    ...status.budgets.map((budget) => `bolets_provider_budget_units${labels({ provider: budget.provider, consumer: budget.consumer, window: budget.windowKind })} ${budget.estimatedUnits}`),
    "# HELP bolets_rolling_state_points Number of provider points with a complete rolling state.",
    "# TYPE bolets_rolling_state_points gauge",
    ...status.rollingStates.map((rolling) => `bolets_rolling_state_points${labels({ stream: rolling.stream })} ${rolling.stateCount}`),
    "# HELP bolets_rolling_state_oldest_hour_timestamp_seconds Oldest last-hour cursor across rolling points.",
    "# TYPE bolets_rolling_state_oldest_hour_timestamp_seconds gauge",
    ...status.rollingStates.map((rolling) => `bolets_rolling_state_oldest_hour_timestamp_seconds${labels({ stream: rolling.stream })} ${timestampSeconds(rolling.oldestLastHour)}`),
    "# HELP bolets_weather_snapshot_rows Rows in the latest normalized weather snapshot.",
    "# TYPE bolets_weather_snapshot_rows gauge",
    `bolets_weather_snapshot_rows${labels({ snapshot_date: status.weatherSnapshot.latestDate ?? "missing", state: "total" })} ${status.weatherSnapshot.rowCount}`,
    `bolets_weather_snapshot_rows${labels({ snapshot_date: status.weatherSnapshot.latestDate ?? "missing", state: "stale" })} ${status.weatherSnapshot.staleCount}`,
    "# HELP bolets_ingestion_last_run_timestamp_seconds Most recent audited run by pipeline and status.",
    "# TYPE bolets_ingestion_last_run_timestamp_seconds gauge",
    ...Array.from(new Map(status.recentRuns.map((run) => [run.pipeline, run])).values())
      .map((run) => `bolets_ingestion_last_run_timestamp_seconds${labels({ pipeline: run.pipeline, status: run.status })} ${timestampSeconds(run.startedAt)}`),
    "# HELP bolets_operational_status_collection_timestamp_seconds Time the database generated this status snapshot.",
    "# TYPE bolets_operational_status_collection_timestamp_seconds gauge",
    `bolets_operational_status_collection_timestamp_seconds ${timestampSeconds(status.generatedAt)}`,
    "",
  ];

  return lines.join("\n");
}
