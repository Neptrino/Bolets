import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("hydrothermal weather database aggregation", () => {
  it("preserves only the active model windows in live and cached coarse cells", () => {
    const source = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260814120000_add_hydrothermal_model_inputs.sql"),
      "utf8"
    );

    for (const field of [
      "temperatureAvg7dC",
      "temperatureAvg14dC",
      "frostHours14d",
      "heatHours14d",
      "temperatureAvg20dC",
      "frostHours20d",
      "heatHours20d",
      "rainfall14dMm",
      "rainfallDays14d",
      "rainfall21dMm",
      "rainfallDays21d",
      "rainfall26dMm",
      "rainfallDays26d",
      "evapotranspiration14dMm",
      "evapotranspiration21dMm",
      "evapotranspiration26dMm",
    ]) {
      expect(source.match(new RegExp(`'${field}'`, "g")), field).toHaveLength(4);
    }
    expect(source).not.toContain("'temperatureAvg10dC'");
    expect(source).not.toContain("'frostHours10d'");
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
