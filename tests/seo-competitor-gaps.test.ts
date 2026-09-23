// @vitest-environment jsdom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PreserveMushroomsPage, { metadata } from "@/app/conservar-bolets/page";
import { buildSitemap as sitemap } from "@/app/sitemap";
import EdibleMushroomsPage from "@/app/bolets-comestibles/page";
import GuidesPage from "@/app/guies/page";
import { SiteFooter } from "@/components/site-footer";
import { getEditorialMetadata, mushroomPreservationSources, publicEditorialItems } from "@/data/editorial";
import { getSpecies } from "@/data/species";

describe("competitor keyword gaps", () => {
  it("answers priority species questions on their canonical profiles", () => {
    const targets = [
      ["craterellus-lutescens", "camagroc"],
      ["macrolepiota-procera", "apagallums"],
      ["tricholoma-terreum", "fredolic"],
      ["hygrophorus-latitabundus", "llenega negra"],
      ["hygrophorus-russula", "carlet"],
    ] as const;

    for (const [speciesId, phrase] of targets) {
      const species = getSpecies(speciesId)!;
      expect(species.seo?.title?.toLocaleLowerCase("ca-ES")).toContain(phrase);
      expect(species.seo?.description?.length).toBeLessThanOrEqual(155);
      expect(species.seo?.faqs).toHaveLength(2);
      expect(species.seo?.faqs?.every((faq) => faq.question.endsWith("?"))).toBe(true);
      expect(getEditorialMetadata(`species:${speciesId}`).updatedAt >= (["boletus-edulis", "craterellus-lutescens", "tricholoma-terreum", "lactarius-sanguifluus"].includes(speciesId) ? "2026-09-06" : "2026-08-31")).toBe(true);
    }

    expect(getSpecies("hygrophorus-russula")?.similarSpecies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scientificName: "Entoloma sinuatum", edibility: "toxic" }),
      ]),
    );
  });
});

describe("mushroom preservation guide", () => {
  const html = renderToStaticMarkup(createElement(PreserveMushroomsPage));
  const document = new DOMParser().parseFromString(html, "text/html");

  it("publishes a canonical, source-backed Catalan guide", () => {
    expect(metadata.alternates?.canonical).toBe("/conservar-bolets");
    expect(metadata.description!.length).toBeLessThanOrEqual(155);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.body.textContent).toContain("Escalda o cuina els bolets abans de congelar-los");
    expect(document.body.textContent).toContain("−18 °C");
    expect(document.body.textContent).toContain("màxim de dos mesos");
    expect(document.body.textContent).toContain("No tornis a congelar");
    expect(document.querySelectorAll("#preguntes details")).toHaveLength(10);
    expect(document.querySelector("#frescos")?.textContent).toContain("D’un a tres dies");
    for (const method of ["congelar", "assecar", "escabetx"]) {
      expect(document.querySelectorAll(`section#${method} .guide-step-flow li`)).toHaveLength(3);
    }
    expect(document.querySelector("#assecar")?.textContent).toContain("L’assecat no substitueix la cocció");
    expect(document.querySelector("#escabetx")?.textContent).toContain("un mínim de 30 minuts");
    expect(document.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
    for (const source of mushroomPreservationSources) {
      expect(html).toContain(source.url.replaceAll("&", "&amp;"));
    }
  });

  it("is indexed with truthful editorial metadata", () => {
    const editorial = getEditorialMetadata("conservar-bolets");
    expect(editorial.publishedAt).toBe("2026-08-31");
    expect(editorial.updatedAt).toBe("2026-09-23");
    expect(publicEditorialItems).toContain("conservar-bolets");
    expect(sitemap().filter((entry) => entry.url.endsWith("/conservar-bolets"))).toEqual([
      { url: "https://bolets.app/conservar-bolets", lastModified: new Date("2026-09-23T00:00:00Z") },
    ]);
  });

  it("is linked from high-value discovery and culinary surfaces", () => {
    expect(renderToStaticMarkup(createElement(SiteFooter))).toContain('href="/guies"');
    for (const component of [GuidesPage, EdibleMushroomsPage]) {
      expect(renderToStaticMarkup(createElement(component))).toContain('href="/conservar-bolets"');
    }
  });
});
