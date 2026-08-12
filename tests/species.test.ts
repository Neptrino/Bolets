import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  getFeaturedSeasonalSpecies,
  getSpeciesByScientificName,
  speciesAlphabetical,
  speciesProfiles,
  speciesSelectItems,
} from "@/data/species";
import { speciesProfileSchema } from "@/src/lib/schema";

describe("species profiles", () => {
  it("features the strongest seasonal species for the requested month", () => {
    const august = getFeaturedSeasonalSpecies(new Date(2026, 7, 12));

    expect(august).toHaveLength(3);
    expect(august.map((species) => species.speciesId)).toEqual([
      "boletus-reticulatus",
      "amanita-caesarea",
      "boletus-pinophilus",
    ]);
    expect(august.every((species) => species.ecologicalConfig.seasonality.ago !== "inactive")).toBe(true);
  });

  it("validates every catalogue profile", () => {
    expect(speciesProfiles).toHaveLength(33);
    expect(speciesProfiles.length).toBeLessThanOrEqual(33);
    expect(() => speciesProfiles.forEach((profile) => speciesProfileSchema.parse(profile))).not.toThrow();
  });

  it("includes the expanded priority catalogue", () => {
    expect(speciesProfiles.map((profile) => profile.speciesId)).toEqual(expect.arrayContaining([
      "amanita-caesarea",
      "marasmius-oreades",
      "boletus-reticulatus",
      "calocybe-gambosa",
      "hygrophorus-russula",
      "morchella-esculenta",
      "lepista-nuda",
      "suillus-luteus",
      "chroogomphus-rutilus",
      "ramaria-aurea",
      "agaricus-campestris",
      "pleurotus-ostreatus",
      "hygrophorus-eburneus",
      "craterellus-tubaeformis",
      "tuber-melanosporum",
      "amanita-phalloides",
      "rubroboletus-satanas",
      "tylopilus-felleus",
      "amanita-muscaria",
      "cortinarius-rubellus",
      "omphalotus-olearius"
    ]));
  });

  it("sorts the public catalogue and selectors by Catalan common name", () => {
    const collator = new Intl.Collator("ca", { sensitivity: "base" });
    const expectedNames = speciesProfiles
      .map((profile) => profile.identity.commonName)
      .sort((left, right) => collator.compare(left, right));

    expect(speciesAlphabetical.map((profile) => profile.identity.commonName)).toEqual(expectedNames);
    expect(speciesSelectItems.map((item) => item.label)).toEqual(expectedNames);
  });

  it("keeps the two commonly confused Lactarius names distinct", () => {
    expect(speciesProfiles.find((profile) => profile.speciesId === "lactarius-deliciosus")?.identity.commonName).toBe("Pinetell");
    expect(speciesProfiles.find((profile) => profile.speciesId === "lactarius-sanguifluus")?.identity.commonName).toBe("Rovelló");
  });

  it("keeps alternate names limited to Catalan vernacular names", () => {
    const scientificBinomial = /^[A-Z][a-z]+ [a-z][a-z-]+$/;

    for (const profile of speciesProfiles) {
      expect(
        profile.identity.alternateNames.every((name) => !scientificBinomial.test(name)),
        profile.speciesId,
      ).toBe(true);
    }
  });

  it("resolves catalogue profiles from lookalike scientific names", () => {
    expect(getSpeciesByScientificName("Boletus edulis")?.speciesId).toBe(
      "boletus-edulis",
    );
    expect(getSpeciesByScientificName("  boletus EDULIS ")?.speciesId).toBe(
      "boletus-edulis",
    );
    expect(getSpeciesByScientificName("Species not in catalogue")).toBeUndefined();
  });

  it("keeps peu de rata attached to Ramaria rather than Hydnum", () => {
    const ramaria = speciesProfiles.find((profile) => profile.speciesId === "ramaria-aurea")!;
    const hydnum = speciesProfiles.find((profile) => profile.speciesId === "hydnum-repandum")!;

    expect([ramaria.identity.commonName, ...ramaria.identity.alternateNames].join(" ")).toContain("Peu de rata");
    expect(hydnum.identity.alternateNames).not.toContain("peu de rata");
  });

  it("reserves current predictions for species the short-term model can represent", () => {
    const truffle = speciesProfiles.find((profile) => profile.speciesId === "tuber-melanosporum")!;

    expect(truffle.predictionMode).toBe("habitat_only");
    expect(truffle.predictionCaveat).toContain("mesos");
    expect(getFeaturedSeasonalSpecies(new Date(2027, 0, 15)).map((profile) => profile.speciesId))
      .not.toContain("tuber-melanosporum");
  });

  it("does not feature toxic or non-recommended species as seasonal picks", () => {
    for (const monthIndex of Array.from({ length: 12 }, (_, index) => index)) {
      const featured = getFeaturedSeasonalSpecies(new Date(2027, monthIndex, 15));
      expect(featured.every((profile) =>
        ["excellent_edible", "edible", "edible_with_conditions"].includes(profile.identity.edibility)
      )).toBe(true);
    }
  });

  it("explains culinary value independently from consumption conditions", () => {
    for (const profile of speciesProfiles) {
      expect(profile.culinaryProfile.ratingRationale.length, profile.speciesId).toBeGreaterThan(20);
      expect(profile.culinaryProfile.sources.length, profile.speciesId).toBeGreaterThan(0);
      expect(profile.culinaryProfile.cautions.length, profile.speciesId).toBeGreaterThan(0);

      if (profile.culinaryProfile.kind === "culinary") {
        expect(profile.culinaryProfile.bestUses.length, profile.speciesId).toBeGreaterThan(0);
        expect(profile.culinaryProfile.preparation.length, profile.speciesId).toBeGreaterThan(0);
        expect(profile.culinaryProfile.preservation.length, profile.speciesId).toBeGreaterThan(0);
      }
    }

    const morel = speciesProfiles.find((profile) => profile.speciesId === "morchella-esculenta")!;
    expect(morel.identity.edibility).toBe("edible_with_conditions");
    expect(morel.culinaryProfile.rating).toBe(3);
    expect(morel.culinaryProfile.kind).toBe("culinary");

    const deathCap = speciesProfiles.find((profile) => profile.speciesId === "amanita-phalloides")!;
    expect(deathCap.culinaryProfile).toMatchObject({ kind: "safety", rating: 0 });
    expect("bestUses" in deathCap.culinaryProfile).toBe(false);
  });

  it("keeps one valid model configuration per species", () => {
    expect(new Set(speciesProfiles.map((profile) => profile.speciesId)).size).toBe(speciesProfiles.length);
    for (const profile of speciesProfiles) {
      const weights = profile.modelConfig.factors.reduce((total, factor) => total + factor.weight, 0);
      expect(new Set(profile.modelConfig.factors.map((factor) => factor.id)).size).toBe(8);
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
      expect(referenceImage?.localPath).toMatch(/^\/media\/wikimedia\/[a-z0-9-]+\.webp$/);
      expect(existsSync(join(process.cwd(), "public", referenceImage?.localPath ?? ""))).toBe(true);
      expect(referenceImage?.attribution.length).toBeGreaterThan(0);
      expect(referenceImage?.license.length).toBeGreaterThan(0);
      expect(referenceImage?.alt.length).toBeGreaterThan(0);
    }
  });

  it("provides at least three traceable gallery views for every species", () => {
    for (const profile of speciesProfiles) {
      expect(profile.media.length, profile.speciesId).toBeGreaterThanOrEqual(3);
      expect(
        profile.media.every(
          (asset) =>
            asset.sourceUrl.length > 0 &&
            asset.attribution.length > 0 &&
            asset.license.length > 0 &&
            asset.alt.length > 0,
        ),
        profile.speciesId,
      ).toBe(true);
    }
  });

  it("backs every gallery image with a local, non-empty WebP file", () => {
    const invalidAssets = speciesProfiles.flatMap((profile) =>
      profile.media.flatMap((asset) => {
        if (!asset.localPath) {
          return [`${profile.speciesId}: remote-only ${asset.id}`];
        }
        if (!asset.localPath.endsWith(".webp")) {
          return [`${profile.speciesId}: non-WebP ${asset.localPath}`];
        }

        const file = join(process.cwd(), "public", asset.localPath);
        if (!existsSync(file)) {
          return [`${profile.speciesId}: missing ${asset.localPath}`];
        }

        const stats = statSync(file);
        return stats.isFile() && stats.size > 0
          ? []
          : [`${profile.speciesId}: empty/non-file ${asset.localPath}`];
      }),
    );

    expect(invalidAssets).toEqual([]);
  });

  it("keeps application-owned raster media in WebP", () => {
    const mediaRoot = join(process.cwd(), "public", "media");
    const legacyRasterFiles = readdirSync(mediaRoot, { recursive: true })
      .map((file) => file.toString())
      .filter((file) => /\.(?:gif|jpe?g|png)$/i.test(file));

    expect(legacyRasterFiles).toEqual([]);
  });

  it("registers every species for privacy-safe occurrence ingestion", () => {
    const migrationDirectory = join(process.cwd(), "supabase", "migrations");
    const migrations = readdirSync(migrationDirectory)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => readFileSync(join(migrationDirectory, file), "utf8"))
      .join("\n");

    for (const profile of speciesProfiles) {
      expect(migrations, profile.speciesId).toContain(`'${profile.speciesId}'`);
      expect(migrations, profile.identity.scientificName).toContain(`'${profile.identity.scientificName}'`);
    }
  });
});
