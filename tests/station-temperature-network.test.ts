import { describe, expect, it, vi } from "vitest";
import { fetchXemaNetworkTemperatureDay, xemaNetworkTemperatureDayUrl } from "@/supabase/functions/_shared/xema-temperature";
import { packStationTemperatureWindow, unpackStationTemperatureWindow } from "@/supabase/functions/_shared/station-temperature-window";
import { createStationTemperatureScorer, thermalAggregates, type StationTemperatureWindow, type ThermalModelWindow } from "@/supabase/functions/_shared/station-temperature-scoring";
import { STATION_TEMPERATURE_VERSION } from "@/supabase/functions/_shared/station-temperature-field";
const endAt = Date.parse("2026-09-09T00:00:00Z");
const stations = ["C6", "D1"].map((station_code) => ({ station_code, station_name: station_code, latitude: 42.3, longitude: 2.2, altitude_m: 1800 }));
const window: StationTemperatureWindow = { version: STATION_TEMPERATURE_VERSION, endAt, stations,
  hours: stations.flatMap((s) => Array.from({ length: 469 }, (_, i) => ({ stationCode: s.station_code,
    hour: endAt - (480 - i) * 3_600_000, temperatureC: 14.125 + i % 10,
    validation: i % 2 ? "validated" as const : "provisional" as const }))) };

describe("full XEMA temperature network", () => {
  it("queries every temperature station with complete-interval bases and explicit pagination", () => {
    const url = xemaNetworkTemperatureDayUrl("2026-09-08", 50000);
    expect(url.searchParams.get("$where")).toContain("codi_variable='32'");
    expect(url.searchParams.get("$where")).toContain("codi_base in('SH','HO')");
    expect(url.searchParams.get("$where")).not.toContain("codi_estacio");
    expect(url.searchParams.get("$offset")).toBe("50000");
    expect(() => xemaNetworkTemperatureDayUrl("2026-02-30")).toThrow();
  });
  it("fetches later pages and fails instead of publishing a truncated day", async () => {
    const full = Array(50000).fill({ sample: true });
    const load = vi.fn().mockResolvedValueOnce(full).mockResolvedValueOnce([{ sample: false }]);
    expect(await fetchXemaNetworkTemperatureDay("2026-09-08", load)).toHaveLength(50001);
    expect(load.mock.calls[1][0].searchParams.get("$offset")).toBe("50000");
    await expect(fetchXemaNetworkTemperatureDay("2026-09-08", vi.fn().mockResolvedValue(full))).rejects.toThrow("Truncated");
  });
  it("preserves exact temperature values, validation flags and missing trailing hours in compact storage", () => {
    const packed = packStationTemperatureWindow(window);
    expect(JSON.stringify(packed).length).toBeLessThan(JSON.stringify(window).length / 3);
    expect(unpackStationTemperatureWindow(JSON.parse(JSON.stringify(packed)))).toEqual(window);
    const broken = structuredClone(packed); broken.series[0].validation = "V".repeat(481);
    expect(unpackStationTemperatureWindow(broken)).toBeUndefined();
    const duplicate = structuredClone(packed); duplicate.series.push(duplicate.series[0]);
    expect(unpackStationTemperatureWindow(duplicate)).toBeUndefined();
  });
  it("uses stations outside the old pilot pool and reproduces the uncompressed score exactly", () => {
    const id = "a".repeat(64), temperaturesC = Array(480).fill(22);
    const model: ThermalModelWindow = { version: STATION_TEMPERATURE_VERSION, endAt, latitude: 42.3, longitude: 2.2,
      elevationM: 1800, temperaturesC, stationWindowId: "stations" };
    const values = { ...thermalAggregates(temperaturesC), thermalSources: [{ id }], altitudeM: 1800,
      weatherObservedAt: new Date(endAt).toISOString(), weatherModel: "Météo-France AROME France",
      atmosphericResolutionM: 2500, weatherGridLatitude: 42.3, weatherGridLongitude: 2.2, weatherElevationM: 1800 };
    const score = (data: StationTemperatureWindow) => createStationTemperatureScorer(new Map([[id, model]]), new Map([["stations", data]]))(values, 42.3, 2.2);
    const raw = score(window);
    expect(raw.temperatureSource).toBe(STATION_TEMPERATURE_VERSION);
    expect(raw.temperatureModelOnlyHours).toBe(12);
    expect(score(unpackStationTemperatureWindow(packStationTemperatureWindow(window))!)).toEqual(raw);
    expect(score({ ...window, version: "xema-arome-blend-v2" })).toBe(values);
  });
  it("keeps legacy unpacked windows readable", () => {
    const legacy = { ...window, version: "xema-arome-blend-v2" as const, stations: stations.map((s, i) => ({ ...s, station_code: i ? "DG" : "CG" })) };
    expect(unpackStationTemperatureWindow(legacy)).toBe(legacy);
  });
});
