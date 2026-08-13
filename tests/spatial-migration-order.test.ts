import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("spatial migration ordering", () => {
  it("creates the materialized level table before any migration uses it", () => {
    const migrationDirectory = join(process.cwd(), "supabase", "migrations");
    const migrations = readdirSync(migrationDirectory)
      .filter((name) => name.endsWith(".sql"))
      .sort();
    const firstReference = migrations.find((name) =>
      readFileSync(join(migrationDirectory, name), "utf8").includes("public.spatial_cell_levels"),
    );

    expect(firstReference).toBeDefined();
    expect(readFileSync(join(migrationDirectory, firstReference!), "utf8"))
      .toMatch(/create table if not exists public\.spatial_cell_levels[\s\S]*public\.spatial_cell_levels/);
  });
});
