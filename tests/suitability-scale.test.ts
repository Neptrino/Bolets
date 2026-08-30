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

  it("interpolates prediction-map colours across the full positive range", () => {
    expect(predictionMapCellColour(0)).toBe("rgba(112, 103, 88, 0.1)");
    expect(predictionMapCellColour(1)).toBe("rgba(201, 94, 53, 0.68)");
    expect(predictionMapCellColour(4)).toBe("rgba(204, 100, 54, 0.68)");
    expect(predictionMapCellColour(34)).toBe("rgba(204, 155, 70, 0.68)");
    expect(predictionMapCellColour(80)).toBe("rgba(79, 138, 91, 0.68)");
    expect(predictionMapCellColour(100)).toBe("rgba(47, 112, 77, 0.68)");
    expect(predictionMapCellColour(null)).toBe("rgba(150, 149, 142, 0.24)");
  });

  it("does not paint a verified zero like a positive low score", () => {
    expect(predictionMapCellColour(0)).not.toBe(predictionMapCellColour(1));
  });

  it("distinguishes scores within the same rating band", () => {
    expect(predictionMapCellColour(40)).not.toBe(predictionMapCellColour(59));
    expect(predictionMapCellColour(60)).not.toBe(predictionMapCellColour(79));
    expect(predictionMapCellColour(80)).not.toBe(predictionMapCellColour(100));
  });
});
