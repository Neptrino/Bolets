import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  PageHeader,
  PageShell,
  PageTitleAccent,
  SectionHeader,
} from "@/components/page-layout";

describe("shared page layout", () => {
  it("renders the selected page shell element with its shared hooks", () => {
    const html = renderToStaticMarkup(createElement(
      PageShell,
      ({
        as: "article",
        className: "guide-page",
      } as Parameters<typeof PageShell>[0]),
      createElement("p", null, "Guia"),
    ));

    expect(html).toMatch(/^<article\b/);
    expect(html).toContain("page-width");
    expect(html).toContain("guide-page");
    expect(html).toContain('data-page-shell="true"');
    expect(html).toContain("<p>Guia</p>");
    expect(html).toMatch(/<\/article>$/);
  });

  it("renders a semantic page header and accent without presentational markup", () => {
    const html = renderToStaticMarkup(createElement(PageHeader, {
      eyebrow: "Lectura territorial",
      title: createElement(
        "span",
        null,
        "Bolets ",
        createElement(PageTitleAccent, null, "a Catalunya"),
      ),
      description: createElement("span", null, "Ecologia compartida"),
      layout: "split",
      tone: "forest",
    }));

    expect(html).toMatch(/^<header\b/);
    expect(html).toContain('data-page-header="true"');
    expect(html).toContain('data-layout="split"');
    expect(html).toContain("<h1");
    expect(html).toMatch(/<span[^>]*>a Catalunya<\/span>/);
    expect(html).not.toContain("<i");
    expect(html).toContain("<p");
    expect(html).toMatch(/<\/header>$/);
  });

  it("renders a section header with an addressable title and actions", () => {
    const html = renderToStaticMarkup(createElement(SectionHeader, {
      meta: createElement("div", null, "Per estacions"),
      title: "Calendari ecològic",
      titleId: "calendar-title",
      description: "Activitat potencial per mesos.",
      actions: createElement("a", { href: "/temporada" }, "Veure els mesos"),
    }));

    expect(html).toMatch(/^<header\b/);
    expect(html).toContain('data-section-header="true"');
    expect(html).toMatch(/<div[^>]*><div>Per estacions<\/div><\/div>/);
    expect(html).toContain('<h2');
    expect(html).toContain('id="calendar-title"');
    expect(html).toContain("Calendari ecològic</h2>");
    expect(html).toContain('<a href="/temporada">Veure els mesos</a>');
    expect(html).toMatch(/<\/header>$/);
  });
});
