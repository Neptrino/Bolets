import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));

import { AdminNav } from "@/app/admin/(private)/admin-nav";

describe("administrator navigation", () => {
  it("links every private dashboard section and identifies the current one", () => {
    const html = renderToStaticMarkup(createElement(AdminNav));
    expect(html).toContain('aria-label="Seccions de l’administració"');
    for (const href of [
      "/admin",
      "/admin/usuaris",
      "/admin/troballes",
      "/admin/avisos",
      "/admin/aportacions",
      "/admin/publicacio",
      "/admin/operacions",
    ]) expect(html).toContain(`href="${href}"`);
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/admin"/);
    expect(html).toContain('action="/admin/session/logout"');
    expect(html).not.toContain(">BO<");
  });

  it("renders the shared navigation from the protected admin layout", () => {
    const source = readFileSync("app/admin/(private)/layout.tsx", "utf8");
    expect(source).toContain("<AdminNav />");
    expect(source).toContain("requireOperationalSession");
  });

  it("provides immediate feedback while a dynamic admin section loads", () => {
    const source = readFileSync("app/admin/(private)/loading.tsx", "utf8");
    expect(source).toContain("Carregant la secció");
    expect(source).toContain('role="status"');
  });
});
