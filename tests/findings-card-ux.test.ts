import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const findingCard = readFileSync("components/findings/finding-card.tsx", "utf8");

describe("public finding card interactions", () => {
  it("uses the full card content as one descriptive link", () => {
    expect(findingCard).toContain('<Link className="finding-card-link"');
    expect(findingCard).toContain("Obrir la troballa de");
    expect(findingCard).not.toContain("<h2><Link");
  });

  it("keeps the identification explanation at section level instead of repeating it on every card", () => {
    expect(findingCard).not.toContain("Identificació indicada per qui l’ha trobada");
    expect(findingCard).toContain("Compartida per");
  });
});
