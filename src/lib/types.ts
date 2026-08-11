export type EvidenceConfidence = "high" | "moderate" | "limited" | "unknown";

export type EdibilityStatus =
  | "excellent_edible"
  | "edible"
  | "edible_with_conditions"
  | "not_recommended"
  | "inedible"
  | "toxic"
  | "dangerously_toxic"
  | "unknown";

export type Month =
  | "gen"
  | "feb"
  | "mar"
  | "abr"
  | "mai"
  | "jun"
  | "jul"
  | "ago"
  | "set"
  | "oct"
  | "nov"
  | "des";

export type SeasonalActivity = "inactive" | "possible" | "moderate" | "good" | "peak";

export type RegionId =
  | "pirineus"
  | "prepirineus"
  | "catalunya-central"
  | "serralades-costeres"
  | "serralades-prelitorals"
  | "emporda"
  | "montseny"
  | "ports"
  | "muntanyes-interiors"
  | "altres";

export interface SourceReference {
  id: string;
  title: string;
  publisher: string;
  url: string;
  confidence: EvidenceConfidence;
}

export interface MediaAsset {
  id: string;
  imageUrl?: string;
  sourceUrl: string;
  localPath?: string;
  attribution: string;
  license: string;
  identificationReference: boolean;
  alt: string;
}

export interface SimilarSpecies {
  scientificName: string;
  commonName: string;
  mainDifferences: string;
  edibility: EdibilityStatus;
  toxicity: string;
  warning?: boolean;
}

export interface Morphology {
  cap: string;
  hymenium: string;
  stem: string;
  flesh: string;
  colour: string;
  smell: string;
  texture: string;
  typicalAppearance: string;
  keyFeatures: string[];
  variation: string;
}

export interface SoilPreference {
  texture: string;
  reaction: string;
  phRange?: [number, number];
  substrate: string;
  organicMatter: string;
  drainage: string;
  waterRetention: string;
  depth: string;
  humus: string;
  evidence: EvidenceConfidence;
}

export interface ClimateProfile {
  temperatureRange: [number, number];
  nightPreference: string;
  relativeHumidity: string;
  soilMoisture: string;
  rainfall: string;
  drought: string;
  heat: string;
  frost: string;
  wind: string;
  snow: string;
}

export interface RainfallResponse {
  minimumMeaningful?: string;
  preferredAccumulation: string;
  fruitingDelay: string;
  priorMoisture: string;
  temperatureAfterRain: string;
  interruption: string;
  uncertainty: string;
}

export interface HabitatProfile {
  forestTypes: string[];
  treeAssociations: string[];
  hosts: string[];
  soilPreference: string;
  substrate: string;
  moisture: string;
  altitude: [number, number];
  slope: string;
  aspect: string;
  shade: string;
  landscapePosition: string;
}

export interface EcologicalConfig {
  habitat: HabitatProfile;
  soil: SoilPreference;
  climate: ClimateProfile;
  rainfall: RainfallResponse;
  seasonality: Record<Month, SeasonalActivity>;
  regions: RegionId[];
}

export interface ModelFactor {
  id: "forest" | "soil" | "rainfall" | "soilMoisture" | "temperature" | "altitude" | "humidity" | "seasonality";
  label: string;
  weight: number;
  explanation: string;
}

export interface ModelConfig {
  version: string;
  factors: ModelFactor[];
}

export interface SpeciesProfile {
  speciesId: string;
  identity: {
    commonName: string;
    alternateNames: string[];
    scientificName: string;
    family: string;
    genus: string;
    edibility: EdibilityStatus;
    identificationDifficulty: string;
    typicalSize: string;
    shortDescription: string;
  };
  morphology: Morphology;
  similarSpecies: SimilarSpecies[];
  safetyNotice: string;
  ecologicalConfig: EcologicalConfig;
  modelConfig: ModelConfig;
  idealConditions: string[];
  references: SourceReference[];
  media: MediaAsset[];
  confidence: EvidenceConfidence;
}

