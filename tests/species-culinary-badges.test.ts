import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { catalogueSpecies } from "@/data/catalogue";
import { SpeciesCulinarySection } from "@/components/species-profile/culinary-section";
import { getEdibilityPresentation } from "@/src/lib/edibility-presentation";

describe("culinary section badges", () => {
  it("omits redundant badges for ordinary edible species", () => {
    const species = catalogueSpecies.filter(s => s.culinaryProfile.kind === "culinary" && ["edible", "excellent_edible"].includes(s.identity.edibility));
    expect(species.length).toBeGreaterThan(0);
    for (const item of species) {
      const html = renderToStaticMarkup(createElement(SpeciesCulinarySection, { species: item }));
      expect(html).toContain('class="culinary-stars"');
      expect(html).not.toMatch(/class="[^"]*\bedibility-badge\b/);
    }
  });

  it("retains distinct precautions alongside culinary ratings", () => {
    const species = catalogueSpecies.filter(s => s.culinaryProfile.kind === "culinary" && s.identity.edibility === "edible_with_conditions");
    expect(species.length).toBeGreaterThan(0);
    for (const item of species) {
      const html = renderToStaticMarkup(createElement(SpeciesCulinarySection, { species: item }));
      expect(html).toMatch(/class="[^"]*\bedibility-badge edible_with_conditions/);
      expect(html).toContain("Comestible amb condicions");
    }
  });

  it("preserves the primary warning for toxic species without duplicating it", () => {
    const species = catalogueSpecies.filter(s => s.identity.edibility.includes("toxic"));
    expect(species.length).toBeGreaterThan(0);
    for (const item of species) {
      const html = renderToStaticMarkup(createElement(SpeciesCulinarySection, { species: item }));
      expect(html).toContain(`Advertiment de consum: ${getEdibilityPresentation(item.identity.edibility).label}`);
      expect(html).not.toMatch(/class="[^"]*\bedibility-badge\b/);
    }
  });
});
