import { describe, expect, it } from "vitest";
import {
  getSuitabilityBand,
  predictionMapCellColour,
} from "@/src/lib/suitability-scale";

describe("ordinal opportunity scale", () => {
  it.each([
    [0, "Molt baixa"],
    [19, "Molt baixa"],
    [20, "Baixa"],
    [40, "Mitjana"],
    [60, "Alta"],
    [80, "Molt alta"],
    [100, "Molt alta"]
  ])("maps %i to %s", (score, label) => {
    expect(getSuitabilityBand(score).label).toBe(label);
  });

  it("safely clamps values outside the display range", () => {
    expect(getSuitabilityBand(-5).label).toBe("Molt baixa");
    expect(getSuitabilityBand(120).label).toBe("Molt alta");
  });

  it("uses the same qualitative colours for prediction-map cells", () => {
    expect(predictionMapCellColour(4)).toBe("rgba(201, 94, 53, 0.68)");
    expect(predictionMapCellColour(34)).toBe("rgba(221, 135, 60, 0.68)");
    expect(predictionMapCellColour(80)).toBe("rgba(79, 138, 91, 0.68)");
    expect(predictionMapCellColour(null)).toBe("rgba(150, 149, 142, 0.24)");
  });

  it("uses one colour for every score in the same rating band", () => {
    expect(predictionMapCellColour(40)).toBe(predictionMapCellColour(59));
    expect(predictionMapCellColour(60)).toBe(predictionMapCellColour(79));
  });
});
