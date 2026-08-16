import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function allSlotsReaderMigration() {
  const migrationDirectory = join(process.cwd(), "supabase", "migrations");
  return readdirSync(migrationDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(join(migrationDirectory, file), "utf8"))
    .filter((source) =>
      source.includes(
        "create or replace function public.read_all_cached_species_habitat_cells",
      ),
    )
    .at(-1) ?? "";
}

describe("all-species habitat reader migration", () => {
  const source = allSlotsReaderMigration();

  it("exists and returns both slot arrays", () => {
    expect(source).not.toBe("");
    expect(source).toContain("coverages real[]");
    expect(source).toContain("weighted_coverages real[]");
  });

  it("only serves the coarse grids that carry the cache", () => {
    expect(source).toContain("p_grid_size_m in (1000, 2500, 5000, 10000)");
  });

  it("clamps the row limit like the other spatial readers", () => {
    expect(source).toContain("limit least(greatest(p_limit, 1), 1000)");
  });

  it("is restricted to the service role", () => {
    expect(source).toMatch(
      /revoke all on function public\.read_all_cached_species_habitat_cells[\s\S]*from public, anon, authenticated/,
    );
    expect(source).toMatch(
      /grant execute on function public\.read_all_cached_species_habitat_cells[\s\S]*to service_role/,
    );
  });

  it("pins an empty search path", () => {
    expect(source).toContain("set search_path = ''");
  });
});
