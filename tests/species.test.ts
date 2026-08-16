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

const monthOrder = [
  "gen", "feb", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "oct", "nov", "des",
] as const;
const phenologyAnchor = {
  inactive: 0,
  possible: 0.25,
  moderate: 0.5,
  good: 0.8,
  peak: 1,
} as const;

describe("species profiles", () => {
  it("features the strongest seasonal species for the requested month", () => {
    const august = getFeaturedSeasonalSpecies(new Date(2026, 7, 12));

    expect(august).toHaveLength(3);
    expect(august.map((species) => species.speciesId)).toEqual([
      "russula-virescens",
      "boletus-reticulatus",
      "amanita-caesarea",
    ]);
    expect(august.every((species) => species.ecologicalConfig.seasonality.ago !== "inactive")).toBe(true);
  });

  it("validates every catalogue profile", () => {
    expect(speciesProfiles).toHaveLength(52);
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
      "omphalotus-olearius",
      "hygrophorus-marzuolus",
      "tricholoma-portentosum",
      "russula-virescens",
      "cyclocybe-cylindracea",
      "coprinus-comatus",
      "suillus-granulatus",
      "pleurotus-eryngii",
      "lepiota-brunneoincarnata",
      "galerina-marginata",
      "cortinarius-orellanus",
      "gyromitra-esculenta",
      "amanita-pantherina",
      "amanita-virosa",
      "amanita-verna",
      "tricholoma-pardinum",
      "entoloma-sinuatum",
      "inocybe-erubescens",
      "clitocybe-rivulosa",
      "paxillus-involutus",
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
    const pinetell = speciesProfiles.find((profile) => profile.speciesId === "lactarius-deliciosus")!;
    const rovello = speciesProfiles.find((profile) => profile.speciesId === "lactarius-sanguifluus")!;

    expect(pinetell.identity.commonName).toBe("Pinetell");
    expect(rovello.identity.commonName).toBe("Rovelló");
    expect(pinetell.ecologicalConfig.regions).toContain("pirineus");
    expect(rovello.ecologicalConfig.regions).toContain("pirineus");
    expect(rovello.ecologicalConfig.habitat.treeAssociations).toContain("Pinus sylvestris");
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
    expect(getSpeciesByScientificName("Inocybe erubescens")?.speciesId).toBe(
      "inocybe-erubescens",
    );
    expect(getSpeciesByScientificName("Clitocybe rivulosa")?.speciesId).toBe(
      "clitocybe-rivulosa",
    );
    expect(getSpeciesByScientificName("Species not in catalogue")).toBeUndefined();
  });

  it("lists matagent as a hazardous cep lookalike", () => {
    const cep = speciesProfiles.find((profile) => profile.speciesId === "boletus-edulis")!;
    const matagent = cep.similarSpecies.find((item) => (
      item.scientificName === "Rubroboletus satanas"
    ));

    expect(matagent).toMatchObject({
      commonName: "Matagent",
      edibility: "dangerously_toxic",
      warning: true,
    });
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

  it("keeps one resolved hydrothermal configuration per species", () => {
    expect(new Set(speciesProfiles.map((profile) => profile.speciesId)).size).toBe(speciesProfiles.length);
    for (const profile of speciesProfiles) {
      const model = profile.modelConfig;
      // Supported species score with hydrothermal-v2 since the 2026-08-16
      // cutover; the habitat-only truffle keeps the v1 tag.
      expect(model.model, profile.speciesId).toBe(
        model.status === "supported" ? "hydrothermal-v2" : "hydrothermal-v1",
      );
      expect(model, profile.speciesId).not.toHaveProperty("factors");
      expect(model.version.length, profile.speciesId).toBeGreaterThan(0);

      if (model.status === "supported") {
        expect(profile.predictionMode, profile.speciesId).toBe("current");
        expect(model.version).toBe("hydrothermal-v2-priors-2026-08");
        expect(model.guild).not.toBe("hypogeous");
        expect(model.water.waterExponent).toBeGreaterThan(0);
        expect(model.water.waterExponent).toBeLessThan(1);
        expect(model.water.moistureWindowDays).toBe(7);
        expect([14, 21, 26]).toContain(model.water.rainfallWindowDays);
        expect(model.temperature.coldHalfWidthC).toBeGreaterThan(0);
        expect(model.temperature.warmHalfWidthC).toBeGreaterThan(0);
        expect(model.temperature.frostHalfLifeHours).toBeGreaterThan(0);
        expect(model.temperature.heatHalfLifeHours).toBeGreaterThan(0);
        expect(model.phenology.monthlyAnchors).toHaveLength(12);
        expect(model.phenology.monthlyAnchors).toEqual(
          monthOrder.map((month) => phenologyAnchor[profile.ecologicalConfig.seasonality[month]]),
        );
        expect(
          model.phenology.monthlyAnchors.every((anchor) => anchor >= 0 && anchor <= 1),
          profile.speciesId,
        ).toBe(true);
        expect(model.evidence.status).not.toBe("unsupported");
      } else {
        expect(profile.speciesId).toBe("tuber-melanosporum");
        expect(profile.predictionMode).toBe("habitat_only");
        expect(model.version).toBe("habitat-static-only-2026-08");
        expect(model.guild).toBe("hypogeous");
        expect(model.evidence.status).toBe("unsupported");
        expect(model).not.toHaveProperty("water");
        expect(model).not.toHaveProperty("temperature");
        expect(model).not.toHaveProperty("phenology");
      }

      expect(profile.references.length).toBeGreaterThan(0);
      expect(profile.safetyNotice).toContain("identificació");
    }
  });

  it("applies the literature-backed Boletus edulis override", () => {
    const model = speciesProfiles.find((profile) => profile.speciesId === "boletus-edulis")!
      .modelConfig;
    if (model.status !== "supported") throw new Error("Expected a supported model");

    expect(model.guild).toBe("ectomycorrhizal");
    expect(model.water.rainfallWindowDays).toBe(26);
    expect(model.temperature).toMatchObject({
      windowDays: 20,
      optimumC: 13.5,
      coldHalfWidthC: 3.5,
      warmHalfWidthC: 4.5,
    });
    expect(model.evidence.status).toBe("species-literature");
    expect(model.evidence.citations).toContain(
      "https://doi.org/10.64898/2025.12.12.693895",
    );
  });

  it("initializes distinct temperature curves from each species ecology", () => {
    const cold = speciesProfiles.find((profile) => profile.speciesId === "cortinarius-rubellus")!;
    const warm = speciesProfiles.find((profile) => profile.speciesId === "amanita-caesarea")!;
    if (cold.modelConfig.status !== "supported" || warm.modelConfig.status !== "supported") {
      throw new Error("Expected supported models");
    }

    // v2 shifts the optimum 3 degrees below the editorial daytime midpoint
    // (window means include nights) and keeps the guild's asymmetric widths.
    expect(cold.ecologicalConfig.climate.temperatureRange).toEqual([5, 16]);
    expect(cold.modelConfig.temperature).toMatchObject({
      optimumC: 7.5,
      coldHalfWidthC: 4,
      warmHalfWidthC: 5,
    });
    expect(warm.ecologicalConfig.climate.temperatureRange).toEqual([15, 25]);
    expect(warm.modelConfig.temperature).toMatchObject({
      optimumC: 17,
      coldHalfWidthC: 4,
      warmHalfWidthC: 5,
    });
  });

  it("rejects malformed numeric model configurations", () => {
    const profile = speciesProfiles.find((item) => item.speciesId === "boletus-edulis")!;
    const model = profile.modelConfig;
    if (model.status !== "supported") throw new Error("Expected a supported model");

    const invalidWaterExponent = {
      ...profile,
      modelConfig: {
        ...model,
        water: { ...model.water, waterExponent: 1 },
      },
    };
    expect(speciesProfileSchema.safeParse(invalidWaterExponent).success).toBe(false);

    const invalidBand = {
      ...profile,
      modelConfig: {
        ...model,
        water: { ...model.water, rewBand: [0.5, 0.4, 0.9, 1.2] },
      },
    };
    expect(speciesProfileSchema.safeParse(invalidBand).success).toBe(false);

    const invalidPhenology = {
      ...profile,
      modelConfig: {
        ...model,
        phenology: {
          monthlyAnchors: [0, 0, 0, 0, 0, 0, 0, 0.25, 0.8, 1.2, 0.8, 0],
        },
      },
    };
    expect(speciesProfileSchema.safeParse(invalidPhenology).success).toBe(false);

    const modelWithoutWater = {
      model: model.model,
      version: model.version,
      status: model.status,
      guild: model.guild,
      temperature: model.temperature,
      phenology: model.phenology,
      evidence: model.evidence,
    };
    expect(speciesProfileSchema.safeParse({
      ...profile,
      modelConfig: modelWithoutWater,
    }).success).toBe(false);
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
