import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GuidesPage from "@/app/guies/page";
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
    // Pinned per hub so that changing a hub's content has to bump its own date:
    // the sitemap lastmod is the crawl signal. Both hubs were rewritten on
    // 21 September around the questions people actually search — "quan surten"
    // and "on trobar" — and had their house jargon removed; on 23 September
    // their FAQ moved to the shared collapsible design.
    const expectedRevisions: Record<string, string> = {
      "zones-rovellons": "2026-09-23",
      "zones-ceps": "2026-09-23",
    };

    for (const guide of speciesTerritoryGuides) {
      const editorial = getEditorialMetadata(guide.contentId);
      expect(editorial.updatedAt, guide.contentId).toBe(expectedRevisions[guide.contentId]);
      expect(
        entries.find((entry) => entry.url.endsWith(guide.path))?.lastModified,
        guide.path,
      ).toEqual(new Date(`${editorial.updatedAt}T00:00:00Z`));
    }
  });

  it("does not invent a territory guide for an unrelated species", () => {
    expect(territoryGuideForSpecies("amanita-phalloides")).toBeUndefined();
  });

  it("keeps species territory hubs reachable through the footer's guides index", () => {
    expect(footer).toContain('href="/guies"');
    const html = renderToStaticMarkup(createElement(GuidesPage));
    for (const guide of speciesTerritoryGuides) expect(html).toContain(`href="${guide.path}"`);
  });
});
