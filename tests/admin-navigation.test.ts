import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DetailNav } from "@/app/admin/status/detail-nav";

describe("administrator navigation", () => {
  it("links every private dashboard section and identifies the current one", () => {
    const html = renderToStaticMarkup(createElement(DetailNav, { current: "status" }));
    expect(html).toContain('aria-label="Seccions de l’administració"');
    for (const href of [
      "/admin/status",
      "/admin/status/users",
      "/admin/status/findings",
      "/admin/status/reports",
      "/admin/status/contributions",
      "/admin/status/instagram",
    ]) expect(html).toContain(`href="${href}"`);
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/admin\/status"/);
  });

  it("renders the shared navigation in both status overview outcomes", () => {
    const source = readFileSync("app/admin/status/page.tsx", "utf8");
    expect(source.match(/<DetailNav current="status" \/>/g)).toHaveLength(2);
  });
});
