import { describe, expect, it } from "vitest";
import { extractSitemapLocations, inspectHtml, summarizeAudit } from "@/scripts/audit-seo-routes.mjs";

describe("SEO route audit", () => {
  it("extracts sitemap locations and decodes URL entities", () => {
    const xml = `<?xml version="1.0"?><urlset><url><loc>https://bolets.app/bolets</loc></url><url><loc>https://bolets.app/map?x=1&amp;y=2</loc></url></urlset>`;
    expect(extractSitemapLocations(xml)).toEqual([
      "https://bolets.app/bolets",
      "https://bolets.app/map?x=1&y=2",
    ]);
  });

  it("reads core metadata and normalizes internal links", () => {
    const html = `<!doctype html><html><head><title>Guia &amp; mapa</title><meta name="description" content="Descripció útil"><meta name="robots" content="index, follow"><link rel="canonical" href="https://bolets.app/bolets"></head><body><h1>Bolets <em>de Catalunya</em></h1><a href="/map?species=all#top">Mapa</a><a href="https://example.com">Fora</a></body></html>`;
    expect(inspectHtml(html, "https://bolets.app/bolets")).toEqual({
      title: "Guia & mapa",
      description: "Descripció útil",
      h1: ["Bolets de Catalunya"],
      canonical: "https://bolets.app/bolets",
      noindex: false,
      internalLinks: ["https://bolets.app/map"],
    });
  });

  it("flags indexation failures and pages with no inbound links", () => {
    const pages = [
      { url: "https://bolets.app", status: 200, title: "Inici", description: "Portada", h1: ["Inici"], canonical: "https://bolets.app", noindex: false, internalLinks: ["https://bolets.app/bolets"] },
      { url: "https://bolets.app/bolets", status: 200, title: "Bolets", description: "Catàleg", h1: ["Bolets"], canonical: "https://bolets.app/bolets", noindex: false, internalLinks: [] },
      { url: "https://bolets.app/orfe", status: 200, title: "", description: "", h1: [], canonical: "", noindex: true, internalLinks: [] },
    ];
    const report = summarizeAudit(pages, pages.map((page) => page.url));

    expect(report.critical.missingTitles).toEqual(["https://bolets.app/orfe"]);
    expect(report.critical.noindexInSitemap).toEqual(["https://bolets.app/orfe"]);
    expect(report.warnings.orphanCandidates).toEqual(["https://bolets.app/orfe"]);
  });
});
