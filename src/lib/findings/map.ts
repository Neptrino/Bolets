import type { OwnerFinding, PublicFindingCell } from "@/src/lib/findings/types";
import type { SpatialBounds } from "@/src/lib/types";

type PersonalFindingForMap = Pick<
  OwnerFinding,
  "cellBounds" | "exactLocation" | "id" | "reportedSpeciesName"
>;

export type PersonalFindingMapProperties = {
  exact: boolean;
  findingId: string;
  name: string;
};

export function personalFindingBounds(
  findings: PersonalFindingForMap[],
): SpatialBounds | null {
  if (!findings.length) return null;

  return findings.reduce<SpatialBounds>((bounds, finding) => {
    const findingBounds = finding.exactLocation
      ? {
          west: finding.exactLocation.longitude,
          south: finding.exactLocation.latitude,
          east: finding.exactLocation.longitude,
          north: finding.exactLocation.latitude,
        }
      : finding.cellBounds;

    return {
      west: Math.min(bounds.west, findingBounds.west),
      south: Math.min(bounds.south, findingBounds.south),
      east: Math.max(bounds.east, findingBounds.east),
      north: Math.max(bounds.north, findingBounds.north),
    };
  }, {
    west: Number.POSITIVE_INFINITY,
    south: Number.POSITIVE_INFINITY,
    east: Number.NEGATIVE_INFINITY,
    north: Number.NEGATIVE_INFINITY,
  });
}

export function personalFindingMapData(findings: PersonalFindingForMap[]) {
  const exactPoints: GeoJSON.FeatureCollection<
    GeoJSON.Point,
    PersonalFindingMapProperties
  > = {
    type: "FeatureCollection",
    features: findings.flatMap((finding) => finding.exactLocation ? [{
      type: "Feature" as const,
      properties: {
        exact: true,
        findingId: finding.id,
        name: finding.reportedSpeciesName,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [
          finding.exactLocation.longitude,
          finding.exactLocation.latitude,
        ],
      },
    }] : []),
  };
  const coarseCells: GeoJSON.FeatureCollection<
    GeoJSON.Polygon,
    PersonalFindingMapProperties
  > = {
    type: "FeatureCollection",
    features: findings.flatMap((finding) => {
      if (finding.exactLocation) return [];
      const { west, south, east, north } = finding.cellBounds;
      return [{
        type: "Feature" as const,
        properties: {
          exact: false,
          findingId: finding.id,
          name: finding.reportedSpeciesName,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ]],
        },
      }];
    }),
  };

  return { coarseCells, exactPoints };
}

export function findingCellsInBounds(cells: PublicFindingCell[], bounds: SpatialBounds) {
  return cells.filter((cell) =>
    cell.bounds.east > bounds.west &&
    cell.bounds.west < bounds.east &&
    cell.bounds.north > bounds.south &&
    cell.bounds.south < bounds.north
  );
}

export function findingCellAt(
  cells: Iterable<PublicFindingCell>,
  longitude: number,
  latitude: number,
) {
  for (const cell of cells) {
    if (
      longitude >= cell.bounds.west &&
      longitude < cell.bounds.east &&
      latitude >= cell.bounds.south &&
      latitude < cell.bounds.north
    ) return cell;
  }
}

export function findingCellColour(count: number) {
  if (count >= 15) return "#425c49";
  if (count >= 5) return "#9c4f2b";
  return "#d88445";
}

export function findingCellFillOpacity(width: number, height: number) {
  const size = Math.max(width, height);
  if (size <= 32) return 0.78;
  if (size >= 160) return 0.26;
  return 0.78 - ((size - 32) / 128) * 0.52;
}
