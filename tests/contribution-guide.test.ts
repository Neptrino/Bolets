import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContributionGuide } from "@/components/contribution-guide";

describe("shared contribution guide", () => {
  it("explains the review flow and supported contribution types", () => {
    const html = renderToStaticMarkup(createElement(ContributionGuide));

    expect(html).toContain("Com funciona");
    expect(html).toContain("Maneres de contribuir");
    expect(html).toContain("Troballes i fotografies");
    expect(html).toContain("Catàleg amb fonts");
    expect(html).toContain("De 2,5 km a 250 m");
    expect(html).toContain("La mateixa zona, més detall");
    for (const resolution of ["2500", "1000", "250"]) {
      expect(html).toContain(`data-resolution="${resolution}"`);
    }
    expect(html.match(/class="contribution-resolution-shot"/g)).toHaveLength(3);
    expect(html.match(/class="contribution-steps"/g)).toHaveLength(1);
  });
});
