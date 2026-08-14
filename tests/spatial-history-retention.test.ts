import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260814134500_bound_spatial_history_retention.sql",
  ),
  "utf8",
);

describe("capacity-safe observed history retention", () => {
  it("retains four complete grid dates and one complete forecast issue", () => {
    expect(migration).toMatch(
      /delete from public\.weather_grid_snapshots where snapshot_date < current_date - 3/,
    );
    expect(migration).toContain("public.prune_weather_forecast_issues(1)");
    expect(migration).toContain("end_time < now() - interval '24 hours'");
  });

  it("prunes and vacuums before either observed pipeline starts", () => {
    expect(migration).toContain("'bolets-pipeline-retention',\n  '0 0 * * *'");
    expect(migration).toContain("'vacuum-weather-grid-snapshots',\n  '2 0 * * *'");
    expect(migration).toContain("'vacuum-cron-job-run-details',\n  '3 0 * * *'");
    expect(migration).toContain("'refresh-spatial-environment',\n  '5-59/2 * * * *'");
    expect(migration).toContain("'refresh-spatial-soil',\n  '6-59/5 * * * *'");
  });

  it("keeps the retention function service-role only", () => {
    expect(migration).toMatch(/security definer[\s\S]*set search_path = ''/);
    expect(migration).toMatch(
      /revoke all on function public\.run_environment_retention\(\)[\s\S]*from public, anon, authenticated/,
    );
    expect(migration).toMatch(
      /grant execute on function public\.run_environment_retention\(\)[\s\S]*to service_role/,
    );
  });
});
