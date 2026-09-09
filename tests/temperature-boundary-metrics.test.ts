import { describe, expect, it } from "vitest";
import { temperatureBoundaryPairs, summarizeTemperatureBoundaries, type BoundaryCell } from "@/scripts/lib/temperature-boundary-metrics";

function cell(x: number, y: number, score = 30, candidate = score): BoundaryCell {
  const components = { habitatCoverage: 90, altitude: 100, phenology: 90, water: 40 };
  return { cellId: `epsg25831:250:${x}:${y}`, windowId: "test", weatherPointId: "west", altitudeM: 1500,
    applied: true, reason: "applied", baseline: { score, conditions: score, components },
    candidate: { score: candidate, conditions: candidate, components } };
}

describe("temperature boundary comparison", () => {
  it("counts four sides in a square once and excludes diagonals", () => {
    const pairs = temperatureBoundaryPairs([cell(1, 1), cell(2, 1), cell(1, 2), cell(2, 2)]);
    expect(pairs).toHaveLength(4);
    expect(new Set(pairs.map((p) => [p.cellA, p.cellB].sort().join("|"))).size).toBe(4);
  });
  it("detects a new severe jump at a coverage edge even within one model grid", () => {
    const a = cell(1, 1, 20, 50), b = { ...cell(2, 1, 22), applied: false };
    const report = summarizeTemperatureBoundaries(temperatureBoundaryPairs([a, b]));
    expect(report.comparableCoverageEdges.newSevereJumps).toBe(1);
    expect(report.comparableSameWeather.candidate.maximum).toBe(28);
  });
  it("separates habitat-driven and large-altitude differences from similar neighbours", () => {
    const a = cell(1, 1), b = cell(2, 1), c = cell(3, 1);
    b.baseline.components.habitatCoverage = 10;
    c.altitudeM = 1650;
    const report = summarizeTemperatureBoundaries(temperatureBoundaryPairs([a, b, c]));
    expect(report.all.pairs).toBe(2);
    expect(report.comparable.pairs).toBe(0);
  });
  it("retains unsupported pairs in the comparison and reports source boundaries", () => {
    const a = { ...cell(1, 1, 20), applied: false };
    const b = { ...cell(2, 1, 60), applied: false, weatherPointId: "east" };
    const report = summarizeTemperatureBoundaries(temperatureBoundaryPairs([a, b]));
    expect(report.comparableNeitherSupported.unchanged).toBe(1);
    expect(report.comparableCrossWeather.baseline.maximum).toBe(40);
  });
  it("rejects duplicate cells and excludes unavailable or unrelated-window pairs", () => {
    expect(() => temperatureBoundaryPairs([cell(1, 1), cell(1, 1)])).toThrow("Duplicate");
    const a = cell(1, 1), b = cell(2, 1);
    b.baseline.score = null;
    expect(temperatureBoundaryPairs([a, b])).toHaveLength(0);
    expect(temperatureBoundaryPairs([a, { ...cell(2, 1), windowId: "other" }])).toHaveLength(0);
  });
});
