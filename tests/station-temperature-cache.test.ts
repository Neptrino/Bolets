import { beforeEach, describe, expect, it, vi } from "vitest";
import { cachedStationTemperatureValues, temperatureCacheKey, type TemperatureTarget } from "@/supabase/functions/_shared/station-temperature-cache";
import { STATION_TEMPERATURE_VERSION } from "@/supabase/functions/_shared/station-temperature-field";

const mocks = vi.hoisted(() => ({ load: vi.fn(), score: vi.fn() }));
vi.mock("@/supabase/functions/_shared/station-temperature-store.ts", () => ({ loadStationTemperatureScorer: mocks.load }));
const target: TemperatureTarget = {
  latitude: 42.3, longitude: 2.2,
  values: { thermalSources: [{ id: "a".repeat(64) }], altitudeM: 1800, weatherObservedAt: "2026-09-09T16:00:00Z",
    weatherModel: "Météo-France AROME France", atmosphericResolutionM: 2500,
    weatherGridLatitude: 42.3, weatherGridLongitude: 2.2, weatherElevationM: 1500,
    temperatureAvg14dC: 20, temperatureAvg20dC: 19, heatHours14d: 12, heatHours20d: 20, frostHours14d: 0, frostHours20d: 0,
    soilMoisture: 12, thermalExposure: { original: true } },
};
const patch = { temperatureAvg14dC: 16, temperatureAvg20dC: 15, heatHours14d: 0, heatHours20d: 0,
  heatDegreeHours14d: 0, heatDegreeHours20d: 0,
  frostHours14d: 0, frostHours20d: 0, thermalReferenceElevationM: 1800, temperatureSource: STATION_TEMPERATURE_VERSION,
  temperatureQuality: "includes-provisional", temperatureMinimumStations: 19, temperatureModelOnlyHours: 1 };
function database() {
  const rows = new Map<string, Record<string, unknown>>();
  let error = false;
  const writes = vi.fn(async (input: Array<{ id: string; values: Record<string, unknown> }>) => {
    if (!error) for (const row of input) rows.set(row.id, row.values);
    return { error: error ? new Error("offline") : null };
  });
  const db = { from: vi.fn(() => ({
    select: () => ({ in: (_field: string, ids: string[]) => ({ limit: async () => ({
      data: ids.filter((id) => rows.has(id)).map((id) => ({ id, values: rows.get(id) })),
      error: error ? new Error("offline") : null,
    }) }) }), upsert: writes,
  })) } as unknown as Parameters<typeof cachedStationTemperatureValues>[0];
  return { db, rows, writes, fail: () => { error = true; } };
}
beforeEach(() => {
  mocks.load.mockReset().mockImplementation(async () => Object.assign(mocks.score, { inputsComplete: false }));
  mocks.score.mockReset().mockImplementation((values) => ({ ...values, ...patch, thermalExposure: undefined }));
});
describe("persistent cell temperature cache", () => {
  it("reuses the patch across requests and species while retaining fresh nonthermal fields", async () => {
    const { db, writes } = database();
    const first = await cachedStationTemperatureValues(db, [target]);
    const changedWater = { ...target, values: { ...target.values, soilMoisture: 25, habitatCoverage: 45 } };
    const second = await cachedStationTemperatureValues(db, [changedWater]);
    expect(mocks.load).toHaveBeenCalledTimes(1);
    expect(mocks.score).toHaveBeenCalledTimes(1);
    expect(writes).toHaveBeenCalledTimes(1);
    expect(first[0]).toEqual({ ...target.values, ...patch, thermalExposure: undefined });
    expect(second[0]).toEqual({ ...changedWater.values, ...patch, thermalExposure: undefined });
    expect(writes.mock.calls[0][0][0].values).toEqual(patch);
  });
  it("invalidates every scorer control, cell geometry and frozen source reference", async () => {
    const original = await temperatureCacheKey(target);
    for (const [key, value] of Object.entries(target.values)) {
      if (["soilMoisture", "thermalExposure"].includes(key)) continue;
      const altered = typeof value === "number" ? value + 1 : key === "thermalSources" ? [{ id: "b".repeat(64) }] : `${value}-changed`;
      expect(await temperatureCacheKey({ ...target, values: { ...target.values, [key]: altered } }), key).not.toBe(original);
    }
    expect(await temperatureCacheKey({ ...target, latitude: 42.31 })).not.toBe(original);
    expect(await temperatureCacheKey({ ...target, longitude: 2.21 })).not.toBe(original);
  });
  it("bypasses cached adjustments for stale or already corrected inputs", async () => {
    const { db } = database();
    await cachedStationTemperatureValues(db, [target]);
    const stale = { ...target, stale: true };
    const corrected = { ...target, values: { ...target.values, thermalReferenceElevationM: 1800 } };
    expect(await cachedStationTemperatureValues(db, [stale, corrected])).toEqual([stale.values, corrected.values]);
    expect(mocks.score).toHaveBeenCalledTimes(1);
  });
  it("never caches an unavailable optional blend, so recovered evidence is retried", async () => {
    const { db, writes } = database();
    mocks.score.mockImplementationOnce((values) => values);
    expect((await cachedStationTemperatureValues(db, [target]))[0]).toBe(target.values);
    expect(writes).not.toHaveBeenCalled();
    await cachedStationTemperatureValues(db, [target]);
    expect(mocks.load).toHaveBeenCalledTimes(2);
    expect(writes).toHaveBeenCalledTimes(1);
  });
  it("caches deterministic baseline decisions only when every frozen input was loaded", async () => {
    const { db, writes } = database();
    mocks.load.mockImplementation(async () => Object.assign(mocks.score, { inputsComplete: true }));
    mocks.score.mockImplementation((values) => values);
    expect((await cachedStationTemperatureValues(db, [target]))[0]).toBe(target.values);
    expect(writes).toHaveBeenCalledTimes(1);
    expect((await cachedStationTemperatureValues(db, [target]))[0]).toBe(target.values);
    expect(mocks.score).toHaveBeenCalledTimes(1);
  });
  it("calculates normally when the optional cache is unavailable", async () => {
    const { db, fail } = database(); fail();
    expect((await cachedStationTemperatureValues(db, [target]))[0]).toEqual({ ...target.values, ...patch, thermalExposure: undefined });
  });
  it("rejects and repairs malformed patches without accepting unrelated fields", async () => {
    const { db, rows } = database();
    const key = (await temperatureCacheKey(target))!;
    rows.set(key, { ...patch, soilMoisture: 99 });
    expect((await cachedStationTemperatureValues(db, [target]))[0].soilMoisture).toBe(12);
    expect(rows.get(key)).toEqual(patch);
  });
  it("loads only missing model windows when a bucket overlaps cached cells", async () => {
    const { db } = database();
    await cachedStationTemperatureValues(db, [target]);
    const neighbour = { ...target, longitude: 2.21 };
    await cachedStationTemperatureValues(db, [target, neighbour]);
    expect(mocks.load.mock.calls[1][1]).toEqual([neighbour.values]);
    expect(mocks.score).toHaveBeenCalledTimes(2);
  });
});
