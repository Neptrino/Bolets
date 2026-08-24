import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260813160000_refresh_conditions_after_spatial_ingestion.sql",
  ),
  "utf8",
);
const replayRefreshMigration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260823180823_refresh_condition_caches_after_same_day_reingestion.sql",
  ),
  "utf8",
);
const atmospherePipeline = readFileSync(
  join(process.cwd(), "supabase", "functions", "refresh-spatial-environment", "index.ts"),
  "utf8",
);
const soilPipeline = readFileSync(
  join(process.cwd(), "supabase", "functions", "refresh-spatial-soil", "index.ts"),
  "utf8",
);

describe("spatial condition refresh after ingestion", () => {
  it("replaces the fixed-time job with an idempotent completion gate", () => {
    expect(migration).toContain("where jobname = 'refresh-spatial-level-conditions'");
    expect(migration).toContain("pg_try_advisory_xact_lock");
    expect(migration).toContain("pipeline in ('spatial-atmosphere', 'spatial-soil')");
    expect(migration).toContain("completed_streams <> 2");
    expect(migration).toContain("last_cell_id = '__complete__'");
    expect(migration).toContain("perform public.refresh_spatial_level_conditions(10000, p_snapshot_date)");
  });

  it("retries the idempotent refresh after ingestion cursors are already complete", () => {
    expect(atmospherePipeline).toMatch(
      /cursor\.last_cell_id === COMPLETE_CURSOR[\s\S]*refreshSpatialLevelConditionsAfterIngestion\(supabase, today\)/,
    );
    expect(soilPipeline).toMatch(
      /soilAlreadyComplete && forecastAlreadyComplete[\s\S]*refreshSpatialLevelConditionsAfterIngestion\(supabase, today\)/,
    );
  });

  it("tracks the observed generation instead of skipping a same-day replay", () => {
    expect(replayRefreshMigration).toContain("max(updated_at)");
    expect(replayRefreshMigration).toContain("cache_generation_at >= observed_generation_at");
    expect(replayRefreshMigration).toContain("'spatial-condition-coarse'");
    expect(replayRefreshMigration).toContain(
      "perform public.refresh_spatial_level_conditions(10000, p_snapshot_date)",
    );
  });

  it("keeps the refresh RPC service-only", () => {
    expect(migration).toContain("security invoker");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });
});
