import { z } from "zod";

const quantityBandSchema = z.enum([
  "one",
  "two-five",
  "six-twenty",
  "twenty-one-plus",
]);

export const findingDraftSchema = z.object({
  clientReportId: z.uuid(),
  speciesId: z.string().regex(/^[a-z0-9-]{3,80}$/),
  observedAt: z.iso.datetime({ offset: true }),
  longitude: z.number().min(0.05).max(3.35),
  latitude: z.number().min(40.45).max(42.95),
  accuracyM: z.number().min(0).max(10_000).nullable(),
  locationMode: z.enum(["private_exact", "coarse_only"]),
  quantityBand: quantityBandSchema.nullable(),
  privateNotes: z.string().trim().max(1_000),
  visibility: z.enum(["private", "public"]),
  showAlias: z.boolean(),
});

export const findingFinalizeSchema = z.object({
  photos: z.array(z.object({
    id: z.uuid(),
    stagingPath: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/),
    position: z.number().int().min(0).max(3),
  })).max(4),
  turnstileToken: z.string().min(1).max(2048).optional(),
});

export const findingVoteSchema = z.object({
  speciesId: z.string().regex(/^[a-z0-9-]{3,80}$/),
});

export const findingFlagSchema = z.object({
  reason: z.enum(["spam", "privacy", "unsafe", "other"]),
  detail: z.string().trim().max(500).optional(),
});

export const findingProfileSchema = z.object({
  alias: z.string().trim().min(3).max(30)
    .regex(/^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u)
    .nullable(),
});

export const findingPrivacyPatchSchema = z.object({
  visibility: z.enum(["private", "public"]).optional(),
  showAlias: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "No privacy change supplied");
