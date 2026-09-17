import { describe, expect, it } from "vitest";
import { catalogueSpecies, getCatalogueSpecies } from "@/data/catalogue";
import { getSpanishSpeciesNames } from "@/data/species-common-names";
import {
  speciesFaqs,
  speciesLead,
  speciesMetaDescription,
  speciesPageTitle,
  speciesSeasonPhrase,
} from "@/src/lib/species-summary";

const spanish = (speciesId: string) => getSpanishSpeciesNames(speciesId);

describe("species answer-first lead", () => {
  it("names the species in Catalan, Latin and Spanish and states edibility, season and habitat", () => {
    const moixerno = getCatalogueSpecies("calocybe-gambosa")!;
    const lead = speciesLead(moixerno, spanish(moixerno.speciesId));

    expect(lead).toMatch(/^El moixernó \(Calocybe gambosa\), en castellà seta de San Jorge o perrechico, és un bolet comestible excel·lent que surt a la primavera/);
    expect(lead).toContain("en prats");
    expect(lead).toMatch(/m d’altitud\.$/);
  });

  it("states toxicity in the first sentence", () => {
    const farinera = getCatalogueSpecies("amanita-phalloides")!;
    expect(speciesLead(farinera, spanish(farinera.speciesId))).toMatch(/és un bolet (molt )?tòxic que surt/);
  });

  it("keeps sourced season text for reference-only species", () => {
    const reference = catalogueSpecies.find((species) => "scope" in species)!;
    expect(speciesSeasonPhrase(reference)).toMatch(/^(a |de )/);
    expect(speciesLead(reference, spanish(reference.speciesId))).not.toContain("altitud");
  });

  it("builds a clean lead, snippet and title for every catalogue species", () => {
    for (const species of catalogueSpecies) {
      const names = spanish(species.speciesId);
      const lead = speciesLead(species, names);
      expect(lead, species.speciesId).toMatch(/^(El |La |L’)\S.*\.$/u);
      expect(lead, species.speciesId).toContain(species.identity.scientificName);
      expect(lead, species.speciesId).not.toMatch(/undefined|null|\.\.|\s{2}|\s,/u);

      const description = speciesMetaDescription(species, names);
      expect(description.length, species.speciesId).toBeLessThanOrEqual(155);
      expect(description, species.speciesId).toContain(species.identity.commonName);

      const title = speciesPageTitle(species);
      expect(title, species.speciesId).not.toContain("…");
      expect(title.length, species.speciesId).toBeLessThanOrEqual(49);
      expect(title, species.speciesId).toContain(species.identity.commonName.split(" ")[0]);
    }
  });

  it("falls back to a shorter title pattern instead of truncating long names", () => {
    const trompeta = getCatalogueSpecies("craterellus-cornucopioides")!;
    expect(speciesPageTitle(trompeta)).toBe("Trompeta de la mort: identificació i temporada");
    const cep = getCatalogueSpecies("boletus-edulis")!;
    expect(speciesPageTitle(cep)).toBe(cep.seo!.title);
  });
});

describe("species FAQ", () => {
  it("gives every species a Spanish-name question and complete answers", () => {
    for (const species of catalogueSpecies) {
      const faqs = speciesFaqs(species, spanish(species.speciesId));
      expect(faqs.length, species.speciesId).toBeGreaterThanOrEqual(4);
      expect(faqs.some((faq) => /castellà/u.test(faq.question)), species.speciesId).toBe(true);
      expect(new Set(faqs.map((faq) => faq.question)).size).toBe(faqs.length);
      for (const faq of faqs) {
        expect(faq.question, species.speciesId).toMatch(/\?$/u);
        expect(faq.answer, species.speciesId).toMatch(/\.$/u);
        expect(faq.answer, species.speciesId).not.toMatch(/undefined|null|\.\./u);
      }
    }
  });

  it("keeps curated questions first and does not repeat a topic they cover", () => {
    const curatedSpecies = catalogueSpecies.filter((species) => species.seo?.faqs?.length);
    expect(curatedSpecies.length).toBeGreaterThan(0);
    for (const species of curatedSpecies) {
      const curated = species.seo!.faqs!;
      const faqs = speciesFaqs(species, spanish(species.speciesId));
      expect(faqs.slice(0, curated.length)).toEqual(curated);
      const generated = faqs.slice(curated.length).map((faq) => faq.question);
      if (curated.some((faq) => /comestible|menjar|es pot/iu.test(faq.question))) {
        expect(generated.some((question) => /és comestible\?$/u.test(question))).toBe(false);
      }
    }
  });

  it("answers the Spanish-name question with the name and the shared scientific name", () => {
    const rovello = getCatalogueSpecies("lactarius-sanguifluus")!;
    const faq = speciesFaqs(rovello, spanish(rovello.speciesId)).find((item) => /castellà/u.test(item.question))!;
    expect(faq.question).toBe("Com es diu el rovelló en castellà?");
    expect(faq.answer).toContain("níscalo sanguíneo");
    expect(faq.answer).toContain("Lactarius sanguifluus");
  });
});
