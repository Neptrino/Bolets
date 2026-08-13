import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260813103000_store_spatial_forecasts.sql"),
  "utf8",
);
const currentReader = readFileSync(
  join(process.cwd(), "supabase", "functions", "read-spatial-environment", "index.ts"),
  "utf8",
);
const refreshPipeline = readFileSync(
  join(process.cwd(), "supabase", "functions", "refresh-spatial-soil", "index.ts"),
  "utf8",
);

describe("spatial forecast storage", () => {
  it("keeps future-valid weather separate from observed snapshots", () => {
    expect(migration).toContain("create table public.weather_grid_forecasts");
    expect(migration).toContain("unique (point_id, snapshot_date, horizon_hours)");
    expect(migration).toContain("horizon_hours in (24, 48, 72, 96, 120)");
    expect(migration).not.toMatch(/insert into public\.weather_grid_snapshots[\s\S]*valid_at/);
  });

  it("keeps forecast rows private, indexed, and bounded by retention", () => {
    expect(migration).toContain("weather_grid_forecasts_point_date_idx");
    expect(migration).toContain("alter table public.weather_grid_forecasts enable row level security");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("delete from public.weather_grid_forecasts where snapshot_date < current_date - 2");
    expect(migration).toContain("'forecastsDeleted', forecasts_deleted");
    expect(migration).toContain("'open-meteo-soil-forecast'");
  });

  it("reads one complete issue rather than mixing partial forecast dates", () => {
    expect(currentReader).toContain("const expectedHorizons = [24, 48, 72, 96, 120]");
    expect(currentReader).toContain("candidate.snapshot_date}:${candidate.generated_at}");
    expect(currentReader).toContain("group.length === expectedHorizons.length");
    expect(currentReader).toContain("group.every((row) => row.unavailable_fields.length === 0)");
    expect(currentReader).toContain("atmospherePoint.soil_point_id");
    expect(currentReader).toContain("returning observed history only");
  });

  it("retries forecast batches independently from current soil ingestion", () => {
    expect(migration).toContain("pipeline = 'spatial-forecast'");
    expect(refreshPipeline).toContain('const FORECAST_CURSOR_PIPELINE = "spatial-forecast"');
    expect(refreshPipeline).toContain("const forecastBatchSucceeded");
    expect(refreshPipeline).toContain("if (!forecastErrorMessage && completeForecastRows)");
    expect(refreshPipeline).toContain("SOIL_CURSOR_PIPELINE");
    expect(refreshPipeline).toContain('recordForecastSourceState(\n          supabase,\n          "ecmwf-ifs-hres-forecast"');
    expect(refreshPipeline).toContain('recordForecastSourceState(\n          supabase,\n          "open-meteo-soil-forecast"');
    expect(refreshPipeline).toContain("Current spatial soil stream will retry independently");
  });
});
