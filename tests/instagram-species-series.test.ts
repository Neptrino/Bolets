import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { catalogueSpecies } from "@/data/catalogue";
import {
  INSTAGRAM_SPECIES_SLIDE_COUNT,
  instagramSpeciesLookalikeImage,
  instagramSpeciesPublicationForSpecies,
  instagramSpeciesSeasonRanking,
} from "@/src/lib/instagram-species-series";

describe("Instagram species series", () => {
  it("publishes one five-slide field guide for every catalogue species", () => {
    expect(catalogueSpecies).toHaveLength(62);
    expect(INSTAGRAM_SPECIES_SLIDE_COUNT).toBe(5);

    const publications = catalogueSpecies.map((species) => (
      instagramSpeciesPublicationForSpecies(species.speciesId)
    ));

    expect(publications).toHaveLength(62);
    expect(new Set(publications.map((publication) => publication.profile.speciesId)).size).toBe(62);
    expect(publications.map((publication) => publication.profile.speciesId)).toEqual(
      catalogueSpecies.map((species) => species.speciesId),
    );
    expect(publications.every((publication) => publication.profile.imagePath.endsWith(".webp"))).toBe(true);
  });

  it("resolves a manually selected catalogue species", () => {
    expect(instagramSpeciesPublicationForSpecies("boletus-edulis").profile.commonName).toBe("Cep");
    expect(() => instagramSpeciesPublicationForSpecies("not-in-the-catalogue"))
      .toThrow("Unknown Instagram species");
  });

  it("carries the photograph credit so the card and caption can attribute it", () => {
    const { profile } = instagramSpeciesPublicationForSpecies("boletus-edulis");
    expect(profile.imageAttribution).toBe("ReddishClover");
    expect(profile.imageLicense).toContain("CC BY-SA");
  });

  it("orders the picker by the activity of the publication month", () => {
    const october = instagramSpeciesSeasonRanking("2026-10-15");
    expect(october).toHaveLength(62);
    expect(october[0]!.activity).toBe("peak");
    expect(october.find((entry) => entry.speciesId === "boletus-edulis")?.activity).toBe("peak");
    expect(october.find((entry) => entry.speciesId === "boletus-edulis")?.label).toContain("en pic");
    expect(october.at(-1)!.activity).toBe("unknown");

    const ranks = october.map((entry) => ["peak", "good", "moderate", "possible", "inactive", "unknown"].indexOf(entry.activity));
    expect([...ranks].sort((left, right) => left - right)).toEqual(ranks);

    const january = instagramSpeciesSeasonRanking("2026-01-15");
    expect(january.find((entry) => entry.speciesId === "boletus-edulis")?.activity).toBe("inactive");
    expect(() => instagramSpeciesSeasonRanking("2026-13-01")).toThrow("Invalid Instagram species publication date");
  });

  it("pairs most lookalikes with a catalogue photograph and credit", () => {
    const cep = instagramSpeciesPublicationForSpecies("boletus-edulis").profile;
    const lookalike = instagramSpeciesLookalikeImage(cep);
    expect(lookalike?.speciesId).toBe("rubroboletus-satanas");
    expect(lookalike?.imagePath.endsWith(".webp")).toBe(true);
    expect(lookalike?.attribution).toBeTruthy();

    const paired = catalogueSpecies.filter((species) => (
      instagramSpeciesLookalikeImage(instagramSpeciesPublicationForSpecies(species.speciesId).profile)
    ));
    expect(paired.length).toBeGreaterThanOrEqual(45);
    expect(instagramSpeciesLookalikeImage({ lookalike: null })).toBeNull();
  });

  it("retires the automatic species timer and keeps only manual Buffer queueing", () => {
    const publisher = readFileSync("deploy/vps/publish-instagram-growth.sh", "utf8");
    const rollout = readFileSync("deploy/vps/rollout.sh", "utf8");

    expect(existsSync("deploy/vps/bolets-instagram-species.timer")).toBe(false);
    expect(publisher).toContain("education|weekend");
    expect(publisher).not.toContain("education|species|weekend");
    expect(rollout).toContain("disable --now bolets-instagram-species.timer");
    expect(rollout).not.toContain("install -m 644 \"$app_dir/deploy/vps/bolets-instagram-species.timer\"");
  });
});
