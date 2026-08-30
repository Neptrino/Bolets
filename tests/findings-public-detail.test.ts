import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const detailPage = readFileSync("app/troballes/[id]/page.tsx", "utf8");
const overviewPage = readFileSync("app/troballes/page.tsx", "utf8");
const locationMap = readFileSync("components/findings/public-finding-location-map.tsx", "utf8");
const findingCard = readFileSync("components/findings/finding-card.tsx", "utf8");
const reportForm = readFileSync("components/findings/finding-report-form.tsx", "utf8");
const flagButton = readFileSync("components/findings/finding-flag-button.tsx", "utf8");

describe("public finding detail", () => {
  it("publishes a canonical URL for the public findings overview", () => {
    expect(overviewPage).toContain('alternates: { canonical: "/troballes" }');
  });

  it("keeps thin observation and cell-filter views out of the index while allowing discovery", () => {
    expect(detailPage).toContain('robots: { index: false, follow: true }');
    expect(overviewPage).toContain('robots: { index: false, follow: true }');
  });

  it("uses the overview as an aggregate hub linked to canonical species profiles", () => {
    expect(overviewPage).toContain("Què expliquen aquestes troballes?");
    expect(overviewPage).toContain("summarizePublicFindings(findings)");
    expect(overviewPage).toContain('href={item.href}');
    expect(overviewPage).toContain('"@type": "CollectionPage"');
    expect(detailPage).toContain('href={profileHref}');
  });

  it("renders the finding's public privacy cell without an exact point", () => {
    expect(detailPage).toContain("<PublicFindingLocationMap bounds={finding.cellBounds} />");
    expect(locationMap).toContain("fitSpatialBounds(localMap, cellBounds, false)");
    expect(locationMap).toContain("drawTerritorialWindow(context, localMap, cellBounds)");
    expect(locationMap).not.toContain("exactLocation");
  });

  it("is non-interactive and explains the map's privacy limit", () => {
    expect(locationMap).toContain("interactive: false");
    expect(locationMap).toContain("showFullscreen: false");
    expect(locationMap).toContain("showNavigation: false");
    expect(locationMap).toContain("no assenyala el punt exacte de la troballa");
  });

  it("presents the contributor's identification without community validation UI", () => {
    expect(detailPage).toContain("<dt>Identificació indicada</dt>");
    expect(detailPage).toContain("title={finding.reportedSpeciesName}");
    expect(detailPage).not.toContain("FindingVoteForm");
    expect(detailPage).not.toContain("verificationStatus");
    expect(detailPage).not.toContain("consensusSpeciesName");
    expect(findingCard).not.toContain("finding-badge");
    expect(findingCard).not.toContain("voteCount");
  });

  it("gives the observation date a dedicated, readable treatment", () => {
    expect(detailPage).toContain("Data de la troballa");
    expect(detailPage).toContain('className="finding-detail-date"');
    expect(detailPage).toContain("Àrea generalitzada de 10 × 10 km");
  });

  it("groups the public data and map in one side pane, with reporting below", () => {
    expect(detailPage).toContain('className="finding-detail-panel"');
    expect(detailPage).toContain("<PublicFindingLocationMap bounds={finding.cellBounds} />");
    expect(detailPage).toContain('className="finding-detail-report"');
    expect(detailPage.indexOf('className="finding-detail-report"')).toBeGreaterThan(detailPage.indexOf("</aside>"));
  });

  it("keeps problem reporting while removing validation promises from capture", () => {
    expect(detailPage).toContain("<FindingFlagButton findingId={finding.id} />");
    expect(reportForm).not.toContain("la comunitat no podrà validar");
    expect(reportForm).not.toContain("Quan hi hagi vots");
  });

  it("uses an accessible site dialog instead of the browser prompt for reports", () => {
    expect(flagButton).toContain("<dialog");
    expect(flagButton).toContain("element.showModal()");
    expect(flagButton).toContain("maxLength={500}");
    expect(flagButton).not.toContain("window.prompt");
  });
});
