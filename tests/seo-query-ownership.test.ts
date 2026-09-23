// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Pair pages now embed the comparator, whose species selectors use the router.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/compare/cep-vs-cep-estiu",
  useSearchParams: () => new URLSearchParams(),
}));
import HomePage, { metadata as homeMetadata } from "@/app/page";
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
  it("preserves the broad homepage identity and links to the dedicated current overview", () => {
    const document = new DOMParser().parseFromString(renderToStaticMarkup(createElement(HomePage)), "text/html");

    expect(homeMetadata.title).toBe("Bolets de Catalunya: mapa, espècies i temporada");
    expect(homeMetadata.alternates?.canonical).toBe("/");
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelector("h1")?.textContent).toBe("Bolets de Catalunya.Mapa, espècies i temporada.");
    expect(Array.from(document.querySelectorAll("h1, h2"), heading => heading.textContent))
      .not.toContain("On trobar bolets avui i aquesta setmana?");
    // The reference block carries a descriptive heading instead of a slogan.
    expect(Array.from(document.querySelectorAll("h2"), heading => heading.textContent))
      .toContain("Guia d’espècies de bolets de Catalunya");

    const preview = document.querySelector(".home-map-feature");
    expect(preview?.querySelector("a.button")?.getAttribute("href")).toBe("/map");
    expect(preview?.querySelector("a.button")?.textContent?.trim()).toBe("Obrir el mapa");
    expect(preview?.querySelector("a.home-map-preview")?.getAttribute("href")).toBe("/map");
    // The overview keeps owning "on trobar bolets avui": the homepage links it with that exact anchor.
    expect(preview?.querySelector('a[href="/bolets-avui"]')?.className).toContain("button");
    expect(preview?.querySelector('a[href="/bolets-avui"]')?.textContent?.trim()).toBe("Consulta on trobar bolets avui");
    expect(document.querySelector(".hero-actions a")?.getAttribute("href")).toBe("/map");
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
      expect(getEditorialMetadata(`species:${target.speciesId}`).updatedAt >= (target.speciesId !== "cantharellus-cibarius" ? "2026-09-06" : "2026-08-31")).toBe(true);
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
    // The pair page is the comparator: no separate "open the comparator" hop.
    expect(html).toContain("Selecciona l’espècie dreta");
    expect(html).not.toContain("Obrir el comparador complet");
  });

  it("links the permanent season overview from the simplified footer", () => {
    const html = renderToStaticMarkup(createElement(SiteFooter));

    expect(html).toContain('href="/temporada"');
    expect(html).toContain(">Temporada</a>");
  });

  it("keeps the coordinated release URL-neutral", () => {
    const entries = buildSitemap();

    expect(entries).toHaveLength(220);
    expect(entries.some(({ url }) => url.endsWith("/noms-de-bolets-catala-castella"))).toBe(true);
    expect(new Set(entries.map(({ url }) => url)).size).toBe(entries.length);
  });
});
