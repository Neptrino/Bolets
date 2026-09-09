import { describe, expect, it, vi } from "vitest";
import { freezeStationTemperatureSources, loadStationTemperatureScorer, publicTemperatureValues } from "@/supabase/functions/_shared/station-temperature-store";
import { STATION_TEMPERATURE_VERSION } from "@/supabase/functions/_shared/station-temperature-field";
import type { ThermalModelWindow } from "@/supabase/functions/_shared/station-temperature-scoring";

const end = Date.parse("2026-09-09T00:00:00Z") / 1000;
const location = { latitude: 42.3, longitude: 2.2, elevation: 1200, utc_offset_seconds: 7200,
  current: { time: end }, hourly: { time: Array.from({ length: 720 }, (_, i) => end - (719 - i) * 3600), temperature_2m: Array(720).fill(18) } };
function database(fail = false) {
  const writes: Array<{ id: string; payload: ThermalModelWindow }> = [];
  const window = { id: "b".repeat(64), payload: { version: STATION_TEMPERATURE_VERSION, endAt: end * 1000, hours: [],
    stations: ["CG", "DG"].map((station_code) => ({ station_code, latitude: 42.3, longitude: 2.2, altitude_m: 1200 })) } };
  const from = vi.fn((table: string) => {
    const query = { select: () => query, eq: () => query, in: () => query,
      maybeSingle: async () => ({ data: window, error: fail ? new Error("Test outage") : null }),
      limit: async () => ({ data: [], error: new Error("Test read outage") }),
      upsert: async (rows: typeof writes) => { writes.push(...rows); return { error: null }; } };
    if (!["station_temperature_windows", "thermal_model_windows"].includes(table)) throw new Error("Unexpected mutable station read");
    return query;
  });
  return { db: { from } as unknown as Parameters<typeof freezeStationTemperatureSources>[0], writes, from };
}

describe("frozen station temperature integration", () => {
  it("preserves absolute UTC epoch hours despite the provider's daylight-saving display offset", async () => {
    const { db, writes } = database();
    const sources = await freezeStationTemperatureSources(db, new Map([["point", location]]));
    expect(sources.get("point")).toEqual([{ id: writes[0].id }]);
    expect(writes[0].payload.endAt).toBe(end * 1000);
    expect(writes[0].payload.temperaturesC).toHaveLength(480);
    expect(writes[0].payload.stationWindowId).toBe("b".repeat(64));
  });
  it("rejects missing or nonconsecutive control hours without inventing a shorter window", async () => {
    const { db, writes } = database();
    const broken = { ...location, hourly: { ...location.hourly, time: [...location.hourly.time] } };
    broken.hourly.time[400] -= 3600;
    expect((await freezeStationTemperatureSources(db, new Map([["point", broken]]))).size).toBe(0);
    expect(writes).toHaveLength(0);
  });
  it("keeps the baseline when optional storage fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const { db } = database(true);
      expect((await freezeStationTemperatureSources(db, new Map([["point", location]]))).size).toBe(0);
      const original = { thermalSources: [{ id: "a".repeat(64) }], temperatureAvg20dC: 18 };
      const scorer = await loadStationTemperatureScorer(db, [original]);
      expect(scorer(original, 42.3, 2.2)).toBe(original);
    } finally { log.mockRestore(); }
  });
  it("does not freeze an extended station outage", async () => {
    const upsert = vi.fn();
    const stations = ["CG", "DG"].map((station_code) => ({ station_code, latitude: 42.3, longitude: 2.2, altitude_m: 1200 }));
    const days = Array.from({ length: 21 }, () => ({ stations, hours: [] }));
    const query = { select: () => query, eq: () => query, gte: () => query, lte: () => query, order: () => query,
      maybeSingle: async () => ({ data: null, error: null }), limit: async () => ({ data: days, error: null }), upsert };
    const db = { from: () => query } as unknown as Parameters<typeof freezeStationTemperatureSources>[0];
    expect((await freezeStationTemperatureSources(db, new Map([["point", location]]))).size).toBe(0);
    expect(upsert).not.toHaveBeenCalled();
  });
  it.each([0, 1, 6, 12, 13])("freezes a %i-hour tail only within the publication limit", async (lag) => {
    const stations = ["CG", "DG"].map((station_code) => ({ station_code, latitude: 42.3, longitude: 2.2, altitude_m: 1200 }));
    const hours = stations.flatMap((s) => Array.from({ length: 481 - lag }, (_, i) => ({
      stationCode: s.station_code, hour: (end - (480 - i) * 3600) * 1000, temperatureC: 20, validation: "provisional",
    })));
    const days = Array.from({ length: 21 }, (_, i) => ({ stations, hours: i === 0 ? hours : [] }));
    let frozen: unknown;
    const query = { select: () => query, eq: () => query, gte: () => query, lte: () => query, order: () => query,
      maybeSingle: async () => ({ data: null, error: null }), limit: async () => ({ data: days, error: null }),
      single: async () => ({ data: frozen, error: null }),
      upsert: vi.fn(async (row: unknown) => { if (!Array.isArray(row)) frozen = row; return { error: null }; }) };
    const db = { from: () => query } as unknown as Parameters<typeof freezeStationTemperatureSources>[0];
    const result = await freezeStationTemperatureSources(db, new Map([["point", location]]));
    expect(result.size).toBe(lag <= 12 ? 1 : 0);
    expect(query.upsert.mock.calls.length).toBe(lag <= 12 ? 2 : 0);
  });
  it("removes private references and distributions while retaining source provenance", () => {
    expect(publicTemperatureValues({ thermalSources: [{ id: "secret" }], thermalExposure: [1], temperatureSource: STATION_TEMPERATURE_VERSION }))
      .toEqual({ temperatureSource: STATION_TEMPERATURE_VERSION });
  });
});


it.each(["model", "station", "none"])("marks immutable inputs complete only with no missing %s rows", async (missing) => {
  const modelId = "a".repeat(64), stationId = "b".repeat(64);
  const db = { from: (table: string) => ({ select: () => ({ in: () => ({ limit: async () => ({
    error: null,
    data: table === "thermal_model_windows"
      ? missing === "model" ? [] : [{ id: modelId, payload: { stationWindowId: stationId } }]
      : missing === "station" ? [] : [{ id: stationId, payload: {} }],
  }) }) }) }) } as unknown as Parameters<typeof loadStationTemperatureScorer>[0];
  const score = await loadStationTemperatureScorer(db, [{ thermalSources: [{ id: modelId }] }]);
  expect(score.inputsComplete).toBe(missing === "none");
});
