import { z } from "zod";

const confidence = z.enum(["high", "moderate", "limited", "unknown"]);
const edibility = z.enum([
  "excellent_edible",
  "edible",
  "edible_with_conditions",
  "not_recommended",
  "inedible",
  "toxic",
  "dangerously_toxic",
  "unknown"
]);
const month = z.enum(["gen", "feb", "mar", "abr", "mai", "jun", "jul", "ago", "set", "oct", "nov", "des"]);
const activity = z.enum(["inactive", "possible", "moderate", "good", "peak"]);
const region = z.enum([
  "pirineus",
  "prepirineus",
  "catalunya-central",
  "serralades-costeres",
  "serralades-prelitorals",
  "emporda",
  "montseny",
  "ports",
  "muntanyes-interiors",
  "altres"
]);
export const spatialGridSizeSchema = z.union([
  z.literal(250), z.literal(1000), z.literal(2500), z.literal(5000), z.literal(10000)
]);
const localMediaPath = z
  .string()
  .regex(
    /^\/(?!\/)[^\s]+\.webp$/,
    "Expected a root-relative WebP media path",
  );

export const geologicalSubstrateEvidenceSchema = z.object({
  class: z.enum([
    "silicic",
    "calcareous",
    "mixed",
    "unconsolidated",
    "unknown",
  ]),
  dominantCoverage: z.number().min(0).max(1),
  mappedCoverage: z.number().min(0).max(1),
  sourceId: z.literal("icgc-geology-50k-v3"),
  mapScaleDenominator: z.literal(50000),
  dominantUnitCode: z.string().trim().min(1).max(40).optional(),
  dominantUnitDescription: z.string().trim().min(1).max(1000).optional(),
  dominantUnitCoverage: z.number().min(0).max(1).optional(),
  aggregationBaseM: z.literal(250).optional(),
}).superRefine((evidence, context) => {
  if (evidence.dominantCoverage > evidence.mappedCoverage) {
    context.addIssue({
      code: "custom",
      path: ["dominantCoverage"],
      message: "Dominant coverage cannot exceed mapped coverage",
    });
  }

  if (evidence.dominantUnitCoverage !== undefined &&
      evidence.dominantUnitCoverage > evidence.mappedCoverage) {
    context.addIssue({
      code: "custom",
      path: ["dominantUnitCoverage"],
      message: "Dominant unit coverage cannot exceed mapped coverage",
    });
  }

  if ((evidence.dominantUnitCode === undefined) !==
      (evidence.dominantUnitCoverage === undefined)) {
    context.addIssue({
      code: "custom",
      path: evidence.dominantUnitCode === undefined
        ? ["dominantUnitCode"]
        : ["dominantUnitCoverage"],
      message: "Dominant unit code and coverage must be provided together",
    });
  }

  if (evidence.dominantUnitDescription !== undefined &&
      (evidence.dominantUnitCode === undefined ||
        evidence.dominantUnitCoverage === undefined)) {
    context.addIssue({
      code: "custom",
      path: ["dominantUnitDescription"],
      message: "Dominant unit description requires unit code and coverage",
    });
  }
});

const sourceReference = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  url: z.url(),
  confidence,
});
const culinaryProfileBase = z.object({
  rating: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  ratingLabel: z.string().min(1),
  ratingRationale: z.string().min(1),
  summary: z.string().min(1),
  cautions: z.array(z.string().min(1)).min(1),
  sources: z.array(sourceReference).min(1),
});
const culinaryProfile = z.discriminatedUnion("kind", [
  culinaryProfileBase.extend({
    kind: z.literal("culinary"),
    flavour: z.string().min(1),
    texture: z.string().min(1),
    bestUses: z.array(z.string().min(1)).min(1),
    preparation: z.array(z.string().min(1)).min(1),
    preservation: z.array(z.string().min(1)).min(1),
  }),
  culinaryProfileBase.extend({ kind: z.literal("safety") }),
]);

