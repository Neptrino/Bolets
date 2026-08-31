import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RainGuidePage from "@/app/quan-surten-els-bolets-despres-de-ploure/page";
import sitemap from "@/app/sitemap";
import { getEditorialMetadata, hydrothermalScientificSources } from "@/data/editorial";

function articleFor(html: string, commonName: string) {
  const start = html.indexOf(`<span>${commonName}</span>`);
  const end = html.indexOf("</article>", start);
  expect(start, `${commonName} should appear in the guide`).toBeGreaterThanOrEqual(0);
  expect(end, `${commonName} card should close`).toBeGreaterThan(start);
  return html.slice(start, end);
}

describe("rain response guide", () => {
  const html = renderToStaticMarkup(createElement(RainGuidePage));

  it("explains the hydrothermal model without promising a fruiting date", () => {
    expect(html).toContain("La pluja no activa un compte enrere");
    expect(html).toContain("La valoració baixa si hi ha poc terreny adequat");
    expect(html).not.toContain("F = 100 × P × W");
    expect(html).not.toContain("O = H × F");
    expect(html).not.toContain("P · temporada");
    expect(html).not.toContain("W · estat hídric");
    for (const heading of [
      "Bosc adequat",
      "Moment favorable",
      "Resultat conjunt",
      "El moment de l’any",
      "La humitat que ja hi havia",
      "Quantitat i repartiment",
      "Fred, calor i extrems",
      "Vent i dies secs",
    ]) {
      expect(html).toContain(`<h3>${heading}</h3>`);
    }
    expect(html.match(/class="rain-index-flow"/g)).toHaveLength(1);
    expect(html.match(/class="rain-factor-grid"/g)).toHaveLength(1);
    expect(html.match(/class="rain-evidence-grid"/g)).toHaveLength(1);
    expect(html).toContain("El vent i una ratxa seca poden fer perdre ràpidament la humitat");
    expect(html).not.toContain("energia del sòl");
    expect(html).not.toContain("Temperatura acumulada");
    expect(html).not.toContain("3, 7 i 30 dies");
  });

  it("keeps the six examples focused on field-readable guidance", () => {
    for (const species of ["Rovelló", "Pinetell", "Cep", "Camagroc", "Múrgola", "Camasec"] as const) {
      const card = articleFor(html, species);
      expect(card).toContain("<dt>Resposta habitual</dt>");
      expect(card).toContain("<dt>Aigua que necessita</dt>");
      expect(card).not.toContain("Finestra hídrica");
      expect(card).not.toContain("Finestra tèrmica");
      expect(card).toContain(`aria-label="Veure la fitxa de ${species}"`);
    }
  });

  it("links the guide to live conditions, method, and primary evidence", () => {
    expect(html).toContain('href="/map"');
    expect(html).toContain('href="/bolets-avui"');
    expect(html).toContain('href="/metode#prediccio"');
    for (const source of hydrothermalScientificSources) {
      expect(html).toContain(`href="${source.url}"`);
      expect(html).toContain(`aria-label="Consultar l’estudi: ${source.title}"`);
    }
  });

  it("publishes matching article and sitemap revision metadata", () => {
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/s);
    expect(jsonLdMatch).not.toBeNull();
    const jsonLd = JSON.parse(jsonLdMatch![1]!) as {
      description: string;
      citation: string[];
      dateModified: string;
    };
    expect(jsonLd.description).toContain("La pluja no activa un compte enrere");
    expect(jsonLd.citation).toEqual(hydrothermalScientificSources.map((source) => source.url));
    expect(jsonLd.dateModified).toBe("2026-08-14");
    expect(getEditorialMetadata("quan-surten-els-bolets-despres-de-ploure").updatedAt).toBe("2026-08-14");

    const sitemapEntry = sitemap().find((entry) =>
      entry.url.endsWith("/quan-surten-els-bolets-despres-de-ploure")
    );
    expect(sitemapEntry?.lastModified).toEqual(new Date("2026-08-14T00:00:00+02:00"));
  });
});
