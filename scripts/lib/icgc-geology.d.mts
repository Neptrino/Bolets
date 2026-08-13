export type GeologicalSubstrateClass = "silicic" | "calcareous" | "mixed" | "unconsolidated";
export type GeologicalUnitClass = GeologicalSubstrateClass | "unknown";

export interface GeologicalUnitMapping {
  unitId: number;
  code: string;
  description: string;
  substrateClass: GeologicalUnitClass;
  descriptionFingerprint: string;
  sourceVersion: string;
}

export interface GeologyMappingArtifact {
  source: { sourceVersion: string; [key: string]: unknown };
  units: GeologicalUnitMapping[];
  audit: { mappingFingerprint: string; [key: string]: unknown };
}

export const ICGC_GEOLOGY_SOURCE: Readonly<Record<string, string | number>>;
export const GEOLOGY_CLASSES: readonly GeologicalSubstrateClass[];
export function classifyGeologicalUnit(description: string, period?: string): GeologicalUnitClass;
export function descriptionFingerprint(description: string): string;
export function mappingFingerprint(units: GeologicalUnitMapping[]): string;
export function packGeologyCoverages(coverages: Partial<Record<GeologicalSubstrateClass, number>>): number;
export function packGeologySampleCounts(sampleCounts: Partial<Record<GeologicalSubstrateClass, number>>, totalSamples?: number): {
  coverages: Record<GeologicalSubstrateClass, number>;
  packed: number;
};
export function unpackGeologyCoverages(packed: number): Record<GeologicalSubstrateClass, number>;
export function summarizeGeologySamples(
  unitIds: Array<number | null | undefined>,
  unitsById: Map<number, Pick<GeologicalUnitMapping, "unitId" | "substrateClass">>,
  totalSamples?: number,
): {
  coverages: Record<GeologicalSubstrateClass, number>;
  coveragesPacked: number;
  mappedCoveragePercent: number;
  dominantUnitId?: number;
  dominantUnitCoveragePercent?: number;
};
export function ensureIcgcGeologyPackage(cacheDirectory: string): Promise<string>;
export function readOfficialGeologyUnits(gpkgPath: string): Promise<Array<{ code: string; description: string; period: string }>>;
export function loadGeologyMapping(path: string): Promise<GeologyMappingArtifact>;
export type PolygonCoordinates = Array<Array<Array<[number, number]>>>;
export function parseGeoPackagePolygon(hex: string): PolygonCoordinates;
export function polygonContainsPoint(polygons: PolygonCoordinates, x: number, y: number): boolean;
