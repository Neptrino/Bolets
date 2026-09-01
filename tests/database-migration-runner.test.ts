import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const runner = readFileSync("deploy/vps/apply-database-migrations.sh", "utf8");
const baselineVerifier = readFileSync(
  "deploy/vps/verify-restored-migration-baseline.sql",
  "utf8",
);
const reconciliation = readFileSync(
  "supabase/migrations/20260901160459_reconcile_scoped_habitat_cache_reset.sql",
  "utf8",
);

describe("production database migration runner", () => {
  it("discovers the complete migration directory instead of maintaining an allowlist", () => {
    const migrations = readdirSync("supabase/migrations")
      .filter((file) => file.endsWith(".sql"))
      .sort();

    expect(
      migrations.filter((file) => file.slice(0, 14) <= "20260901151545"),
    ).toHaveLength(121);
    expect(migrations.length).toBeGreaterThan(121);
    expect(runner).toContain(
      "find \"$migration_dir\" -maxdepth 1 -type f -name '*.sql' -print | LC_ALL=C sort",
    );
    expect(runner).not.toMatch(/20\d{12}_[a-z0-9_]+\.sql/);
    expect(runner).toContain("Database migration versions must be unique and increasing");
  });

  it("uses the Supabase ledger and fails closed on every history mismatch", () => {
    expect(runner).toContain("supabase_migrations.schema_migrations");
    expect(runner).toContain("The Supabase migration ledger has an unexpected shape");
    expect(runner).toContain("Production records migration $applied_version");
    expect(runner).toContain("The Supabase migration ledger is non-contiguous");
    expect(runner).toContain("The production migration ledger does not match");
    expect(runner).toContain("pg_advisory_xact_lock");
    expect(runner).toContain("insert into supabase_migrations.schema_migrations");
  });

  it("bootstraps only the fixed, verified physical-restore baseline", () => {
    expect(runner).toContain("restored_baseline_version=20260901151545");
    expect(runner).toContain("restored_baseline_count=121");
    expect(runner).toContain('psql_input < "$baseline_verifier"');
    expect(runner).toContain("refusing to guess its migration history");
    expect(baselineVerifier).toContain("open_meteo_hourly_states");
    expect(baselineVerifier).toContain("user_findings");
    expect(baselineVerifier).toContain("user_forest_preferences");
    expect(baselineVerifier).toContain("raw_app_meta_data ->> 'app_role' = 'admin'");
  });

  it("reconciles the one migration omitted by the former allowlist", () => {
    expect(reconciliation).toContain("scoped_cells_delete");
    expect(reconciliation).toContain("scoped_profiles_delete");
    expect(reconciliation).toContain("return;");
    expect(reconciliation).toContain("execute scoped_definition");
  });
});
