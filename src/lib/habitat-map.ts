import { boundsCentre, boundsContain } from "@/src/lib/map-grid";
import type { OccurrenceSupportCell, PotentialHabitatCell } from "@/src/lib/types";

const HABITAT_RGB = "33, 102, 172";

export function isHabitatCellCorroborated(
  cell: PotentialHabitatCell,
  supportCells: OccurrenceSupportCell[],
) {
  const [longitude, latitude] = boundsCentre(cell.cellBounds);
  return supportCells.some((supportCell) => boundsContain(supportCell.bounds, longitude, latitude));
}

export function habitatCellColour(coverage: number) {
  const boundedCoverage = Math.min(1, Math.max(coverage, 0));
  const opacity = Number((0.12 + boundedCoverage * 0.68).toFixed(3));
  return `rgba(${HABITAT_RGB}, ${opacity})`;
}
