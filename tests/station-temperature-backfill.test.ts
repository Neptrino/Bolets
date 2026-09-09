import { beforeEach, expect, it, vi } from "vitest";
import { attachStationTemperatureBatch } from "@/supabase/functions/_shared/station-temperature-backfill";
import { freezeStationTemperatureSources } from "@/supabase/functions/_shared/station-temperature-store";
import { STATION_TEMPERATURE_VERSION } from "@/supabase/functions/_shared/station-temperature-field";
import { thermalAggregates } from "@/supabase/functions/_shared/station-temperature-scoring";

vi.mock("@/supabase/functions/_shared/station-temperature-store", () => ({ freezeStationTemperatureSources: vi.fn() }));
const end = Date.parse("2026-09-09T00:00:00Z"), oldId = "a".repeat(64), newId = "b".repeat(64);
const temperatures = Array(480).fill(18);
const values = { ...thermalAggregates(temperatures), thermalSources: [{ id: oldId }],
  weatherObservedAt: new Date(end).toISOString(), weatherElevationM: 1200, weatherGridLatitude: 42.3, weatherGridLongitude: 2.2 };
function database(version: string, missingState = false) {
  const update = vi.fn();
  const filters = vi.fn();
  const from = vi.fn((table: string) => {
    let writing = false;
    const query = { select: () => writing ? Promise.resolve({ data: [{ point_id: "point" }], error: null }) : query,
      update: (row: unknown) => { writing = true; update(row); return query; },
      eq: (...args: unknown[]) => { if (writing) filters(...args); return query; },
      gt: () => query, gte: () => query, in: () => query, order: () => query,
      maybeSingle: async () => ({ data: { id: "window" }, error: null }),
      limit: async () => ({ error: null, data: table === "open_meteo_hourly_states"
        ? [{ point_id: "point", payload: missingState ? {} : { latitude: 42.3, longitude: 2.2, elevation: 1200,
          hourly: { time: temperatures.map((_, i) => end / 1000 - (479 - i) * 3600), temperature_2m: temperatures } } }]
        : table === "thermal_model_windows" ? [{ id: oldId, version }]
        : [{ point_id: "point", snapshot_date: "2026-09-09", observed_at: new Date(end).toISOString(), values }] }),
    };
    return query;
  });
  return { db: { from } as unknown as Parameters<typeof attachStationTemperatureBatch>[0], update, filters };
}
beforeEach(() => vi.mocked(freezeStationTemperatureSources).mockReset().mockResolvedValue(new Map()));
it("skips current-version references without requiring mutable station inputs", async () => {
  const { db, update } = database(STATION_TEMPERATURE_VERSION);
  expect(await attachStationTemperatureBatch(db, "", "2026-09-09")).toMatchObject({ ready: true, unchanged: 1, attached: 0 });
  expect(update).not.toHaveBeenCalled();
  expect(vi.mocked(freezeStationTemperatureSources).mock.calls[0][1].size).toBe(0);
});
it("upgrades older references only after their source reproduces all controls and uses compare-and-set", async () => {
  const { db, update, filters } = database("xema-arome-blend-v2");
  vi.mocked(freezeStationTemperatureSources).mockResolvedValue(new Map([["point|2026-09-09", [{ id: newId }]]]));
  expect(await attachStationTemperatureBatch(db, "", "2026-09-09")).toMatchObject({ ready: true, attached: 1, mismatched: 0 });
  expect(update).toHaveBeenCalledWith({ values: { ...values, thermalSources: [{ id: newId }] } });
  expect(filters).toHaveBeenCalledWith("observed_at", new Date(end).toISOString());
});
it("retains older references when the original provider controls are unavailable", async () => {
  const { db, update } = database("xema-arome-blend-v2", true);
  expect(await attachStationTemperatureBatch(db, "", "2026-09-09")).toMatchObject({ ready: true, attached: 0, mismatched: 1 });
  expect(update).not.toHaveBeenCalled();
});
