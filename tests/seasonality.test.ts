import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { generateMetadata } from "@/app/temporada/[month]/page";
import { SeasonPageContent } from "@/components/season-page-content";
import {
  monthFromSeasonSlug,
  monthInTimeZone,
  monthWithPreposition,
  seasonMonthPath,
  SEASON_MONTHS,
} from "@/src/lib/seasonality";

describe("seasonality calendar", () => {
  it("keeps the twelve months in calendar order", () => {
    expect(SEASON_MONTHS.map(({ key }) => key)).toEqual([
      "gen",
      "feb",
      "mar",
      "abr",
      "mai",
      "jun",
      "jul",
      "ago",
      "set",
      "oct",
      "nov",
      "des",
    ]);
  });

  it("uses Catalonia local time at a month boundary", () => {
    expect(monthInTimeZone(new Date("2026-08-31T21:59:59Z"))).toBe("ago");
    expect(monthInTimeZone(new Date("2026-08-31T22:00:00Z"))).toBe("set");
  });

  it("uses the correct Catalan article before month names", () => {
    expect(monthWithPreposition("ago")).toBe("a l’agost");
    expect(monthWithPreposition("abr")).toBe("a l’abril");
    expect(monthWithPreposition("oct")).toBe("a l’octubre");
    expect(monthWithPreposition("set")).toBe("al setembre");
  });

  it("builds twelve unique, accent-safe month routes", () => {
    const paths = SEASON_MONTHS.map(({ key }) => seasonMonthPath(key));

    expect(paths).toHaveLength(12);
    expect(new Set(paths).size).toBe(12);
    expect(paths).toContain("/temporada/gener");
    expect(paths).toContain("/temporada/marc");
    expect(paths).toContain("/temporada/setembre");
    expect(SEASON_MONTHS.every(({ key, slug }) => monthFromSeasonSlug(slug) === key)).toBe(true);
    expect(monthFromSeasonSlug("setembre-inexistent")).toBeUndefined();
  });

  it("gives every month unique, concise metadata and a self canonical", async () => {
    const metadata = await Promise.all(SEASON_MONTHS.map(({ slug }) => (
      generateMetadata({ params: Promise.resolve({ month: slug }) })
    )));
    const titles = metadata.map((item) => item.title);
    const descriptions = metadata.map((item) => item.description);

    expect(new Set(titles).size).toBe(12);
    expect(new Set(descriptions).size).toBe(12);
    for (const [index, item] of metadata.entries()) {
      expect(item.alternates?.canonical).toBe(seasonMonthPath(SEASON_MONTHS[index].key));
      expect(String(item.title)).not.toContain("temporada a Catalunya");
      expect(item.description?.length).toBeGreaterThanOrEqual(100);
      expect(item.description?.length).toBeLessThanOrEqual(160);
    }
  });

  it("links monthly pages to the season overview and emits their breadcrumb hierarchy", () => {
    const html = renderToStaticMarkup(createElement(SeasonPageContent, {
      canonicalPath: "/temporada/setembre",
      month: "set",
    }));

    expect(html).toContain('href="/temporada"');
    expect(html).toContain("← Temporada de bolets a Catalunya");
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"name":"setembre"');
    expect(html).toContain("Calendari de bolets al setembre");
  });

  it("keeps the broad season wording on the overview only", () => {
    const html = renderToStaticMarkup(createElement(SeasonPageContent, {
      canonicalPath: "/temporada",
      month: "set",
      overview: true,
    }));

    expect(html).toContain("Temporada de bolets");
    expect(html).toContain("a Catalunya.");
    expect(html).not.toContain("← Temporada de bolets a Catalunya");
    expect(html).toContain('"@type":"BreadcrumbList"');
  });
});
