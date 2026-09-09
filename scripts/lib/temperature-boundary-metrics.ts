export type BoundaryScore = {
  score: number | null;
  conditions: number | null;
  components: Record<string, number | null>;
};

export type BoundaryCell = {
  cellId: string;
  windowId: string;
  weatherPointId: string;
  altitudeM: number;
  applied: boolean;
  reason: string;
  baseline: BoundaryScore;
  candidate: BoundaryScore;
};

export const BOUNDARY_COMPARISON = {
  maximumAltitudeDifferenceM: 50,
  maximumHabitatCoverageDifferencePoints: 10,
  maximumAltitudeSuitabilityDifferencePoints: 10,
  maximumWaterDifferencePoints: 10,
  maximumPhenologyDifferencePoints: 2,
  newSevereJump: { baselineGapBelow: 10, candidateGapAtLeast: 20 },
} as const;

function lattice(cellId: string) {
  const match = /^epsg25831:250:(\d+):(\d+)$/.exec(cellId);
  if (!match) throw new Error("Boundary comparison requires canonical 250 m cells");
  return { x: Number(match[1]), y: Number(match[2]) };
}

/** Compare each shared side once, never diagonals or a viewport's row ordering. */
export function temperatureBoundaryPairs(cells: BoundaryCell[]) {
  const lookup = new Map(cells.map((cell) => [cell.cellId, cell]));
  if (lookup.size !== cells.length) throw new Error("Duplicate boundary cell");
  return cells.flatMap((a) => {
    const { x, y } = lattice(a.cellId);
    return [[x + 1, y], [x, y + 1]].flatMap(([nx, ny]) => {
      const b = lookup.get(`epsg25831:250:${nx}:${ny}`);
      if (!b || a.windowId !== b.windowId) return [];
      if ([a.baseline.score, b.baseline.score, a.candidate.score, b.candidate.score,
        a.baseline.conditions, b.baseline.conditions, a.candidate.conditions, b.candidate.conditions]
        .some((value) => value === null || !Number.isFinite(value))) return [];
      const difference = (component: string) => {
        const av = a.baseline.components[component];
        const bv = b.baseline.components[component];
        return typeof av === "number" && typeof bv === "number" ? Math.abs(av - bv) : Infinity;
      };
      const habitatCompatible = [a, b].every((cell) => ["habitatCoverage", "altitude", "phenology"]
        .every((component) => (cell.baseline.components[component] ?? 0) > 0));
      const comparable = habitatCompatible && Number.isFinite(a.altitudeM) && Number.isFinite(b.altitudeM) &&
        Math.abs(a.altitudeM - b.altitudeM) <= BOUNDARY_COMPARISON.maximumAltitudeDifferenceM &&
        difference("habitatCoverage") <= BOUNDARY_COMPARISON.maximumHabitatCoverageDifferencePoints &&
        difference("altitude") <= BOUNDARY_COMPARISON.maximumAltitudeSuitabilityDifferencePoints &&
        difference("water") <= BOUNDARY_COMPARISON.maximumWaterDifferencePoints &&
        difference("phenology") <= BOUNDARY_COMPARISON.maximumPhenologyDifferencePoints;
      return [{
        cellA: a.cellId, cellB: b.cellId, windowId: a.windowId,
        crossWeatherBoundary: a.weatherPointId !== b.weatherPointId,
        support: a.applied && b.applied ? "both" : a.applied || b.applied ? "mixed" : "neither",
        comparable, habitatCompatible,
        baselineGap: Math.abs(a.baseline.score! - b.baseline.score!),
        candidateGap: Math.abs(a.candidate.score! - b.candidate.score!),
        baselineConditionsGap: Math.abs(a.baseline.conditions! - b.baseline.conditions!),
        candidateConditionsGap: Math.abs(a.candidate.conditions! - b.candidate.conditions!),
      }];
    });
  });
}

type BoundaryPair = ReturnType<typeof temperatureBoundaryPairs>[number];
function distribution(values: number[]) {
  if (!values.length) return { mean: null, p95: null, maximum: null, atLeast10: 0, atLeast20: 0, atLeast30: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1], maximum: sorted.at(-1)!,
    atLeast10: values.filter((v) => v >= 10).length,
    atLeast20: values.filter((v) => v >= 20).length,
    atLeast30: values.filter((v) => v >= 30).length,
  };
}

export function summarizeTemperatureBoundaries(pairs: BoundaryPair[]) {
  const summary = (selected: BoundaryPair[]) => ({
    pairs: selected.length,
    baseline: distribution(selected.map((p) => p.baselineGap)),
    candidate: distribution(selected.map((p) => p.candidateGap)),
    baselineConditions: distribution(selected.map((p) => p.baselineConditionsGap)),
    candidateConditions: distribution(selected.map((p) => p.candidateConditionsGap)),
    reduced: selected.filter((p) => p.candidateGap < p.baselineGap).length,
    increased: selected.filter((p) => p.candidateGap > p.baselineGap).length,
    unchanged: selected.filter((p) => p.candidateGap === p.baselineGap).length,
    newSevereJumps: selected.filter((p) => p.baselineGap < BOUNDARY_COMPARISON.newSevereJump.baselineGapBelow &&
      p.candidateGap >= BOUNDARY_COMPARISON.newSevereJump.candidateGapAtLeast).length,
    gapIncreasesAtLeast10: selected.filter((p) => p.candidateGap - p.baselineGap >= 10).length,
  });
  const comparable = pairs.filter((p) => p.comparable);
  return {
    all: summary(pairs), comparable: summary(comparable),
    comparableCrossWeather: summary(comparable.filter((p) => p.crossWeatherBoundary)),
    comparableSameWeather: summary(comparable.filter((p) => !p.crossWeatherBoundary)),
    comparableBothSupported: summary(comparable.filter((p) => p.support === "both")),
    comparableCoverageEdges: summary(comparable.filter((p) => p.support === "mixed")),
    comparableNeitherSupported: summary(comparable.filter((p) => p.support === "neither")),
    byWindow: Object.fromEntries([...new Set(pairs.map((p) => p.windowId))].sort().map((windowId) =>
      [windowId, { all: summary(pairs.filter((p) => p.windowId === windowId)),
        comparable: summary(comparable.filter((p) => p.windowId === windowId)),
        crossWeather: summary(comparable.filter((p) => p.windowId === windowId && p.crossWeatherBoundary)) }])),
  };
}
