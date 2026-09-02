import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { catalogueSpecies } from "@/data/catalogue";
import {
  INSTAGRAM_SPECIES_SLIDE_COUNT,
  instagramSpeciesPublicationForDate,
} from "@/src/lib/instagram-species-series";

function dateAfter(start: string, days: number) {
  const value = Date.parse(`${start}T00:00:00.000Z`) + days * 24 * 60 * 60 * 1_000;
  return new Date(value).toISOString().slice(0, 10);
}

describe("Instagram species series", () => {
  it("publishes one five-slide field guide for every catalogue species", () => {
    expect(catalogueSpecies).toHaveLength(62);
    expect(INSTAGRAM_SPECIES_SLIDE_COUNT).toBe(5);

    let dayOffset = 0;
    const publications = Array.from({ length: 62 }, (_, index) => {
      const publication = instagramSpeciesPublicationForDate(dateAfter("2026-09-03", dayOffset));
      dayOffset += index % 2 === 0 ? 4 : 3;
      return publication;
    });

    expect(publications).toHaveLength(62);
    expect(new Set(publications.map((publication) => publication.profile.speciesId)).size).toBe(62);
    expect(publications.map((publication) => publication.profile.speciesId)).toEqual(
      catalogueSpecies.map((species) => species.speciesId),
    );
    expect(publications.every((publication) => publication.profile.imagePath.endsWith(".webp"))).toBe(true);
  });

  it("accepts only Monday and Thursday dates", () => {
    expect(() => instagramSpeciesPublicationForDate("2026-09-02")).toThrow(
      "run only on Monday and Thursday",
    );
    expect(() => instagramSpeciesPublicationForDate("2026-02-31")).toThrow(
      "Invalid Instagram species publication date",
    );
  });

  it("keeps the VPS timer and publisher wired to the species publication kind", () => {
    const timer = readFileSync("deploy/vps/bolets-instagram-species.timer", "utf8");
    const publisher = readFileSync("deploy/vps/publish-instagram-growth.sh", "utf8");
    const rollout = readFileSync("deploy/vps/rollout.sh", "utf8");

    expect(timer).toContain("OnCalendar=Mon,Thu *-*-* 19:00:00 Europe/Madrid");
    expect(timer).toContain("bolets-instagram-growth@species.service");
    expect(publisher).toContain("education|species|weekend");
    expect(rollout).toContain("bolets-instagram-species.timer");
  });
});
