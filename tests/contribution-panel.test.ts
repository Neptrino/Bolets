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
    expect(html).toContain("Troballa pública ja publicada");
    expect(html).toContain("Encara no tens cap troballa pública amb foto");
    expect(html).toContain('href="/troballes/nova"');
    expect(html).not.toContain("contribution-access-state");
    expect(html).not.toContain("El mapa públic mostra sectors de 2,5 km");
    expect(html).not.toContain("contribution-history");
  });

  it("preselects a published finding when the proposal starts from the journal", () => {
    const html = renderToStaticMarkup(createElement(ContributionPanel, {
      findingOptions: [{
        id: "6ddaf107-64b1-494b-925a-4bd98de7a6a8",
        reportedSpeciesName: "Cep",
        observedOn: "2026-09-02",
      }],
      initialFindingId: "6ddaf107-64b1-494b-925a-4bd98de7a6a8",
    }));

    expect(html).toContain("Tria una troballa del teu quadern");
    expect(html).toContain("Cep · 2 de setembre del 2026");
    expect(html).not.toContain("Encara no tens cap troballa pública amb foto");
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
