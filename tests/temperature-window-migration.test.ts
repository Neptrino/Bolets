import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("historical weather database aggregation", () => {
  it("preserves temperature and antecedent-moisture fields in live and cached coarse cells", () => {
    const source = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260812055451_add_10d_temperature_history.sql"),
      "utf8"
    );

    expect(source.match(/'temperatureMin10dC'/g)).toHaveLength(4);
    expect(source.match(/'temperatureAvg10dC'/g)).toHaveLength(4);
    expect(source.match(/'temperatureMax10dC'/g)).toHaveLength(4);
    expect(source.match(/'frostHours10d'/g)).toHaveLength(4);
    expect(source.match(/'rainfall3dMm'/g)).toHaveLength(4);
    expect(source.match(/'rainfallPrevious23dMm'/g)).toHaveLength(4);
    expect(source.match(/'rainfall30dMm'/g)).toHaveLength(4);
    expect(source.match(/'drySpellDays'/g)).toHaveLength(4);
    expect(source.match(/'evapotranspiration30dMm'/g)).toHaveLength(4);
    expect(source.match(/'soilMoistureAvg7d'/g)).toHaveLength(4);
    expect(source.match(/'soilMoistureTrend7d'/g)).toHaveLength(4);
    expect(source).toContain("create or replace function public.read_aggregated_cell_environment");
    expect(source).toContain("create or replace function public.refresh_spatial_level_conditions");
    expect(source).toContain("security invoker");
  });
});
