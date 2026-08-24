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

  it("atomically caps every egress lane below shared minute, hour, and day quotas", () => {
    expect(parallelMigration).toContain("create table public.provider_budget_windows");
    expect(parallelMigration).toContain("create or replace function public.reserve_provider_budget");
    expect(parallelMigration).toContain("pg_advisory_xact_lock");
    expect(parallelMigration).toContain("return 'minute'");
    expect(parallelMigration).toContain("return 'hour'");
    expect(parallelMigration).toContain("return 'day'");
    expect(parallelMigration).toContain("security definer");
    expect(parallelMigration).toContain(
      "revoke all on table public.provider_budget_windows from public, anon, authenticated",
    );
    expect(refresh).toContain("OPEN_METEO_SPATIAL_DAILY_BUDGET_UNITS = 6_500");
    expect(soilRefresh).toContain("OPEN_METEO_SOIL_FORECAST_DAILY_BUDGET_UNITS = 3_600");
    expect(refresh).toContain("reserveOpenMeteoBudget");
    expect(refresh).toContain("attempts: 1");
    expect(soilRefresh).toContain("reserveOpenMeteoBudget");
    expect(regionalRefresh).toContain("reserveOpenMeteoBudget");
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
    expect(refresh).toContain("const JOB_SHARD_SIZE = 50");
    expect(refresh).toContain("alignFallbacksForAtmosphere");
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
    expect(migrationInstaller).toContain("spatial_atmosphere_jobs_egress_lane_check");
    expect(migrationInstaller).toContain("*\"'aws'\"*");
    const migrationPosition = rollout.lastIndexOf("apply-database-migrations.sh");
    const functionPosition = rollout.indexOf("sync-functions.sh");
    expect(migrationPosition).toBeGreaterThan(rollout.indexOf("build app"));
    expect(functionPosition).toBeGreaterThan(migrationPosition);
  });
});
