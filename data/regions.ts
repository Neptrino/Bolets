import type { RegionId } from "@/src/lib/types";
import regionDefinitions from "@/data/regions.json";

type RegionDefinition = { id: RegionId; label: string; centre: [number, number]; coordinates: [number, number][] };
const regions = regionDefinitions as RegionDefinition[];

export const regionLabels = Object.fromEntries(regions.map((region) => [region.id, region.label])) as Record<RegionId, string>;
export const regionCentres = Object.fromEntries(regions.map((region) => [region.id, region.centre])) as Record<RegionId, [number, number]>;
export const regionSelectItems = regions.map((region) => ({ value: region.id, label: region.label }));

export const isRegionId = (value: string | undefined): value is RegionId => Boolean(value && value in regionLabels);

export const cataloniaRegionsGeoJson: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: regions.filter((region) => region.coordinates.length).map((region) => ({
    type: "Feature",
    properties: { id: region.id, label: region.label },
    geometry: { type: "Polygon", coordinates: [region.coordinates] }
  }))
};
