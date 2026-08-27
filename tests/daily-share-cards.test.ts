import { describe, expect, it } from "vitest";
import { createDailyShareCards, createFavourableDailySharePreviewCards } from "@/src/lib/daily-share-cards";
import { createSignedDailyShareImagePath, parseSignedDailyShareCard } from "@/src/lib/daily-share-image-payload";
import type { AreaOverviewItem, CurrentOverviewItem } from "@/src/lib/current-overview";

const publishable = {
  status: "available",
  summary: {
    snapshot: { observedAt: "2026-08-14T08:00:00.000Z" },
    bestCell: { score: 74 },
    positiveCellShare: 0.42,
    score20CellShare: 0.27,
    result: { opportunityIndex: 74, label: "favorable" },
  },
} as const;

describe("daily share cards", () => {
  it("uses only publishable readings and keeps each prediction zone represented", () => {
    const items = [
      { speciesId: "boletus-edulis", regionId: "pirineus", speciesName: "Cep", regionName: "Pirineus", seasonalActivity: "good", ...publishable },
      { speciesId: "lactarius-deliciosus", regionId: "montseny", speciesName: "Pinetell", regionName: "Montseny", seasonalActivity: "good", status: "insufficient", summary: null },
    ] as unknown as CurrentOverviewItem[];

    const cards = createDailyShareCards(items);
    const catalunya = cards.find((card) => card.slug === "catalunya");
    const montseny = cards.find((card) => card.slug === "montseny");

    expect(cards).toHaveLength(22);
    expect(catalunya?.readings).toEqual([{ speciesId: "boletus-edulis", regionName: "Pirineus", speciesName: "Cep", score: 74, label: "alta", positiveCellShare: 0.42, score20CellShare: 0.27 }]);
    expect(catalunya?.shareText).toContain("no confirma presència");
    expect(catalunya?.shareText).toContain("https://bolets.app/bolets-avui");
    expect(cards.find((card) => card.slug === "pirineus")?.shareText).toContain("https://bolets.app/map?species=boletus-edulis&region=pirineus");
    expect(montseny?.available).toBe(false);
    expect(montseny?.readings).toEqual([]);
    expect(montseny?.shareText).toContain("no hi ha una lectura territorial publicable");
    expect(cards.find((card) => card.slug === "zona-ripolles")).toMatchObject({
      title: "Ripollès",
      available: false,
      readings: [],
    });
  });

  it("lets the unified Catalunya card rank a territorial winner above a region", () => {
    const items = [
      { speciesId: "boletus-edulis", regionId: "pirineus", speciesName: "Cep", regionName: "Pirineus", seasonalActivity: "good", ...publishable },
    ] as unknown as CurrentOverviewItem[];
    const territoryItems = [
      {
        areaSlug: "ripolles",
        areaName: "Ripollès",
        areaTypeLabel: "comarca",
        prepositionalName: "al Ripollès",
        regionId: "pirineus",
        bounds: { west: 2, south: 42, east: 2.5, north: 42.5 },
        path: "/zones/ripolles",
        speciesId: "boletus-edulis",
        speciesName: "Cep",
        seasonalActivity: "good",
        status: "available",
        summary: { ...publishable.summary, bestCell: { score: 91 } },
      },
    ] as unknown as AreaOverviewItem[];

    const cards = createDailyShareCards(items, territoryItems);
    expect(cards.find((card) => card.slug === "catalunya")?.readings[0]).toMatchObject({
      regionName: "Ripollès",
      speciesName: "Cep",
      score: 91,
    });
    expect(cards.find((card) => card.slug === "zona-ripolles")?.readings[0]?.score).toBe(91);
  });

  it("uses a plain no-conditions message when every published reading is zero", () => {
    const zeroReading = { ...publishable, summary: { snapshot: { observedAt: "2026-08-14T08:00:00.000Z" }, bestCell: { score: 0 }, positiveCellShare: 0, score20CellShare: 0, result: { opportunityIndex: 0, label: "molt baixa" } } };
    const items = [
      { speciesId: "boletus-edulis", regionId: "pirineus", speciesName: "Cep", regionName: "Pirineus", seasonalActivity: "good", ...zeroReading },
    ] as unknown as CurrentOverviewItem[];

    const cards = createDailyShareCards(items);

    expect(cards.find((card) => card.slug === "catalunya")?.shareText).toContain("no hi ha condicions favorables publicables a Catalunya");
    expect(cards.find((card) => card.slug === "pirineus")?.shareText).toContain("no hi ha condicions favorables publicables en aquesta zona");
  });

  it("keeps favourable visual fixtures explicitly local and simulated", () => {
    const cards = createFavourableDailySharePreviewCards();
    const territoryCards = cards.filter((card) => card.scope === "territory");

    expect(cards).toHaveLength(22);
    expect(cards.every((card) => card.isPreview && card.readings.every((reading) => reading.score > 0))).toBe(true);
    expect(cards.filter((card) => card.scope !== "territory").every((card) => card.readings.length === 3)).toBe(true);
    expect(new Set(cards[0]?.readings.map((reading) => reading.regionName)).size).toBe(3);
    expect(territoryCards).toHaveLength(12);
    expect(territoryCards.every((card) => card.slug.startsWith("zona-") && card.readings.length === 1)).toBe(true);
    expect(territoryCards.map((card) => card.slug)).toContain("zona-bergueda--rasos-de-peguera");
    expect(cards[0]?.eyebrow).toContain("Dades simulades");
    expect(cards[0]?.shareText).toContain("PREVISUALITZACIÓ LOCAL");
  });

  it("binds generated image URLs to the exact card reading", () => {
    const secret = "daily-share-test-secret";
    const card = createFavourableDailySharePreviewCards()[0]!;
    const url = new URL(
      createSignedDailyShareImagePath(card, "feed", secret),
      "https://bolets.app",
    );

    expect(parseSignedDailyShareCard(url.searchParams, card.slug, secret)).toMatchObject({
      slug: card.slug,
      readings: card.readings,
    });
    url.searchParams.set("card", `${url.searchParams.get("card")}x`);
    expect(parseSignedDailyShareCard(url.searchParams, card.slug, secret)).toBeNull();
  });
});
