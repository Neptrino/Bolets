// @vitest-environment jsdom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnnualSeasonCalendar } from "@/components/annual-season-calendar";
import { referenceSpeciesProfiles } from "@/data/reference-species";
import { edibleSpecies, toxicSpecies } from "@/src/lib/species-collections";
import { SEASON_MONTHS, SEASONAL_ACTIVITY_LABELS } from "@/src/lib/seasonality";
import { speciesPath } from "@/src/lib/seo";

describe("annual season calendar", () => {
  const html = renderToStaticMarkup(createElement(AnnualSeasonCalendar, { currentMonth: "set" }));
  const document = new DOMParser().parseFromString(html, "text/html");

  it("preserves every month's activity from the shared edible species profiles", () => {
    const rows = Array.from(document.querySelectorAll("tbody tr"));
    expect(rows).toHaveLength(edibleSpecies.length);
    for (const [index, species] of edibleSpecies.entries()) {
      const row = rows[index];
      expect(row.querySelector('th[scope="row"] a')?.getAttribute("href")).toBe(speciesPath(species));
      const cells = row.querySelectorAll("td");
      expect(cells).toHaveLength(12);
      for (const [monthIndex, month] of SEASON_MONTHS.entries()) {
        expect(cells[monthIndex].querySelector(".sr-only")?.textContent).toBe(
          SEASONAL_ACTIVITY_LABELS[species.ecologicalConfig.seasonality[month.key]],
        );
      }
    }
  });

  it("excludes toxic and descriptive-only species from the edible monthly calendar", () => {
    const paths = Array.from(document.querySelectorAll("tbody a"), (link) => link.getAttribute("href"));
    for (const species of [...referenceSpeciesProfiles, ...toxicSpecies]) {
      expect(paths).not.toContain(speciesPath(species));
    }
  });

  it("labels the current month and makes the scroll region keyboard accessible", () => {
    expect(document.querySelector('thead [aria-current="page"]')?.getAttribute("href")).toBe("/temporada/setembre");
    expect(document.querySelectorAll("thead [data-selected]")).toHaveLength(1);
    expect(document.querySelector('[role="region"]')?.getAttribute("tabindex")).toBe("0");
    expect(document.querySelectorAll('thead th[scope="col"]')).toHaveLength(13);
    expect(document.querySelector("caption")?.textContent).toContain("Calendari anual");
  });

  it("distinguishes a selected month from the actual current month", () => {
    const html = renderToStaticMarkup(createElement(AnnualSeasonCalendar, { currentMonth: "set", selectedMonth: "des" }));
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.querySelector('thead [aria-current="page"]')?.getAttribute("href")).toBe("/temporada/desembre");
    expect(document.querySelector('a[href="/temporada/setembre"]')?.textContent).toContain("Ara");
    expect(document.querySelector('a[href="/temporada/desembre"]')?.textContent).not.toContain("Ara");
  });
});
