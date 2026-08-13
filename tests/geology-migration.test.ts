import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260813120000_add_icgc_geology_evidence.sql",
  ),
  "utf8",
);
const descriptionMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260813130000_expose_geology_unit_descriptions.sql",
  ),
  "utf8",
);

describe("compact ICGC geology storage", () => {
  it("keeps geology out of the wide scoring tables", () => {
    expect(migration).toContain("create table public.spatial_geology_cells");
    expect(migration).toContain("create table public.spatial_geology_levels");
    expect(migration).toContain("cell_key bigint primary key");
    expect(migration).toContain("evidence bigint not null");
    expect(migration).not.toMatch(/alter table public\.spatial_cells\s+add column geology/);
    expect(migration).not.toMatch(/alter table public\.spatial_cell_levels\s+add column geology/);
    expect(migration).not.toContain("static_values ||");
    expect(migration).not.toContain("static_sources ||");
  });

  it("pins the official source and does not confuse scale with resolution", () => {
    expect(migration).toContain("geologia-territorial-50000-geologic-v3r0-202412.zip");
    expect(migration).toContain("v3r0-202412");
    expect(migration).toContain("_04_unitats_geologiques_50000");
    expect(migration).toContain("60d730395874ee860d09ddddbf2cc60d187c46f05f9018e7049bcdf8a65b684f");
    expect(migration).toContain("map_scale_denominator");
    expect(migration).toMatch(/'geology',\s+null,/);
  });

  it("exposes only service-role import, rollup and read functions", () => {
    for (const signature of [
      "upsert_geology_units(jsonb)",
      "backfill_spatial_geology_evidence(jsonb)",
      "refresh_spatial_geology_level(integer)",
      "read_spatial_geology_evidence(text[], integer)",
    ]) {
      expect(migration).toContain(`revoke all on function public.${signature}`);
      expect(migration).toContain(`grant execute on function public.${signature}`);
    }
    expect(migration).toContain("security invoker");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("Every geology row must reference an existing 250 m cell");
  });

  it("area-weights coarse evidence over the full canonical parent", () => {
    const rollup = migration.split(
      "create or replace function public.refresh_spatial_geology_level",
    )[1];
    expect(rollup).toContain("levels.base_cell_count");
    expect(rollup).toContain("coverage_totals.silicic_total / levels.base_cell_count");
    expect(rollup).toContain("ranked_units.unit_total * 10 >= coverage_totals.mapped_total * 7");
    expect(rollup).not.toContain("mode() within group");
  });

  it("exposes official unit descriptions without widening spatial storage", () => {
    expect(descriptionMigration).toContain("dominant_unit_description text");
    expect(descriptionMigration).toContain("units.description");
    expect(descriptionMigration).toContain(
      "revoke all on function public.read_spatial_geology_evidence(text[], integer)",
    );
    expect(descriptionMigration).toContain(
      "grant execute on function public.read_spatial_geology_evidence(text[], integer)",
    );
    expect(descriptionMigration).toContain("security invoker");
    expect(descriptionMigration).toContain("set search_path = ''");
    expect(descriptionMigration).toContain("from public, anon, authenticated");
    expect(descriptionMigration).toContain("to service_role");
    expect(descriptionMigration).not.toMatch(/alter table public\.spatial_(?:cells|cell_levels)/);
  });
});
