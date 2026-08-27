import { z } from "zod";
import { speciesProfileSchema } from "@/src/lib/schema";

const fields = speciesProfileSchema.shape;

// Reuse the catalogue's identity/media validation without accepting any of its
// numerical model fields. Unknown fields must fail rather than be discarded.
export const referenceSpeciesProfileSchema = z.object({
  speciesId: fields.speciesId,
  seo: z.object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    keywords: z.array(z.string().min(1)).optional(),
  }).strict().optional(),
  scope: z.literal("reference-only"),
  identity: fields.identity,
  morphology: fields.morphology,
  similarSpecies: fields.similarSpecies,
  safetyNotice: fields.safetyNotice,
  culinaryProfile: fields.culinaryProfile,
  references: fields.references.min(2),
  media: fields.media.min(1),
  confidence: fields.confidence,
  ecology: z.object({
    habitats: z.array(z.string().min(1)).min(1),
    season: z.string().min(1),
    description: z.string().min(1),
    limitations: z.string().min(1),
  }).strict(),
}).strict().superRefine((profile, context) => {
  const edible = ["excellent_edible", "edible", "edible_with_conditions"].includes(profile.identity.edibility);
  if (edible !== (profile.culinaryProfile.kind === "culinary")) {
    context.addIssue({ code: "custom", path: ["culinaryProfile", "kind"], message: "Culinary guidance requires an edible species" });
  }
});
