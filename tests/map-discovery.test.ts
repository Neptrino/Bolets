// @vitest-environment jsdom

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomeMapFeature } from "@/components/home-map-feature";
import { UMAMI_EVENT_NAMES, UMAMI_EVENTS } from "@/src/lib/umami-goals";
import { buildSitemap } from "@/app/sitemap";
import { editorialArticleFields, getEditorialMetadata } from "@/data/editorial";

describe("map discovery metadata", () => {
  it("uses the recorded map content update in both the sitemap and structured data", () => {
    const updatedAt = getEditorialMetadata("map").updatedAt;
    expect(updatedAt).toBe("2026-09-14");
    expect(buildSitemap().filter(({ url }) => url === "https://bolets.app/map"))
      .toEqual([{ url: "https://bolets.app/map", lastModified: new Date(`${updatedAt}T00:00:00Z`) }]);
    expect(editorialArticleFields("map").dateModified).toContain(updatedAt);
  });
});

describe("homepage map section", () => {
  it("demonstrates the interactive map and sends the preview and primary action to it", () => {
    const document = new DOMParser().parseFromString(renderToStaticMarkup(createElement(HomeMapFeature)), "text/html");
    expect(document.querySelector("h2")?.textContent).toBe("Mapa de bolets de Catalunya");
    expect(document.querySelector("a.button")?.getAttribute("href")).toBe("/map");
    expect(document.querySelector("a.home-map-preview")?.getAttribute("href")).toBe("/map");
    expect(document.querySelector('a[href="/bolets-avui"]')).not.toBeNull();
    expect(document.querySelector(".home-map-preview-label")?.textContent).toBe("Exemple simulat");
    expect(document.querySelectorAll(".home-map-steps li")).toHaveLength(3);
    // Google returns the homepage for the "avui" cluster, so the daily overview keeps its own heading here.
    expect(Array.from(document.querySelectorAll("h2"), (heading) => heading.textContent))
      .toEqual(["Mapa de bolets de Catalunya", "On trobar bolets avui"]);
  });
});

describe("map journey events", () => {
  it("uses fixed allowlisted names for homepage, Avui and guide map transitions", () => {
    for (const name of [UMAMI_EVENTS.homepageMapSectionClick, UMAMI_EVENTS.avuiMapOpen, UMAMI_EVENTS.guideMapOpen]) {
      expect(UMAMI_EVENT_NAMES).toContain(name);
      expect(name).toMatch(/^[a-z-]+$/);
    }
  });
});