const supportedModelEvidence = z.object({
  status: z.enum(["expert-prior", "species-literature"]),
  citations: z.array(z.url()).min(1),
});
const unsupportedModelEvidence = z.object({
  status: z.literal("unsupported"),
  citations: z.array(z.url()),
});
const waterModelParameters = z.object({
  waterExponent: z.number().gt(0).lt(1),
  moistureWindowDays: z.literal(7),
  rewBand: z.tuple([
    z.number().min(0).max(1.4),
    z.number().min(0).max(1.4),
    z.number().min(0).max(1.4),
    z.number().min(0).max(1.4),
  ]),
  rainfallWindowDays: z.union([z.literal(14), z.literal(21), z.literal(26)]),
  rainfallHalfSaturationMm: z.number().positive(),
  wetDaysHalfSaturation: z.number().positive(),
  triggerDependency: z.number().min(0).max(1),
  drySpellGraceDays: z.number().min(0),
  drySpellDecayDays: z.number().positive(),
  drySpellExponent: z.number().min(0),
  vpdComfortKpa: z.number().min(0),
  vpdDecayKpa: z.number().positive(),
  vpdExponent: z.number().min(0),
}).superRefine(({ rewBand }, context) => {
  if (!(rewBand[0] < rewBand[1] && rewBand[1] <= rewBand[2] && rewBand[2] < rewBand[3])) {
    context.addIssue({
      code: "custom",
      path: ["rewBand"],
      message: "REW response points must be ordered around the optimum plateau",
    });
  }
});
const temperatureModelParameters = z.object({
  windowDays: z.union([z.literal(14), z.literal(20)]),
  optimumC: z.number().min(-10).max(35),
  coldHalfWidthC: z.number().positive(),
  warmHalfWidthC: z.number().positive(),
  frostHalfLifeHours: z.number().positive(),
  heatHalfLifeHours: z.number().positive(),
});
const monthlyPhenologyAnchors = z.tuple([
  z.number().min(0).max(1), z.number().min(0).max(1),
  z.number().min(0).max(1), z.number().min(0).max(1),
  z.number().min(0).max(1), z.number().min(0).max(1),
  z.number().min(0).max(1), z.number().min(0).max(1),
  z.number().min(0).max(1), z.number().min(0).max(1),
  z.number().min(0).max(1), z.number().min(0).max(1),
]);
const fruitingModelConfig = z.discriminatedUnion("status", [
  z.object({
    model: z.literal("hydrothermal-v1"),
    version: z.string().min(1),
    status: z.literal("supported"),
    guild: z.enum([
      "ectomycorrhizal",
      "litter-soil-saprotroph",
      "wood-decayer",
      "grassland",
    ]),
    water: waterModelParameters,
    temperature: temperatureModelParameters,
    phenology: z.object({ monthlyAnchors: monthlyPhenologyAnchors }),
    evidence: supportedModelEvidence,
  }),
  z.object({
    model: z.literal("hydrothermal-v1"),
    version: z.string().min(1),
    status: z.literal("habitat-only"),
    guild: z.literal("hypogeous"),
    evidence: unsupportedModelEvidence,
  }),
]);

export const speciesProfileSchema = z.object({
  speciesId: z.string().regex(/^[a-z0-9-]+$/),
  predictionMode: z.enum(["current", "habitat_only"]),
  predictionCaveat: z.string().optional(),
  identity: z.object({
    commonName: z.string(),
    alternateNames: z.array(z.string()),
    scientificName: z.string(),
    family: z.string(),
    genus: z.string(),
    edibility,
    identificationDifficulty: z.string(),
    typicalSize: z.string(),
    shortDescription: z.string()
  }),
  morphology: z.object({
    cap: z.string(), hymenium: z.string(), stem: z.string(), flesh: z.string(), colour: z.string(),
    smell: z.string(), texture: z.string(), typicalAppearance: z.string(), keyFeatures: z.array(z.string()), variation: z.string()
  }),
  similarSpecies: z.array(z.object({
    scientificName: z.string(), commonName: z.string(), mainDifferences: z.string(), edibility, toxicity: z.string(), warning: z.boolean().optional()
  })),
  safetyNotice: z.string(),
  culinaryProfile,
  ecologicalConfig: z.object({
    habitat: z.object({
      forestTypes: z.array(z.string()), treeAssociations: z.array(z.string()), hosts: z.array(z.string()), soilPreference: z.string(), substrate: z.string(), moisture: z.string(),
      altitude: z.tuple([z.number(), z.number()]), slope: z.string(), aspect: z.string(), shade: z.string(), landscapePosition: z.string()
    }),
    soil: z.object({
      texture: z.string(), reaction: z.string(), phRange: z.tuple([z.number(), z.number()]).optional(), substrate: z.string(), organicMatter: z.string(), drainage: z.string(),
      waterRetention: z.string(), depth: z.string(), humus: z.string(), evidence: confidence
    }),
    climate: z.object({
      temperatureRange: z.tuple([z.number(), z.number()]), nightPreference: z.string(), relativeHumidity: z.string(), soilMoisture: z.string(), rainfall: z.string(),
      drought: z.string(), heat: z.string(), frost: z.string(), wind: z.string(), snow: z.string()
    }),
    rainfall: z.object({
      minimumMeaningful: z.string().optional(), preferredAccumulation: z.string(), fruitingDelay: z.string(), priorMoisture: z.string(),
      temperatureAfterRain: z.string(), interruption: z.string(), uncertainty: z.string()
    }),
    seasonality: z.record(month, activity),
    regions: z.array(region)
  }),
  modelConfig: fruitingModelConfig,
  idealConditions: z.array(z.string()),
  references: z.array(sourceReference),
  media: z.array(z.object({ id: z.string(), imageUrl: z.url().optional(), sourceUrl: z.url(), localPath: localMediaPath.optional(), attribution: z.string(), license: z.string(), identificationReference: z.boolean(), alt: z.string() })),
  confidence
}).superRefine((profile, context) => {
  if (profile.predictionMode === "habitat_only" && !profile.predictionCaveat?.trim()) {
    context.addIssue({
      code: "custom",
      path: ["predictionCaveat"],
      message: "Habitat-only profiles must explain why a current prediction is unavailable",
    });
  }

  if ((profile.predictionMode === "habitat_only") !== (profile.modelConfig.status === "habitat-only")) {
    context.addIssue({
      code: "custom",
      path: ["modelConfig", "status"],
      message: "Prediction mode and fruiting-model support status must agree",
    });
  }


  const edibleStatuses = ["excellent_edible", "edible", "edible_with_conditions"];
  const expectsCulinaryProfile = edibleStatuses.includes(profile.identity.edibility);
  if (expectsCulinaryProfile !== (profile.culinaryProfile.kind === "culinary")) {
    context.addIssue({
      code: "custom",
      path: ["culinaryProfile", "kind"],
      message: "Culinary guidance is only valid for species classified as edible",
    });
  }
});

