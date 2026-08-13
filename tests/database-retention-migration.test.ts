import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260813090000_retain_spatial_score_history.sql",
  ),
  "utf8",
);
const initialMigration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260812135508_bound_database_growth.sql",
  ),
  "utf8",
);

describe("bounded database retention", () => {
  it("retains prediction fallback weather while bounding append-only history", () => {
    expect(migration).toContain("snapshot_date < current_date - 7");
    expect(migration).toContain("end_time < now() - interval '48 hours'");
    expect(migration).toContain("'weatherGridDeleted', weather_grid_deleted");
    expect(migration).toContain("'cronRunsDeleted', cron_runs_deleted");
  });

  it("keeps retention private, audited, and scheduled through one short call", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(initialMigration).toContain("'select public.run_environment_retention();'");
    expect(`${initialMigration}\n${migration}`).not.toContain("vacuum full");
  });
});
