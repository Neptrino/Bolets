import { describe, expect, it } from "vitest";
import { catalogueSpecies } from "@/data/catalogue";
import { catalogueFilterSearch, matchesCatalogueFilters, parseCatalogueFilters } from "@/src/lib/catalogue-filters";
import { catalogueCounts, catalogueListRows, toCatalogueDirectoryEntry } from "@/src/lib/catalogue-list";
import { seasonGuides, speciesForSeasonGuide } from "@/src/lib/season-guides";

const cards = catalogueSpecies.map(toCatalogueDirectoryEntry);
const matching = (filters: Parameters<typeof matchesCatalogueFilters>[1]) =>
  cards.filter((card) => matchesCatalogueFilters(card, filters));

describe("catalogue filters", () => {
  it("reads only known URL values", () => {
    expect(parseCatalogueFilters({ tipus: "comestibles", estacio: "tardor" })).toEqual({ group: "edible", season: "tardor" });
    expect(parseCatalogueFilters({ tipus: "edible", estacio: ["tardor", "estiu"] })).toEqual({ group: null, season: null });
  });

  it("writes the same URL values it reads", () => {
    expect(catalogueFilterSearch(" cep ", { group: "toxic", season: "hivern" })).toBe("?q=cep&tipus=toxics&estacio=hivern");
    expect(catalogueFilterSearch("", { group: null, season: null })).toBe("");
    expect(parseCatalogueFilters({ tipus: "toxics", estacio: "hivern" })).toEqual({ group: "toxic", season: "hivern" });
  });

  it("groups by edibility with the counts the page intro quotes", () => {
    const counts = catalogueCounts(catalogueListRows());
    expect(matching({ group: "edible", season: null })).toHaveLength(counts.edible);
    expect(matching({ group: "toxic", season: null })).toHaveLength(counts.toxic);
    expect(matching({ group: "other", season: null })).toHaveLength(counts.other);
  });

  it("includes every scored species its season guide lists, plus descriptive species by their sourced season", () => {
    for (const guide of seasonGuides) {
      const ids = new Set(matching({ group: null, season: guide.id }).map((card) => card.speciesId));
      for (const species of speciesForSeasonGuide(guide)) expect(ids).toContain(species.speciesId);
    }
    const rangeSpecies = cards.find((card) => card.seasonLabel === "De primavera a tardor");
    expect(rangeSpecies?.catalogueSeasons).toEqual(["primavera", "estiu", "tardor"]);
    expect(cards.every((card) => card.catalogueSeasons.length > 0)).toBe(true);
  });
});
