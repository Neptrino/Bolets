import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { predictionViewportStatus } from "@/src/lib/prediction-map-status";

describe("prediction map rendering", () => {
  const source = readFileSync(
    join(process.cwd(), "components", "region-map.tsx"),
    "utf8",
  );

  it("paints zero-score cells instead of leaving the map apparently empty", () => {
    expect(source).toContain("context.fillStyle = predictionMapCellColour(cell.score)");
    expect(source).not.toContain("if (cell.score !== 0)");
  });

  it("keeps an explicit loading overlay visible while replacement cells load", () => {
    expect(source).toContain('className="prediction-map-loading"');
    expect(source).toContain("Actualitzant la predicció…");
    expect(source).toContain('aria-busy={cellState.status === "loading"}');
  });

  it("loads historical evidence separately from the primary habitat grid", () => {
    expect(source).toContain("/api/occurrences?");
    expect(source).toContain("void loadHistoricalEvidence()");
  });

  it.each([
    [{ published: 0, excluded: 0, withheld: 0 }, "empty"],
    [{ published: 2, excluded: 0, withheld: 0 }, "ready"],
    [{ published: 0, excluded: 2, withheld: 0 }, "incompatible"],
    [{ published: 0, excluded: 0, withheld: 2 }, "withheld"],
    [{ published: 0, excluded: 1, withheld: 1 }, "mixed"],
    [{ published: 2, excluded: 1, withheld: 1 }, "mixed"],
  ] as const)("classifies viewport counts %o as %s", (counts, status) => {
    expect(predictionViewportStatus(counts)).toBe(status);
  });
});
