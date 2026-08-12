import { describe, expect, it } from "vitest";
import {
  habitatCellColour,
  habitatCellIntensity,
  isHabitatCellCorroborated,
  toPotentialHabitatMapCell,
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
  it("omits repeated provenance fields from drawing payloads", () => {
    expect(toPotentialHabitatMapCell({
      ...habitatCell,
      speciesId: "boletus-edulis",
      regionId: "prepirineus",
      gridSizeM: 1000,
      coverage: 0.6,
      altitudeWeightedCoverage: 0.5,
      eligibleCellCount: 8,
      sourceResolutionM: 250,
      confidence: "high",
      source: ["ICGC", "SoilGrids"],
    })).toEqual({
      cellId: "habitat-cell",
      cellBounds: habitatCell.cellBounds,
      coverage: 0.6,
      altitudeWeightedCoverage: 0.5,
    });
  });

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

  it("uses altitude-weighted coverage for distribution intensity without losing legacy fallback", () => {
    expect(habitatCellIntensity({ coverage: 0.8, altitudeWeightedCoverage: 0.6 })).toBe(0.6);
    expect(habitatCellIntensity({ coverage: 0.8 })).toBe(0.8);
  });
});