export const conditionSnapshotSchema = z.object({
  regionId: region,
  observedAt: z.string().datetime({ offset: true }),
  source: z.array(z.string()),
  confidence,
  stale: z.boolean(),
  unavailableFields: z.array(z.string()),
  values: z.object({
    weatherObservedAt: z.string().datetime({ offset: true }).optional(),
    weatherModel: z.string().optional(), atmosphericResolutionM: z.number().int().positive().optional(), soilMoistureResolutionM: z.number().int().positive().optional(),
    weatherGridLatitude: z.number().min(-90).max(90).optional(), weatherGridLongitude: z.number().min(-180).max(180).optional(), weatherElevationM: z.number().min(-100).max(5000).optional(),
    soilGridLatitude: z.number().min(-90).max(90).optional(), soilGridLongitude: z.number().min(-180).max(180).optional(),
    temperatureC: z.number().optional(), temperatureAvg7dC: z.number().optional(),
    temperatureAvg14dC: z.number().optional(), temperatureAvg20dC: z.number().optional(),
    frostHours14d: z.number().int().min(0).optional(), frostHours20d: z.number().int().min(0).optional(),
    heatHours14d: z.number().int().min(0).optional(), heatHours20d: z.number().int().min(0).optional(),
    relativeHumidity: z.number().min(0).max(100).optional(), relativeHumidityMin24h: z.number().min(0).max(100).optional(),
    relativeHumidityAvg24h: z.number().min(0).max(100).optional(), relativeHumidityMax24h: z.number().min(0).max(100).optional(),
    relativeHumidityAvg7d: z.number().min(0).max(100).optional(),
    soilMoisture: z.number().min(0).max(1).optional(), soilMoistureMin24h: z.number().min(0).max(1).optional(),
    soilMoistureAvg24h: z.number().min(0).max(1).optional(), soilMoistureMax24h: z.number().min(0).max(1).optional(),
    soilMoistureMin7d: z.number().min(0).max(1).optional(), soilMoistureAvg7d: z.number().min(0).max(1).optional(),
    soilMoistureMax7d: z.number().min(0).max(1).optional(), soilMoistureTrend7d: z.number().min(-1).max(1).optional(),
    rainfall24hMm: z.number().min(0).optional(), rainfall3dMm: z.number().min(0).optional(), rainfall7dMm: z.number().min(0).optional(), rainfallPrevious23dMm: z.number().min(0).optional(),
    rainfall30dMm: z.number().min(0).optional(), drySpellDays: z.number().min(0).max(30).optional(),
    rainfall14dMm: z.number().min(0).optional(), rainfall21dMm: z.number().min(0).optional(), rainfall26dMm: z.number().min(0).optional(),
    rainfallDays7d: z.number().min(0).max(7).optional(), rainfallDays14d: z.number().min(0).max(14).optional(),
    rainfallDays21d: z.number().min(0).max(21).optional(), rainfallDays26d: z.number().min(0).max(26).optional(),
    rainfallDays30d: z.number().min(0).max(30).optional(),
    evapotranspiration3dMm: z.number().min(0).optional(), evapotranspiration7dMm: z.number().min(0).optional(),
    evapotranspiration30dMm: z.number().min(0).optional(), windKmh: z.number().min(0).optional(), windAvg24hKmh: z.number().min(0).optional(),
    evapotranspiration14dMm: z.number().min(0).optional(), evapotranspiration21dMm: z.number().min(0).optional(), evapotranspiration26dMm: z.number().min(0).optional(),
    windMax24hKmh: z.number().min(0).optional(), windGustKmh: z.number().min(0).optional(), windGustMax24hKmh: z.number().min(0).optional(),
    altitudeM: z.number().min(0).optional(),
    habitatAltitudeSuitability: z.number().min(0).max(100).optional(),
    habitatCoveragePercent: z.number().min(0).max(100).optional(),
    forestTypes: z.array(z.string()).optional(), treeSpecies: z.array(z.string()).optional(), soilPh: z.number().min(0).max(14).optional(),
    soilTexture: z.string().optional(), soilSubstrate: z.string().optional(),
    geologicalSubstrate: geologicalSubstrateEvidenceSchema.optional()
  })
});

