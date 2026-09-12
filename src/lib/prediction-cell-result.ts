import type { PredictionCell, SuitabilityResult } from "@/src/lib/types";

/** Preserve the server-scored reading, including the selected child of a coarse cell. */
export function resultFromCell(cell: PredictionCell): SuitabilityResult {
  const missingComponents = cell.components
    .filter((component) => component.score === null)
    .map((component) => component.id);
  return {
    score: cell.score,
    fruitingConditionsScore: cell.fruitingConditionsScore,
    opportunityIndex: cell.opportunityIndex,
    rawHabitatCoverage: cell.values.habitatCoveragePercent === undefined
      ? null
      : Math.max(0, Math.min(1, cell.values.habitatCoveragePercent / 100)),
    effectiveHabitatCoverage: cell.effectiveHabitatCoverage,
    label: cell.label,
    components: cell.components,
    modelVersion: cell.modelVersion,
    dataCompleteness: cell.components.length
      ? (cell.components.length - missingComponents.length) / cell.components.length
      : 0,
    missingComponents,
  };
}
