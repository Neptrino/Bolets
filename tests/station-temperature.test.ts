import { describe, expect, it } from "vitest";
import { aggregateXemaTemperatureHours, modelIntervalMean, xemaTemperatureDayUrl } from "@/supabase/functions/_shared/xema-temperature";
import { evaluateStationBias, normalizeArchivedTemperature, temperatureMetrics, type TemperaturePair } from "@/scripts/lib/station-temperature-evaluation";

const hour = Date.parse("2026-08-20T00:00:00Z");
const row = (minute: string, temperature: unknown = "12", extra = {}) => ({
  codi_estacio: "DG", codi_variable: "32", codi_base: "SH", codi_estat: "V",
  data_lectura: `2026-08-20T00:${minute}:00.000`, valor_lectura: temperature, ...extra,
});

describe("XEMA temperature observations", () => {
  it("aligns UTC interval starts and averages complete half hours", () => {
    expect(aggregateXemaTemperatureHours([row("00", "10"), row("30", "14")], "validated").hours).toEqual([
      { stationCode: "DG", hour, temperatureC: 12, validation: "validated" },
    ]);
  });

  it("preserves provisional quality instead of silently treating publication as validation", () => {
    const rows = [row("00", "10", { codi_estat: undefined }), row("30", "14", { codi_estat: "T" })];
    expect(aggregateXemaTemperatureHours(rows, "validated").hours).toEqual([]);
    const published = aggregateXemaTemperatureHours(rows, "published");
    expect(published.hours[0].validation).toBe("provisional");
    expect(published.qualityCounts).toEqual({ unstarted: 1, T: 1 });
    expect(aggregateXemaTemperatureHours([row("00"), row("30", "14", { codi_estat: "N" })], "published").hours).toEqual([]);
  });

  it("accepts one hourly average but rejects overlap, incomplete hours and conflicting duplicates", () => {
    expect(aggregateXemaTemperatureHours([row("00", "10", { codi_base: "HO" })], "validated").hours[0].temperatureC).toBe(10);
    expect(aggregateXemaTemperatureHours([row("00")], "validated").hours).toEqual([]);
    const complete = [row("00"), row("30")];
    expect(aggregateXemaTemperatureHours([...complete, row("00")], "validated").hours).toHaveLength(1);
    expect(aggregateXemaTemperatureHours([...complete, row("00", "14")], "validated").hours).toEqual([]);
    expect(aggregateXemaTemperatureHours([...complete, row("00", "12", { codi_base: "HO" })], "validated").hours).toEqual([]);
  });

  it("does not turn missing, corrupt or unsupported observations into zero degrees", () => {
    for (const bad of [null, undefined, "", " ", "NaN", 100, -100]) {
      expect(aggregateXemaTemperatureHours([row("00", "12", { valor_lectura: bad }), row("30")], "published").hours).toEqual([]);
    }
    expect(aggregateXemaTemperatureHours([row("00", "12", { codi_base: "MI" }), row("30")], "validated").hours).toEqual([]);
    expect(aggregateXemaTemperatureHours([row("00", "12", { codi_base: "HO", data_lectura: "2026-02-30T00:00:00" })], "validated").hours).toEqual([]);
  });

  it("requests bounded temperature data with validation flags and rejects query injection", () => {
    const url = xemaTemperatureDayUrl("2026-08-20", ["DG", "DP"]);
    expect(url.searchParams.get("$select")).toContain("codi_estat");
    expect(url.searchParams.get("$where")).toContain("data_lectura < '2026-08-21T00:00:00'");
    expect(() => xemaTemperatureDayUrl("2026-02-30", ["DG"])).toThrow();
    expect(() => xemaTemperatureDayUrl("2026-08-20", ["DG' OR true"])).toThrow();
  });

  it("matches the interval rather than its starting instantaneous temperature", () => {
    const model = new Map([[hour, 24], [hour + 3_600_000, 28]]);
    expect(modelIntervalMean(model, hour)).toBe(26);
    expect(modelIntervalMean(model, hour + 3_600_000)).toBeUndefined();
  });
});

