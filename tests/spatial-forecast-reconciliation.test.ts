import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260814130000_realign_spatial_forecasts.sql",
  ),
  "utf8",
);
const preservationMigration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260814131500_preserve_completed_forecast_during_observation_refresh.sql",
  ),
  "utf8",
);
const refreshPipeline = readFileSync(
  join(process.cwd(), "supabase", "functions", "refresh-spatial-soil", "index.ts"),
  "utf8",
);
const predictionHistory = readFileSync(
  join(process.cwd(), "src", "lib", "predictions.ts"),
  "utf8",
);

function functionDefinition(name: string, source = migration) {
  const start = source.indexOf(`create or replace function public.${name}`);
  const revoke = source.indexOf(`revoke all on function public.${name}`, start);
  if (start < 0 || revoke < 0) return "";
  return source.slice(start, revoke);
}

const reconciliationFunction = functionDefinition(
  "reconcile_weather_forecast_issue",
  preservationMigration,
);
const completionFunction = functionDefinition("complete_weather_forecast_issue");
const pruningFunction = functionDefinition("prune_weather_forecast_issues");

describe("same-day spatial forecast reconciliation", () => {
  it("keeps the eight-hour calibration seam while rebuilding a misaligned daily issue", () => {
    expect(predictionHistory).toContain(
      "const MAX_FORECAST_ANCHOR_GAP_MS = 8 * 60 * 60 * 1000",
    );
    expect(migration).toContain(
      "create or replace function public.reconcile_weather_forecast_issue",
    );
    expect(reconciliationFunction).toContain("pg_try_advisory_xact_lock");
    expect(reconciliationFunction).toContain("'spatial-atmosphere'");
    expect(reconciliationFunction).toContain("'spatial-soil'");
    expect(reconciliationFunction).toContain("select generated_at, completed_at");
    expect(reconciliationFunction).toContain("issue_completed_at is null");
    expect(reconciliationFunction).toMatch(/last_cell_id\s*=\s*'__complete__'/);
    expect(reconciliationFunction).toMatch(/8\s*(?:hours?|\*\s*interval\s*'1 hour')/i);
    expect(reconciliationFunction).toMatch(
      /observed_streams <> 2[\s\S]*'issueComplete', issue_completed_at is not null/,
    );
  });

  it("invalidates only the replaceable forecast issue and cursor", () => {
    const forecastDelete = reconciliationFunction.match(
      /delete from public\.weather_grid_forecasts[\s\S]*?;/,
    )?.[0];
    const issueDelete = reconciliationFunction.match(
      /delete from public\.weather_forecast_issues[\s\S]*?;/,
    )?.[0];
    const cursorDelete = reconciliationFunction.match(
      /delete from public\.pipeline_cursors[\s\S]*?;/,
    )?.[0];

    expect(forecastDelete).toMatch(/snapshot_date\s*=\s*p_snapshot_date/);
    expect(issueDelete).toMatch(/snapshot_date\s*=\s*p_snapshot_date/);
    expect(cursorDelete).toContain("'spatial-forecast-v2'");
    expect(cursorDelete).toMatch(/snapshot_date\s*=\s*p_snapshot_date/);
    expect(reconciliationFunction).not.toContain("delete from public.weather_grid_snapshots");
    expect(reconciliationFunction).not.toContain("delete from public.spatial_cell_levels");
    expect(reconciliationFunction).not.toContain("delete from public.ingestion_runs");
  });

  it("marks an issue complete only after the full 500 by 6 contract succeeds", () => {
    expect(migration).toMatch(/add column(?: if not exists)? completed_at/);
    expect(migration).toContain(
      "create or replace function public.complete_weather_forecast_issue",
    );
    expect(completionFunction).toContain("from public.weather_grid_points");
    expect(completionFunction).toContain("stored_rows <> expected_points * 6");
    expect(completionFunction).toContain("stored_points <> expected_points");
    expect(completionFunction).toContain("stored_horizons <> 6");
    expect(completionFunction).toMatch(/unavailable_fields/);
    expect(completionFunction).toMatch(
      /update public\.weather_forecast_issues[\s\S]*completed_at\s*=\s*coalesce\(completed_at,\s*now\(\)\)/,
    );
  });

  it("bounds retained issues and schedules VACUUM outside the migration transaction", () => {
    expect(migration).toContain(
      "create or replace function public.prune_weather_forecast_issues",
    );
    expect(pruningFunction).toContain("p_keep_complete integer default 1");
    expect(pruningFunction).toMatch(/completed_at\s+is\s+not\s+null/i);
    expect(pruningFunction).toMatch(/order by[\s\S]*(?:completed_at|generated_at)\s+desc/i);
    expect(pruningFunction).toContain("delete from public.weather_grid_forecasts");
    expect(pruningFunction).toContain("delete from public.weather_forecast_issues");
    expect(migration).not.toMatch(/^\s*vacuum(?:\s+full)?\b/im);
    expect(migration).toContain("forecast_prune := public.prune_weather_forecast_issues(1)");
    expect(migration).toContain("'vacuum (analyze) public.weather_grid_forecasts'");
  });

  it("keeps both maintenance functions private and service-role only", () => {
    for (const functionName of [
      "reconcile_weather_forecast_issue",
      "complete_weather_forecast_issue",
      "prune_weather_forecast_issues",
    ]) {
      expect(migration).toMatch(
        new RegExp(`create or replace function public\\.${functionName}[\\s\\S]*?security invoker`),
      );
      expect(migration).toMatch(
        new RegExp(`revoke all on function public\\.${functionName}\\([\\s\\S]*?from public, anon, authenticated`),
      );
      expect(migration).toMatch(
        new RegExp(`grant execute on function public\\.${functionName}\\([\\s\\S]*?to service_role`),
      );
    }

    const issueTableGrants = migration.match(
      /grant[\s\S]*?on table public\.weather_forecast_issues[\s\S]*?to service_role\s*;/gi,
    )?.join("\n") ?? "";
    expect(issueTableGrants).toMatch(/\bupdate\b/i);
    expect(issueTableGrants).toMatch(/\bdelete\b/i);
  });

  it("reconciles before the worker accepts a completed daily cursor", () => {
    const handlerStart = refreshPipeline.indexOf("Deno.serve");
    const reconciliationCall = refreshPipeline.indexOf(
      "await reconcileForecastIssue(supabase, today)",
      handlerStart,
    );
    const cursorRead = refreshPipeline.indexOf('.from("pipeline_cursors")', handlerStart);

    expect(handlerStart).toBeGreaterThan(-1);
    expect(refreshPipeline).toContain('.rpc("reconcile_weather_forecast_issue"');
    expect(reconciliationCall).toBeGreaterThan(-1);
    expect(cursorRead).toBeGreaterThan(-1);
    expect(reconciliationCall).toBeLessThan(cursorRead);
    const reconciliationHandling = refreshPipeline.slice(reconciliationCall, cursorRead);
    expect(reconciliationHandling).toContain("issueComplete");
    expect(reconciliationHandling).toContain("saveCursor");
    expect(reconciliationHandling).toContain("FORECAST_CURSOR_PIPELINE");
    expect(reconciliationHandling).toContain("COMPLETE_CURSOR");
    expect(refreshPipeline).toContain("spatial-forecast-v2");
    expect(refreshPipeline).toMatch(/forecast[A-Za-z]*(?:Reconciled|Reconciliation)|reconciledForecast/i);
  });

  it("marks the rebuilt issue complete before pruning its predecessor", () => {
    const handlerStart = refreshPipeline.indexOf("Deno.serve");
    const completionCall = refreshPipeline.indexOf(
      "await completeForecastIssue(",
      handlerStart,
    );
    const pruningCall = refreshPipeline.indexOf(
      "await pruneForecastIssues(",
      handlerStart,
    );

    expect(refreshPipeline).toContain('.rpc("complete_weather_forecast_issue"');
    expect(refreshPipeline).toContain('.rpc("prune_weather_forecast_issues"');
    expect(completionCall).toBeGreaterThan(-1);
    expect(pruningCall).toBeGreaterThan(-1);
    expect(completionCall).toBeLessThan(pruningCall);
  });
});
