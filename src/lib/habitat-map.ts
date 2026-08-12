import { boundsCentre, boundsContain } from "@/src/lib/map-grid";
import type {
  OccurrenceSupportCell,
  PotentialHabitatCell,
  PotentialHabitatMapCell,
} from "@/src/lib/types";

export function toPotentialHabitatMapCell(
  cell: PotentialHabitatCell,
): PotentialHabitatMapCell {
  return {
    cellId: cell.cellId,
    cellBounds: cell.cellBounds,
    coverage: cell.coverage,
    altitudeWeightedCoverage: cell.altitudeWeightedCoverage,
  };
}

const HABITAT_RGB = "33, 102, 172";

export function isHabitatCellCorroborated(
  cell: Pick<PotentialHabitatCell, "cellBounds">,
  supportCells: Array<Pick<OccurrenceSupportCell, "bounds">>,
) {
  const [longitude, latitude] = boundsCentre(cell.cellBounds);
  return supportCells.some((supportCell) => boundsContain(supportCell.bounds, longitude, latitude));
}

export function habitatCellIntensity(
  cell: Pick<PotentialHabitatMapCell, "coverage"> &
    Partial<Pick<PotentialHabitatMapCell, "altitudeWeightedCoverage">>,
) {
  return cell.altitudeWeightedCoverage ?? cell.coverage;
}

export function habitatCellColour(coverage: number) {
  const boundedCoverage = Math.min(1, Math.max(coverage, 0));
  const opacity = Number((0.12 + boundedCoverage * 0.68).toFixed(3));
  return `rgba(${HABITAT_RGB}, ${opacity})`;
}
