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
    expect(html).toContain("La puntuació baixa si hi ha poc hàbitat adequat");
    expect(html).not.toContain("F = 100 × P × W");
    expect(html).not.toContain("O = H × F");
    expect(html).not.toContain("P · temporada");
    expect(html).not.toContain("W · estat hídric");
    for (const heading of [
      "Hàbitat adequat",
      "Condicions per fructificar",
      "Puntuació de la cel·la",
      "Calendari suau",
      "Sòl i pluja efectiva",
      "14, 21 o 26 dies",
      "Memòria tèrmica i extrems",
      "Atmosfera i ratxa seca",
    ]) {
      expect(html).toContain(`<h3>${heading}</h3>`);
    }
    expect(html.match(/class="rain-index-flow"/g)).toHaveLength(1);
    expect(html.match(/class="rain-factor-grid"/g)).toHaveLength(1);
    expect(html.match(/class="rain-evidence-grid"/g)).toHaveLength(1);
    expect(html).toContain("El vent no es puntua directament");
    expect(html).not.toContain("energia del sòl");
    expect(html).not.toContain("Temperatura acumulada");
    expect(html).not.toContain("3, 7 i 30 dies");
  });

  it("derives the six example windows from the resolved species model", () => {
    for (const [species, waterDays, temperatureDays] of [
      ["Rovelló", 21, 20],
      ["Pinetell", 21, 20],
      ["Cep", 26, 20],
      ["Camagroc", 21, 20],
      ["Múrgola", 14, 14],
      ["Camasec", 14, 14],
    ] as const) {
      const card = articleFor(html, species);
      expect(card).toContain(`<dt>Finestra hídrica</dt><dd>${waterDays} dies</dd>`);
      expect(card).toContain(`<dt>Finestra tèrmica</dt><dd>${temperatureDays} dies</dd>`);
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
