import { describe, expect, it } from "vitest";
import { heatmapBlurRadius } from "@/components/region-map/prediction-surface";

describe("prediction heat surface", () => {
  it("keeps a restrained blur across cell sizes", () => {
    expect(heatmapBlurRadius(5)).toBe(5);
    expect(heatmapBlurRadius(30)).toBe(6);
    expect(heatmapBlurRadius(100)).toBe(18);
  });
});
