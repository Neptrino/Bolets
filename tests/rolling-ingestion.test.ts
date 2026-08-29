import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260824061712_add_open_meteo_rolling_history.sql",
  ),
  "utf8",
);
const parallelMigration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260824074556_parallel_spatial_ingestion.sql",
  ),
  "utf8",
);
const awsLaneMigration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260824113000_add_aws_ingestion_lane.sql",
  ),
  "utf8",
);
const egressCircuitMigration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260824114320_add_open_meteo_egress_circuit_breaker.sql",
  ),
  "utf8",
);
const unlimitedUsageMigration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260824125832_disable_local_open_meteo_limits.sql",
  ),
  "utf8",
);
const auditReconciliationMigration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260824135419_reconcile_spatial_job_audits.sql",
  ),
  "utf8",
);
const conditionCacheCronMigration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260824141111_schedule_condition_cache_publication.sql",
  ),
  "utf8",
);
const refresh = readFileSync(
  join(process.cwd(), "supabase", "functions", "refresh-spatial-environment", "index.ts"),
  "utf8",
);
const soilRefresh = readFileSync(
  join(process.cwd(), "supabase", "functions", "refresh-spatial-soil", "index.ts"),
  "utf8",
);
const regionalRefresh = readFileSync(
  join(process.cwd(), "supabase", "functions", "refresh-environment", "index.ts"),
  "utf8",
);
const cron = readFileSync(join(process.cwd(), "deploy", "vps", "configure-cron.sql"), "utf8");
const rollout = readFileSync(join(process.cwd(), "deploy", "vps", "rollout.sh"), "utf8");
const migrationInstaller = readFileSync(
  join(process.cwd(), "deploy", "vps", "apply-database-migrations.sh"),
  "utf8",
);

