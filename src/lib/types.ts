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

export type FruitingGuild =
  | "ectomycorrhizal"
  | "litter-soil-saprotroph"
  | "wood-decayer"
  | "grassland"
  | "hypogeous";

export type MonthlyPhenologyAnchors = readonly [
  number, number, number, number, number, number,
  number, number, number, number, number, number,
];

export interface WaterModelParameters {
  waterExponent: number;
  moistureWindowDays: 7;
  rewBand: readonly [number, number, number, number];
  rainfallWindowDays: 14 | 21 | 26;
  rainfallHalfSaturationMm: number;
  wetDaysHalfSaturation: number;
  triggerDependency: number;
  drySpellGraceDays: number;
  drySpellDecayDays: number;
  drySpellExponent: number;
  vpdComfortKpa: number;
  vpdDecayKpa: number;
  vpdExponent: number;
}

export interface TemperatureModelParameters {
  windowDays: 14 | 20;
  optimumC: number;
  coldHalfWidthC: number;
  warmHalfWidthC: number;
  frostHalfLifeHours: number;
  heatHalfLifeHours: number;
}

/**
 * v2 water parameters. The rain and soil estimators are combined as a weighted
 * geometric mean instead of v1's chain, and both carry floors, so a single
 * unreliable input cannot zero an otherwise favourable score.
 */
export interface WaterModelParametersV2 extends Omit<
  WaterModelParameters,
  "waterExponent" | "triggerDependency"
> {
  /** Weight given to the soil estimator; the rain estimator takes the rest. */
  soilWeight: number;
  /** Weight of the 7-day soil minimum within the soil estimator. */
  soilFloorWeight: number;
  soilDryFloor: number;
  soilWetFloor: number;
  rainFloor: number;
  /**
   * Weight of the trailing week's rain within the window. Fruiting bodies
   * found today developed over the preceding weeks, so fresh rain counts
   * less: 0 scores matured rain only, 1 restores the plain trailing window.
   * Fast saprotroph guilds sit high, slow ectomycorrhizal guilds low.
   */
  recentRainWeight: number;
  /**
   * Length of the "recent" exclusion window in days. The default 7 suits
   * fast flushes (chanterelles fruit 7-12 days after rain); boletus flushes
   * trail rain by roughly two weeks in both observed seasons, so their
   * species override extends the exclusion to 14 days.
   */
  recentWindowDays: 7 | 14;
  /** Exponent on water in the fruiting product; temperature takes the rest. */
  waterExponent: number;
}

export interface CombinationModelParameters {
  /** Concave habitat weight: opportunity = habitat^exponent x conditions. */
  habitatExponent: number;
  /** Monotone calibration applied to the raw component product. */
  calibrationGamma: number;
}

/**
 * Altitude correction for the phenology calendar. The fruiting season moves
 * downslope through autumn (~25-40 days per 1000 m in dated observations), so
 * a cell above the species' reference altitude reads the calendar that many
 * days ahead; below it, behind. Spring-calendar species shift the opposite
 * way and currently carry no shift.
 */
export interface PhenologyAltitudeShift {
  /** Calendar days read ahead per 100 m above the reference altitude. */
  daysPer100m: number;
  referenceAltitudeM: number;
  maxShiftDays: number;
}

export type ModelEvidence =
  | { status: "expert-prior" | "species-literature"; citations: string[] }
  | { status: "unsupported"; citations: string[] };

export type FruitingModelConfig =
  | {
      model: "hydrothermal-v1";
      version: string;
      status: "supported";
      guild: Exclude<FruitingGuild, "hypogeous">;
      water: WaterModelParameters;
      temperature: TemperatureModelParameters;
      phenology: { monthlyAnchors: MonthlyPhenologyAnchors };
      evidence: Extract<ModelEvidence, { status: "expert-prior" | "species-literature" }>;
    }
  | {
      model: "hydrothermal-v2";
      version: string;
      status: "supported";
      guild: Exclude<FruitingGuild, "hypogeous">;
      water: WaterModelParametersV2;
      temperature: TemperatureModelParameters;
      combination: CombinationModelParameters;
      phenology: {
        monthlyAnchors: MonthlyPhenologyAnchors;
        altitudeShift?: PhenologyAltitudeShift;
      };
      evidence: Extract<ModelEvidence, { status: "expert-prior" | "species-literature" }>;
    }
  | {
      model: "hydrothermal-v1";
      version: string;
      status: "habitat-only";
      guild: "hypogeous";
      evidence: Extract<ModelEvidence, { status: "unsupported" }>;
    };

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
  /** Editorial search copy for a species whose common names need clarification. */
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
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
  modelConfig: FruitingModelConfig;
  idealConditions: string[];
  references: SourceReference[];
  media: MediaAsset[];
  confidence: EvidenceConfidence;
}

/** Source-backed catalogue knowledge, deliberately not a scoring input. */
export interface ReferenceSpeciesProfile extends Pick<SpeciesProfile,
  "speciesId" | "seo" | "identity" | "morphology" | "similarSpecies" |
  "safetyNotice" | "culinaryProfile" | "references" | "media" | "confidence"
> {
  scope: "reference-only";
  ecology: {
    habitats: string[];
    season: string;
    description: string;
    limitations: string;
  };
}

