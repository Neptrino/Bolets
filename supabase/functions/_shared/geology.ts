export const ICGC_GEOLOGY_SOURCE_ID = "icgc-geology-50k-v3" as const;
export const ICGC_GEOLOGY_SCALE_DENOMINATOR = 50_000 as const;

export type GeologicalSubstrateClass =
  | "silicic"
  | "calcareous"
  | "mixed"
  | "unconsolidated"
  | "unknown";

export type SpatialGeologyRow = {
  cell_id?: unknown;
  silicic_percent?: unknown;
  calcareous_percent?: unknown;
  mixed_percent?: unknown;
  unconsolidated_percent?: unknown;
  unknown_percent?: unknown;
  mapped_percent?: unknown;
  dominant_unit_code?: unknown;
  dominant_unit_description?: unknown;
  dominant_unit_coverage_percent?: unknown;
  source_id?: unknown;
  scale_denominator?: unknown;
};

function percentage(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : undefined;
}

/**
 * Converts compact database percentages into the display-only API contract.
 *
 * A class must cover at least 70% of the whole display cell to be called
 * dominant. A well-mapped contact without one dominant class is reported as
 * mixed. Sparse or mapped-but-unclassified evidence is reported as unknown.
 */
export function geologicalSubstrateEvidence(
  row: SpatialGeologyRow | undefined,
  gridSizeM: number,
) {
  if (!row) return undefined;
  const mappedPercent = percentage(row.mapped_percent);
  if (mappedPercent === undefined || mappedPercent <= 0) return undefined;

  const classifiedEntries = [
    ["silicic", percentage(row.silicic_percent) ?? 0],
    ["calcareous", percentage(row.calcareous_percent) ?? 0],
    ["mixed", percentage(row.mixed_percent) ?? 0],
    ["unconsolidated", percentage(row.unconsolidated_percent) ?? 0],
  ] as const satisfies readonly (readonly [Exclude<GeologicalSubstrateClass, "unknown">, number])[];
  const unknownPercent = percentage(row.unknown_percent) ?? 0;
  const classifiedTotal = classifiedEntries.reduce((total, [, value]) => total + value, 0);
  if (classifiedTotal + unknownPercent > mappedPercent + 0.01) return undefined;

  const [largestClass, largestPercent] = classifiedEntries.reduce((largest, entry) =>
    entry[1] > largest[1] ? entry : largest
  );
  let substrateClass: GeologicalSubstrateClass;
  let dominantPercent: number;
  if (unknownPercent >= 70) {
    substrateClass = "unknown";
    dominantPercent = unknownPercent;
  } else if (largestPercent >= 70) {
    substrateClass = largestClass;
    dominantPercent = largestPercent;
  } else if (mappedPercent >= 70 && classifiedTotal > unknownPercent) {
    substrateClass = "mixed";
    dominantPercent = classifiedTotal;
  } else {
    substrateClass = "unknown";
    dominantPercent = Math.max(unknownPercent, mappedPercent - classifiedTotal);
    if (dominantPercent <= 0) dominantPercent = mappedPercent;
  }

  const unitCode = typeof row.dominant_unit_code === "string" && row.dominant_unit_code.trim()
    ? row.dominant_unit_code.trim()
    : undefined;
  const unitCoveragePercent = percentage(row.dominant_unit_coverage_percent);
  const unitDescription = typeof row.dominant_unit_description === "string" &&
      row.dominant_unit_description.trim()
    ? row.dominant_unit_description.trim()
    : undefined;
  const hasValidUnit = unitCode !== undefined && unitCoveragePercent !== undefined && unitCoveragePercent <= mappedPercent;
  const sourceId = row.source_id === ICGC_GEOLOGY_SOURCE_ID
    ? ICGC_GEOLOGY_SOURCE_ID
    : undefined;
  const mapScaleDenominator = row.scale_denominator === ICGC_GEOLOGY_SCALE_DENOMINATOR
    ? ICGC_GEOLOGY_SCALE_DENOMINATOR
    : undefined;
  if (!sourceId || !mapScaleDenominator) return undefined;

  return {
    class: substrateClass,
    dominantCoverage: dominantPercent / 100,
    mappedCoverage: mappedPercent / 100,
    sourceId,
    mapScaleDenominator,
    ...(hasValidUnit
      ? {
          dominantUnitCode: unitCode,
          ...(unitDescription ? { dominantUnitDescription: unitDescription } : {}),
          dominantUnitCoverage: unitCoveragePercent / 100,
        }
      : {}),
    ...(gridSizeM === 250 ? {} : { aggregationBaseM: 250 as const }),
  };
}
