import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ZonesPage from "@/app/zones/page";
import { describe, expect, it } from "vitest";
import { buildSitemap as sitemap } from "@/app/sitemap";
import { getEditorialMetadata } from "@/data/editorial";
import { getSpecies } from "@/data/species";
import {
  speciesTerritoryGuides,
  territoryGuideForSpecies,
} from "@/src/lib/species-territory-guides";

const footer = readFileSync("components/site-footer.tsx", "utf8");

describe("species territory guide registry", () => {
  it("publishes unique guide paths with valid, non-overlapping species", () => {
    expect(speciesTerritoryGuides.map((guide) => guide.path)).toEqual([
      "/zones/rovellons",
      "/zones/ceps",
    ]);
    expect(speciesTerritoryGuides.map((guide) => guide.contentId)).toEqual([
      "zones-rovellons",
      "zones-ceps",
    ]);

    const speciesIds = speciesTerritoryGuides.flatMap((guide) => [...guide.speciesIds]);
    expect(new Set(speciesIds).size).toBe(speciesIds.length);

    for (const guide of speciesTerritoryGuides) {
      expect(guide.title.length).toBeGreaterThan(20);
      expect(guide.description.length).toBeGreaterThan(60);
      for (const speciesId of guide.speciesIds) {
        expect(getSpecies(speciesId), speciesId).toBeDefined();
        expect(territoryGuideForSpecies(speciesId)).toBe(guide);
      }
    }
  });

  it("gives each intent hub its own editorial revision date in the sitemap", () => {
    const entries = sitemap();

    for (const guide of speciesTerritoryGuides) {
      const editorial = getEditorialMetadata(guide.contentId);
      expect(editorial.updatedAt, guide.contentId).toBe(guide.contentId === "zones-ceps" ? "2026-09-06" : "2026-08-31");
      expect(
        entries.find((entry) => entry.url.endsWith(guide.path))?.lastModified,
        guide.path,
      ).toEqual(new Date(`${editorial.updatedAt}T00:00:00+02:00`));
    }
  });

  it("does not invent a territory guide for an unrelated species", () => {
    expect(territoryGuideForSpecies("amanita-phalloides")).toBeUndefined();
  });

  it("keeps species territory hubs reachable through the footer's zones directory", () => {
    expect(footer).toContain('href="/zones"');
    const html = renderToStaticMarkup(createElement(ZonesPage));
    for (const guide of speciesTerritoryGuides) expect(html).toContain(`href="${guide.path}"`);
  });
});
