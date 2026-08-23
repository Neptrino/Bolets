import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260823093000_cache_1km_territorial_conditions.sql"),
  "utf8",
);
const reader = readFileSync(
  join(process.cwd(), "supabase", "functions", "read-spatial-environment", "index.ts"),
  "utf8",
);
const pipeline = readFileSync(
  join(process.cwd(), "supabase", "functions", "_shared", "pipeline.ts"),
  "utf8",
);

describe("territorial condition cache", () => {
  it("extends the canonical condition refresher and gates the daily 1 km refresh", () => {
    expect(migration).toContain("p_grid_size_m not in (1000, 2500, 5000, 10000)");
    expect(migration).toContain("refresh_territorial_level_conditions_after_ingestion");
    expect(migration).toContain("pipeline in ('spatial-atmosphere', 'spatial-soil')");
    expect(migration).toContain("perform public.refresh_spatial_level_conditions(1000, p_snapshot_date)");
  });

  it("serves 1 km cells from the precomputed reader", () => {
    expect(reader).toContain('resolution >= 1000');
    expect(reader).toContain('? "read_precomputed_cell_environment"');
  });

  it("keeps coarse and territorial refreshes in separate RPC transactions", () => {
    expect(pipeline).toContain('"refresh_spatial_level_conditions_after_ingestion"');
    expect(pipeline).toContain('"refresh_territorial_level_conditions_after_ingestion"');
    expect(pipeline.indexOf('"refresh_spatial_level_conditions_after_ingestion"'))
      .toBeLessThan(pipeline.indexOf('"refresh_territorial_level_conditions_after_ingestion"'));
  });
});
