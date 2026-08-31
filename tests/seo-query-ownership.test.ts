import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ComparisonLandingPage from "@/app/compare/[slug]/page";
import { generateMetadata as generateSpeciesMetadata } from "@/app/bolets/[slug]/page";
import { metadata as mapMetadata } from "@/app/map/page";
import { buildSitemap } from "@/app/sitemap";
import { SiteFooter } from "@/components/site-footer";
import { getEditorialMetadata } from "@/data/editorial";
import { getSpecies } from "@/data/species";
import { speciesSlugForId } from "@/data/species-slugs";
import { speciesPath } from "@/src/lib/seo";
import {
  MAP_PREDICTION_DESCRIPTION,
  MAP_PREDICTION_TITLE,
} from "@/src/lib/map-seo";

describe("SEO query ownership", () => {
  it("lets the current overview own the full current-intent heading", () => {
    const homepage = readFileSync("app/page.tsx", "utf8");

    expect(homepage).toContain("Condicions actuals per territori");
    expect(homepage).toContain("On trobar bolets avui <ArrowUpRight");
    expect(homepage).toContain('href="/bolets-avui"');
    expect(homepage).not.toContain("On trobar bolets avui i aquesta setmana?");
  });

  it("lets the map own prediction searches without changing its visible heading", () => {
    const mapPage = readFileSync("app/map/map-page-content.tsx", "utf8");

    expect(mapMetadata.title).toBe(MAP_PREDICTION_TITLE);
    expect(mapMetadata.description).toBe(MAP_PREDICTION_DESCRIPTION);
    expect(MAP_PREDICTION_DESCRIPTION.length).toBeLessThanOrEqual(155);
    expect(mapMetadata.alternates?.canonical).toBe("/map");
    expect(mapMetadata.openGraph?.title).toBe(MAP_PREDICTION_TITLE);
    expect(mapPage).toContain(': "Mapa de bolets de Catalunya");');
    expect(mapPage).toContain("keywords: MAP_PREDICTION_KEYWORDS");
  });

  it("publishes exact, bounded metadata for the three head-term species owners", async () => {
    const targets = [
      {
        speciesId: "boletus-edulis",
        title: "Cep bolet: identificació, hàbitat i temporada",
        keywords: ["cep bolet", "bolet cep", "ceps bolets"],
      },
      {
        speciesId: "cantharellus-cibarius",
        title: "Rossinyol bolet: identificació i confusions",
        keywords: ["rossinyol bolet", "bolet rossinyol", "rossinyols bolets"],
      },
      {
        speciesId: "lactarius-sanguifluus",
        title: "Rovelló bolet: identificació i diferències",
        keywords: ["rovelló bolet", "bolet rovelló", "rovello bolet"],
      },
    ] as const;

    for (const target of targets) {
      const species = getSpecies(target.speciesId)!;
      const metadata = await generateSpeciesMetadata({
        params: Promise.resolve({ slug: speciesSlugForId(target.speciesId) }),
      });

      expect(species.seo?.title).toBe(target.title);
      expect(species.seo?.keywords).toEqual(target.keywords);
      expect(species.seo?.keywords).not.toContain("rovellons");
      expect(species.seo?.description?.length).toBeLessThanOrEqual(155);
      expect(metadata.title).toBe(target.title);
      expect(metadata.alternates?.canonical).toBe(speciesPath(species));
      expect(getEditorialMetadata(`species:${target.speciesId}`).updatedAt).toBe("2026-08-31");
    }
  });

  it("links curated comparisons back to both primary species guides", async () => {
    const page = await ComparisonLandingPage({
      params: Promise.resolve({ slug: "cep-vs-cep-estiu" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('href="/bolets/cep"');
    expect(html).toContain("Guia principal: Cep");
    expect(html).toContain('href="/bolets/cep-d-estiu"');
    expect(html).toContain("Guia principal: Cep d’estiu");
    expect(html).toContain("Obrir el comparador complet");
  });

  it("links the permanent season overview and the current seasonal guide from the footer", () => {
    const html = renderToStaticMarkup(createElement(SiteFooter));

    expect(html).toContain('href="/temporada"');
    expect(html).toContain("Temporada de bolets");
    expect(html).toMatch(/href="\/bolets-(?:de-primavera|d-estiu|de-tardor|d-hivern)"/);
  });

  it("keeps the coordinated release URL-neutral", () => {
    const entries = buildSitemap();

    expect(entries).toHaveLength(205);
    expect(new Set(entries.map(({ url }) => url)).size).toBe(entries.length);
  });
});
