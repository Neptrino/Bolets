import { expect, it, vi } from "vitest";
import { attachStationTemperatureBatch } from "@/supabase/functions/_shared/station-temperature-backfill";

vi.mock("@/supabase/functions/_shared/station-temperature-store", () => ({
  freezeStationTemperatureSources: vi.fn(async () => new Map()),
}));

it("advances past already-attached legacy snapshots without waiting for a new-version window", async () => {
  const from = vi.fn((table: string) => {
    const query = { select: () => query, eq: () => query, gt: () => query, gte: () => query,
      in: () => query, order: () => query, limit: async () => ({ error: null,
        data: table === "open_meteo_hourly_states" ? [{ point_id: "point", payload: {} }] :
          [{ point_id: "point", values: { thermalSources: [{ id: "a".repeat(64) }] } }],
      }) };
    if (table === "station_temperature_windows") throw new Error("No new window is needed for attached evidence");
    return query;
  });
  const result = await attachStationTemperatureBatch({ from } as unknown as Parameters<typeof attachStationTemperatureBatch>[0], "", "2026-09-09");
  expect(result).toMatchObject({ ready: true, next: "point", attached: 0, unchanged: 1 });
});
