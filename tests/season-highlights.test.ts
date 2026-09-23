import { describe, expect, it } from "vitest";
import type { Month } from "@/src/lib/types";
import { catalogueGroup } from "@/src/lib/catalogue-list";
import { seasonGuideMetadata, seasonGuides, speciesForSeasonGuide } from "@/src/lib/season-guides";
import { bestMonthsInSeason, seasonMonthHighlights, seasonProtagonists, splitSeasonSpecies } from "@/src/lib/season-highlights";

describe("season guide highlights", () => {
  it.each(seasonGuides.map((guide) => [guide.id, guide] as const))("never names a toxic or inedible species as a %s protagonist", (_, guide) => {
    const species = speciesForSeasonGuide(guide);
    const protagonists = seasonProtagonists(guide, species);
    expect(protagonists.length).toBeGreaterThan(0);
    expect(protagonists.length).toBeLessThanOrEqual(6);
    for (const { species: item, bestMonths } of protagonists) {
      expect(catalogueGroup(item.identity.edibility)).toBe("edible");
      expect(bestMonths.every((month) => (guide.months as readonly Month[]).includes(month))).toBe(true);
    }
    for (const month of seasonMonthHighlights(guide, species)) {
      expect(month.species.every((item) => catalogueGroup(item.identity.edibility) === "edible")).toBe(true);
    }
  });

  it("leads autumn with the most searched edibles", () => {
    const guide = seasonGuides.find((entry) => entry.id === "tardor")!;
    const ids = seasonProtagonists(guide, speciesForSeasonGuide(guide)).map(({ species }) => species.speciesId);
    expect(ids.slice(0, 2)).toEqual(["boletus-edulis", "craterellus-lutescens"]);
  });

  it("gives one column per guide month and keeps every season species in exactly one card block", () => {
    for (const guide of seasonGuides) {
      const species = speciesForSeasonGuide(guide);
      expect(seasonMonthHighlights(guide, species).map((month) => month.month)).toEqual([...guide.months]);
      const { edible, caution } = splitSeasonSpecies(species);
      expect(edible.length + caution.length).toBe(species.length);
      expect(caution.every((item) => catalogueGroup(item.identity.edibility) !== "edible")).toBe(true);
    }
  });

  it("reports the months where a species is at its best within the season", () => {
    const guide = seasonGuides.find((entry) => entry.id === "tardor")!;
    const cep = speciesForSeasonGuide(guide).find((item) => item.speciesId === "boletus-edulis")!;
    const best = bestMonthsInSeason(cep, guide.months);
    expect(best.length).toBeGreaterThan(0);
    expect(best.every((month) => cep.ecologicalConfig.seasonality[month] === cep.ecologicalConfig.seasonality[best[0]])).toBe(true);
  });
});

describe("season guide titles", () => {
  it.each(seasonGuides.map((guide) => [guide.id, guide] as const))("keeps the %s search title whole", (_, guide) => {
    const title = seasonGuideMetadata(guide).title;
    expect(typeof title === "string" ? title : "").not.toMatch(/…$/u);
  });
});