describe("rolling observed-weather ingestion", () => {
  it("stores one private bounded 720-hour state per provider point", () => {
    expect(migration).toContain("create table public.open_meteo_hourly_states");
    expect(migration).toContain("hour_count smallint not null check (hour_count = 720)");
    expect(migration).toContain("check (last_hour = first_hour + interval '719 hours')");
    expect(migration).toContain("alter table public.open_meteo_hourly_states enable row level security");
    expect(migration).toContain(
      "revoke all on table public.open_meteo_hourly_states from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant select, insert, update, delete on table public.open_meteo_hourly_states to service_role",
    );
  });

  it("moves seamless rain to the existing coarse lattice without replacing XEMA", () => {
    expect(refresh).toContain('.eq("model", "best_match")');
    expect(refresh).toContain("soil_point_id");
    expect(refresh).toContain("precipitationFallbackResolutionM: 9000");
    expect(refresh).toContain("buildStationCorrectedPrecipitation");
    expect(refresh).toContain('precipitationFallbackModel: "meteofrance_seamless"');
    expect(refresh).not.toContain("keeping AROME rain");
  });

  it("records the coarse fallback source and resets only its own cursor", () => {
    expect(migration).toContain("'meteofrance-seamless-precipitation'");
    expect(migration).toContain("'daily rolling overlap'");
    expect(migration).toContain("'spatial-precipitation-fallback'");
    expect(migration).not.toMatch(/where pipeline in \([^)]*'spatial-atmosphere'/);
  });

  it("publishes condition caches outside the bounded Edge request", () => {
    expect(conditionCacheCronMigration).toContain("refresh-spatial-condition-caches");
    expect(conditionCacheCronMigration).toContain(
      "refresh_spatial_level_conditions_after_ingestion(current_date)",
    );
    expect(conditionCacheCronMigration).toContain(
      "refresh_territorial_level_conditions_after_ingestion(current_date)",
    );
    expect(cron).toContain("cleanup-finding-photo-staging");
    expect(cron).toContain("Expected twelve Bolets cron jobs");
  });

  it("atomically records provider usage without applying local limits", () => {
    expect(parallelMigration).toContain("create table public.provider_budget_windows");
    expect(unlimitedUsageMigration).toContain("create or replace function public.record_provider_usage");
    expect(unlimitedUsageMigration).toContain("pg_advisory_xact_lock");
    expect(unlimitedUsageMigration).toContain("Limit arguments are ignored");
    expect(unlimitedUsageMigration).not.toContain("return 'minute'");
    expect(unlimitedUsageMigration).not.toContain("return 'hour'");
    expect(unlimitedUsageMigration).not.toContain("return 'day'");
    expect(unlimitedUsageMigration).toContain("security definer");
    expect(parallelMigration).toContain(
      "revoke all on table public.provider_budget_windows from public, anon, authenticated",
    );
    expect(refresh).toContain("recordOpenMeteoUsage");
    expect(refresh).toContain("attempts: 1");
    expect(soilRefresh).toContain("recordOpenMeteoUsage");
    expect(regionalRefresh).toContain("recordOpenMeteoUsage");
    expect(regionalRefresh).toContain('const REGIONAL_EGRESS_LANES = ["cloudflare", "aws"]');
    expect(regionalRefresh).toContain("defer_open_meteo_egress_lane");
    expect(regionalRefresh).toContain("record_open_meteo_egress_success");
    expect(regionalRefresh).toContain("attempts: 1");
    expect(regionalRefresh).not.toContain('egressLane: "direct"');
    expect(refresh).not.toContain("ProviderBudgetDeferredError");
  });

  it("leases stable shards to direct, Cloudflare, and AWS lanes without duplicates", () => {
    expect(parallelMigration).toContain("create table public.spatial_atmosphere_jobs");
    expect(parallelMigration).toContain("spatial_atmosphere_jobs_running_lane_idx");
    expect(parallelMigration).toContain("for update skip locked");
    expect(parallelMigration).toContain("dependency.status <> 'succeeded'");
    expect(parallelMigration).toContain("create or replace function public.complete_spatial_atmosphere_job");
    expect(parallelMigration).toContain("last_cell_id = excluded.last_cell_id");
    expect(awsLaneMigration).toContain("egress_lane in ('direct', 'cloudflare', 'aws')");
    expect(awsLaneMigration).toContain("p_egress_lane not in ('direct', 'cloudflare', 'aws')");
    expect(cron).toContain("from (values ('direct'), ('cloudflare'), ('aws')) as lanes(lane)");
    expect(cron).toContain("jsonb_build_object('trigger', 'cron', 'lane', lane)");
    expect(refresh).toContain('egressLane = body.lane ?? "direct"');
    expect(refresh).toContain('egressLane !== "aws"');
    expect(refresh).toContain("const JOB_SHARD_SIZE = 100");
    expect(refresh).toContain("const PROVIDER_BATCH_SIZE = 50");
    expect(refresh).toContain("alignFallbacksForAtmosphere");
  });

  it("closes abandoned audit attempts when a shard retry succeeds", () => {
    expect(auditReconciliationMigration).toContain(
      "create or replace function public.complete_spatial_atmosphere_job",
    );
    expect(auditReconciliationMigration).toContain("superseded-retry");
    expect(auditReconciliationMigration).toContain("run.status = 'running'");
    expect(auditReconciliationMigration).toContain("job.status = 'succeeded'");
    expect(auditReconciliationMigration).toContain("to service_role");
  });

  it("pauses only the egress lane that Open-Meteo rate-limits", () => {
    expect(egressCircuitMigration).toContain("create table public.open_meteo_egress_lanes");
    expect(egressCircuitMigration).toContain("consecutive_rate_limits");
    expect(egressCircuitMigration).toContain("defer_open_meteo_egress_lane");
    expect(egressCircuitMigration).toContain("record_open_meteo_egress_success");
    expect(egressCircuitMigration).toContain("blocked_until > statement_timestamp()");
    expect(egressCircuitMigration).toContain("claim_spatial_atmosphere_job_without_egress_guard");
    expect(egressCircuitMigration).toContain("enable row level security");
    expect(refresh).toContain("error instanceof OpenMeteoRequestError && error.status === 429");
    expect(refresh).toContain('reason: "egress-rate-limit"');
    expect(refresh).toContain("egressLane,");
  });

  it("installs the additive schema before synchronizing the new VPS function", () => {
    expect(migrationInstaller).toContain("--single-transaction");
    expect(migrationInstaller).toContain("to_regclass('public.$marker')");
    expect(migrationInstaller).toContain("open_meteo_hourly_states");
    expect(migrationInstaller).toContain("spatial_atmosphere_jobs");
    expect(migrationInstaller).toContain("20260824113000_add_aws_ingestion_lane.sql");
    expect(migrationInstaller).toContain("20260824114320_add_open_meteo_egress_circuit_breaker.sql");
    expect(migrationInstaller).toContain("apply_if_missing open_meteo_egress_lanes");
    expect(migrationInstaller).toContain("20260824125832_disable_local_open_meteo_limits.sql");
    expect(migrationInstaller).toContain("record_provider_usage(text,text,integer)");
    expect(migrationInstaller).toContain("spatial_atmosphere_jobs_egress_lane_check");
    expect(migrationInstaller).toContain("20260824135419_reconcile_spatial_job_audits.sql");
    expect(migrationInstaller).toContain("Applied spatial audit reconciliation");
    expect(migrationInstaller).toContain("20260824141111_schedule_condition_cache_publication.sql");
    expect(migrationInstaller).toContain("Applied condition-cache publication schedule");
    expect(migrationInstaller).toContain(
      "20260824145507_use_latest_observed_completion_for_forecast_alignment.sql",
    );
    expect(migrationInstaller).toContain("Applied forecast alignment reconciliation");
    expect(migrationInstaller).toContain("20260824151551_add_operational_resync_dispatcher.sql");
    expect(migrationInstaller).toContain("Applied operational resync dispatcher");
    expect(migrationInstaller).toContain("*\"'aws'\"*");
    const migrationPosition = rollout.lastIndexOf("apply-database-migrations.sh");
    const functionPosition = rollout.indexOf("sync-functions.sh");
    expect(migrationPosition).toBeGreaterThan(rollout.indexOf("build app"));
    expect(functionPosition).toBeGreaterThan(migrationPosition);
  });
});
