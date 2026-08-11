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

  it("uses the blue habitat scale independently from historical evidence", () => {
    expect(habitatCellColour(0.36)).toBe("rgba(33, 102, 172, 0.365)");
  });

  it("keeps sparse coarse-cell coverage visually subtle", () => {
    expect(habitatCellColour(0.01)).toBe("rgba(33, 102, 172, 0.127)");
    expect(habitatCellColour(1)).toBe("rgba(33, 102, 172, 0.8)");
  });
});
