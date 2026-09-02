import { describe, expect, it } from "vitest";
import { findingDraftSchema, findingFinalizeSchema, findingPrivacyPatchSchema } from "@/src/lib/findings/schema";

const validDraft = {
  clientReportId: "4f86fb17-0bf4-4ae7-8293-91e8eaac17ae",
  speciesId: "lactarius-deliciosus",
  observedAt: "2026-08-28T10:30:00+02:00",
  longitude: 2.1,
  latitude: 41.8,
  accuracyM: 12,
  locationMode: "private_exact",
  quantityBand: "two-five",
  privateNotes: "Sota pins",
  visibility: "public",
  showAlias: false,
};

describe("finding input schemas", () => {
  it("accepts a bounded Catalan field report", () => {
    expect(findingDraftSchema.safeParse(validDraft).success).toBe(true);
  });

  it("rejects coordinates outside Catalonia", () => {
    expect(findingDraftSchema.safeParse({ ...validDraft, latitude: 50 }).success).toBe(false);
  });

  it("requires staged photographs to live under three UUID path segments", () => {
    expect(findingFinalizeSchema.safeParse({ photos: [{ id: validDraft.clientReportId, stagingPath: `${validDraft.clientReportId}/${validDraft.clientReportId}/${validDraft.clientReportId}.webp`, position: 0 }] }).success).toBe(true);
    expect(findingFinalizeSchema.safeParse({ photos: [{ id: validDraft.clientReportId, stagingPath: "someone-else/photo.webp", position: 0 }] }).success).toBe(false);
  });

  it("accepts only bounded Turnstile tokens", () => {
    expect(findingFinalizeSchema.safeParse({ photos: [], turnstileToken: "verified-token" }).success).toBe(true);
    expect(findingFinalizeSchema.safeParse({ photos: [], turnstileToken: "x".repeat(2049) }).success).toBe(false);
  });

  it("accepts privacy changes only for the whole finding or its alias", () => {
    expect(findingPrivacyPatchSchema.safeParse({ visibility: "private" }).success).toBe(true);
    expect(findingPrivacyPatchSchema.safeParse({ showAlias: true }).success).toBe(true);
    expect(findingPrivacyPatchSchema.safeParse({ photoVisibility: [{ id: validDraft.clientReportId, isPublic: false }] }).success).toBe(false);
  });
});
