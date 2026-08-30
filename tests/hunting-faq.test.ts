// @vitest-environment jsdom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HuntingFaqPage, { metadata } from "@/app/preguntes-frequents-bolets/page";
import GuidesPage from "@/app/guies/page";
import sitemap from "@/app/sitemap";
import { SiteFooter } from "@/components/site-footer";
import { SeasonPageContent } from "@/components/season-page-content";
import CollectingRulesGuidePage from "@/app/normativa-bolets/page";
import { getEditorialMetadata, publicEditorialItems } from "@/data/editorial";

const path = "/preguntes-frequents-bolets";
const html = renderToStaticMarkup(createElement(HuntingFaqPage));
const document = new DOMParser().parseFromString(html, "text/html");

describe("mushroom-hunting FAQ", () => {
  it("server-renders fifteen practical answers in four linked topics", () => {
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.querySelectorAll("section[aria-labelledby]")).toHaveLength(4);
    expect(document.querySelectorAll("details")).toHaveLength(15);
    expect(document.querySelectorAll("details[open]")).toHaveLength(1);
    expect(document.querySelector("details")?.hasAttribute("open")).toBe(true);
    for (const question of document.querySelectorAll("details")) {
      expect(question.querySelector("summary h3")?.textContent?.endsWith("?")).toBe(true);
      expect(question.querySelector("p")?.textContent?.length).toBeGreaterThan(100);
      expect(question.querySelectorAll('a[href^="/"]').length).toBeGreaterThanOrEqual(1);
      expect(question.querySelectorAll('a[href^="/"]').length).toBeLessThanOrEqual(2);
    }
    const anchors = document.querySelectorAll('nav[aria-label="Temes de les preguntes freqüents"] a');
    expect(anchors).toHaveLength(4);
    for (const anchor of anchors) {
      expect(document.querySelector(anchor.getAttribute("href")!)?.tagName).toBe("H2");
    }
  });

  it("gives every answer a unique native fragment target and an accessible permalink", () => {
    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const details of document.querySelectorAll("details")) {
      const answer = details.querySelector("div[id]")!;
      const link = answer.querySelector(`a[href="#${answer.id}"]`);
      expect(link?.getAttribute("aria-label")).toContain(details.querySelector("h3")!.textContent);
      expect(link?.textContent).toContain("Enllaç a aquesta resposta");
      expect(answer.parentElement).toBe(details);
    }
  });

  it("directs suspected poisoning to medical care, not online identification", () => {
    const answer = document.querySelector("#intoxicacio")!;
    expect(answer.textContent).toContain("assistència mèdica immediata");
    expect(answer.textContent).toContain("sense endarrerir l’atenció");
    expect(answer.textContent).toContain("encara que es trobin bé");
    expect(answer.querySelector('a[href="/bolets-verinosos"]')).not.toBeNull();
    expect(answer.querySelector('a[href="https://canalsalut.gencat.cat/ca/salut-a-z/i/intoxicacio-bolets/"]')).not.toBeNull();
  });

  it("links to real canonical guides rather than isolated FAQ-only destinations", () => {
    const canonicalUrls = new Set(sitemap().map((entry) => entry.url));
    const links = [...document.querySelectorAll('a[href^="/"]')];
    for (const link of links) {
      const url = new URL(link.getAttribute("href")!, "https://bolets.app");
      url.hash = "";
      expect(canonicalUrls.has(url.href), url.href).toBe(true);
    }
    for (const target of ["/temporada", "/bolets-avui", "/zones", "/zones/rovellons", "/zones/ceps", "/bolets-verinosos", "/normativa-bolets", "/quan-surten-els-bolets-despres-de-ploure"]) {
      expect(document.querySelector(`details a[href="${target}"]`), target).not.toBeNull();
    }
  });

  it("keeps safety, uncertain conditions and local permissions explicit", () => {
    const text = document.body.textContent!;
    expect(text).toContain("Editorial, no micològica");
    expect(text).not.toMatch(/revisió\s+(?:micològica\s+)?pendent\b|no basta/);
    expect(text).toContain("no confirma que n’estiguin sortint avui");
    expect(text).toContain("zero tampoc demostra absència");
    expect(text).toContain("no el consumeixis");
    expect(text).toContain("Confirma les condicions vigents amb el gestor");
    expect(text).not.toContain("€");
    const sources = document.querySelectorAll('ul[aria-label="Fonts d’aquesta resposta"] a');
    expect(sources.length).toBeGreaterThanOrEqual(5);
    for (const source of sources) expect(new URL(source.getAttribute("href")!).hostname).toMatch(/(?:\.gencat\.cat$|^doi\.org$)/);
  });

  it("addresses researched questions without overstating identification or harvesting evidence", () => {
    const text = document.body.textContent!;
    expect(text).toContain("On trobar bolets avui o aquesta setmana?");
    expect(text).toContain("el resultat d’una app o un sol tret no són suficients");
    expect(text).toContain("És millor tallar o arrencar els bolets?");
    expect(text).toContain("l’estudi no es pot extrapolar a qualsevol bosc");
    expect(text).toContain("Com preparar una sortida a buscar bolets amb nens?");
    expect(text).toContain("no certifiquen itineraris aptes per a infants");
    expect(document.querySelector('details a[href="https://doi.org/10.1016/j.biocon.2005.10.042"]')).not.toBeNull();
  });

  it("publishes canonical article metadata and a truthful editorial sitemap date", () => {
    expect(metadata.alternates?.canonical).toBe(path);
    expect(metadata.robots).toBeUndefined();
    expect(metadata.description!.length).toBeLessThanOrEqual(155);
    const graph = JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!)["@graph"];
    const article = graph.find((item: Record<string, unknown>) => item["@type"] === "Article");
    expect(article.url).toBe(`https://bolets.app${path}`);
    expect(article.datePublished).toBe("2026-08-27");
    expect(article.dateModified).toBe(getEditorialMetadata("preguntes-frequents-bolets").updatedAt);
    expect(article).not.toHaveProperty("reviewedBy");
    expect(graph.some((item: Record<string, unknown>) => item["@type"] === "BreadcrumbList")).toBe(true);
    expect(publicEditorialItems).toContain("preguntes-frequents-bolets");
    expect(sitemap().filter((entry) => entry.url.endsWith(path))).toEqual([
      { url: `https://bolets.app${path}`, lastModified: new Date("2026-08-28T00:00:00+02:00") },
    ]);
  });

  it("is discoverable from the footer and the guides directory", () => {
    for (const component of [SiteFooter, GuidesPage]) {
      expect(renderToStaticMarkup(createElement(component))).toContain(`href="${path}"`);
    }
  });

  it("links season and permissions readers to the relevant FAQ topic", () => {
    for (const overview of [true, false]) {
      const markup = renderToStaticMarkup(createElement(SeasonPageContent, { canonicalPath: overview ? "/temporada" : "/temporada/setembre", month: "set", overview }));
      expect(markup).toContain(`href="${path}#quan-anar-hi"`);
    }
    expect(renderToStaticMarkup(createElement(CollectingRulesGuidePage))).toContain(`href="${path}#recolleccio-responsable"`);
  });
});
