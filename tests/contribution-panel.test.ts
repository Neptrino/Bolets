import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { ContributionHistory, ContributionPanel } from "@/components/contribution-panel";

describe("contribution form", () => {
  it("keeps the submit action available while explaining the description requirement", () => {
    const html = renderToStaticMarkup(createElement(ContributionPanel));
    const button = html.match(/<button\b[^>]*>[^<]*/)?.[0];

    expect(button).not.toContain("disabled");
    expect(html).toContain("Mínim 20 caràcters");
    expect(html).toContain('minLength="20"');
    expect(html).toContain("Triar fotografies");
    expect(html).toContain('accept="image/*"');
    expect(html).toContain("eliminar metadades com la ubicació");
    expect(html).toContain("Proposa una col·laboració");
    expect(html).not.toContain("Troballa pública ja publicada");
    expect(html).toContain("Correcció del catàleg amb fonts fiables");
    expect(html).toContain("Fotografia o recurs reutilitzable de bolets");
    expect(html.match(/Si s’aprova: \+30 dies/g)).toHaveLength(2);
    expect(html.match(/sectors d’1 km i 250 m/g)).toHaveLength(2);
    expect(html).not.toContain("contribution-access-state");
    expect(html).not.toContain("El mapa públic mostra sectors de 2,5 km");
    expect(html).not.toContain("contribution-history");
  });

  it("places account status before the form and contribution history in its own section", () => {
    const page = readFileSync("app/compte/col-laboracio/page.tsx", "utf8");
    const status = page.indexOf('className="contribution-account-status"');
    const form = page.indexOf('className="account-contribution-layout"');
    const history = page.indexOf('className="contribution-account-history"');

    expect(status).toBeGreaterThan(-1);
    expect(status).toBeLessThan(form);
    expect(form).toBeLessThan(history);
    expect(page).toContain("<ContributionHistory");
    expect(page).toContain("Una troballa pública amb foto obre els sectors d’1 km durant 7 dies");
    expect(page).toContain('href="/troballes/nova"');
    expect(page).toContain("no passen al catàleg automàticament");
  });

  it("makes an approved contribution and its active detailed-map access explicit", () => {
    const html = renderToStaticMarkup(createElement(ContributionHistory, {
      activeUntil: "2026-12-01T10:00:00.000Z",
      requests: [{
        id: "approved-request",
        kind: "reusable_media" as const,
        description: "Fotografies originals per al catàleg.",
        evidenceUrl: null,
        findingId: null,
        mediaCount: 1,
        status: "approved" as const,
        reviewNote: null,
        reviewedAt: "2026-09-02T06:00:00.000Z",
        createdAt: "2026-09-01T18:00:00.000Z",
      }],
    }));

    expect(html).toContain('data-status="approved"');
    expect(html).toContain("contribution-history-status");
    expect(html).toContain("Aprovada");
    expect(html).toContain("Revisada el 2 de setembre del 2026");
    expect(html).toContain("Mapa detallat obert fins al 1 de desembre del 2026");
  });
});
