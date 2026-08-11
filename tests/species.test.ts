import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { speciesProfiles } from "@/data/species";
import { speciesProfileSchema } from "@/src/lib/schema";

describe("species profiles", () => {
  it("validates every required initial profile", () => {
    expect(speciesProfiles).toHaveLength(14);
    expect(() => speciesProfiles.forEach((profile) => speciesProfileSchema.parse(profile))).not.toThrow();
  });

  it("includes the Ou de reig and Camasec profiles", () => {
    expect(speciesProfiles.map((profile) => profile.speciesId)).toEqual(expect.arrayContaining(["amanita-caesarea", "marasmius-oreades"]));
  });

  it("keeps one valid model configuration per species", () => {
    for (const profile of speciesProfiles) {
      const weights = profile.modelConfig.factors.reduce((total, factor) => total + factor.weight, 0);
      expect(weights).toBeCloseTo(1, 8);
      expect(profile.references.length).toBeGreaterThan(0);
      expect(profile.safetyNotice).toContain("identificació");
    }
  });

  it("keeps local Boletus edulis media traceable and out of identification references", () => {
    const profile = speciesProfiles.find((species) => species.speciesId === "boletus-edulis");
    const localMedia = profile?.media.filter((asset) => asset.sourceUrl.startsWith("https://www.magnific.com/")) ?? [];

    expect(localMedia).toHaveLength(2);
    expect(localMedia.every((asset) => asset.sourceUrl.startsWith("https://www.magnific.com/"))).toBe(true);
    expect(localMedia.every((asset) => asset.localPath?.startsWith("/media/boletus-edulis/"))).toBe(true);
    expect(localMedia.every((asset) => asset.attribution && asset.license)).toBe(true);
    expect(localMedia.every((asset) => !asset.identificationReference)).toBe(true);
  });

  it("provides an attributed Wikimedia reference image for every species", () => {
    for (const profile of speciesProfiles) {
      const referenceImage = profile.media.find((asset) => asset.identificationReference);
      expect(referenceImage, profile.speciesId).toBeDefined();
      expect(referenceImage?.imageUrl).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
      expect(referenceImage?.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(referenceImage?.localPath).toMatch(/^\/media\/wikimedia\/[a-z0-9-]+\.jpg$/);
      expect(existsSync(join(process.cwd(), "public", referenceImage?.localPath ?? ""))).toBe(true);
      expect(referenceImage?.attribution.length).toBeGreaterThan(0);
      expect(referenceImage?.license.length).toBeGreaterThan(0);
      expect(referenceImage?.alt.length).toBeGreaterThan(0);
    }
  });
});
