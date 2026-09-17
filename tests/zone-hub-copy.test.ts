import { describe, expect, it } from "vitest";
import { hubAltitudeBand, hubSeasonWindow, hubSpeciesList } from "@/components/hub-sections";
import { areaProfiles, areasBySlug, locationPagesForArea, placesForArea } from "@/data/location-pages";
import { getSpecies } from "@/data/species";
import { PIRINEU_AREA_SLUGS, pirineuAreas, pirineuGuideSpecies } from "@/src/lib/pirineu-guide";
import type { SpeciesProfile } from "@/src/lib/types";
import { altitudeBandPhrase, seasonWindowPhrase, zoneHubFaqs, zoneHubSummary } from "@/src/lib/zone-hub-copy";

function areaSpecies(areaSlug: string) {
  return [...new Set(locationPagesForArea(areaSlug).map((page) => page.speciesId))]
    .map((speciesId) => getSpecies(speciesId))
    .filter((species): species is SpeciesProfile => Boolean(species));
}

describe("zone hub prose", () => {
  it("gives every area forest and season notes written as full sentences", () => {
    for (const area of areaProfiles) {
      expect(area.forests, area.slug).toMatch(/^[A-ZÀ-Ú].{120,}\.$/su);
      expect(area.seasonNotes, area.slug).toMatch(/^[A-ZÀ-Ú].{120,}\.$/su);
      expect(area.forests, area.slug).not.toMatch(/TODO|lorem/iu);
      if (area.regulationNote) expect(area.regulationNote, area.slug).toMatch(/\.$/u);
    }
  });

  it("names a documented park only where the regulation note exists", () => {
    expect(areasBySlug.prades.regulationNote).toContain("Poblet");
    expect(areasBySlug.cerdanya.regulationNote).toContain("Cadí-Moixeró");
    expect(areasBySlug.guilleries.regulationNote).toBeUndefined();
  });
});

describe("zone hub copy", () => {
  it("turns the season window and altitude band into phrases", () => {
    expect(seasonWindowPhrase("Setembre – Novembre")).toBe("de setembre a novembre");
    expect(seasonWindowPhrase("Agost – Novembre")).toBe("d’agost a novembre");
    expect(seasonWindowPhrase("Octubre")).toBe("a l’octubre");
    expect(seasonWindowPhrase("Maig")).toBe("al maig");
    expect(seasonWindowPhrase("Sense pic definit")).toBe("sense pic definit");
    expect(altitudeBandPhrase("400–2100 m")).toBe("boscos entre 400 i 2.100 m");
    expect(altitudeBandPhrase("fins a 1800 m")).toBe("boscos fins a 1.800 m");
  });

  it("summarises every hub with its places, species and window", () => {
    for (const area of areaProfiles) {
      const places = placesForArea(area.slug);
      const species = areaSpecies(area.slug);
      const summary = zoneHubSummary({
        area,
        places,
        speciesList: hubSpeciesList(species),
        speciesCount: species.length,
        seasonWindow: hubSeasonWindow(species),
        altitudeBand: hubAltitudeBand(species),
      });
      expect(summary, area.slug).toMatch(/^Guia de bolets .*\.$/u);
      for (const place of places) expect(summary, area.slug).toContain(place.nameWithArticle);
      expect(summary, area.slug).toContain(species[0].identity.commonName.toLocaleLowerCase("ca"));
      expect(summary, area.slug).not.toMatch(/undefined|NaN/u);
    }
  });

  it("asks the five territory questions and answers them from the record", () => {
    const area = areasBySlug.bergueda;
    const species = areaSpecies(area.slug);
    const faqs = zoneHubFaqs({ area, places: placesForArea(area.slug), speciesList: hubSpeciesList(species), seasonWindow: hubSeasonWindow(species) });
    expect(faqs.map((faq) => faq.question)).toEqual([
      "Quan hi ha bolets al Berguedà?",
      "Quins bolets es poden trobar al Berguedà?",
      "On buscar bolets al Berguedà?",
      "Hi ha bolets al Berguedà avui?",
      "Cal permís per collir bolets al Berguedà?",
    ]);
    for (const faq of faqs) expect(faq.answer).toMatch(/\.$/u);
    expect(faqs[1].answer).toContain(area.forests);
    expect(faqs[2].answer).toContain("Castellar de n’Hug i els Rasos de Peguera");
    expect(faqs[4].answer).toContain("Cadí-Moixeró");
    const generic = zoneHubFaqs({ area: areasBySlug.guilleries, places: placesForArea("guilleries"), speciesList: "cep", seasonWindow: "Octubre" });
    expect(generic[4].answer).toContain("Depèn de la finca");
  });
});

describe("Pyrenees hub", () => {
  it("groups the Pyrenean and Prepyrenean hubs with their guide species", () => {
    expect(PIRINEU_AREA_SLUGS).toEqual(["ripolles", "cerdanya", "bergueda", "solsones"]);
    for (const { area, placeCount, guideCount, species } of pirineuAreas) {
      expect(["pirineus", "prepirineus"]).toContain(area.regionId);
      expect(placeCount).toBeGreaterThan(0);
      expect(guideCount).toBeGreaterThanOrEqual(placeCount);
      expect(species.length).toBeGreaterThan(0);
    }
    expect(pirineuGuideSpecies.map((species) => species.speciesId)).toContain("boletus-pinophilus");
    const tops = pirineuGuideSpecies.map((species) => species.ecologicalConfig.habitat.altitude[1]);
    expect([...tops].sort((left, right) => right - left)).toEqual(tops);
  });
});
