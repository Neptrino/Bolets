import { describe, expect, it } from "vitest";
import { catalogueSpecies } from "@/data/catalogue";
import { speciesArticle, speciesHeadings, speciesProfileSections } from "@/src/lib/species-headings";

describe("species headings", () => {
  it("picks the Catalan article from the first word", () => {
    expect(speciesArticle("Cep").withArticle).toBe("el cep");
    expect(speciesArticle("Llenega blanca").withArticle).toBe("la llenega blanca");
    expect(speciesArticle("Ou de reig").withArticle).toBe("l’ou de reig");
    expect(speciesArticle("Apagallums").ofSpecies).toBe("de l’apagallums");
    expect(speciesArticle("Trompeta de la mort").ofSpecies).toBe("de la trompeta de la mort");
    expect(speciesArticle("Tricoloma tigrat").withArticle).toBe("el tricoloma tigrat");
    expect(speciesArticle("Cua de cavall").withArticle).toBe("la cua de cavall");
    expect(speciesArticle("Pixacà").withArticle).toBe("el pixacà");
  });

  it("builds sentence-cased, species-named section headings", () => {
    const cep = speciesHeadings("Cep");
    expect(cep.identify).toBe("Com reconèixer el cep");
    expect(cep.cuisine).toBe("El cep a la cuina");
    expect(cep.ecology).toBe("On i quan creix el cep");
    expect(cep.map).toBe("On podria créixer el cep a Catalunya");
    expect(cep.names).toBe("Noms del cep en català i castellà");
    expect(speciesHeadings("Apagallums").edible).toBe("Es pot menjar l’apagallums?");
    expect(speciesHeadings("Apagallums").cuisine).toBe("L’apagallums a la cuina");
  });

  it("never produces a bare or doubled article for any catalogue species", () => {
    for (const species of catalogueSpecies) {
      const { withArticle } = speciesArticle(species.identity.commonName);
      expect(withArticle).toMatch(/^(el |la |l’)\S/);
      expect(withArticle).not.toMatch(/^l’[^aeiouàáèéíïòóúüh]/i);
    }
  });
});

it("numbers every visible profile section consecutively, including optional FAQs", () => {
  for (const species of catalogueSpecies) {
    const sections = speciesProfileSections(species);
    expect(sections.map(section => section.number)).toEqual(sections.map((_, i) => String(i + 1).padStart(2, "0")));
    expect(new Set(sections.map(section => section.id)).size).toBe(sections.length);
    expect(sections.some(section => section.id === "preguntes")).toBe(Boolean(species.seo?.faqs?.length));
    expect(sections.some(section => section.id === "distribució")).toBe(!("scope" in species));
    expect(sections.at(-1)?.id).toBe("fonts");
  }
});
