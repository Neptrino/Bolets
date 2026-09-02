import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/supabase/server", () => ({
  getAuthenticatedUser: vi.fn(async () => ({ id: "forest-page-owner" })),
}));
vi.mock("@/src/lib/my-forest/preferences.server", () => ({
  readForestPreferences: vi.fn(async () => ({ speciesIds: [], territorySlugs: [] })),
}));
vi.mock("@/components/my-forest/dashboard", () => ({
  TodayForYou: () => null,
}));
vi.mock("@/components/my-forest/preference-manager", () => ({
  PreferenceManager: () => null,
}));
vi.mock("@/components/map-detail-access-notice", async () => {
  const { createElement } = await import("react");
  return {
    MapDetailAccessNotice: ({ resolution, inline }: { resolution: number; inline?: boolean }) =>
      createElement("aside", {
        "data-map-detail-access": true,
        "data-resolution": resolution,
        "data-inline": inline,
      }),
  };
});

import MyForestPage from "@/app/compte/bosc/page";

describe("El meu bosc page actions", () => {
  it("uses the shared account navigation and detail-access banner", async () => {
    const html = renderToStaticMarkup(await MyForestPage({ searchParams: Promise.resolve({}) }));
    const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0];
    expect(header).not.toContain('href="/compte"');
    expect(header).not.toContain('href="/col-labora"');
    expect(html).toContain('aria-label="Seccions del compte"');
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/compte\/bosc"/);
    expect(html).toContain('data-map-detail-access="true"');
    expect(html).toContain('data-resolution="1000"');
    expect(html).toContain('data-inline="true"');
    expect(html).not.toContain("La teva temporada");
  });
});
