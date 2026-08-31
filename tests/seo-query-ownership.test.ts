import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ComparisonLandingPage from "@/app/compare/[slug]/page";
import { generateMetadata as generateSpeciesMetadata } from "@/app/bolets/[slug]/page";
import { buildSitemap } from "@/app/sitemap";
import { SiteFooter } from "@/components/site-footer";
import { getEditorialMetadata } from "@/data/editorial";
import { getSpecies } from "@/data/species";

describe("SEO query ownership", () => {
  it("lets the current overview own the full current-intent heading", () => {
    const homepage = readFileSync("app/page.tsx", "utf8");

    expect(homepage).toContain("Condicions actuals per territori");
    expect(homepage).toContain("On trobar bolets avui <ArrowUpRight");
    expect(homepage).toContain('href="/bolets-avui"');
    expect(homepage).not.toContain("On trobar bolets avui i aquesta setmana?");
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
        params: Promise.resolve({ slug: target.speciesId }),
      });

      expect(species.seo?.title).toBe(target.title);
      expect(species.seo?.keywords).toEqual(target.keywords);
      expect(species.seo?.keywords).not.toContain("rovellons");
      expect(species.seo?.description?.length).toBeLessThanOrEqual(155);
      expect(metadata.title).toBe(target.title);
      expect(metadata.alternates?.canonical).toBe(`/bolets/${target.speciesId}`);
      expect(getEditorialMetadata(`species:${target.speciesId}`).updatedAt).toBe("2026-08-31");
    }
  });

  it("links curated comparisons back to both primary species guides", async () => {
    const page = await ComparisonLandingPage({
      params: Promise.resolve({ slug: "cep-vs-cep-estiu" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('href="/bolets/boletus-edulis"');
    expect(html).toContain("Guia principal: Cep");
    expect(html).toContain('href="/bolets/boletus-reticulatus"');
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

    expect(entries).toHaveLength(204);
    expect(new Set(entries.map(({ url }) => url)).size).toBe(entries.length);
  });
});
