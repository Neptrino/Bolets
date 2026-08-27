export interface DistributionPolygon<Region extends string = string> {
  regionId: Region;
  coordinates: [number, number][];
}

interface DistributionGridCell<Region extends string = string> {
  regionId: Region;
  bounds: [[number, number], [number, number]];
}

interface DistributionGridOptions {
  bounds: [[number, number], [number, number]];
  longitudeStep: number;
  latitudeStep: number;
  landMask?: [number, number][][];
}

function pointInPolygon(point: [number, number], polygon: [number, number][]) {
  const [x, y] = point;
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [currentX, currentY] = polygon[index];
    const [previousX, previousY] = polygon[previous];
    const crossesRay = (currentY > y) !== (previousY > y)
      && x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX;
    if (crossesRay) inside = !inside;
  }

  return inside;
}

export function createDistributionGrid<Region extends string>(
  polygons: DistributionPolygon<Region>[],
  activeRegions: Region[],
  options: DistributionGridOptions
) {
  const active = new Set(activeRegions);
  const activePolygons = polygons.filter((polygon) => active.has(polygon.regionId));
  const [[west, south], [east, north]] = options.bounds;
  const columns = Math.ceil((east - west) / options.longitudeStep);
  const rows = Math.ceil((north - south) / options.latitudeStep);
  const cells: DistributionGridCell<Region>[] = [];

  for (let row = 0; row < rows; row += 1) {
    const cellSouth = south + row * options.latitudeStep;
    const cellNorth = Math.min(cellSouth + options.latitudeStep, north);

    for (let column = 0; column < columns; column += 1) {
      const cellWest = west + column * options.longitudeStep;
      const cellEast = Math.min(cellWest + options.longitudeStep, east);
      const centre: [number, number] = [(cellWest + cellEast) / 2, (cellSouth + cellNorth) / 2];
      if (options.landMask && !options.landMask.some((ring) => pointInPolygon(centre, ring))) continue;
      const polygon = activePolygons.find((candidate) => pointInPolygon(centre, candidate.coordinates));
      if (!polygon) continue;

      cells.push({
        regionId: polygon.regionId,
        bounds: [[cellWest, cellSouth], [cellEast, cellNorth]]
      });
    }
  }

  return cells;
}
