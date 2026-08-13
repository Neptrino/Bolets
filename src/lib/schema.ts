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
const spatialGridSize = z.union([
  z.literal(250), z.literal(1000), z.literal(2500), z.literal(5000), z.literal(10000)
]);
const localMediaPath = z
  .string()
  .regex(
    /^\/(?!\/)[^\s]+\.webp$/,
    "Expected a root-relative WebP media path",
  );

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
  modelConfig: z.object({
    version: z.string(),
    factors: z.array(z.object({
      id: z.enum(["forest", "soil", "rainfall", "soilMoisture", "temperature", "altitude", "humidity", "seasonality"]), label: z.string(), weight: z.number().positive(), explanation: z.string()
    }))
  }),
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
    temperatureC: z.number().optional(), temperatureMin24hC: z.number().optional(), temperatureAvg24hC: z.number().optional(), temperatureMax24hC: z.number().optional(),
    temperatureMin7dC: z.number().optional(), frostHours7d: z.number().int().min(0).optional(),
    temperatureMin10dC: z.number().optional(), temperatureAvg10dC: z.number().optional(), temperatureMax10dC: z.number().optional(),
    frostHours10d: z.number().int().min(0).optional(),
    relativeHumidity: z.number().min(0).max(100).optional(), relativeHumidityMin24h: z.number().min(0).max(100).optional(),
    relativeHumidityAvg24h: z.number().min(0).max(100).optional(), relativeHumidityMax24h: z.number().min(0).max(100).optional(),
    relativeHumidityAvg7d: z.number().min(0).max(100).optional(),
    soilMoisture: z.number().min(0).max(1).optional(), soilMoistureMin24h: z.number().min(0).max(1).optional(),
    soilMoistureAvg24h: z.number().min(0).max(1).optional(), soilMoistureMax24h: z.number().min(0).max(1).optional(),
    soilMoistureMin7d: z.number().min(0).max(1).optional(), soilMoistureAvg7d: z.number().min(0).max(1).optional(),
    soilMoistureMax7d: z.number().min(0).max(1).optional(), soilMoistureTrend7d: z.number().min(-1).max(1).optional(),
    rainfall3dMm: z.number().min(0).optional(), rainfall7dMm: z.number().min(0).optional(), rainfallPrevious23dMm: z.number().min(0).optional(),
    rainfall30dMm: z.number().min(0).optional(), drySpellDays: z.number().min(0).max(30).optional(),
    evapotranspiration3dMm: z.number().min(0).optional(), evapotranspiration7dMm: z.number().min(0).optional(),
    evapotranspiration30dMm: z.number().min(0).optional(), windKmh: z.number().min(0).optional(), windAvg24hKmh: z.number().min(0).optional(),
    windMax24hKmh: z.number().min(0).optional(), windGustKmh: z.number().min(0).optional(), windGustMax24hKmh: z.number().min(0).optional(),
    altitudeM: z.number().min(0).optional(),
    habitatAltitudeSuitability: z.number().min(0).max(100).optional(),
    forestCompatibility: z.number().min(0).max(100).optional(), soilCompatibility: z.number().min(0).max(100).optional(),
    forestTypes: z.array(z.string()).optional(), treeSpecies: z.array(z.string()).optional(), soilPh: z.number().min(0).max(14).optional(),
    soilTexture: z.string().optional(), soilSubstrate: z.string().optional()
  })
});

export const spatialEnvironmentResponseSchema = z.object({
  cells: z.array(z.object({
    cellId: z.string(),
    regionId: region,
    gridSizeM: spatialGridSize,
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
    gridSizeM: spatialGridSize,
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
  resolution: spatialGridSize
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
