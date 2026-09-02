import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { catalogueSpecies } from "@/data/catalogue";
import {
  INSTAGRAM_SPECIES_SLIDE_COUNT,
  instagramSpeciesPublicationForSpecies,
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
