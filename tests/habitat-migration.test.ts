import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { speciesProfiles } from "@/data/species";

function latestHabitatReaderMigration() {
  const migrationDirectory = join(process.cwd(), "supabase", "migrations");
  const definitions = readdirSync(migrationDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(join(migrationDirectory, file), "utf8"))
    .filter((source) =>
      source.includes(
        "create or replace function public.read_weighted_potential_habitat_cells",
      ),
    );

  return definitions.at(-1) ?? "";
}

function latestCoarseHabitatReaderMigration() {
  const migrationDirectory = join(process.cwd(), "supabase", "migrations");
  const definitions = readdirSync(migrationDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(join(migrationDirectory, file), "utf8"))
    .filter((source) =>
      source.includes(
        "create or replace function public.read_weighted_coarse_potential_habitat_cells",
      ),
    );

  return definitions.at(-1) ?? "";
}

function altitudeWeightMigration() {
  const migrationDirectory = join(process.cwd(), "supabase", "migrations");
  return readdirSync(migrationDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(join(migrationDirectory, file), "utf8"))
    .find((source) => source.includes("create or replace function public.habitat_altitude_weight")) ?? "";
}

describe("potential habitat database reader", () => {
  it("plans exact and coarse resolutions as separate query branches", () => {
    const source = latestHabitatReaderMigration();
    const coarseSource = latestCoarseHabitatReaderMigration();
    const weightedReader = source.split(
      "create or replace function public.read_weighted_potential_habitat_cells",
    )[1] ?? "";
    const coarseBranch = weightedReader.split("return;\n  end if;")[1] ?? "";

    expect(source).toContain("language plpgsql");
    expect(source).toContain("create or replace function public.read_weighted_potential_habitat_cells");
    expect(source).toContain("if p_grid_size_m = 250 then");
    expect(coarseBranch).toContain("read_weighted_coarse_potential_habitat_cells");
    expect(coarseBranch).not.toContain(
      "cells.geom operator(extensions.&&)",
    );
    expect(source).toContain("altitude_weighted_coverage double precision");
    expect(altitudeWeightMigration()).toContain("0.75 + 0.25");
    expect(source).toContain("security invoker");
    const compactCoverMigration = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260812080817_compact_habitat_cover_storage.sql"),
      "utf8",
    );
    expect(compactCoverMigration).toContain("create or replace function public.habitat_cover_weight_compact");
    const packedCoverMigration = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260812110500_pack_habitat_cover_samples.sql"),
      "utf8",
    );
    expect(packedCoverMigration).toContain("habitat_cover_counts bigint");
    expect(packedCoverMigration).toContain("p_cover_counts >> (cover_index * 5)");
    expect(packedCoverMigration).toContain("unnest(p_cover_codes, p_cover_shares)");
    expect(source).toContain("/ 25");
    expect(source).not.toContain("and cells.habitat_forest_types ?| p_forest_terms");
    expect(coarseSource).toContain("query_grid_extent as materialized");
    expect(coarseSource).toContain("spatial_cells_habitat_grid_covering_idx");
    expect(coarseSource).toContain("cells.habitat_cover_counts is not null");
    expect(coarseSource).toContain("extent.min_y * (p_grid_size_m / 250)");
    expect(coarseSource).not.toContain("exact_ids as materialized");
    expect(coarseSource).toContain("join visible_levels levels on levels.bucket_x = grouped.bucket_x");
    const coarseLevelIndexMigration = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260812123000_lookup_coarse_habitat_children.sql"),
      "utf8",
    );
    expect(coarseLevelIndexMigration).toContain("spatial_cell_levels_grid_xy_idx");
    expect(coarseSource).not.toContain("cells.geom operator(extensions.&&)");
    const storageMigration = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260812075342_optimize_spatial_storage_and_reads.sql"),
      "utf8",
    );
    expect(storageMigration).toContain("delete from public.spatial_cell_levels where grid_size_m = 500");
    expect(coarseSource).toContain("levels.east >= p_west");
    expect(storageMigration).toContain("drop index if exists public.spatial_cells_verified_cell_idx");
    expect(storageMigration).not.toContain("drop index if exists public.spatial_cells_habitat_ranges_covering_idx");
    expect(storageMigration).not.toContain("drop column if exists habitat_forest_types");
  });

  it("routes core-aware requests to the weighted reader and keeps the legacy fallback", () => {
    const source = readFileSync(
      join(process.cwd(), "supabase", "functions", "read-spatial-environment", "index.ts"),
      "utf8",
    );

    expect(source).toContain('numberParam(searchParams, "altitudeCoreMin")');
    expect(source).toContain('url.searchParams.get("includeHabitat") === "true"');
    expect(source).toContain("async function readHabitatRowsForBounds(");
    expect(source).toContain("const tileCount = Math.min(Math.ceil(requestArea / 0.5), 10)");
    expect(source).toContain("const completeHabitatCoverage = habitatResult?.complete ?? false");
    expect(source).toContain("const truncated = !habitatResult.complete || rows.length > limit");
    expect(source).toContain("if (habitatResult?.error) throw habitatResult.error");
    expect(source).not.toContain("Unable to add exact habitat coverage");
    expect(source).toContain('"read_weighted_coarse_potential_habitat_cells"');
    expect(source).toContain('"read_weighted_potential_habitat_cells"');
    expect(source).toContain("row.altitude_weighted_coverage ?? row.coverage");
    expect(source).toContain('"read_cached_species_habitat_cells"');
    expect(source).toContain('"species_habitat_profile_complete"');
  });

  it("stores only completed sparse coarse species profiles", () => {
    const source = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260812142500_cache_coarse_species_habitat.sql"),
      "utf8",
    );
    expect(source).toContain("coarse_species_habitat_cells");
    expect(source).toContain("coverages real[]");
    expect(source).toContain("(1000, 4), (2500, 10), (5000, 20), (10000, 40)");
    expect(source).toContain("profile.complete");
    expect(source).toContain("build_coarse_species_habitat_cache");
    expect(source).not.toContain("(250, 1)");
  });

  it("keeps enough bounded coarse-cache slots for the expanded catalogue", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "supabase",
        "migrations",
        "20260813140000_expand_coarse_habitat_profile_capacity.sql",
      ),
      "utf8",
    );
    const profileCapacity = Number(
      source.match(/profile_count > (\d+)/)?.[1],
    );

    expect(source).toContain("check (slot between 1 and 64)");
    expect(source).toContain(
      "create or replace function public.build_coarse_species_habitat_cache",
    );
    expect(profileCapacity).toBe(64);
    expect(profileCapacity).toBeGreaterThanOrEqual(speciesProfiles.length);
  });
});
