import { describe, expect, it } from "vitest";
import { catalogueSpecies } from "@/data/catalogue";
import { getSpecies } from "@/data/species";
import { speciesEditorialProse } from "@/data/species-editorial-prose";
import { speciesBySearchDemand } from "@/data/species-search-demand";
import { speciesProfileSections } from "@/src/lib/species-headings";

const EDIBLE = new Set(["excellent_edible", "edible", "edible_with_conditions"]);

describe("species editorial prose", () => {
  const entries = Object.entries(speciesEditorialProse);

  it("covers exactly the twenty most searched species, each a scored profile", () => {
    expect(entries.map(([speciesId]) => speciesId).sort()).toEqual([...speciesBySearchDemand.slice(0, 20)].sort());
    for (const [speciesId] of entries) expect(getSpecies(speciesId)).toBeDefined();
  });

  it("answers the searched questions in plain language", () => {
    for (const [speciesId, prose] of entries) {
      const species = getSpecies(speciesId)!;
      expect(prose.identification.length, speciesId).toBeGreaterThanOrEqual(2);
      expect(prose.ecology.length, speciesId).toBeGreaterThanOrEqual(2);
      expect(prose.cuisine.length, speciesId).toBeGreaterThanOrEqual(2);
      expect(prose.lookalikes.heading.length, speciesId).toBeGreaterThan(0);
      if (prose.ecologyHeading) {
        expect(EDIBLE.has(species.identity.edibility), speciesId).toBe(true);
        expect(prose.ecologyHeading, speciesId).toMatch(/^On trobar .+ i quan surten$/u);
      }
      const text = [...prose.identification, prose.lookalikes.text, ...prose.ecology, ...prose.cuisine].join(" ");
      expect(text, speciesId).not.toMatch(/fructificació|miceli|hàbitat potencial|finestra|\blectura\b/iu);
      // Territory context must never read as a confirmed collection spot.
      if (EDIBLE.has(species.identity.edibility)) expect(prose.ecology.join(" "), speciesId).toMatch(/no punts de collida/u);
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
