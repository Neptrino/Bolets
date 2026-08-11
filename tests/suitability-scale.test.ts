import { describe, expect, it } from "vitest";
import { getSuitabilityBand } from "@/src/lib/suitability-scale";

describe("qualitative suitability scale", () => {
  it.each([
    [0, "Molt dolent"],
    [19, "Molt dolent"],
    [20, "Dolent"],
    [40, "Regular"],
    [60, "Bo"],
    [80, "Excel·lent"],
    [100, "Excel·lent"]
  ])("maps %i to %s", (score, label) => {
    expect(getSuitabilityBand(score).label).toBe(label);
  });

  it("safely clamps values outside the display range", () => {
    expect(getSuitabilityBand(-5).label).toBe("Molt dolent");
    expect(getSuitabilityBand(120).label).toBe("Excel·lent");
  });
});
