import { z } from "zod";

export const instagramMotifs = ["water", "trees", "scale", "extent", "calendar", "field"] as const;
export type InstagramMotif = typeof instagramMotifs[number];

const common = {
  eyebrow: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(70),
  subtitle: z.string().trim().min(1).max(120),
};

// The local template CLI always stamps drafts. Live map covers intentionally
// stay in the signed weekend route; a generic JSON brief cannot fabricate one.
export const instagramCoverBriefSchema = z.discriminatedUnion("layout", [
  z.object({ ...common, layout: z.literal("photo"), speciesId: z.string().min(1) }).strict(),
  z.object({ ...common, layout: z.literal("question"), motif: z.enum(instagramMotifs), tone: z.enum(["cream", "orange", "forest"]) }).strict(),
]);
export type InstagramCoverBrief = z.infer<typeof instagramCoverBriefSchema>;

export function instagramCoverWarnings(brief: InstagramCoverBrief) {
  const warnings: string[] = [];
  if (brief.title.split(/\s+/).length > 6) warnings.push("Keep the cover headline to six words when possible.");
  if (brief.subtitle.length > 90) warnings.push("Move supporting detail into the carousel or caption.");
  return warnings;
}
