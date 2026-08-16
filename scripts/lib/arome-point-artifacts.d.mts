export const AROME_POINT_ARTIFACT_SCHEMA: "arome-point-artifacts-v1";
export const AROME_POINT_COMPARISON_SCHEMA: "arome-point-comparison-v1";

export type AromePrivatePoint = {
  latitude: number;
  longitude: number;
};

export type AromePointComparison = {
  schema: "arome-point-comparison-v1";
  status: "offline-shadow-diagnostic";
  provider: string;
  model: string;
  datasetId: string;
  runAt: string;
  validAt: string;
  leadHours: number;
  nativeGrid: {
    angularResolutionDegrees: number;
    coordinateReferenceSystem: "Météo-France GRIB geographic sphere";
    sphereRadiusMetres: number;
    rasterInterpretation: "pixel-is-point";
  };
  transportContracts: {
    temperature2m: {
      describedUnit: "K";
      tiffUnit: "C";
      offsetToDescribedUnit: 273.15;
    };
    relativeHumidity2m: { describedUnit: "%"; tiffUnit: "%" };
    windSpeed10m: { describedUnit: "m s-1"; tiffUnit: "m/s" };
  };
  limitations: string[];
  locations: Array<{
    location: string;
    temperature2m: { value: number; unit: "°C" };
    relativeHumidity2m: { value: number; unit: "%" };
    windSpeed10m: { value: number; unit: "m/s" };
  }>;
  differencesFromLocation1: Array<{
    location: string;
    temperature2mDifference: { value: number; unit: "°C" };
    relativeHumidity2mDifference: { value: number; unit: "percentage points" };
    windSpeed10mDifference: { value: number; unit: "m/s" };
  }>;
};

export function parseAromePointArtifactManifest(value: unknown): unknown;
export function parsePrivateAromePoints(value: unknown): Array<AromePrivatePoint & { label: string }>;
export function compareAromePointArtifacts(options: {
  manifestPath: string;
  pointsPath: string;
  repositoryRoot?: string;
}): Promise<AromePointComparison>;
export function sanitizeAromePointDiagnosticError(error: unknown): string;
