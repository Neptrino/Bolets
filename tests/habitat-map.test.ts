import { describe, expect, it } from "vitest";
import {
  habitatCellColour,
  isHabitatCellCorroborated,
} from "@/src/lib/habitat-map";
import type { OccurrenceSupportCell, PotentialHabitatCell } from "@/src/lib/types";

const habitatCell = {
  cellId: "habitat-cell",
  cellBounds: [[1.1, 41.1], [1.15, 41.15]],
} as PotentialHabitatCell;

const supportCell = {
  supportCellId: "support-cell",
  bounds: [[1.05, 41.05], [1.2, 41.2]],
} as OccurrenceSupportCell;

describe("habitat map occurrence styling", () => {
  it("corroborates a habitat cell when its centre is inside a 10 km support cell", () => {
    expect(isHabitatCellCorroborated(habitatCell, [supportCell])).toBe(true);
  });

  it("does not corroborate habitat from a nearby support cell", () => {
    const nearbySupport = {
      ...supportCell,
      bounds: [[1.16, 41.1], [1.26, 41.2]],
    } as OccurrenceSupportCell;

    expect(isHabitatCellCorroborated(habitatCell, [nearbySupport])).toBe(false);
  });

  it("uses a distinct hue without changing the coverage opacity", () => {
    expect(habitatCellColour(0.36, false)).toBe("rgba(150, 63, 32, 0.346)");
    expect(habitatCellColour(0.36, true)).toBe("rgba(69, 91, 59, 0.346)");
  });

  it("keeps sparse coarse-cell coverage visually subtle", () => {
    expect(habitatCellColour(0.01, false)).toBe("rgba(150, 63, 32, 0.087)");
    expect(habitatCellColour(1, false)).toBe("rgba(150, 63, 32, 0.82)");
  });
});
