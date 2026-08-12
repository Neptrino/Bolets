import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260812135509_skip_unchanged_spatial_imports.sql",
  ),
  "utf8",
);

const importer = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "functions",
    "import-spatial-cells",
    "index.ts",
  ),
  "utf8",
);

describe("conditional spatial imports", () => {
  it("keeps unchanged cell and weather rows out of PostgreSQL updates", () => {
    const weatherUpsert = migration
      .split("insert into public.weather_grid_points as existing")[1]
      .split("get diagnostics weather_rows_written")[0];
    const cellUpsert = migration
      .split("insert into public.spatial_cells as existing")[1]
      .split("get diagnostics cell_rows_written")[0];
    const weatherDifference = weatherUpsert.split("where (")[1];
    const cellDifference = cellUpsert.split("where (")[1];

    expect(weatherDifference).toContain("is distinct from");
    for (const column of [
      "provider",
      "requested_lat",
      "requested_lon",
      "requested_elevation_m",
      "native_resolution_m",
      "model",
    ]) {
      expect(weatherDifference).toContain(`existing.${column}`);
      expect(weatherDifference).toContain(`excluded.${column}`);
    }
    expect(weatherDifference).not.toContain("updated_at");

    expect(cellDifference).toContain("is distinct from");
    for (const column of [
      "region_id",
      "grid_size_m",
      "west",
      "south",
      "east",
      "north",
      "static_values",
      "habitat_cover_counts",
      "habitat_cover_codes",
      "habitat_cover_shares",
      "static_sources",
      "source_resolution_m",
      "confidence",
      "static_verified",
      "source_observed_at",
      "weather_point_id",
    ]) {
      expect(cellDifference).toContain(`existing.${column}`);
      expect(cellDifference).toContain(`excluded.${column}`);
    }
    expect(cellDifference).not.toContain("updated_at");
  });

  it("exposes one atomic RPC only to the service role", () => {
    expect(migration).toContain("create or replace function public.upsert_spatial_import_batch");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(importer).toContain('supabase.rpc("upsert_spatial_import_batch"');
    expect(importer).not.toContain('.from("spatial_cells").upsert');
    expect(importer).not.toContain('.from("weather_grid_points").upsert');
  });
});