export const spatialEnvironmentResponseSchema = z.object({
  cells: z.array(z.object({
    cellId: z.string(),
    regionId: region,
    gridSizeM: spatialGridSizeSchema,
    bounds: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]),
    observedAt: z.string().datetime({ offset: true }),
    source: z.array(z.string()),
    sourceResolutionM: z.number().int().positive(),
    confidence,
    stale: z.boolean(),
    unavailableFields: z.array(z.string()),
    values: conditionSnapshotSchema.shape.values
  })),
  truncated: z.boolean(),
  bounds: z.object({ west: z.number(), south: z.number(), east: z.number(), north: z.number() })
});

export const spatialEnvironmentHistorySchema = z.object({
  cellId: z.string(),
  regionId: region,
  forecast: z.object({
    generatedAt: z.string().datetime({ offset: true }),
    baseline: z.object({
      validAt: z.string().datetime({ offset: true }),
      horizonHours: z.literal(0),
      // Optional only for deployment skew with the legacy five-row reader.
      // A calibrated forecast is withheld unless every count is present.
      pointCount: z.number().int().positive().optional(),
      source: z.array(z.string()),
      sourceResolutionM: z.number().int().positive(),
      confidence,
      unavailableFields: z.array(z.string()),
      values: conditionSnapshotSchema.shape.values,
    }).optional(),
    snapshots: z.array(z.object({
      validAt: z.string().datetime({ offset: true }),
      horizonHours: z.union([
        z.literal(24), z.literal(48), z.literal(72), z.literal(96), z.literal(120),
      ]),
      pointCount: z.number().int().positive().optional(),
      source: z.array(z.string()),
      sourceResolutionM: z.number().int().positive(),
      confidence,
      unavailableFields: z.array(z.string()),
      values: conditionSnapshotSchema.shape.values,
    })).length(5),
  }).nullable().optional(),
  snapshots: z.array(z.object({
    observedAt: z.string().datetime({ offset: true }),
    source: z.array(z.string()),
    sourceResolutionM: z.number().int().positive(),
    confidence,
    unavailableFields: z.array(z.string()),
    values: conditionSnapshotSchema.shape.values,
  })),
});

export const spatialHabitatResponseSchema = z.object({
  cells: z.array(z.object({
    cellId: z.string(),
    regionId: region,
    gridSizeM: spatialGridSizeSchema,
    bounds: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]),
    coverage: z.number().min(0).max(1),
    altitudeWeightedCoverage: z.number().min(0).max(1).optional(),
    eligibleCellCount: z.number().int().positive(),
    sourceResolutionM: z.number().int().positive(),
    confidence,
    source: z.array(z.string())
  })),
  truncated: z.boolean(),
  bounds: z.object({ west: z.number(), south: z.number(), east: z.number(), north: z.number() }),
  resolution: spatialGridSizeSchema
});

export const occurrenceSupportResponseSchema = z.object({
  cells: z.array(z.object({
    cellId: z.string(),
    gridSizeM: z.literal(10000),
    bounds: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]),
    recordCount: z.number().int().positive(),
    observedYearMin: z.number().int().min(1500).max(2100).nullable(),
    observedYearMax: z.number().int().min(1500).max(2100).nullable(),
    observedMonths: z.array(z.number().int().min(1).max(12)),
    sources: z.array(z.object({
      sourceId: z.string(),
      title: z.string(),
      datasetKey: z.uuid(),
      doi: z.string(),
      licenseUrl: z.url(),
      sourceUrl: z.url(),
      lastSyncedAt: z.string().datetime({ offset: true }).nullable()
    })).min(1)
  })),
  truncated: z.boolean(),
  bounds: z.object({ west: z.number(), south: z.number(), east: z.number(), north: z.number() }),
  speciesId: z.string().regex(/^[a-z0-9-]+$/)
});
