import { boundsCentre, boundsContain } from "@/src/lib/map-grid";
import type { OccurrenceSupportCell, PotentialHabitatCell } from "@/src/lib/types";

const HABITAT_RGB = "150, 63, 32";
const CORROBORATED_HABITAT_RGB = "69, 91, 59";

export function isHabitatCellCorroborated(
  cell: PotentialHabitatCell,
  supportCells: OccurrenceSupportCell[],
) {
  const [longitude, latitude] = boundsCentre(cell.cellBounds);
  return supportCells.some((supportCell) => boundsContain(supportCell.bounds, longitude, latitude));
}

export function habitatCellColour(coverage: number, corroborated: boolean) {
  const boundedCoverage = Math.min(1, Math.max(coverage, 0));
  const opacity = Number((0.08 + boundedCoverage * 0.74).toFixed(3));
  const rgb = corroborated ? CORROBORATED_HABITAT_RGB : HABITAT_RGB;
  return `rgba(${rgb}, ${opacity})`;
}
