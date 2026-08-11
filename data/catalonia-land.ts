import cataloniaLand from "@/data/catalonia-land.json";

type Position = [number, number];
type BoundaryFeature = { geometry: { type: "MultiPolygon"; coordinates: Position[][][] } };

function signedArea(ring: Position[]) {
  return ring.reduce((area, point, index) => {
    const previous = ring[index === 0 ? ring.length - 1 : index - 1];
    return area + previous[0] * point[1] - point[0] * previous[1];
  }, 0) / 2;
}

// The ICGC boundary is stored as four province features. Keep only exterior
// rings so their shared administrative enclaves dissolve into one land mask.
export const cataloniaLandRings = (cataloniaLand.features as unknown as BoundaryFeature[])
  .flatMap((feature) => feature.geometry.coordinates.flat())
  .filter((ring) => signedArea(ring) > 0);
