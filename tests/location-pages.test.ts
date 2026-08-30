import { describe, expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import {
  areaProfiles,
  areasBySlug,
  getLocationPage,
  getPlace,
  locationPagePath,
  placePath,
  placeProfiles,
  speciesLocationPages,
} from "@/data/location-pages";

describe("curated species-location pages", () => {
  it("uses a stable area, place and species hierarchy", () => {
    const paths = speciesLocationPages.map(locationPagePath);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain("/zones/ripolles/camprodon/ceps");
    expect(paths).toContain("/zones/montseny/viladrau/ceps");
    expect(paths).toContain("/zones/montseny/viladrau/rossinyols");
    expect(paths).toContain("/zones/montseny/viladrau/camagrocs");
    expect(paths).toContain("/zones/montseny/viladrau/ous-de-reig");
    expect(paths).toContain("/zones/bergueda/rasos-de-peguera/fredolics");
    expect(paths).toContain("/zones/ports/horta-de-sant-joan/rovellons");
    expect(paths).toContain("/zones/ports/horta-de-sant-joan/pinetells");
    expect(paths).toContain("/zones/ripolles/camprodon/rovellons");
    expect(paths).toContain("/zones/ripolles/camprodon/pinetells");
    expect(paths).toContain("/zones/ripolles/sant-pau-de-seguries/trompetes-de-la-mort");
    expect(paths).toContain("/zones/ripolles/sant-pau-de-seguries/rossinyols");
    expect(paths).toContain("/zones/cerdanya/bellver-de-cerdanya/rovellons");
    expect(paths).toContain("/zones/cerdanya/bellver-de-cerdanya/pinetells");
    expect(placePath(getPlace("ripolles", "camprodon")!)).toBe("/zones/ripolles/camprodon");
    expect(paths.every((path) => /^\/zones\/[a-z-]+\/[a-z-]+\/[a-z-]+$/.test(path))).toBe(true);
  });

  it("publishes five distinct ecological guides for Viladrau", () => {
    const viladrauPages = speciesLocationPages.filter(
      (page) => page.areaSlug === "montseny" && page.placeSlug === "viladrau",
    );
    expect(viladrauPages).toHaveLength(5);
    expect(new Set(viladrauPages.map((page) => page.speciesId)).size).toBe(5);
  });

  it("keeps generic rovelló demand attached to the accurate pinetell profile", () => {
    const berguedaPinetellPages = speciesLocationPages.filter(
      (page) => page.areaSlug === "bergueda" && page.speciesId === "lactarius-deliciosus",
    );
    expect(berguedaPinetellPages).toHaveLength(2);
    for (const page of berguedaPinetellPages) {
      expect(page.titlePhrase).toContain("Pinetells (rovellons)");
      expect(page.searchName).toContain("rovellons");
    }
  });

  it("publishes a local guide for the true rovelló profile", () => {
    for (const [areaSlug, placeSlug] of [
      ["ports", "horta-de-sant-joan"],
      ["ripolles", "camprodon"],
      ["cerdanya", "bellver-de-cerdanya"],
    ] as const) {
      const rovelloPage = getLocationPage(areaSlug, placeSlug, "rovellons");
      expect(rovelloPage?.speciesId, `${areaSlug}/${placeSlug}`).toBe("lactarius-sanguifluus");
    }
  });

  it("publishes the source-backed trompeta guide in the Ripollès", () => {
    const page = getLocationPage(
      "ripolles",
      "sant-pau-de-seguries",
      "trompetes-de-la-mort",
    );
    expect(page?.speciesId).toBe("craterellus-cornucopioides");
    expect(getSpecies(page!.speciesId)?.ecologicalConfig.regions).toContain("pirineus");
  });

  it("publishes multiple guides for every curated place", () => {
    for (const place of placeProfiles) {
      const pages = speciesLocationPages.filter(
        (page) => page.areaSlug === place.areaSlug && page.placeSlug === place.slug,
      );
      expect(pages.length, `${place.areaSlug}/${place.slug}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("places every municipality or landscape inside a valid parent area", () => {
    expect(areaProfiles.length).toBeGreaterThanOrEqual(4);
    expect(placeProfiles.length).toBeGreaterThanOrEqual(8);
    for (const place of placeProfiles) {
      expect(areasBySlug[place.areaSlug], place.slug).toBeDefined();
      expect(place.mapCentre[0], `${place.slug} longitude`).toBeGreaterThanOrEqual(0.05);
      expect(place.mapCentre[0], `${place.slug} longitude`).toBeLessThanOrEqual(3.32);
      expect(place.mapCentre[1], `${place.slug} latitude`).toBeGreaterThanOrEqual(40.48);
      expect(place.mapCentre[1], `${place.slug} latitude`).toBeLessThanOrEqual(42.92);
    }
  });

  it("only publishes combinations compatible with the shared regional ecology", () => {
    for (const page of speciesLocationPages) {
      const species = getSpecies(page.speciesId);
      const area = areasBySlug[page.areaSlug];
      const place = getPlace(page.areaSlug, page.placeSlug);
      expect(species, page.speciesId).toBeDefined();
      expect(place, page.placeSlug).toBeDefined();
      expect(species!.ecologicalConfig.regions).toContain(area.regionId);
      expect(getLocationPage(page.areaSlug, page.placeSlug, page.speciesSlug)).toBe(page);
    }
  });

  it("requires substantive local copy rather than template-only doorway pages", () => {
    for (const page of speciesLocationPages) {
      const place = getPlace(page.areaSlug, page.placeSlug)!;
      expect(page.introduction.length).toBeGreaterThan(150);
      expect(page.habitatNote.length).toBeGreaterThan(150);
      expect(page.seasonNote.length).toBeGreaterThan(120);
      const distinctivePlaceTerm = place.name.toLocaleLowerCase("ca").split(" ").at(-1)!;
      expect(page.titlePhrase.toLocaleLowerCase("ca")).toContain(distinctivePlaceTerm);
      expect(place.source.url).toMatch(/^https:\/\//);
    }
  });

  it("offers several distinct external resources for every place", () => {
    for (const place of placeProfiles) {
      const resources = [place.source, ...place.resources];
      expect(resources, place.slug).toHaveLength(3);
      expect(new Set(resources.map((resource) => resource.url)).size, place.slug).toBe(3);
      for (const resource of resources) {
        expect(resource.title.length, place.slug).toBeGreaterThan(4);
        expect(resource.url, place.slug).toMatch(/^https:\/\//);
      }
    }
  });
});
