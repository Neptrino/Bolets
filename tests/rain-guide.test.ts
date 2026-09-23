import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RainGuidePage from "@/app/quan-surten-els-bolets-despres-de-ploure/page";
import { buildSitemap as sitemap, editorialLastModified } from "@/app/sitemap";
import { getEditorialMetadata, hydrothermalScientificSources } from "@/data/editorial";

function articleFor(html: string, commonName: string) {
  const start = html.indexOf(`<h3>${commonName}</h3>`);
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
    expect(html.match(/class="guide-step-flow"/g)).toHaveLength(1);
    expect(html.match(/class="guide-factor-grid"/g)).toHaveLength(1);
    expect(html.match(/class="rain-evidence-grid"/g)).toHaveLength(1);
    expect(html).toContain("El vent i una ratxa seca poden fer perdre ràpidament la humitat");
    expect(html).not.toContain("energia del sòl");
    expect(html).not.toContain("Temperatura acumulada");
    expect(html).not.toContain("3, 7 i 30 dies");
  });

  it("answers the question first with the scored windows and shared thresholds", () => {
    const answer = html.slice(html.indexOf('class="guide-answer"'), html.indexOf("</aside>"));
    expect(answer).toMatch(/<h2[^>]*>Els bolets surten entre \d+ i \d+ dies després de ploure, segons l’espècie\.<\/h2>/);
    expect(answer.match(/<li>/g)?.length).toBeGreaterThanOrEqual(3);
    expect(answer).toMatch(/Dies \d+–\d+/);
    expect(answer).toMatch(/Amb uns <strong>\d+ mm<\/strong>/);
  });

  it("keeps the eight examples focused on field-readable guidance", () => {
    for (const species of ["Cep", "Camagroc", "Rossinyol", "Rovelló", "Fredolic", "Pinetell", "Múrgola", "Camasec"] as const) {
      const card = articleFor(html, species);
      // The strip is derived from the shipped model parameters
      // (rain-response-summary), so it always prints the scored window.
      expect(card).toContain('class="rain-timeline-bar"');
      expect(card).toMatch(/dies \d+–\d+/);
      // Every species shares the rain thresholds today, so the cards leave
      // them to the short answer instead of repeating the same millimetres.
      expect(card).not.toMatch(/\d+ mm/);
      expect(card).toContain("<dt>Humitat prèvia</dt>");
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
      "@graph": Array<{
        "@type": string;
        description?: string;
        citation?: string[];
        dateModified?: string;
      }>;
    };
    const article = jsonLd["@graph"].find((entry) => entry["@type"] === "Article");
    const faq = jsonLd["@graph"].find((entry) => entry["@type"] === "FAQPage");
    expect(article?.description).toMatch(/^Els bolets surten entre \d+ i \d+ dies després de ploure/);
    expect(article?.citation).toEqual(hydrothermalScientificSources.map((source) => source.url));
    expect(article?.dateModified).toBe(getEditorialMetadata("quan-surten-els-bolets-despres-de-ploure").updatedAt);
    expect(faq).toBeDefined();
    expect(getEditorialMetadata("quan-surten-els-bolets-despres-de-ploure").updatedAt >= "2026-09-03").toBe(true);

    const sitemapEntry = sitemap().find((entry) =>
      entry.url.endsWith("/quan-surten-els-bolets-despres-de-ploure")
    );
    expect(sitemapEntry?.lastModified).toEqual(editorialLastModified("quan-surten-els-bolets-despres-de-ploure"));
  });
});
