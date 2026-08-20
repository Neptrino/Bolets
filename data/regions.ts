import type { RegionId, SpatialBounds } from "@/src/lib/types";
import regionDefinitions from "@/data/regions.json";

type RegionDefinition = { id: RegionId; label: string; centre: [number, number]; coordinates: [number, number][] };
const regions = regionDefinitions as RegionDefinition[];

export const regionLabels = Object.fromEntries(regions.map((region) => [region.id, region.label])) as Record<RegionId, string>;
export const regionCentres = Object.fromEntries(regions.map((region) => [region.id, region.centre])) as Record<RegionId, [number, number]>;
export const regionSelectItems = regions.map((region) => ({ value: region.id, label: region.label }));

export const cataloniaSpatialBounds: SpatialBounds = {
  west: 0.05,
  south: 40.48,
  east: 3.32,
  north: 42.92,
};

export const regionBounds = Object.fromEntries(
  regions.map((region) => {
    if (!region.coordinates.length) return [region.id, cataloniaSpatialBounds];
    const longitudes = region.coordinates.map(([longitude]) => longitude);
    const latitudes = region.coordinates.map(([, latitude]) => latitude);
    return [region.id, {
      west: Math.min(...longitudes),
      south: Math.min(...latitudes),
      east: Math.max(...longitudes),
      north: Math.max(...latitudes),
    } satisfies SpatialBounds];
  }),
) as Record<RegionId, SpatialBounds>;

export const isRegionId = (value: string | undefined): value is RegionId => Boolean(value && value in regionLabels);

export const cataloniaRegionsGeoJson: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: regions.filter((region) => region.coordinates.length).map((region) => ({
    type: "Feature",
    properties: { id: region.id, label: region.label },
    geometry: { type: "Polygon", coordinates: [region.coordinates] }
  }))
};
