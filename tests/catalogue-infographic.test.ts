import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MushroomInfographicPage, { metadata } from "@/app/bolets/infografia/page";
import { CatalogueInfographicSpecies } from "@/components/catalogue-infographic-species";
import { catalogueSpecies } from "@/data/catalogue";
import { infographicGroups, infographicSpeciesGroups } from "@/src/lib/catalogue-infographic";
import { speciesPath } from "@/src/lib/seo";
import { STATIC_MEDIA_VERSION } from "@/src/lib/static-media";
import { existsSync, statSync } from "node:fs";

describe("catalogue infographic text version", () => {
  it("groups every catalogue species exactly like the printed poster", () => {
    const groups = infographicSpeciesGroups();
    const collator = new Intl.Collator("ca", { sensitivity: "base" });

    expect(groups.map((group) => group.id)).toEqual(infographicGroups.map((group) => group.id));
    expect(groups.reduce((sum, group) => sum + group.rows.length, 0)).toBe(catalogueSpecies.length);
    expect(new Set(groups.flatMap((group) => group.rows.map((row) => row.speciesId))).size).toBe(catalogueSpecies.length);
    for (const group of groups) {
      const names = group.rows.map((row) => row.commonName);
      expect(names).toEqual([...names].sort(collator.compare));
    }
    for (const row of groups.flatMap((group) => group.rows)) {
      expect(row.bestMonthsLabel).not.toBe("");
      expect(row.habitatLabel).not.toBe("");
      expect(row.edibilityLabel).not.toBe("");
    }
  });

  it("lists every poster species as a link, grouped like the sheet", () => {
    const html = renderToStaticMarkup(createElement(CatalogueInfographicSpecies, { speciesCount: catalogueSpecies.length }));

    expect(html).not.toContain("<table");
    expect(html).toContain("Excel·lents comestibles");
    expect(html).toContain("Molt tòxics");
    expect(html).toContain('style="background:#7d2730"');
    for (const species of catalogueSpecies) {
      expect(html).toContain(`href="${speciesPath(species)}"`);
      expect(html).toContain(`>${species.identity.commonName}</a>`);
    }
  });

  it("keeps the download, opens the poster from the image and shares the poster itself", () => {
    const html = renderToStaticMarkup(createElement(MushroomInfographicPage));

    expect(html).toContain("/downloads/infografies/bolets-catalunya-infografia.png");
    expect(html.indexOf('id="infografia"')).toBeLessThan(html.indexOf('id="infografia-especies"'));
    expect(html).toContain('class="catalogue-infographic-zoom" href="/media/editorial/bolets-catalunya-infografia.webp"');
    expect(html).not.toContain("Veure a mida completa");
    expect(html).toContain('href="/downloads/infografies/bolets-catalunya-infografia.pdf" download="bolets-catalunya-infografia.pdf"');
    expect(html).toContain("application/pdf");
    expect(existsSync("public/downloads/infografies/bolets-catalunya-infografia.pdf")).toBe(true);
    expect(statSync("public/downloads/infografies/bolets-catalunya-infografia.pdf").size).toBeGreaterThan(100_000);

    const image = metadata.openGraph?.images;
    const first = Array.isArray(image) ? image[0] : image;
    expect(typeof first === "object" && first && "url" in first ? first.url : first)
      .toBe(`/media/optimized/${STATIC_MEDIA_VERSION}/editorial/bolets-catalunya-infografia.w1280.webp`);
  });
});
