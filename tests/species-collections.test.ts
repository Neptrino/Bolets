import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { edibleSpecies, speciesInSeason, toxicSpecies } from "@/src/lib/species-collections";
import { comparisonPages } from "@/data/comparison-pages";
import { getSpecies } from "@/data/species";

describe("search-intent species collections", () => {
  it("only publishes edible statuses in the edible guide", () => {
    expect(edibleSpecies.length).toBeGreaterThan(0);
    expect(edibleSpecies.every((species) => [
      "excellent_edible",
      "edible",
      "edible_with_conditions",
    ].includes(species.identity.edibility))).toBe(true);
  });

  it("only publishes toxic statuses in the poisonous guide", () => {
    expect(toxicSpecies.length).toBeGreaterThan(0);
    expect(toxicSpecies.every((species) => [
      "toxic",
      "dangerously_toxic",
    ].includes(species.identity.edibility))).toBe(true);
    expect(toxicSpecies.some((species) => species.speciesId === "amanita-phalloides")).toBe(true);
  });

  it("derives monthly results from versioned seasonality", () => {
    const octoberSpecies = speciesInSeason("oct");
    expect(octoberSpecies.length).toBeGreaterThan(0);
    expect(octoberSpecies.every((species) => species.ecologicalConfig.seasonality.oct !== "inactive")).toBe(true);
    expect(octoberSpecies[0]?.ecologicalConfig.seasonality.oct).toBe("peak");
  });

  it("includes all intent landing pages in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://bolets.app/bolets-comestibles");
    expect(urls).toContain("https://bolets.app/bolets-verinosos");
    expect(urls).toContain("https://bolets.app/temporada");
    expect(urls).toContain("https://bolets.app/zones/rovellons");
    expect(urls).toContain("https://bolets.app/compare/rovello-vs-pinetell");
  });

  it("keeps every curated comparison connected to two catalogue species", () => {
    expect(comparisonPages.length).toBeGreaterThanOrEqual(13);
    expect(new Set(comparisonPages.map((page) => page.slug)).size).toBe(comparisonPages.length);
    const unorderedPairs = comparisonPages.map((page) => [page.leftSpeciesId, page.rightSpeciesId].sort().join(":"));
    expect(new Set(unorderedPairs).size).toBe(unorderedPairs.length);
    for (const page of comparisonPages) {
      expect(getSpecies(page.leftSpeciesId), page.slug).toBeDefined();
      expect(getSpecies(page.rightSpeciesId), page.slug).toBeDefined();
      expect(page.introduction.length).toBeGreaterThan(100);
      expect(page.decisiveDifference.length).toBeGreaterThan(70);
    }
  });

  it("covers the strongest current comparison suggestions", () => {
    const slugs = comparisonPages.map((page) => page.slug);
    expect(slugs).toContain("rovello-vs-pinetell");
    expect(slugs).toContain("rossinyol-vs-camagroc");
    expect(slugs).toContain("ou-de-reig-vs-reig-bord");
  });
});
