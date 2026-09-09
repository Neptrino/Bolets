import { describe, expect, it } from "vitest";
import { terrainLapseDeltaC } from "@/src/lib/hydrothermal-v2";
import { blendStationModelTemperature, evaluateStationModelBlend, modelTemperatureAtElevation } from "@/scripts/lib/station-temperature-blend";

const hour = Date.parse("2026-08-20T12:00:00Z");
const stations = [
  { station_code: "A", station_name: "A", latitude: 42.3, longitude: 2.1, altitude_m: 1500 },
  { station_code: "B", station_name: "B", latitude: 42.31, longitude: 2.1, altitude_m: 1000 },
  { station_code: "C", station_name: "C", latitude: 42.32, longitude: 2.1, altitude_m: 2000 },
];
const observations = () => stations.map((station) => ({ stationCode: station.station_code, hour,
  temperatureC: station.station_code === "A" ? 20 : station.station_code === "B" ? 23.25 : 16.75,
  validation: "validated" as const }));
const elevations = new Map(stations.map((station) => [station.station_code, station.altitude_m]));

describe("experimental station/model temperature blend", () => {
  it("matches the existing mean lapse convention including sign, zero difference and cap", () => {
    for (const [source, target] of [[1472, 1824], [1776, 1833], [1500, 1500], [500, 2500], [2500, 500]]) {
      const delta = terrainLapseDeltaC({ weatherElevationM: source, altitudeM: target });
      expect(modelTemperatureAtElevation(20, source, target)).toBeCloseTo(20 + delta!);
    }
    expect(modelTemperatureAtElevation(undefined, 1000, 1500)).toBeUndefined();
    expect(modelTemperatureAtElevation(20, NaN, 1500)).toBeUndefined();
  });

  it("averages temperatures after altitude alignment, with no threshold or score averaging", () => {
    expect(blendStationModelTemperature(modelTemperatureAtElevation(28, 1000, 1500), 25)).toBe(24.875);
    expect(blendStationModelTemperature(28, 24)).toBe(26);
    expect(blendStationModelTemperature(0, 0)).toBe(0);
    expect(blendStationModelTemperature(20, undefined)).toBeUndefined();
    expect(blendStationModelTemperature(NaN, 20)).toBeUndefined();
  });

  it("evaluates against omitted target observations on matched supported hours, preserving fallback coverage", () => {
    const hours = observations();
    const pairs = hours.map((observation) => ({ ...observation, modelC: observation.temperatureC + 1 }));
    const result = evaluateStationModelBlend(pairs, hours, stations, elevations, hour);
    expect(result.summary.testedHours).toBe(3);
    expect(result.summary.supportedHours).toBe(1);
    expect(result.summary.baselineMeanStationMaeC).toBe(1);
    expect(result.summary.blendMeanStationMaeC).toBeCloseTo(0.5);
    expect(result.stations[1].withModelFallback.maeC).toBe(1);
    expect(result.stations[1].supportedBlend.maeC).toBeNull();
    const changed = observations(); changed[0].temperatureC = 40;
    expect(evaluateStationModelBlend(pairs, changed, stations, elevations, hour).stations[0]).toEqual(result.stations[0]);
  });

  it("applies only the remaining provider-to-target altitude shift and rejects missing metadata", () => {
    const hours = observations();
    const pairs = hours.map((observation) => ({ ...observation, modelC: observation.temperatureC }));
    const raised = new Map(elevations); raised.set("A", 1600);
    const result = evaluateStationModelBlend(pairs, hours, stations, raised, hour);
    expect(result.stations[0].modelElevationAdjustmentC).toBe(0.65);
    expect(result.summary.modelAltitudeMeanStationMaeC).toBeCloseTo(0.65);
    expect(result.summary.blendMeanStationMaeC).toBeCloseTo(0.325);
    expect(() => evaluateStationModelBlend(pairs, hours, stations, new Map(), hour)).toThrow();
  });
});
