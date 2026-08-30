import { describe, expect, it } from "vitest";
import {
  loadAreaOverview,
  loadCurrentOverview,
} from "@/src/lib/current-overview";
import { developmentOverviewSimulation } from "@/src/lib/current-overview-simulation";

async function unavailableOverviewItems() {
  const unavailable = async () => {
    throw new Error("No local data");
  };
  const [currentItems, areaItems] = await Promise.all([
    loadCurrentOverview(unavailable, "ago"),
    loadAreaOverview(unavailable, "ago"),
  ]);
  return {
    currentItems: currentItems.slice(0, 4),
    areaItems: areaItems.slice(0, 4),
  };
}

describe("development current-overview simulation", () => {
  it("replaces an unavailable local overview with deterministic fictitious summaries", async () => {
    const unavailable = await unavailableOverviewItems();
    const options = {
      environment: { NODE_ENV: "development" },
      observedAt: "2026-08-30T12:00:00.000Z",
    };
    const first = developmentOverviewSimulation(
      unavailable.currentItems,
      unavailable.areaItems,
      options,
    );
    const second = developmentOverviewSimulation(
      unavailable.currentItems,
      unavailable.areaItems,
      options,
    );

    expect(first.simulated).toBe(true);
    expect(first.currentItems.every((item) => item.status === "available")).toBe(true);
    expect(first.areaItems.every((item) => item.summary?.gridSizeM === 1000)).toBe(true);
    expect(first.currentItems[0]?.summary?.snapshot.source).toEqual([
      "Simulació local · dades fictícies",
    ]);
    expect(first).toEqual(second);
  });

  it("never substitutes production or an existing publishable overview", async () => {
    const unavailable = await unavailableOverviewItems();
    const production = developmentOverviewSimulation(
      unavailable.currentItems,
      unavailable.areaItems,
      { environment: { NODE_ENV: "production" } },
    );
    expect(production).toEqual({ ...unavailable, simulated: false });

    const developmentWithData = developmentOverviewSimulation(
      [{
        ...unavailable.currentItems[0]!,
        status: "available",
        summary: developmentOverviewSimulation(
          unavailable.currentItems,
          unavailable.areaItems,
          {
            environment: { NODE_ENV: "development" },
            observedAt: "2026-08-30T12:00:00.000Z",
          },
        ).currentItems[0]!.summary,
      }],
      unavailable.areaItems,
      { environment: { NODE_ENV: "development" } },
    );
    expect(developmentWithData.simulated).toBe(false);
  });
});
