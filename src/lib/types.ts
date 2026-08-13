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

export type MapViewMode = "prediction" | "compatibility";
export type SpeciesPredictionMode = "current" | "habitat_only";

export interface SourceReference {
  id: string;
  title: string;
  publisher: string;
  url: string;
  confidence: EvidenceConfidence;
}

export type GeologicalSubstrateClass =
  | "silicic"
  | "calcareous"
  | "mixed"
  | "unconsolidated"
  | "unknown";

/**
 * Display-only geological context derived from the ICGC 1:50,000 map.
 *
 * This is deliberately separate from the legacy `soilSubstrate` scoring input:
 * a geological unit is contextual evidence, not a measured soil property.
 */
export interface GeologicalSubstrateEvidence {
  class: GeologicalSubstrateClass;
  dominantCoverage: number;
  mappedCoverage: number;
  sourceId: "icgc-geology-50k-v3";
  mapScaleDenominator: 50000;
  dominantUnitCode?: string;
  dominantUnitDescription?: string;
  dominantUnitCoverage?: number;
  aggregationBaseM?: 250;
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

export interface CulinaryProfileBase {
  rating: 0 | 1 | 2 | 3;
  ratingLabel: string;
  ratingRationale: string;
  summary: string;
  cautions: string[];
  sources: SourceReference[];
}

export type CulinaryProfile =
  | (CulinaryProfileBase & {
      kind: "culinary";
      flavour: string;
      texture: string;
      bestUses: string[];
      preparation: string[];
      preservation: string[];
    })
  | (CulinaryProfileBase & {
      kind: "safety";
    });

export interface SpeciesProfile {
  speciesId: string;
  predictionMode: SpeciesPredictionMode;
  predictionCaveat?: string;
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
  culinaryProfile: CulinaryProfile;
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
    temperatureMin10dC?: number;
    temperatureAvg10dC?: number;
    temperatureMax10dC?: number;
    frostHours10d?: number;
    relativeHumidity?: number;
    relativeHumidityMin24h?: number;
    relativeHumidityAvg24h?: number;
    relativeHumidityMax24h?: number;
    relativeHumidityAvg7d?: number;
    soilMoisture?: number;
    soilMoistureMin24h?: number;
    soilMoistureAvg24h?: number;
    soilMoistureMax24h?: number;
    soilMoistureMin7d?: number;
    soilMoistureAvg7d?: number;
    soilMoistureMax7d?: number;
    soilMoistureTrend7d?: number;
    rainfall3dMm?: number;
    rainfall7dMm?: number;
    rainfallPrevious23dMm?: number;
    rainfall30dMm?: number;
    drySpellDays?: number;
    evapotranspiration3dMm?: number;
    evapotranspiration7dMm?: number;
    evapotranspiration30dMm?: number;
    windKmh?: number;
    windAvg24hKmh?: number;
    windMax24hKmh?: number;
    windGustKmh?: number;
    windGustMax24hKmh?: number;
    altitudeM?: number;
    habitatAltitudeSuitability?: number;
    forestCompatibility?: number;
    soilCompatibility?: number;
    forestTypes?: string[];
    treeSpecies?: string[];
    soilPh?: number;
    soilTexture?: string;
    soilSubstrate?: string;
    geologicalSubstrate?: GeologicalSubstrateEvidence;
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

export interface RegionalPredictionSummary {
  regionId: RegionId;
  gridSizeM: 10000;
  scoredCellCount: number;
  scoreRange: [number, number];
  result: SuitabilityResult;
  snapshot: ConditionSnapshot;
}

export type SpatialGridSizeM = 250 | 1000 | 2500 | 5000 | 10000;

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

export interface PredictionHistoryPoint {
  observedAt: string;
  score: number | null;
}

export type ForecastHorizonConfidence = "high" | "moderate" | "limited";
export type ForecastHorizonDays = 1 | 2 | 3 | 4 | 5;

export interface PredictionForecastPoint {
  validAt: string;
  score: number | null;
  horizonDays: ForecastHorizonDays;
  horizonConfidence: ForecastHorizonConfidence;
}

export interface PredictionCellTimeline {
  observed: PredictionHistoryPoint[];
  forecast: {
    generatedAt: string;
    source: string[];
    sourceResolutionM: number;
    points: PredictionForecastPoint[];
  } | null;
}

export type PredictionMapCell = Pick<
  PredictionCell,
  "cellId" | "gridSizeM" | "cellBounds" | "score"
> & {
  habitatCoverage: number | null;
};

export interface PotentialHabitatCell {
  speciesId: string;
  cellId: string;
  regionId: RegionId;
  gridSizeM: SpatialGridSizeM;
  cellBounds: CoordinateBounds;
  coverage: number;
  altitudeWeightedCoverage: number;
  eligibleCellCount: number;
  sourceResolutionM: number;
  confidence: EvidenceConfidence;
  source: string[];
}

export type PotentialHabitatMapCell = Pick<
  PotentialHabitatCell,
  "cellId" | "cellBounds" | "coverage" | "altitudeWeightedCoverage"
>;

export interface OccurrenceSupportCell extends HistoricalOccurrenceEvidence {
  bounds: CoordinateBounds;
}
