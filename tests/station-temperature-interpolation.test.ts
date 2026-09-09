import { describe, expect, it } from "vitest";
import { createStationObservedTemperature, evaluateStationInterpolation } from "@/scripts/lib/station-temperature-interpolation";

const hour = Date.parse("2026-08-20T12:00:00Z");
const stations = [
  { station_code: "A", station_name: "A", latitude: 42.3, longitude: 2.1, altitude_m: 1500 },
  { station_code: "B", station_name: "B", latitude: 42.31, longitude: 2.1, altitude_m: 1000 },
  { station_code: "C", station_name: "C", latitude: 42.32, longitude: 2.1, altitude_m: 2000 },
];
const observations = () => stations.map((station) => ({ stationCode: station.station_code, hour,
  temperatureC: station.station_code === "A" ? 40 : station.station_code === "B" ? 23.25 : 16.75,
  validation: "validated" as const }));

describe("offline observed station interpolation", () => {
  it("shifts peer observations to target elevation and excludes the target's own observation", () => {
    const field = createStationObservedTemperature(observations(), stations);
    const estimate = field(stations[0])(hour)!;
    expect(estimate.temperatureC).toBeCloseTo(20);
    expect(estimate.donors.map((donor) => donor.code)).toEqual(["B", "C"]);
    expect(estimate.donors.map((donor) => donor.adjustmentC)).toEqual([-3.25, 3.25]);
    expect(estimate.donors.reduce((sum, donor) => sum + donor.normalizedWeight, 0)).toBeCloseTo(1);
    const changed = observations(); changed[0].temperatureC = -10;
    expect(createStationObservedTemperature(changed, stations)(stations[0])(hour)).toEqual(estimate);
  });

  it("keeps the zero-lapse comparison distinct, with the same spatial weighting", () => {
    const estimate = createStationObservedTemperature(observations(), stations, 0)(stations[0])(hour)!;
    expect(estimate.donors.every((donor) => donor.adjustmentC === 0)).toBe(true);
    expect(estimate.temperatureC).toBeGreaterThan(20);
  });

  it("requires two simultaneous eligible donors and never substitutes stale observations", () => {
    const field = createStationObservedTemperature(observations(), stations);
    expect(field(stations[0])(hour + 3_600_000)).toBeUndefined();
    const one = createStationObservedTemperature(observations().slice(0, 2), stations);
    expect(one(stations[0])(hour)).toBeUndefined();
    const remote = stations.map((station) => station.station_code === "C" ? { ...station, altitude_m: 2500 } : station);
    expect(createStationObservedTemperature(observations(), remote)(stations[0])(hour)).toBeUndefined();
  });

  it("retains zero degrees and rejects invalid targets or conflicting observations", () => {
    const zeros = observations().map((observation) => ({ ...observation, temperatureC: 0 }));
    expect(createStationObservedTemperature(zeros, stations, 0)(stations[0])(hour)?.temperatureC).toBe(0);
    expect(() => createStationObservedTemperature([...zeros, { ...zeros[0], temperatureC: 1 }], stations)).toThrow();
    expect(() => createStationObservedTemperature(zeros, stations)({ ...stations[0], altitude_m: NaN })).toThrow();
  });

  it("reports accuracy on identical supported hours and separates unavailable station coverage", () => {
    const hours = observations(); hours[0].temperatureC = 20;
    const pairs = hours.map((observation) => ({ ...observation, modelC: observation.temperatureC + 1 }));
    const result = evaluateStationInterpolation(pairs, hours, stations, hour);
    expect(result.summary.testedHours).toBe(3);
    expect(result.summary.supportedHours).toBe(1);
    expect(result.summary.supportedStations).toBe(1);
    expect(result.summary.supportedBaselineMeanStationMaeC).toBe(1);
    expect(result.summary.supportedInterpolationMeanStationMaeC).toBeCloseTo(0);
    expect(result.stations[1].withModelFallback.maeC).toBe(1);
    expect(result.stations[1].supportedInterpolation.maeC).toBeNull();
  });
});
