import { describe, expect, it } from "vitest";
import { catalogueSpecies } from "@/data/catalogue";
import { catalogueSearchQuery, filterCatalogue } from "@/src/lib/catalogue-search";
import { toSpeciesCardProfile } from "@/src/lib/species-card-profile";

const cards = catalogueSpecies.map(toSpeciesCardProfile);
const idsFor = (query: string) => filterCatalogue(cards, query).map((card) => card.speciesId);

describe("catalogue discovery", () => {
  it.each([
    ["  PINETELL   BORD ", "lactarius-chrysorrheus"],
    ["cigro", "leccinellum-lepidum"],
    ["bufa del diable", "calvatia-gigantea"],
    ["aurantiaca hygrophoropsis", "hygrophoropsis-aurantiaca"],
    ["niscalo", "lactarius-deliciosus"],
  ])("finds canonical profiles by the reader's name: %s", (query, id) => {
    expect(idsFor(query)).toContain(id);
  });

  it("treats accents and common separators consistently without discarding any search term", () => {
    expect(idsFor("ou de reig")).toEqual(idsFor("OU-DE-REIG"));
    expect(idsFor("rovello")).toEqual(idsFor("rovelló"));
    expect(idsFor("cep nosuchname")).toEqual([]);
    expect(filterCatalogue(cards, "   ")).toHaveLength(catalogueSpecies.length);
  });

  it("keeps descriptive species searchable without manufacturing ecological values", () => {
    const result = filterCatalogue(cards, "Hygrophoropsis aurantiaca");
    expect(result).toHaveLength(1);
    expect(result[0].ecologicalConfig.seasonality).toBeNull();
    expect(result[0].ecologicalConfig.habitat.altitude).toBeNull();
  });

  it("preserves shared regional names but does not combine unrelated aliases", () => {
    expect(idsFor("pinetell bord").sort()).toEqual(["lactarius-chrysorrheus", "lactarius-torminosus"]);
    expect(idsFor("puagra llora")).toEqual(["russula-cyanoxantha"]);
  });

  it("bounds public search input and rejects ambiguous repeated parameters", () => {
    expect(catalogueSearchQuery(["cep", "rovelló"])).toBe("");
    expect(catalogueSearchQuery(undefined)).toBe("");
    expect(catalogueSearchQuery("  cep  ")).toBe("cep");
    expect(catalogueSearchQuery("a".repeat(1000))).toHaveLength(120);
  });
});
