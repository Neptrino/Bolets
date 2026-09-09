import { describe, expect, it } from "vitest";
import { STATION_DONOR_TAPER, stationTemperatureDonors } from "@/scripts/lib/station-temperature-evaluation";
import { createStationObservedTemperature } from "@/scripts/lib/station-temperature-interpolation";
import { stationModelBlendConfig } from "@/scripts/lib/station-temperature-blend";

const hour = Date.parse("2026-08-20T12:00:00Z");
const stations = [
  { station_code: "A", station_name: "A", latitude: 42, longitude: 2, altitude_m: 1500 },
  { station_code: "B", station_name: "B", latitude: 42, longitude: 2, altitude_m: 1500 },
  { station_code: "C", station_name: "C", latitude: 42, longitude: 2, altitude_m: 2100 },
];
const observations = stations.map((s, i) => ({ stationCode: s.station_code, hour,
  temperatureC: [10, 20, 40][i], validation: "validated" as const }));
const target = { ...stations[0], station_code: "TARGET" };

describe("experimental station influence taper", () => {
  it("removes an altitude-cutoff jump without extending donor eligibility", () => {
    const original = createStationObservedTemperature(observations, stations);
    const tapered = createStationObservedTemperature(observations, stations, 6.5, STATION_DONOR_TAPER);
    const a = { ...target, altitude_m: 1499.999 }, b = { ...target, altitude_m: 1500.001 };
    expect(Math.abs(original(a)(hour)!.temperatureC - original(b)(hour)!.temperatureC)).toBeGreaterThan(1);
    expect(Math.abs(tapered(a)(hour)!.temperatureC - tapered(b)(hour)!.temperatureC)).toBeLessThan(0.0001);
    expect(stationTemperatureDonors(stations, a, STATION_DONOR_TAPER).map((d) => d.code)).toEqual(["A", "B"]);
  });
  it("removes a distance-cutoff jump with two other contemporaneous donors", () => {
    const peers = stations.map((s) => s.station_code === "C" ? { ...s, altitude_m: 1500, latitude: 42 + 50 / 6371 * 180 / Math.PI } : s);
    const original = createStationObservedTemperature(observations, peers);
    const tapered = createStationObservedTemperature(observations, peers, 6.5, STATION_DONOR_TAPER);
    const a = { ...target, latitude: 42 - 1e-8 }, b = { ...target, latitude: 42 + 1e-8 };
    expect(Math.abs(original(a)(hour)!.temperatureC - original(b)(hour)!.temperatureC)).toBeGreaterThan(0.1);
    expect(Math.abs(tapered(a)(hour)!.temperatureC - tapered(b)(hour)!.temperatureC)).toBeLessThan(1e-6);
  });
  it("keeps original interior weights and requires two positive supported donors", () => {
    expect(stationTemperatureDonors(stations.slice(0, 2), target, STATION_DONOR_TAPER))
      .toEqual(stationTemperatureDonors(stations.slice(0, 2), target));
    const field = createStationObservedTemperature(observations.slice(0, 1), stations, 6.5, STATION_DONOR_TAPER);
    expect(field(target)(hour)).toBeUndefined();
    expect(() => stationTemperatureDonors(stations, target, { distanceKm: 0, elevationM: 100 })).toThrow();
  });
  it("versions the optional taper and leaves the original experiment unchanged", () => {
    expect(stationModelBlendConfig().version).toBe("xema-arome-equal-blend-shadow-v1");
    expect(stationModelBlendConfig().donorTaper).toBeUndefined();
    expect(stationModelBlendConfig("tapered").donorTaper).toEqual(STATION_DONOR_TAPER);
    expect(() => stationModelBlendConfig("unknown")).toThrow();
  });
});
