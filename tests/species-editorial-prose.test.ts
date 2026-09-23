import { describe, expect, it } from "vitest";
import { catalogueSpecies, getCatalogueSpecies } from "@/data/catalogue";
import { speciesEditorialProse } from "@/data/species-editorial-prose";
import { speciesBySearchDemand } from "@/data/species-search-demand";
import { speciesProfileSections } from "@/src/lib/species-headings";

const EDIBLE = new Set(["excellent_edible", "edible", "edible_with_conditions"]);

describe("species editorial prose", () => {
  const entries = Object.entries(speciesEditorialProse);

  it("covers the twenty most searched species and every edible species in the catalogue", () => {
    const expected = new Set<string>([
      ...speciesBySearchDemand.slice(0, 20),
      ...catalogueSpecies.filter((species) => EDIBLE.has(species.identity.edibility)).map((species) => species.speciesId),
    ]);
    expect(entries.map(([speciesId]) => speciesId).sort()).toEqual([...expected].sort());
  });

  it("answers the searched questions in plain language", () => {
    for (const [speciesId, prose] of entries) {
      const species = getCatalogueSpecies(speciesId)!;
      expect(prose.identification.length, speciesId).toBeGreaterThanOrEqual(2);
      expect(prose.ecology.length, speciesId).toBeGreaterThanOrEqual(2);
      expect(prose.cuisine.length, speciesId).toBeGreaterThanOrEqual(2);
      expect(prose.lookalikes.heading.length, speciesId).toBeGreaterThan(0);
      if (prose.ecologyHeading) {
        expect(EDIBLE.has(species.identity.edibility), speciesId).toBe(true);
        expect(prose.ecologyHeading, speciesId).toMatch(/^On trobar .+ i quan (surten|maduren)$/u);
      }
      const text = [...prose.identification, prose.lookalikes.text, ...prose.ecology, ...prose.cuisine].join(" ");
      expect(text, speciesId).not.toMatch(/fructificació|miceli|hàbitat potencial|finestra|\blectura\b/iu);
      // Territory context must never read as a confirmed collection spot; descriptive profiles
      // name no territories and say instead that the prediction map does not cover them.
      if ("scope" in species) expect(prose.ecology.join(" "), speciesId).toMatch(/mapa de predicció/u);
      else if (EDIBLE.has(species.identity.edibility)) expect(prose.ecology.join(" "), speciesId).toMatch(/no punts de collida/u);
      expect(prose.identification[0], speciesId).not.toMatch(/^Com reconèixer/u);
    }
  });

  it("keeps one section order for every species, walking identify → where and when → kitchen → reference", () => {
    const expected = ["identificació", "confusions", "ecologia", "distribució", "cuina", "noms", "preguntes", "targeta-de-camp", "fonts"];
    for (const species of catalogueSpecies) {
      const ids = speciesProfileSections(species).map((section) => section.id);
      expect(ids).toEqual("scope" in species ? expected.filter((id) => id !== "distribució") : expected);
    }
  });
});
