import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadCachedAreaOverview,
  loadCachedCurrentOverview,
  type AreaOverviewItem,
  type CurrentOverviewItem,
} from "@/src/lib/current-overview";
import { loadDailySharePublicationCard } from "@/src/lib/daily-share-cards";

vi.mock("@/src/lib/current-overview", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/src/lib/current-overview")>(),
  loadCachedAreaOverview: vi.fn(),
  loadCachedCurrentOverview: vi.fn(),
}));

const regional = {
  regionId: "pirineus", regionName: "Pirineus", speciesId: "boletus-edulis",
  speciesName: "Cep", seasonalActivity: "good", status: "available",
  summary: {
    snapshot: { observedAt: "2026-09-11T00:22:00Z" }, bestCell: { score: 49 },
    positiveCellShare: 1, score20CellShare: 0.55,
  },
} as CurrentOverviewItem;
const local = {
  ...regional, areaSlug: "cerdanya", areaName: "Cerdanya", areaTypeLabel: "comarca",
  prepositionalName: "a la Cerdanya", path: "/zones/cerdanya",
  bounds: { west: 1.5, south: 42.2, east: 2, north: 42.6 },
  summary: {
    ...regional.summary!, areaSlug: "cerdanya", gridSizeM: 1000,
    bestCell: { ...regional.summary!.bestCell, score: 69 },
  },
} satisfies AreaOverviewItem;

describe("scheduled daily share data", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(loadCachedCurrentOverview).mockResolvedValue([regional]);
    vi.mocked(loadCachedAreaOverview).mockResolvedValue([local]);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("waits past the interactive 15-second deadline for the local zones", async () => {
    vi.mocked(loadCachedAreaOverview).mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve([local]), 25_000);
    }));
    let completed = false;
    const pending = loadDailySharePublicationCard().then((card) => {
      completed = true;
      return card;
    });
    await vi.advanceTimersByTimeAsync(15_001);
    expect(completed).toBe(false);
    await vi.advanceTimersByTimeAsync(10_000);
    const card = await pending;
    expect(card?.readings[0]).toMatchObject({ regionName: "Cerdanya", score: 69 });
    expect(card?.shareText).toContain("Cerdanya: Cep · 69/100");
  });

  it("reuses a slow load through the retry instead of duplicating cold aggregation", async () => {
    vi.mocked(loadCachedAreaOverview).mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve([local]), 70_000);
    }));
    const pending = loadDailySharePublicationCard();
    await vi.advanceTimersByTimeAsync(70_000);
    expect((await pending)?.readings[0].regionName).toBe("Cerdanya");
    expect(loadCachedAreaOverview).toHaveBeenCalledTimes(1);
    expect(loadCachedCurrentOverview).toHaveBeenCalledTimes(1);
  });

  it("returns no publication after both bounded waits instead of a regional fallback", async () => {
    vi.mocked(loadCachedAreaOverview).mockImplementation(() => new Promise(() => {}));
    const pending = loadDailySharePublicationCard();
    await vi.advanceTimersByTimeAsync(125_000);
    expect(await pending).toBeNull();
    expect(loadCachedAreaOverview).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retries a failed read once after five seconds and recovers", async () => {
    vi.mocked(loadCachedAreaOverview).mockRejectedValueOnce(new Error("temporary failure"));
    const pending = loadDailySharePublicationCard();
    await vi.advanceTimersByTimeAsync(4_999);
    expect(loadCachedAreaOverview).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending)?.readings[0].regionName).toBe("Cerdanya");
    expect(loadCachedAreaOverview).toHaveBeenCalledTimes(2);
  });

  it("settles a slow sibling before retrying a rejected read", async () => {
    vi.mocked(loadCachedCurrentOverview).mockRejectedValueOnce(new Error("temporary failure"));
    vi.mocked(loadCachedAreaOverview).mockImplementationOnce(() => new Promise((resolve) => {
      setTimeout(() => resolve([local]), 20_000);
    }));
    const pending = loadDailySharePublicationCard();
    await vi.advanceTimersByTimeAsync(24_999);
    expect(loadCachedAreaOverview).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).not.toBeNull();
    expect(loadCachedAreaOverview).toHaveBeenCalledTimes(2);
  });

  it("stops after the second failure", async () => {
    vi.mocked(loadCachedAreaOverview).mockRejectedValue(new Error("unavailable"));
    const pending = loadDailySharePublicationCard();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await pending).toBeNull();
    expect(loadCachedAreaOverview).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("recovers when previously unavailable local readings become publishable", async () => {
    vi.mocked(loadCachedAreaOverview).mockResolvedValueOnce([
      { ...local, status: "unavailable", summary: null },
    ]);
    const pending = loadDailySharePublicationCard();
    await vi.advanceTimersByTimeAsync(5_000);
    expect((await pending)?.readings[0].regionName).toBe("Cerdanya");
    expect(loadCachedAreaOverview).toHaveBeenCalledTimes(2);
  });

  it.each([[], [{ ...local, status: "insufficient", summary: null }], [
    local, { ...local, areaSlug: "ripolles", status: "unavailable", summary: null },
  ]] as AreaOverviewItem[][])("rejects missing or failed local readings: %j", async (...items) => {
    vi.mocked(loadCachedAreaOverview).mockResolvedValue(items);
    const pending = loadDailySharePublicationCard();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(await pending).toBeNull();
  });

  it("keeps verified zero local scores publishable", async () => {
    const zero = { ...local, summary: { ...local.summary!, bestCell: { ...local.summary!.bestCell, score: 0 } } };
    vi.mocked(loadCachedAreaOverview).mockResolvedValue([zero]);
    expect(await loadDailySharePublicationCard()).not.toBeNull();
    expect(loadCachedAreaOverview).toHaveBeenCalledTimes(1);
  });
});
