import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const findingCard = readFileSync("components/findings/finding-card.tsx", "utf8");

describe("public finding card interactions", () => {
  it("keeps the observation and canonical species destinations distinct", () => {
    expect(findingCard).toContain('<Link className="finding-card-media-link"');
    expect(findingCard).toContain("Obrir la troballa de");
    expect(findingCard).toContain('<Link className="finding-card-species-link" href={profileHref}>');
    expect(findingCard).toContain('<Link className="finding-card-detail-link"');
  });

  it("keeps the identification explanation at section level instead of repeating it on every card", () => {
    expect(findingCard).not.toContain("Identificació indicada per qui l’ha trobada");
    expect(findingCard).toContain('className="finding-card-author"');
    expect(findingCard).toContain("Compartida per");
    expect(findingCard).not.toContain("<p>{finding.alias");
  });

  it("keeps generic location privacy copy out of each card", () => {
    expect(findingCard).toContain("<time dateTime={finding.observedOn}");
    expect(findingCard).not.toContain("Casella de 10 × 10 km");
  });
});