export type CatalogueSpecies = SpeciesProfile | ReferenceSpeciesProfile;

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
    temperatureAvg7dC?: number;
    temperatureAvg14dC?: number;
    temperatureAvg20dC?: number;
    frostHours14d?: number;
    frostHours20d?: number;
    heatHours14d?: number;
    heatHours20d?: number;
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
    rainfall24hMm?: number;
    rainfall3dMm?: number;
    rainfall7dMm?: number;
    rainfallPrevious23dMm?: number;
    rainfall30dMm?: number;
    rainfall14dMm?: number;
    rainfall21dMm?: number;
    rainfall26dMm?: number;
    rainfallDays7d?: number;
    rainfallDays14d?: number;
    rainfallDays21d?: number;
    rainfallDays26d?: number;
    rainfallDays30d?: number;
    drySpellDays?: number;
    evapotranspiration3dMm?: number;
    evapotranspiration7dMm?: number;
    evapotranspiration30dMm?: number;
    evapotranspiration14dMm?: number;
    evapotranspiration21dMm?: number;
    evapotranspiration26dMm?: number;
    windKmh?: number;
    windAvg24hKmh?: number;
    windMax24hKmh?: number;
    windGustKmh?: number;
    windGustMax24hKmh?: number;
    altitudeM?: number;
    habitatAltitudeSuitability?: number;
    habitatCoveragePercent?: number;
    forestTypes?: string[];
    treeSpecies?: string[];
    soilPh?: number;
    soilTexture?: string;
    soilSubstrate?: string;
    geologicalSubstrate?: GeologicalSubstrateEvidence;
  };
}

export type ModelComponentId =
  | "habitatCoverage"
  | "altitude"
  | "phenology"
  | "water"
  | "temperature"
  | "extremes";

export interface ModelComponent {
  id: ModelComponentId;
  label: string;
  score: number | null;
  state: "favourable" | "mixed" | "unfavourable" | "unknown";
}

export interface SuitabilityResult {
  /** Area-density opportunity index. This remains `score` for map/API consumers. */
  score: number | null;
  fruitingConditionsScore: number | null;
  opportunityIndex: number | null;
  rawHabitatCoverage: number | null;
  effectiveHabitatCoverage: number | null;
  label: "molt baixa" | "baixa" | "mitjana" | "alta" | "molt alta" | "sense dades";
  components: ModelComponent[];
  modelVersion: string;
  dataCompleteness: number;
  missingComponents: ModelComponentId[];
}

export interface RegionalPredictionSummary {
  regionId: RegionId;
  gridSizeM: SpatialGridSizeM;
  scoredCellCount: number;
  /** Compatible scored cells with a value above zero. */
  positiveCellCount: number;
  /** Compatible scored cells reaching the public "baixa" band (20+). */
  score20CellCount: number;
  positiveCellShare: number;
  score20CellShare: number;
  scoreRange: [number, number];
  /**
   * Highest-scoring cell in the region. A localized pocket (for example a
   * post-storm valley) can score well above the region-wide median, so the
   * summary keeps both readings.
   */
  bestCell: { cellId: string; score: number; cellBounds: CoordinateBounds };
  result: SuitabilityResult;
  snapshot: ConditionSnapshot;
}

/**
 * A regional summary recomputed over an area hub's own bounds (massís or
 * comarca scale) instead of the parent region's cells. The parent regionId is
 * kept for map links and snapshot labelling.
 */
export interface AreaPredictionSummary extends RegionalPredictionSummary {
  areaSlug: string;
  gridSizeM: 1000;
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
  fruitingConditionsScore: number | null;
  opportunityIndex: number | null;
  effectiveHabitatCoverage: number | null;
  label: SuitabilityResult["label"];
  sourceResolutionM: number;
  confidence: EvidenceConfidence;
  stale: boolean;
  source: string[];
  unavailableFields: string[];
  values: ConditionSnapshot["values"];
  modelVersion: string;
  components: ModelComponent[];
  occurrenceEvidence: HistoricalOccurrenceEvidence | null;
  occurrenceEvidenceStatus: OccurrenceEvidenceStatus;
}

export interface PredictionHistoryPoint {
  observedAt: string;
  score: number | null;
  fruitingConditionsScore: number | null;
  opportunityIndex: number | null;
}

export type ForecastHorizonConfidence = "high" | "moderate" | "limited";
export type ForecastHorizonDays = 1 | 2 | 3 | 4 | 5;

export interface PredictionForecastPoint {
  validAt: string;
  score: number | null;
  fruitingConditionsScore: number | null;
  opportunityIndex: number | null;
  horizonDays: ForecastHorizonDays;
  horizonConfidence: ForecastHorizonConfidence;
}

export interface PredictionCellTimeline {
  modelVersion: string;
  observed: PredictionHistoryPoint[];
  forecast: {
    generatedAt: string;
    source: string[];
    sourceResolutionM: number;
    anchor: PredictionHistoryPoint & { score: number };
    calibratedAt: string;
    correctionMethod: "observed-anomaly-v1";
    points: PredictionForecastPoint[];
  } | null;
}

export type PredictionMapCell = Pick<
  PredictionCell,
  "cellId" | "gridSizeM" | "cellBounds" | "score"
> & {
  habitatCoverage: number | null;
};

/**
 * Combined-map cell: the best opportunity score among the candidate species,
 * attributed to the species that produced it. `topSpeciesId` is null exactly
 * when the score is withheld or every candidate scored zero.
 */
export type GlobalPredictionMapCell = PredictionMapCell & {
  topSpeciesId: string | null;
};

export interface GlobalSpeciesScore {
  speciesId: string;
  score: number;
  fruitingConditionsScore: number | null;
  effectiveHabitatCoverage: number | null;
}

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
