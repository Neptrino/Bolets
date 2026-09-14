import { describe, expect, it } from "vitest";
import { speciesProfiles } from "@/data/species";
import { familiarSpeciesIds, selectFeaturedSpecies } from "@/src/lib/featured-species";
import { monthInTimeZone } from "@/src/lib/seasonality";

const familiar = new Set<string>(familiarSpeciesIds);
describe("editorial homepage species", () => {
  it("uses valid, unique editorial identifiers", () => {
    expect(familiar.size).toBe(familiarSpeciesIds.length);
    for (const id of familiar) expect(speciesProfiles.some((species) => species.speciesId === id)).toBe(true);
  });
  it("keeps distinct seasonal picks and includes a discovery when available throughout the year", () => {
    for (let month = 0; month < 12; month++) {
      const date = new Date(Date.UTC(2026, month, 15, 12));
      const result = selectFeaturedSpecies(speciesProfiles, date);
      const eligible = speciesProfiles.filter((species) =>
        species.predictionMode === "current" &&
        ["excellent_edible", "edible", "edible_with_conditions"].includes(species.identity.edibility) &&
        species.ecologicalConfig.seasonality[monthInTimeZone(date)] !== "inactive",
      );
      expect(result).toHaveLength(Math.min(3, eligible.length));
      expect(new Set(result.map((species) => species.speciesId)).size).toBe(result.length);
      if (eligible.some((species) => !familiar.has(species.speciesId))) {
        expect(result.some((species) => !familiar.has(species.speciesId))).toBe(true);
      }
      for (const species of result) {
        expect(species.ecologicalConfig.seasonality[monthInTimeZone(date)]).not.toBe("inactive");
        expect(species.predictionMode).toBe("current");
      }
      expect(selectFeaturedSpecies([...speciesProfiles].reverse(), date)).toEqual(result);
    }
  });
  it("handles small candidate pools and requested limits without duplicates", () => {
    const date = new Date("2026-09-14T12:00:00Z");
    expect(selectFeaturedSpecies(speciesProfiles, date, 0)).toEqual([]);
    expect(selectFeaturedSpecies(speciesProfiles, date, 1)).toHaveLength(1);
    const pool = speciesProfiles.filter((species) => familiar.has(species.speciesId));
    const result = selectFeaturedSpecies(pool, date);
    expect(result).toHaveLength(3);
    expect(new Set(result.map((species) => species.speciesId)).size).toBe(3);
    expect(selectFeaturedSpecies([], date)).toEqual([]);
  });
  it("changes calendar months at midnight in Catalonia, independently of server timezone", () => {
    const boundary = new Date("2026-08-31T22:30:00Z");
    expect(selectFeaturedSpecies(speciesProfiles, boundary)).toEqual(
      selectFeaturedSpecies(speciesProfiles, new Date("2026-09-01T12:00:00Z")),
    );
  });
  it("rotates familiar species and discoveries daily, including both milkcaps separately", () => {
    const seenFamiliar = new Set<string>();
    const seenDiscoveries = new Set<string>();
    for (let day = 1; day <= 30; day++) {
      const result = selectFeaturedSpecies(speciesProfiles, new Date(Date.UTC(2026, 8, day, 12)));
      const ids = result.map((species) => species.speciesId);
      expect(ids.filter((id) => familiar.has(id))).toHaveLength(2);
      expect(ids.includes("lactarius-sanguifluus") && ids.includes("lactarius-deliciosus")).toBe(false);
      ids.slice(0, 2).forEach((id) => seenFamiliar.add(id));
      seenDiscoveries.add(ids[2]);
      expect(selectFeaturedSpecies(speciesProfiles, new Date(Date.UTC(2026, 8, day, 0))))
        .toEqual(result);
      if (day < 30) expect(selectFeaturedSpecies(speciesProfiles, new Date(Date.UTC(2026, 8, day + 1, 12))))
        .not.toEqual(result);
    }
    expect(seenFamiliar.has("lactarius-sanguifluus")).toBe(true);
    expect(seenFamiliar.has("lactarius-deliciosus")).toBe(true);
    expect(seenDiscoveries.size).toBeGreaterThan(1);
  });
  it("keeps the selection stable on short and long daylight-saving days", () => {
    for (const [start, end] of [
      ["2026-03-28T23:05:00Z", "2026-03-29T21:55:00Z"],
      ["2026-10-24T22:05:00Z", "2026-10-25T22:55:00Z"],
    ]) expect(selectFeaturedSpecies(speciesProfiles, new Date(start)))
      .toEqual(selectFeaturedSpecies(speciesProfiles, new Date(end)));
  });

});
