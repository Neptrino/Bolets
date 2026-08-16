import { describe, expect, it } from "vitest";
import {
  applyStationRainToLocation,
  normalizeDayHourRow,
  xemaDayHourlyUrl,
} from "@/tests/helpers/xema-historical-rain";

describe("historical XEMA day queries", () => {
  it("groups one UTC day to station hours server side, without coordinates", () => {
    const url = xemaDayHourlyUrl("2025-10-04");
    expect(url.pathname).toBe("/resource/nzvn-apee.json");
    expect(url.searchParams.get("$group")).toBe("codi_estacio,hour");
    const where = url.searchParams.get("$where") ?? "";
    expect(where).toContain("codi_variable='35'");
    expect(where).toContain("data_lectura >= '2025-10-04T00:00:00'");
    expect(where).toContain("data_lectura < '2025-10-05T00:00:00'");
    expect(where).toContain("valor_lectura <= 120");
    expect(url.toString()).not.toMatch(/latitud|longitud/);
  });

  it("rejects malformed days", () => {
    expect(() => xemaDayHourlyUrl("04/10/2025")).toThrow(/ISO calendar date/);
  });
});

describe("historical day-hour row validation", () => {
  const row = { codi_estacio: "WM", hour: "16", mm: "3.9", samples: "2" };

  it("accepts a complete hour and anchors its epoch in universal time", () => {
    expect(normalizeDayHourRow("2025-10-04", row)).toEqual({
      stationCode: "WM",
      hourStartEpoch: Date.parse("2025-10-04T16:00:00Z") / 1000,
      precipitationMm: 3.9,
    });
  });

  it("drops incomplete, duplicated, or physically impossible hours", () => {
    expect(normalizeDayHourRow("2025-10-04", { ...row, samples: "1" })).toBeUndefined();
    expect(normalizeDayHourRow("2025-10-04", { ...row, samples: "3" })).toBeUndefined();
    expect(normalizeDayHourRow("2025-10-04", { ...row, hour: "24" })).toBeUndefined();
    expect(normalizeDayHourRow("2025-10-04", { ...row, mm: "999" })).toBeUndefined();
    expect(normalizeDayHourRow("2025-10-04", { ...row, codi_estacio: "bad!" })).toBeUndefined();
  });
});

describe("applying the production rain stack to a replay series", () => {
  // 2025-10-04 12:00 UTC = 14:00 CEST, matching the gauge matrix key format.
  const epoch = Date.parse("2025-10-04T12:00:00Z") / 1000;

  it("splices the seamless base then overlays gauge hours where dense", () => {
    const location = {
      hourly: {
        time: [epoch, epoch + 3600],
        precipitation: [9, 9],
      },
    };
    const seamless = {
      hourly: {
        time: [epoch, epoch + 3600],
        precipitation: [1.5, 2.5],
      },
    };
    const stations = [
      { station_code: "A", latitude: 42.41, longitude: 2.3, hours: { "2025-10-04T14:00": 4 } },
      { station_code: "B", latitude: 42.39, longitude: 2.3, hours: { "2025-10-04T14:00": 6 } },
    ];
    const applied = applyStationRainToLocation(location, stations, 42.4, 2.3, seamless);
    expect(applied.applied).toBe(true);
    expect(applied.gaugeCoverage).toBe(0.5);
    // Gauge IDW for the covered hour, seamless (not AROME) for the rest.
    expect(location.hourly.precipitation[0]).toBeGreaterThan(3.9);
    expect(location.hourly.precipitation[0]).toBeLessThan(6.1);
    expect(location.hourly.precipitation[1]).toBe(2.5);
  });

  it("keeps model semantics when no gauges are near", () => {
    const location = { hourly: { time: [epoch], precipitation: [9] } };
    const applied = applyStationRainToLocation(location, [], 42.4, 2.3);
    expect(applied.applied).toBe(false);
    expect(location.hourly.precipitation).toEqual([9]);
  });
});
