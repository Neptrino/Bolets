import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { edibleSpecies, speciesInSeason, toxicSpecies } from "@/src/lib/species-collections";
import {
  comparisonPages,
  comparisonPagesForSpecies,
} from "@/data/comparison-pages";
import { getSpecies, speciesProfiles } from "@/data/species";
import { seasonMonthPath, SEASON_MONTHS } from "@/src/lib/seasonality";
import { seasonGuides } from "@/src/lib/season-guides";
import { toSpeciesCardProfile } from "@/src/lib/species-card-profile";
import { speciesTerritoryGuides } from "@/src/lib/species-territory-guides";

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

  it("keeps the client catalogue payload compact", () => {
    const compactProfiles = speciesProfiles.map(toSpeciesCardProfile);
    expect(compactProfiles).toHaveLength(speciesProfiles.length);
    expect(JSON.stringify(compactProfiles).length).toBeLessThan(
      JSON.stringify(speciesProfiles).length / 3,
    );
  });

  it("includes all intent landing pages in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://bolets.app/bolets");
    expect(urls).toContain("https://bolets.app/bolets-avui");
    for (const guide of seasonGuides) {
      expect(urls).toContain(`https://bolets.app${guide.path}`);
    }
    expect(urls).toContain("https://bolets.app/quan-surten-els-bolets-despres-de-ploure");
    expect(urls).toContain("https://bolets.app/parts-dun-bolet");
    expect(urls).toContain("https://bolets.app/equip-editorial");
    expect(urls).toContain("https://bolets.app/bolets-comestibles");
    expect(urls).toContain("https://bolets.app/bolets-verinosos");
    expect(urls).toContain("https://bolets.app/temporada");
    for (const { key } of SEASON_MONTHS) {
      expect(urls).toContain(`https://bolets.app${seasonMonthPath(key)}`);
    }
    expect(urls).toContain("https://bolets.app/zones");
    expect(urls).toContain("https://bolets.app/guies");
    for (const guide of speciesTerritoryGuides) {
      expect(urls).toContain(`https://bolets.app${guide.path}`);
    }
    expect(urls).toContain("https://bolets.app/compare/rovello-vs-pinetell");
  });

  it("publishes unique canonical catalogue URLs with truthful modification dates", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);
    const now = Date.now();

    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.some((url) => new URL(url).pathname.startsWith("/species"))).toBe(false);
    for (const species of speciesProfiles) {
      const entriesForSpecies = entries.filter(
        (entry) => entry.url === `https://bolets.app/bolets/${species.speciesId}`,
      );
      expect(entriesForSpecies, species.speciesId).toHaveLength(1);
      expect(entriesForSpecies[0]?.images, species.speciesId).toHaveLength(1);
    }
    for (const entry of entries) {
      expect(entry.lastModified).toBeDefined();
      expect(new Date(entry.lastModified!).getTime()).toBeLessThanOrEqual(now);
    }
  });

  it("keeps every curated comparison connected to two catalogue species", () => {
    expect(comparisonPages.length).toBeGreaterThanOrEqual(18);
    expect(new Set(comparisonPages.map((page) => page.slug)).size).toBe(comparisonPages.length);
    const unorderedPairs = comparisonPages.map((page) => [page.leftSpeciesId, page.rightSpeciesId].sort().join(":"));
    expect(new Set(unorderedPairs).size).toBe(unorderedPairs.length);
    for (const page of comparisonPages) {
      expect(getSpecies(page.leftSpeciesId), page.slug).toBeDefined();
      expect(getSpecies(page.rightSpeciesId), page.slug).toBeDefined();
      expect(page.introduction.length).toBeGreaterThan(100);
      expect(page.decisiveDifference.length).toBeGreaterThan(70);
      expect(page.metaDescription.length).toBeGreaterThanOrEqual(100);
      expect(page.metaDescription.length).toBeLessThanOrEqual(160);
    }
    expect(new Set(comparisonPages.map((page) => page.metaDescription)).size).toBe(comparisonPages.length);
  });

  it("covers the strongest current comparison suggestions", () => {
    const slugs = comparisonPages.map((page) => page.slug);
    expect(slugs).toEqual(expect.arrayContaining([
      "rovello-vs-pinetell",
      "rossinyol-vs-camagroc",
      "ou-de-reig-vs-reig-bord",
      "cep-vs-mataparent",
      "fredolic-vs-fredolic-metzinos",
      "camasec-vs-candeleta-vorada",
      "moixero-vs-inocibe-patouillard",
      "murgola-vs-bolet-greix",
      "carlet-vs-carner-bord",
    ]));
  });

  it("connects published comparisons back to both species profiles", () => {
    for (const page of comparisonPages) {
      expect(comparisonPagesForSpecies(page.leftSpeciesId)).toContain(page);
      expect(comparisonPagesForSpecies(page.rightSpeciesId)).toContain(page);
    }

    expect(
      comparisonPagesForSpecies("boletus-edulis").map((page) => page.slug),
    ).toContain("cep-vs-mataparent");
  });
});
