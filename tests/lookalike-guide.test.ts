import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LookalikeGuidePage, { metadata } from "@/app/bolets-i-confusions/page";
import { buildSitemap as sitemap, editorialLastModified } from "@/app/sitemap";
import { publicEditorialItems } from "@/data/editorial";
import { comparisonPagesBySlug } from "@/data/comparison-pages";
import { identificationSteps } from "@/data/identification-method";
import { formatMonthRuns, lookalikeGroups, pairOverlapMonths, ungroupedRiskyPairs } from "@/src/lib/lookalike-guide";

describe("typical mushrooms and lookalikes guide", () => {
  it("covers every edible-versus-avoid comparison exactly once", () => {
    expect(ungroupedRiskyPairs).toEqual([]);
    const slugs = lookalikeGroups.flatMap((group) => group.risky.map((pair) => pair.page.slug));
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const group of lookalikeGroups) expect(group.risky.length, group.species.speciesId).toBeGreaterThan(0);
  });

  it("renders each pair with its comparison link and the safety notices", () => {
    const html = renderToStaticMarkup(createElement(LookalikeGuidePage));
    expect(metadata.alternates?.canonical).toBe("/bolets-i-confusions");
    expect(metadata.description?.length).toBeLessThanOrEqual(155);
    expect(html).toContain("Bolets típics de Catalunya");
    expect(html).toContain("Amb què es pot confondre el rovelló?");
    for (const pair of lookalikeGroups.flatMap((group) => group.risky)) {
      expect(html).toContain(`href="/compare/${pair.page.slug}"`);
    }
    expect(html).toContain("Editorial, no micològica");
    expect(html).toContain("061");
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).not.toContain('"reviewedBy"');
    expect(publicEditorialItems).toContain("bolets-i-confusions");
    expect(sitemap().find((entry) => entry.url.endsWith("/bolets-i-confusions"))?.lastModified)
      .toEqual(editorialLastModified("bolets-i-confusions"));
  });

  it("formats overlap months as runs, including across the new year", () => {
    expect(formatMonthRuns([])).toBe("No coincideixen");
    expect(formatMonthRuns(["set", "oct", "nov"])).toBe("setembre–novembre");
    expect(formatMonthRuns(["mai", "set", "oct"])).toBe("maig, setembre–octubre");
    expect(formatMonthRuns(["gen", "des"])).toBe("desembre–gener");
  });

  it("keeps an unknown overlap distinct from an empty one", () => {
    const pairs = lookalikeGroups.flatMap((group) => group.risky);
    const cep = pairs.find((pair) => pair.page.slug === "cep-vs-matagent")!;
    expect(pairOverlapMonths(cep)?.length).toBeGreaterThan(0);
    const descriptive = pairs.find((pair) => !("ecologicalConfig" in pair.lookalike));
    if (descriptive) expect(pairOverlapMonths(descriptive)).toBeNull();
  });

  it("ties every identification step to existing comparison pairs", () => {
    for (const step of identificationSteps) {
      expect(step.decisiveIn.length, step.id).toBeGreaterThan(0);
      for (const slug of step.decisiveIn) expect(comparisonPagesBySlug[slug], `${step.id}: ${slug}`).toBeDefined();
    }
  });
});
