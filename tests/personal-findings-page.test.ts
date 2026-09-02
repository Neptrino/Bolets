import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/supabase/server", () => ({
  getAuthenticatedUser: vi.fn(async () => ({ id: "journal-owner" })),
}));
vi.mock("@/src/lib/my-forest/journal.server", () => ({
  readOwnerJournalSummary: vi.fn(async () => ({ seasonLabel: "2026–27" })),
}));
vi.mock("@/components/my-forest/dashboard", () => ({
  JournalSummary: () => createElement("section", { "data-journal-summary": true }),
}));
vi.mock("@/components/findings/personal-findings", () => ({
  PersonalFindings: () => createElement("section", { "data-personal-findings": true }),
}));

import PersonalFindingsPage from "@/app/les-meves-troballes/page";

describe("private journal page", () => {
  it("places the season summary before the finding archive", async () => {
    const html = renderToStaticMarkup(await PersonalFindingsPage());
    const summaryIndex = html.indexOf('data-journal-summary="true"');
    const findingsIndex = html.indexOf('data-personal-findings="true"');

    expect(html).toContain('aria-current="page"');
    expect(summaryIndex).toBeGreaterThan(-1);
    expect(findingsIndex).toBeGreaterThan(summaryIndex);
  });
});
