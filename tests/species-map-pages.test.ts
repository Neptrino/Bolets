import { describe, expect, it } from "vitest";
import {
  getSpeciesMapPageBySlug,
  speciesMapHref,
  speciesMapPages,
  speciesMapPath,
} from "@/src/lib/species-map-pages";

describe("species map pages", () => {
  it("assigns each curated species a unique canonical path", () => {
    const paths = speciesMapPages.map((page) => speciesMapPath(page.speciesId));

    expect(new Set(paths).size).toBe(speciesMapPages.length);
    expect(speciesMapPath("lactarius-sanguifluus")).toBe("/map/rovello");
    expect(speciesMapPath("boletus-edulis")).toBe("/map/cep");
    expect(getSpeciesMapPageBySlug("cep")?.lead).toContain("fructificació de ceps");
  });

  it("keeps map state parameters on the canonical species route", () => {
    expect(speciesMapHref("lactarius-deliciosus", {
      region: "prepirineus",
      mode: "compatibility",
    })).toBe("/map/pinetell?region=prepirineus&mode=compatibility");
  });

  it("keeps non-curated species on the general parameterized map", () => {
    expect(speciesMapHref("amanita-caesarea", { region: "prelitoral" }))
      .toBe("/map?species=amanita-caesarea&region=prelitoral");
  });

  it("resolves only declared route slugs", () => {
    expect(getSpeciesMapPageBySlug("camagroc")?.speciesId).toBe("craterellus-lutescens");
    expect(getSpeciesMapPageBySlug("desconegut")).toBeUndefined();
  });
});