export interface ConditionSnapshot {
  regionId: RegionId;
  observedAt: string;
  source: string[];
  confidence: EvidenceConfidence;
  stale: boolean;
  unavailableFields: string[];
  values: {
    weatherObservedAt?: string;
    weatherModel?: string;
    atmosphericResolutionM?: number;
    soilMoistureResolutionM?: number;
    weatherGridLatitude?: number;
    weatherGridLongitude?: number;
    weatherElevationM?: number;
    soilGridLatitude?: number;
    soilGridLongitude?: number;
    temperatureC?: number;
    temperatureMin24hC?: number;
    temperatureAvg24hC?: number;
    temperatureMax24hC?: number;
    temperatureMin7dC?: number;
    frostHours7d?: number;
    relativeHumidity?: number;
    relativeHumidityMin24h?: number;
    relativeHumidityAvg24h?: number;
    relativeHumidityMax24h?: number;
    soilMoisture?: number;
    soilMoistureMin24h?: number;
    soilMoistureAvg24h?: number;
    soilMoistureMax24h?: number;
    rainfall7dMm?: number;
    windKmh?: number;
    windAvg24hKmh?: number;
    windMax24hKmh?: number;
    windGustKmh?: number;
    windGustMax24hKmh?: number;
    altitudeM?: number;
    forestCompatibility?: number;
    soilCompatibility?: number;
    forestTypes?: string[];
    treeSpecies?: string[];
    soilPh?: number;
    soilTexture?: string;
    soilSubstrate?: string;
  };
}

export interface FactorContribution {
  id: ModelFactor["id"];
  label: string;
  weight: number;
  score: number | null;
  state: "favourable" | "mixed" | "unfavourable" | "unknown";
}

export interface SuitabilityResult {
  score: number | null;
  label: "molt favorable" | "favorable" | "mixta" | "poc favorable" | "sense dades";
  contributions: FactorContribution[];
  modelVersion: string;
  dataCompleteness: number;
  missingFactors: ModelFactor["id"][];
}

export type SpatialGridSizeM = 250 | 500 | 1000 | 2500 | 5000 | 10000;

export interface SpatialBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export type CoordinateBounds = [[number, number], [number, number]];

export interface OccurrenceEvidenceSource {
  sourceId: string;
  title: string;
  datasetKey: string;
  doi: string;
  licenseUrl: string;
  sourceUrl: string;
  lastSyncedAt: string | null;
}

export interface HistoricalOccurrenceEvidence {
  supportCellId: string;
  gridSizeM: 10000;
  recordCount: number;
  observedYearMin: number | null;
  observedYearMax: number | null;
  observedMonths: number[];
  sources: OccurrenceEvidenceSource[];
}

export type OccurrenceEvidenceStatus = "supported" | "no-records" | "unavailable";

export interface PredictionCell {
  speciesId: string;
  cellId: string;
  regionId: RegionId;
  observedAt: string;
  gridSizeM: SpatialGridSizeM;
  cellBounds: CoordinateBounds;
  score: number | null;
  label: SuitabilityResult["label"];
  sourceResolutionM: number;
  confidence: EvidenceConfidence;
  stale: boolean;
  source: string[];
  unavailableFields: string[];
  values: ConditionSnapshot["values"];
  modelVersion: string;
  factors: FactorContribution[];
  occurrenceEvidence: HistoricalOccurrenceEvidence | null;
  occurrenceEvidenceStatus: OccurrenceEvidenceStatus;
}

export type PredictionMapCell = Pick<
  PredictionCell,
  "speciesId" | "cellId" | "regionId" | "gridSizeM" | "cellBounds" | "score" | "label"
>;

export interface PotentialHabitatCell {
  speciesId: string;
  cellId: string;
  regionId: RegionId;
  gridSizeM: SpatialGridSizeM;
  cellBounds: CoordinateBounds;
  coverage: number;
  eligibleCellCount: number;
  sourceResolutionM: number;
  confidence: EvidenceConfidence;
  source: string[];
}

export interface OccurrenceSupportCell extends HistoricalOccurrenceEvidence {
  bounds: CoordinateBounds;
}
