import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MushroomPartsGuidePage, { metadata } from "@/app/parts-dun-bolet/page";
import { buildSitemap as sitemap } from "@/app/sitemap";
import { getEditorialMetadata } from "@/data/editorial";

describe("mushroom parts guide", () => {
  const html = renderToStaticMarkup(createElement(MushroomPartsGuidePage));

  it("explains the relevant anatomy without presenting a single-trait identification method", () => {
    expect(html).toContain("Parts d’un bolet");
    for (const part of ["Barret", "Himeni", "Peu", "Anell, volva i base", "Espores i esporada", "Miceli"]) {
      expect(html).toContain(`<h3>${part}</h3>`);
    }
    expect(html).toContain("Cap part, per si sola, confirma l’espècie.");
    expect(html).toContain("no permet identificar ni consumir una espècie només amb un detall");
    expect(html).toContain('href="/bolets-verinosos"');
  });

  it("uses a distinct custom icon for each guide concept", () => {
    for (const icon of [
      "cap",
      "hymenium",
      "stem",
      "ring-volva",
      "flesh-reaction",
      "spores",
      "mycelium",
      "context",
    ]) {
      expect(html).toContain(`data-mushroom-icon="${icon}"`);
    }
  });

  it("renders an accessible interactive anatomy explorer", () => {
    expect(html).toContain("Explora l’anatomia del bolet");
    expect(html).toContain('/media/optimized/v7/editorial/parts-dun-bolet-infografia-v2.');
    expect(html).toContain('aria-label="Parts assenyalades del bolet"');
    expect(html).toContain('aria-controls="mushroom-part-detail mushroom-part-mobile-detail"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Toca un número o recorre els noms");
    expect(html).toContain('aria-label="Tanca el detall"');
    expect(html).toContain('data-open="false"');
  });

  it("publishes a concise canonical article metadata record", () => {
    expect(metadata.alternates?.canonical).toBe("/parts-dun-bolet");
    expect(metadata.title).toBe("Parts d’un bolet: guia d’identificació");
    expect(metadata.description?.length).toBeLessThanOrEqual(155);

    const sitemapEntry = sitemap().find((entry) => entry.url.endsWith("/parts-dun-bolet"));
    expect(sitemapEntry?.lastModified).toEqual(new Date("2026-08-31T00:00:00+02:00"));
    expect(getEditorialMetadata("parts-dun-bolet").updatedAt).toBe("2026-08-31");
  });
});
