import { describe, expect, it } from "vitest";
import {
  filterGuideDirectoryItems,
  type GuideDirectoryItem,
} from "@/src/lib/guide-directory";

const guides: GuideDirectoryItem[] = [
  {
    href: "/zones/ripolles/camprodon/ceps",
    title: "Ceps a Camprodon",
    introduction: "Boscos montans compatibles.",
    speciesId: "boletus-edulis",
    speciesName: "Cep",
    scientificName: "Boletus edulis",
    areaSlug: "ripolles",
    areaName: "Ripollès",
    areaType: "comarca",
    placeName: "Camprodon",
    placeType: "municipi",
    habitats: ["Fagedes", "Pinedes"],
    altitudeLabel: "400–2.000 m",
  },
  {
    href: "/zones/garrotxa/santa-pau/trompetes",
    title: "Trompetes de la mort a Santa Pau",
    introduction: "Planifolis humits sobre sòls volcànics.",
    speciesId: "craterellus-cornucopioides",
    speciesName: "Trompeta de la mort",
    scientificName: "Craterellus cornucopioides",
    areaSlug: "garrotxa",
    areaName: "Garrotxa",
    areaType: "comarca",
    placeName: "Santa Pau",
    placeType: "municipi",
    habitats: ["Fagedes", "Rouredes"],
    altitudeLabel: "100–1.500 m",
  },
];

const emptyFilters = { query: "", speciesId: "", areaSlug: "", habitat: "" };

describe("guide directory filters", () => {
  it("matches free text without requiring Catalan accents", () => {
    expect(filterGuideDirectoryItems(guides, { ...emptyFilters, query: "ripolles" }))
      .toEqual([guides[0]]);
  });

  it("combines species, territory and habitat filters", () => {
    expect(filterGuideDirectoryItems(guides, {
      query: "",
      speciesId: "craterellus-cornucopioides",
      areaSlug: "garrotxa",
      habitat: "Fagedes",
    })).toEqual([guides[1]]);
  });

  it("returns an empty result for an incompatible combination", () => {
    expect(filterGuideDirectoryItems(guides, {
      query: "",
      speciesId: "boletus-edulis",
      areaSlug: "garrotxa",
      habitat: "",
    })).toEqual([]);
  });
});
