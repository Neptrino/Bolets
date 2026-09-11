import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { aggregateEnvironmentRows, type EnvironmentSnapshotRow } from "@/supabase/functions/_shared/environment-aggregation";
import { createStationTemperatureScorer, thermalAggregates, type StationTemperatureWindow, type ThermalModelWindow } from "@/supabase/functions/_shared/station-temperature-scoring";
import { packStationTemperatureWindow } from "@/supabase/functions/_shared/station-temperature-window";
import { publicTemperatureValues } from "@/supabase/functions/_shared/station-temperature-store";
import { STATION_TEMPERATURE_VERSION } from "@/supabase/functions/_shared/station-temperature-field";

const mocks = vi.hoisted(() => ({ database: null as unknown }));
vi.mock("@/supabase/functions/_shared/pipeline.ts", () => ({
  createAdminClient: () => mocks.database,
  finiteNumber: (n: number) => Number.isFinite(n) ? n : undefined,
  requireServiceRole: () => false,
  json: (data: unknown, status = 200, headers = {}) => Response.json(data, { status, headers }),
}));
let handler: (request: Request) => Promise<Response>;
beforeAll(async () => {
  vi.stubGlobal("Deno", { serve: (fn: typeof handler) => { handler = fn; } });
  // Dynamic path keeps the application typecheck separate from Deno's runtime.
  const modulePath = "../supabase/functions/read-spatial-environment/index.ts";
  await import(modulePath);
});
afterAll(() => vi.unstubAllGlobals());

const endAt = Date.parse("2026-09-10T00:00:00Z"), DAY = 86_400_000, HOUR = 3_600_000;
const ids = ["a", "b", "c", "d"].map((c) => c.repeat(64));
const windows = new Map<string, StationTemperatureWindow>();
const models = new Map<string, ThermalModelWindow>();
const atmosphere = ids.map((id, i) => {
  const at = endAt - i * DAY, windowId = `window-${i}`;
  windows.set(windowId, { version: STATION_TEMPERATURE_VERSION, endAt: at,
    stations: ["CG", "DG"].map((station_code, index) => ({ station_code, station_name: station_code,
      latitude: 42.3 + index * 0.01, longitude: 2.2, altitude_m: 1200 })),
    hours: ["CG", "DG"].flatMap((stationCode) => Array.from({ length: 481 }, (_, hour) => ({
      stationCode, hour: at - (480 - hour) * HOUR, temperatureC: 20 + i, validation: "provisional" as const,
    }))),
  });
  const model: ThermalModelWindow = { version: STATION_TEMPERATURE_VERSION, endAt: at, latitude: 42.3,
    longitude: 2.2, elevationM: 1000, temperaturesC: Array(480).fill(28 + i), stationWindowId: windowId };
  models.set(id, model);
  return { point_id: "weather", snapshot_date: new Date(at).toISOString().slice(0, 10),
    observed_at: new Date(at).toISOString(), sources: ["AROME"], source_resolution_m: 2500,
    confidence: "high" as const, unavailable_fields: [], values: {
      ...thermalAggregates(model.temperaturesC), weatherGridLatitude: 42.3, weatherGridLongitude: 2.2,
      weatherElevationM: 1000, weatherObservedAt: new Date(at).toISOString(),
      weatherModel: "Météo-France AROME France", atmosphericResolutionM: 2500, thermalSources: [{ id }],
      rainfall7dMm: 42, rainfall30dMm: 90, drySpellDays: 2,
    } };
});
const support = { cell_id: "cell", region_id: "pirineus", grid_size_m: 5000,
  west: 2.19, east: 2.21, south: 42.29, north: 42.31, confidence: "high",
  static_values: { altitudeM: 1200 }, weather_point_ids: ["weather"], soil_point_ids: ["soil"],
  condition_snapshot_date: "2026-09-10" };
const soil = atmosphere.map((row) => ({ ...row, point_id: "soil", sources: ["soil"],
  values: { soilMoisture: 0.2, soilMoistureAvg7d: 0.21 } }));

