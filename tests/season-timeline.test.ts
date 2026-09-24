import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SeasonPageContent } from "@/components/season-page-content";
import { familiarSpeciesIds } from "@/src/lib/featured-species";
import { seasonTimeline } from "@/src/lib/season-timeline";
import { seasonGuideForMonth } from "@/src/lib/season-guides";
import { monthInTimeZone, SEASON_MONTHS, seasonMonthPath } from "@/src/lib/seasonality";
import { speciesInSeason } from "@/src/lib/species-collections";

describe("season timeline stage", () => {
  it("counts exactly the species the season calendar lists, split into three edibility kinds", () => {
    const timeline = seasonTimeline();

    for (const { key } of SEASON_MONTHS) {
      const frame = timeline[key];
      expect(frame.total).toBe(speciesInSeason(key).length);
      expect(frame.byKind.edible + frame.byKind.avoid + frame.byKind.toxic).toBe(frame.total);
      expect(frame.highlights.length).toBeLessThanOrEqual(12);
      for (const highlight of frame.highlights) {
        const species = speciesInSeason(key).find((item) => item.speciesId === highlight.speciesId);
        expect(["peak", "good"]).toContain(species?.ecologicalConfig.seasonality[key]);
        expect(highlight.icon).toBe(`/media/illustrations/${highlight.speciesId}.webp`);
      }
    }
  });

  it("puts the best-known edibles first on stage, in their editorial order", () => {
    const timeline = seasonTimeline();
    const familiar = familiarSpeciesIds as readonly string[];

    for (const { key } of SEASON_MONTHS) {
      const ids = timeline[key].highlights.map((highlight) => highlight.speciesId);
      const familiarOnStage = ids.filter((id) => familiar.includes(id));
      expect(ids.slice(0, familiarOnStage.length)).toEqual(familiarOnStage);
      expect(familiarOnStage).toEqual([...familiarOnStage].sort((a, b) => familiar.indexOf(a) - familiar.indexOf(b)));
    }
    expect(timeline.oct.highlights[0]?.speciesId).toBe("lactarius-sanguifluus");
  });

  it("plays the year on the overview with crawlable links to every month page", () => {
    const html = renderToStaticMarkup(createElement(SeasonPageContent, { canonicalPath: "/temporada", month: "oct", overview: true }));

    expect(html).toContain("Un any de bolets a Catalunya");
    expect(html).toContain("Reprodueix l’any");
    expect(html).toContain("On trobar bolets avui");
    for (const { key } of SEASON_MONTHS) expect(html).toContain(`href="${seasonMonthPath(key)}"`);
    expect(html).not.toContain("season-year");
  });

  it("marks the season card with a badge, and only calls it “Ara” for the current month", () => {
    const current = monthInTimeZone();
    const other = SEASON_MONTHS.find(({ key }) => seasonGuideForMonth(key).id !== seasonGuideForMonth(current).id)!;
    const overview = renderToStaticMarkup(createElement(SeasonPageContent, { canonicalPath: "/temporada", month: current, overview: true }));
    const monthPage = renderToStaticMarkup(createElement(SeasonPageContent, { canonicalPath: seasonMonthPath(other.key), month: other.key }));

    expect(overview).toContain('<span class="pill other-season-badge">Ara</span>');
    expect(monthPage).toContain(`<span class="pill other-season-badge">${other.label}</span>`);
    expect(monthPage).not.toContain('other-season-badge">Ara<');
  });

  it("keeps the month pages on their own panel and month grid", () => {
    const html = renderToStaticMarkup(createElement(SeasonPageContent, { canonicalPath: seasonMonthPath("oct"), month: "oct" }));

    expect(html).not.toContain("season-stage");
    expect(html).toContain("season-now-panel");
    expect(html).toContain("season-year");
  });
});
