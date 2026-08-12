import { describe, expect, it } from "vitest";
import {
  getSuitabilityBand,
  predictionMapCellColour,
} from "@/src/lib/suitability-scale";

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

  it("uses the same qualitative colours for prediction-map cells", () => {
    expect(predictionMapCellColour(4)).toBe("rgba(201, 94, 53, 0.68)");
    expect(predictionMapCellColour(34)).toBe("rgba(221, 135, 60, 0.68)");
    expect(predictionMapCellColour(80)).toBe("rgba(79, 138, 91, 0.68)");
    expect(predictionMapCellColour(null)).toBe("rgba(150, 149, 142, 0.24)");
  });

  it("mixes cell colour by exact compatible area", () => {
    expect(predictionMapCellColour(48, 1)).toBe("rgba(197, 163, 74, 0.68)");
    expect(predictionMapCellColour(48, 0.5)).toBe("rgba(199, 129, 64, 0.68)");
    expect(predictionMapCellColour(48, 0.25)).toBe("rgba(200, 111, 58, 0.68)");
    expect(predictionMapCellColour(48, 0)).toBe("rgba(201, 94, 53, 0.68)");
  });

  it("keeps excluded and withheld cells stable and clamps coverage", () => {
    expect(predictionMapCellColour(0, 0.5)).toBe("rgba(201, 94, 53, 0.68)");
    expect(predictionMapCellColour(null, 0.5)).toBe("rgba(150, 149, 142, 0.24)");
    expect(predictionMapCellColour(48, -1)).toBe("rgba(201, 94, 53, 0.68)");
    expect(predictionMapCellColour(48, 2)).toBe("rgba(197, 163, 74, 0.68)");
  });

  it("matches the mean colour of equal excluded and regular child areas", () => {
    const excluded = [201, 94, 53];
    const regular = [197, 163, 74];
    const average = excluded.map((channel, index) =>
      Math.round((channel + regular[index]) / 2)
    );

    expect(average).toEqual([199, 129, 64]);
    expect(predictionMapCellColour(48, 0.5))
      .toBe(`rgba(${average.join(", ")}, 0.68)`);
  });
});