const stations = [
  { station_code: "A", station_name: "A", latitude: 42.3, longitude: 2.1, altitude_m: 1000 },
  { station_code: "B", station_name: "B", latitude: 42.31, longitude: 2.1, altitude_m: 1100 },
  { station_code: "C", station_name: "C", latitude: 42.32, longitude: 2.1, altitude_m: 1200 },
];
const split = hour + 5 * 86_400_000;
describe("archived model temperature boundary", () => {
  const model = () => ({
    latitude: 42.3, longitude: 2.1, elevation: 1010, utc_offset_seconds: 0,
    hourly_units: { temperature_2m: "°C" },
    hourly: { time: ["2026-08-20T00:00", "2026-08-20T01:00"], temperature_2m: [null, 20] },
  });
  it("preserves missing temperatures without fabricating cold hours", () => {
    const result = normalizeArchivedTemperature(model(), stations[0]);
    expect(result.hours.has(hour)).toBe(false);
    expect(result.hours.get(hour + 3_600_000)).toBe(20);
  });
  it("rejects coordinate, timezone, unit and duplicate-hour mismatches", () => {
    expect(() => normalizeArchivedTemperature({ ...model(), latitude: 43.5 }, stations[0])).toThrow();
    expect(() => normalizeArchivedTemperature({ ...model(), utc_offset_seconds: 7200 }, stations[0])).toThrow();
    expect(() => normalizeArchivedTemperature({ ...model(), hourly_units: { temperature_2m: "K" } }, stations[0])).toThrow();
    const repeated = model();
    repeated.hourly.time[1] = repeated.hourly.time[0];
    expect(() => normalizeArchivedTemperature(repeated, stations[0])).toThrow();
  });
});
function experimentPairs(): TemperaturePair[] {
  return stations.flatMap((station) => Array.from({ length: 6 }, (_, day) => ({
    stationCode: station.station_code, hour: hour + day * 86_400_000,
    temperatureC: 24, modelC: 28, validation: "validated" as const,
  })));
}

describe("station-held-out and date-blocked temperature experiment", () => {
  it("learns earlier peer biases, caps correction and evaluates untouched later dates", () => {
    const result = evaluateStationBias(experimentPairs(), stations, split);
    expect(result.summary.testedHours).toBe(3);
    expect(result.summary.supportedHours).toBe(3);
    expect(result.summary.baselineMeanStationMaeC).toBe(4);
    expect(result.summary.correctedMeanStationMaeC).toBe(1);
    expect(result.summary.baselineHeatClassificationErrors).toBe(3);
    expect(result.summary.correctedHeatClassificationErrors).toBe(0);
  });

  it("cannot learn a target station's own bias", () => {
    const pairs = experimentPairs();
    pairs.forEach((pair) => { if (pair.stationCode === "A" && pair.hour < split) pair.temperatureC = 40; });
    const target = evaluateStationBias(pairs, stations, split).stations[0];
    expect(target.corrected.maeC).toBe(1);
  });

  it("cannot learn peer observations from held-out dates", () => {
    const pairs = experimentPairs();
    pairs.forEach((pair) => { if (pair.stationCode !== "A" && pair.hour >= split) pair.temperatureC = 40; });
    expect(evaluateStationBias(pairs, stations, split).stations[0].corrected.maeC).toBe(1);
  });

  it("falls back unchanged when too few representative stations support a correction", () => {
    const remote = stations.map((station) => station.station_code === "C" ? { ...station, altitude_m: 2500 } : station);
    const result = evaluateStationBias(experimentPairs(), remote, split);
    expect(result.summary.supportedHours).toBe(0);
    expect(result.summary.correctedMeanStationMaeC).toBe(result.summary.baselineMeanStationMaeC);
  });

  it("uses simultaneous peer observations without using the target's own observation", () => {
    const pairs = experimentPairs();
    pairs.forEach((pair) => { if (pair.hour < split || pair.stationCode === "A") pair.temperatureC = 40; });
    const target = evaluateStationBias(pairs, stations, split, "contemporaneous").stations[0];
    // The target observed 40, but the two current peers observed 24. The -3 C
    // bounded correction must use the peers, giving 25 and absolute error 15.
    expect(target.baseline.maeC).toBe(12);
    expect(target.corrected.maeC).toBe(15);
    expect(target.supportedHours).toBe(1);
  });

  it("never substitutes a previous hour when simultaneous donor observations are missing", () => {
    const pairs = experimentPairs().filter((pair) => pair.hour < split || pair.stationCode !== "C");
    const target = evaluateStationBias(pairs, stations, split, "contemporaneous").stations[0];
    expect(target.supportedHours).toBe(0);
    expect(target.corrected.maeC).toBe(target.baseline.maeC);
  });

  it("reports empty comparisons as unavailable, and keeps threshold boundaries inclusive", () => {
    expect(temperatureMetrics([]).maeC).toBeNull();
    const pairs: TemperaturePair[] = [
      { stationCode: "A", hour, temperatureC: 27, modelC: 26, validation: "validated" },
      { stationCode: "A", hour: hour + 3_600_000, temperatureC: 0, modelC: 1, validation: "provisional" },
    ];
    const result = temperatureMetrics(pairs);
    expect(result.heatFalseNegativeHours).toBe(1);
    expect(result.frostFalseNegativeHours).toBe(1);
    expect(result.provisionalHours).toBe(1);
    expect(() => temperatureMetrics(pairs, [0])).toThrow();
  });
});