function database() {
  const cache = new Map<string, unknown>(), stationReads: string[][] = [], modelReads: string[][] = [];
  let failOptional = false;
  const supports = [{ ...support }];
  let hold: Promise<void> | undefined;
  const from = (table: string) => {
    let wanted: string[] = [];
    const result = () => {
      if (table === "spatial_cell_levels") return supports;
      if (table === "weather_grid_snapshots") return [...atmosphere, ...soil].filter((row) => wanted.includes(row.point_id));
      if (table === "weather_grid_forecasts") return [0, 24, 48, 72, 96, 120].map((horizon_hours) => ({
        ...soil[0], horizon_hours, valid_at: new Date(endAt + horizon_hours * HOUR).toISOString(),
        values: { ...soil[0].values, ...atmosphere[0].values, thermalSources: undefined },
      }));
      if (table === "thermal_model_windows") {
        modelReads.push(wanted);
        return wanted.filter((id) => models.has(id)).map((id) => ({ id, payload: models.get(id) }));
      }
      if (table === "station_temperature_windows") {
        stationReads.push(wanted);
        return wanted.filter((id) => windows.has(id)).map((id) => ({ id, payload: packStationTemperatureWindow(windows.get(id)!) }));
      }
      if (table === "cell_temperature_cache") return wanted.filter((id) => cache.has(id)).map((id) => ({ id, values: cache.get(id) }));
      throw new Error(`Unexpected table ${table}`);
    };
    const query = {
      select: () => query, eq: () => query, not: () => query, gte: () => query, lte: () => query,
      order: () => query, limit: () => query,
      in: (_field: string, ids: string[]) => { wanted = ids; return query; },
      maybeSingle: async () => ({ data: { snapshot_date: "2026-09-10", generated_at: new Date(endAt).toISOString() }, error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(table === "spatial_cell_levels" ? hold : undefined)
        .then(() => ({ data: result(),
          error: failOptional && ["thermal_model_windows", "station_temperature_windows", "cell_temperature_cache"].includes(table) ? new Error("offline") : null })).then(resolve),
      upsert: async (rows: Array<{ id: string; values: unknown }>) => {
        for (const row of rows) cache.set(row.id, row.values);
        return { error: null };
      },
    };
    return query;
  };
  mocks.database = { from };
  return { cache, stationReads, modelReads, supports, fail: () => { failOptional = true; }, hold: (promise: Promise<void>) => { hold = promise; } };
}
let db: ReturnType<typeof database>;
beforeEach(() => { db = database(); });
async function frame(offset: number) {
  const response = await handler(new Request(`https://edge.test/read-spatial-environment?mode=frame&west=2&south=42&east=2.5&north=42.5&resolution=5000&offset=${offset}`));
  expect(response.status).toBe(200);
  return response.json();
}

describe("timeline temperature memory and scoring parity", () => {
  it("rejects excess Edge requests with retryable uncached responses and discards cancelled waiters", async () => {
    let release!: () => void;
    db.hold(new Promise<void>((resolve) => { release = resolve; }));
    const controllers = Array.from({ length: 66 }, () => new AbortController());
    const responses = controllers.map((controller) => handler(new Request(
      "https://edge.test/read-spatial-environment?mode=frame&west=2&south=42&east=2.5&north=42.5&resolution=5000&offset=1",
      { signal: controller.signal })));
    const overflow = await responses[65];
    expect(overflow.status).toBe(503);
    expect(overflow.headers.get("retry-after")).toBe("1");
    expect(overflow.headers.get("cache-control")).toContain("no-store");
    controllers.slice(1, 65).forEach((controller) => controller.abort());
    const cancelled = await Promise.all(responses.slice(1, 65));
    expect(cancelled.every((response) => response.status === 503)).toBe(true);
    release();
    expect((await responses[0]).status).toBe(200);
    expect(db.stationReads).toHaveLength(1);
  });

  it.each([-3, -2, -1, 1, 2, 3, 4, 5])("offset %i loads only its selected window and matches the uncached scorer", async (offset) => {
    const index = offset < 0 ? -offset : 0;
    const result = await frame(offset);
    const snapshot = aggregateEnvironmentRows([atmosphere[index], soil[index]] as EnvironmentSnapshotRow[]);
    const expected = publicTemperatureValues(createStationTemperatureScorer(models, windows)(
      { ...snapshot.values, altitudeM: 1200 }, (support.south + support.north) / 2, (support.west + support.east) / 2));
    expect(result.cells[0].snapshot.values).toEqual(JSON.parse(JSON.stringify(expected)));
    expect(result.cells[0].snapshot.observedAt).toBe(atmosphere[index].observed_at);
    expect(result.cells[0].snapshot.confidence).toBe("limited");
    expect(result.cells[0].snapshot.source).toContain("Meteocat XEMA temperature / AROME blend (estimate)");
    expect(db.modelReads).toEqual([[ids[index]]]);
    expect(db.stationReads).toEqual([[`window-${index}`]]);
    expect(result.cells[0].forecast?.snapshots.length ?? 0).toBe(Math.max(offset, 0));
    expect(JSON.stringify(result)).not.toContain("thermalSources");
  });

  it("reuses today's thermal patch across forecast offsets without reloading any station window", async () => {
    const first = await frame(1), later = await frame(5);
    expect(later.cells[0].snapshot).toEqual(first.cells[0].snapshot);
    expect(db.stationReads).toHaveLength(1);
    expect(db.cache.size).toBe(1);
  });

  it("keeps incomplete/older cells tied to their own published date", async () => {
    db.supports[0].condition_snapshot_date = "2026-09-09";
    const result = await frame(1);
    expect(result.cells[0].snapshot.observedAt).toBe(atmosphere[1].observed_at);
    expect(db.stationReads).toEqual([["window-1"]]);
  });

  it("retains the baseline and does not cache unavailable optional inputs", async () => {
    db.fail();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await frame(1);
      expect(result.cells[0].snapshot.values.temperatureAvg20dC).toBe(28);
      expect(result.cells[0].snapshot.values.temperatureSource).toBeUndefined();
      expect(result.cells[0].snapshot.values.soilMoisture).toBe(0.2);
      expect(db.cache.size).toBe(0);
    } finally { log.mockRestore(); }
  });
});
