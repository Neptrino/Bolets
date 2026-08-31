import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SpeciesIndexPage from "@/app/bolets/page";
import MushroomInfographicPage from "@/app/bolets/infografia/page";
import EditorialTeamPage from "@/app/equip-editorial/page";
import GuidesPage from "@/app/guies/page";
import { DataSourceCredits, EditorialAttribution } from "@/components/editorial-attribution";
import { coreEditorialSources, environmentalSources } from "@/data/editorial";

describe("editorial attribution hierarchy", () => {
  it("keeps full trust information available on safety-sensitive pages", () => {
    const html = renderToStaticMarkup(createElement(EditorialAttribution, {
      contentId: "bolets-verinosos",
      sources: coreEditorialSources,
    }));

    expect(html).toContain('class="editorial-panel"');
    expect(html).not.toContain("editorial-panel--compact");
    expect(html).toContain("Autoria");
    expect(html).toContain("Editorial, no micològica");
    expect(html).toContain("Fonts consultades");
  });

  it("collapses source detail on compact profile and guide credits", () => {
    const duplicatedSources = [...coreEditorialSources, coreEditorialSources[0]];
    const html = renderToStaticMarkup(createElement(EditorialAttribution, {
      contentId: "species:cantharellus-cibarius",
      sources: duplicatedSources,
      variant: "compact",
    }));

    expect(html).toContain("editorial-panel--compact");
    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
    expect(html).toContain("Actualitzat");
    expect(html.match(new RegExp(coreEditorialSources[0].url, "g"))).toHaveLength(1);
  });

  it("shows provider credits without an editorial author on data tools", () => {
    const html = renderToStaticMarkup(createElement(DataSourceCredits, {
      label: "Fonts de les dades del mapa",
      sources: environmentalSources,
    }));

    expect(html).toContain("data-source-credits");
    expect(html).toContain("Fonts de les dades del mapa");
    expect(html).toContain("Servei Meteorològic de Catalunya (Meteocat)");
    expect(html).not.toContain("Aleix Ventayol");
    expect(html).not.toContain("Revisió");
  });

  it("renders unlinked runtime source labels in the shared panel variant", () => {
    const html = renderToStaticMarkup(createElement(DataSourceCredits, {
      label: "Fonts de les dades",
      description: "Cartografia i lectures ambientals",
      sources: ["ICGC Cobertes del sòl 2024", "Open-Meteo soil moisture"],
      variant: "panel",
    }));

    expect(html).toContain("data-source-credits--panel");
    expect(html).toContain("Cartografia i lectures ambientals");
    expect(html).toContain("ICGC Cobertes del sòl 2024");
    expect(html).not.toContain("href=");
  });

  it("accepts a concise linked credit without editorial source metadata", () => {
    const html = renderToStaticMarkup(createElement(DataSourceCredits, {
      label: "Font territorial",
      sources: [{ label: "Parc Natural del Montseny", url: "https://example.com/montseny" }],
    }));

    expect(html).toContain("Font territorial");
    expect(html).toContain("Parc Natural del Montseny");
    expect(html).toContain('href="https://example.com/montseny"');
  });

  it("omits the repeated panel from catalogue, guide index, infographic and policy pages", () => {
    for (const page of [SpeciesIndexPage, GuidesPage, MushroomInfographicPage, EditorialTeamPage]) {
      expect(renderToStaticMarkup(createElement(page))).not.toContain("editorial-panel");
    }
  });
});
