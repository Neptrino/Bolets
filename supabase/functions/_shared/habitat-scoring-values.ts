export type HabitatScoringValues = {
  forestCompatibility: number;
  habitatAltitudeSuitability?: number;
  habitatCoverage: number;
};

const floatingPointTolerance = 1e-9;

function verifiedFraction(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < -floatingPointTolerance || value > 1 + floatingPointTolerance) {
    return undefined;
  }
  return Math.max(0, Math.min(1, value));
}

/**
 * Converts the two area-normalised habitat totals into prediction inputs.
 *
 * Both coverage values use the whole display-cell area as their denominator,
 * so their ratio is the mean altitude suitability within compatible habitat.
 * Keeping this arithmetic shared prevents a coarse mean elevation from
 * excluding valid 250 m habitat when the map zooms out.
 */
export function habitatScoringValues({
  coverage: rawCoverage,
  altitudeWeightedCoverage: rawAltitudeWeightedCoverage,
}: {
  coverage: unknown;
  altitudeWeightedCoverage: unknown;
}): HabitatScoringValues | null {
  const habitatCoverage = verifiedFraction(rawCoverage);
  if (habitatCoverage === undefined) return null;

  const altitudeWeightedCoverage = verifiedFraction(rawAltitudeWeightedCoverage);
  if (altitudeWeightedCoverage === undefined) return null;
  if (altitudeWeightedCoverage > habitatCoverage + floatingPointTolerance) {
    return null;
  }

  const forestCompatibility = habitatCoverage * 100;
  if (habitatCoverage === 0) {
    return { forestCompatibility, habitatAltitudeSuitability: 0, habitatCoverage };
  }

  return {
    forestCompatibility,
    habitatAltitudeSuitability: Math.max(
      0,
      Math.min(100, (Math.min(altitudeWeightedCoverage, habitatCoverage) / habitatCoverage) * 100),
    ),
    habitatCoverage,
  };
}

export function mergeHabitatScoringValues(
  baseValues: unknown,
  habitatRow: Record<string, unknown> | undefined,
  completeHabitatCoverage: boolean,
) {
  const values = baseValues && typeof baseValues === "object" && !Array.isArray(baseValues)
    ? { ...(baseValues as Record<string, unknown>) }
    : {};
  const summary = habitatRow
    ? habitatScoringValues({
        coverage: habitatRow.coverage,
        altitudeWeightedCoverage: habitatRow.altitude_weighted_coverage,
      })
    : null;

  if (summary) {
    values.forestCompatibility = summary.forestCompatibility;
    values.habitatAltitudeSuitability = summary.habitatAltitudeSuitability;
    return values;
  }
  if (!habitatRow && completeHabitatCoverage) {
    values.forestCompatibility = 0;
    values.habitatAltitudeSuitability = 0;
    return values;
  }

  delete values.forestCompatibility;
  delete values.habitatAltitudeSuitability;
  delete values.forestTypes;
  delete values.treeSpecies;
  return values;
}
