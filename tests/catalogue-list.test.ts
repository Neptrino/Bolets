import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EdibleMushroomsPage from "@/app/bolets-comestibles/page";
import { catalogueSpecies } from "@/data/catalogue";
import {
  catalogueCounts,
  catalogueFaqs,
  catalogueListRows,
  edibleFaqs,
  edibleGroups,
  speciesHabitatLabel,
  speciesSeasonLabel,
} from "@/src/lib/catalogue-list";
import { edibleSpecies } from "@/src/lib/species-collections";

describe("catalogue list", () => {
  const rows = catalogueListRows();

  it("lists every catalogue species with names, edibility, season and habitat", () => {
    expect(rows).toHaveLength(catalogueSpecies.length);
    for (const row of rows) {
      expect(row.href, row.speciesId).toMatch(/^\/bolets\/[a-z0-9-]+$/u);
      expect(row.spanish, row.speciesId).not.toBe("");
      expect(row.edibilityLabel, row.speciesId).not.toBe("");
      expect(row.season, row.speciesId).toMatch(/^[A-ZÀ-Ú]/u);
      expect(row.habitat, row.speciesId).toMatch(/^[A-ZÀ-Ú]/u);
      expect(["edible", "toxic", "other"]).toContain(row.group);
    }
  });

  it("labels seasons and habitats without the sentence prepositions", () => {
    const moixerno = catalogueSpecies.find((species) => species.speciesId === "calocybe-gambosa")!;
    expect(speciesSeasonLabel(moixerno)).toMatch(/^Primavera/u);
    expect(speciesHabitatLabel(moixerno)).toBe("Prats i pastures");
  });

  it("counts the groups consistently and writes the FAQ from them", () => {
    const counts = catalogueCounts(rows);
    expect(counts.edible + counts.toxic + counts.other).toBe(counts.total);
    expect(counts.excellent).toBeLessThanOrEqual(counts.edible);
    const faqs = catalogueFaqs(counts);
    expect(faqs).toHaveLength(4);
    expect(faqs[0].answer).toContain(`${counts.total} espècies`);
    for (const faq of faqs) {
      expect(faq.question).toMatch(/\?$/u);
      expect(faq.answer).toMatch(/\.$/u);
    }
  });
});

describe("edible list", () => {
  it("partitions the edible species by culinary value", () => {
    const groups = edibleGroups(edibleSpecies);
    const ids = groups.flatMap((group) => group.species.map((species) => species.speciesId));
    expect(new Set(ids).size).toBe(edibleSpecies.length);
    expect(groups.map((group) => group.id)).toEqual(["excellent", "good", "conditions"]);
    expect(groups.find((group) => group.id === "conditions")!.species.every((species) => species.identity.edibility === "edible_with_conditions" || species.culinaryProfile.kind !== "culinary" || species.culinaryProfile.rating < 2)).toBe(true);
  });

  it("answers with real species names and Spanish names", () => {
    const faqs = edibleFaqs(edibleSpecies);
    expect(faqs).toHaveLength(4);
    expect(faqs[0].answer).toMatch(/cep|rovelló|rossinyol/u);
    expect(faqs[2].answer).toContain("(");
    for (const faq of faqs) expect(faq.answer).toMatch(/\.$/u);
  });

  it("keeps the edible hub intact and renders the grouped table and FAQ", () => {
    const html = renderToStaticMarkup(createElement(EdibleMushroomsPage));
    expect(html).toContain("Com triar entre els tipus de bolets comestibles");
    expect(html).toContain("Llista de bolets comestibles per valor culinari");
    expect(html).toContain("Comestibles excel·lents");
    expect(html).toContain("Preguntes sobre els bolets comestibles");
    expect(html).toContain('"@type":"FAQPage"');
  });
});
