import { describe, expect, it } from "vitest";
import { seasonGuideForMonth, seasonGuideMetadata, seasonGuides, speciesForSeasonGuide } from "@/src/lib/season-guides";

describe("season guides", () => {
  it("defines four unique season destinations", () => {
    expect(seasonGuides.map((guide) => guide.id)).toEqual(["primavera", "estiu", "tardor", "hivern"]);
    expect(new Set(seasonGuides.map((guide) => guide.path)).size).toBe(4);
    expect(seasonGuideForMonth("abr").id).toBe("primavera");
    expect(seasonGuideForMonth("jul").id).toBe("estiu");
    expect(seasonGuideForMonth("oct").id).toBe("tardor");
    expect(seasonGuideForMonth("gen").id).toBe("hivern");
  });

  it("derives every guide collection from catalogue seasonality", () => {
    for (const guide of seasonGuides) {
      const species = speciesForSeasonGuide(guide);
      expect(species.length, guide.id).toBeGreaterThan(0);
      expect(species.every((item) => guide.months.some(
        (month) => item.ecologicalConfig.seasonality[month] !== "inactive",
      )), guide.id).toBe(true);
    }
  });

  it("provides unique, concise metadata", () => {
    const metadata = seasonGuides.map(seasonGuideMetadata);
    expect(new Set(metadata.map((item) => item.title)).size).toBe(4);
    expect(new Set(metadata.map((item) => item.description)).size).toBe(4);
    for (const item of metadata) {
      expect(item.description?.length).toBeGreaterThanOrEqual(100);
      expect(item.description?.length).toBeLessThanOrEqual(160);
    }
  });
});
