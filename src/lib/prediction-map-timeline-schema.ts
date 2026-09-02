import { z } from "zod";
import {
  conditionSnapshotSchema,
  evidenceConfidenceSchema,
  regionIdSchema,
  spatialGridSizeSchema,
} from "@/src/lib/schema";

const forecastFields = {
  pointCount: z.number().int().positive().optional(),
  source: z.array(z.string()),
  sourceResolutionM: z.number().int().positive(),
  confidence: evidenceConfidenceSchema,
  unavailableFields: z.array(z.string()),
  values: conditionSnapshotSchema.shape.values,
};

const observedSnapshot = z.object({
  observedAt: z.string().datetime({ offset: true }),
  source: z.array(z.string()),
  sourceResolutionM: z.number().int().positive(),
  confidence: evidenceConfidenceSchema,
  unavailableFields: z.array(z.string()),
  values: conditionSnapshotSchema.shape.values,
});

export const spatialEnvironmentFrameSchema = z.object({
  cells: z.array(z.object({
    cellId: z.string(),
    regionId: regionIdSchema,
    gridSizeM: spatialGridSizeSchema,
    bounds: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]),
    staticValues: conditionSnapshotSchema.shape.values,
    snapshot: observedSnapshot,
    forecast: z.object({
      generatedAt: z.string().datetime({ offset: true }),
      baseline: z.object({
        validAt: z.string().datetime({ offset: true }),
        horizonHours: z.literal(0),
        ...forecastFields,
      }),
      snapshots: z.array(z.object({
        validAt: z.string().datetime({ offset: true }),
        horizonHours: z.union([
          z.literal(24), z.literal(48), z.literal(72), z.literal(96), z.literal(120),
        ]),
        ...forecastFields,
      })).min(1).max(5),
    }).nullable(),
  })),
  truncated: z.boolean(),
  bounds: z.object({ west: z.number(), south: z.number(), east: z.number(), north: z.number() }),
  resolution: spatialGridSizeSchema,
  offset: z.union([
    z.literal(-6), z.literal(-5), z.literal(-4), z.literal(-3), z.literal(-2), z.literal(-1),
    z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
  ]),
});
