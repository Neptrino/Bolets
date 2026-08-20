import { describe, expect, it } from "vitest";
import { createDailyShareCards, createFavourableDailySharePreviewCards } from "@/src/lib/daily-share-cards";
import type { CurrentOverviewItem } from "@/src/lib/current-overview";

const publishable = {
  status: "available",
  summary: {
    snapshot: { observedAt: "2026-08-14T08:00:00.000Z" },
    bestCell: { score: 74 },
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

    expect(cards).toHaveLength(10);
    expect(catalunya?.readings).toEqual([{ speciesId: "boletus-edulis", regionName: "Pirineus", speciesName: "Cep", score: 74, label: "alta" }]);
    expect(catalunya?.shareText).toContain("no confirma presència");
    expect(catalunya?.shareText).toContain("https://bolets.app/bolets-avui");
    expect(cards.find((card) => card.slug === "pirineus")?.shareText).toContain("https://bolets.app/map?species=boletus-edulis&region=pirineus");
    expect(montseny?.available).toBe(false);
    expect(montseny?.readings).toEqual([]);
    expect(montseny?.shareText).toContain("no hi ha una lectura territorial publicable");
  });

  it("uses a plain no-conditions message when every published reading is zero", () => {
    const zeroReading = { ...publishable, summary: { snapshot: { observedAt: "2026-08-14T08:00:00.000Z" }, bestCell: { score: 0 }, result: { opportunityIndex: 0, label: "molt baixa" } } };
    const items = [
      { speciesId: "boletus-edulis", regionId: "pirineus", speciesName: "Cep", regionName: "Pirineus", seasonalActivity: "good", ...zeroReading },
    ] as unknown as CurrentOverviewItem[];

    const cards = createDailyShareCards(items);

    expect(cards.find((card) => card.slug === "catalunya")?.shareText).toContain("no hi ha condicions favorables publicables a Catalunya");
    expect(cards.find((card) => card.slug === "pirineus")?.shareText).toContain("no hi ha condicions favorables publicables en aquesta zona");
  });

  it("keeps favourable visual fixtures explicitly local and simulated", () => {
    const cards = createFavourableDailySharePreviewCards();

    expect(cards).toHaveLength(10);
    expect(cards.every((card) => card.isPreview && card.readings.every((reading) => reading.score > 0))).toBe(true);
    expect(cards.every((card) => card.readings.length === 3)).toBe(true);
    expect(cards[0]?.eyebrow).toContain("Dades simulades");
    expect(cards[0]?.shareText).toContain("PREVISUALITZACIÓ LOCAL");
  });
});
