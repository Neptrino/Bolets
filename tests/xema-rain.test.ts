import { describe, expect, it } from "vitest";
import {
  aggregateXemaRainHours,
  haversineKm,
  interpolateStationRain,
  normalizeXemaStation,
  XEMA_INTERPOLATION,
  xemaRainReadingsUrl,
  xemaStationsUrl,
} from "../supabase/functions/_shared/xema-rain";

function reading(overrides: Record<string, unknown> = {}) {
  return {
    codi_estacio: "WW",
    codi_variable: "35",
    data_lectura: "2026-08-15T16:30:00.000",
    valor_lectura: "1.8",
    codi_base: "SH",
    ...overrides,
  };
}

describe("XEMA request builders", () => {
  it("targets the official semi-hourly dataset with a half-open universal-time window", () => {
    const url = xemaRainReadingsUrl("2026-08-14T00:00:00Z", "2026-08-16T00:00:00Z");
    expect(url.origin).toBe("https://analisi.transparenciacatalunya.cat");
    expect(url.pathname).toBe("/resource/nzvn-apee.json");
    const where = url.searchParams.get("$where") ?? "";
    expect(where).toContain("codi_variable='35'");
    expect(where).toContain("data_lectura >= '2026-08-14T00:00:00'");
    expect(where).toContain("data_lectura < '2026-08-16T00:00:00'");
  });

  it("rejects empty or inverted reading windows and negative offsets", () => {
    expect(() => xemaRainReadingsUrl("2026-08-16T00:00:00Z", "2026-08-14T00:00:00Z")).toThrow(/empty or inverted/);
    expect(() => xemaRainReadingsUrl("2026-08-14T00:00:00Z", "2026-08-14T00:00:00Z")).toThrow(/empty or inverted/);
    expect(() => xemaRainReadingsUrl("2026-08-14T00:00:00Z", "2026-08-16T00:00:00Z", -1)).toThrow(/offset/);
  });

  it("lists station metadata from the official inventory dataset", () => {
    expect(xemaStationsUrl().pathname).toBe("/resource/yqwd-vj5e.json");
  });
});

describe("XEMA station normalization", () => {
  const station = {
    codi_estacio: "WM",
    nom_estacio: "Santuari de Queralt",
    latitud: "42.10736",
    longitud: "1.8267",
    altitud: "1169",
  };

  it("accepts an official station row with string coordinates", () => {
    expect(normalizeXemaStation(station)).toEqual({
      station_code: "WM",
      station_name: "Santuari de Queralt",
      latitude: 42.10736,
      longitude: 1.8267,
      altitude_m: 1169,
    });
  });

  it("rejects stations outside Catalonia bounds or with malformed identity", () => {
    expect(normalizeXemaStation({ ...station, latitud: "48.85" })).toBeUndefined();
    expect(normalizeXemaStation({ ...station, longitud: "-3.7" })).toBeUndefined();
    expect(normalizeXemaStation({ ...station, codi_estacio: "lower!" })).toBeUndefined();
    expect(normalizeXemaStation({ ...station, nom_estacio: "" })).toBeUndefined();
    expect(normalizeXemaStation({ ...station, altitud: "9000" })).toBeUndefined();
  });
});

describe("XEMA semi-hourly to hourly aggregation", () => {
  it("sums the two half hours of one hour and anchors floating timestamps as universal time", () => {
    const hours = aggregateXemaRainHours([
      reading({ data_lectura: "2026-08-15T16:00:00.000", valor_lectura: "2.1" }),
      reading({ data_lectura: "2026-08-15T16:30:00.000", valor_lectura: "1.8" }),
    ]);
    expect(hours).toEqual([{
      station_code: "WW",
      hour_start: "2026-08-15T16:00:00.000Z",
      precipitation_mm: 3.9,
      sample_count: 2,
    }]);
  });

  it("reports incomplete hours through sample_count instead of hiding them", () => {
    const hours = aggregateXemaRainHours([reading()]);
    expect(hours[0].sample_count).toBe(1);
  });

  it("keeps the last published value for duplicated half hours", () => {
    const hours = aggregateXemaRainHours([
      reading({ valor_lectura: "1.8" }),
      reading({ valor_lectura: "2.4" }),
    ]);
    expect(hours).toHaveLength(1);
    expect(hours[0].precipitation_mm).toBe(2.4);
  });

  it("drops readings with the wrong variable, base, timing or physically impossible values", () => {
    expect(aggregateXemaRainHours([
      reading({ codi_variable: "32" }),
      reading({ codi_base: "DD" }),
      reading({ data_lectura: "2026-08-15T16:15:00.000" }),
      reading({ valor_lectura: "-1" }),
      reading({ valor_lectura: "500" }),
      reading({ valor_lectura: "" }),
      reading({ codi_estacio: "toolong5" }),
    ])).toEqual([]);
  });

  it("orders output by hour then station for deterministic storage", () => {
    const hours = aggregateXemaRainHours([
      reading({ codi_estacio: "Z3", data_lectura: "2026-08-15T17:00:00.000" }),
      reading({ codi_estacio: "AA", data_lectura: "2026-08-15T17:00:00.000" }),
      reading({ data_lectura: "2026-08-15T16:00:00.000" }),
    ]);
    expect(hours.map((hour) => `${hour.hour_start}|${hour.station_code}`)).toEqual([
      "2026-08-15T16:00:00.000Z|WW",
      "2026-08-15T17:00:00.000Z|AA",
      "2026-08-15T17:00:00.000Z|Z3",
    ]);
  });
});

describe("station rain interpolation", () => {
  const gauge = (code: string, latitude: number, longitude: number, mm: number) => ({
    station_code: code,
    latitude,
    longitude,
    precipitation_mm: mm,
  });

  it("measures the Queralbs to Queralt distance within a kilometre", () => {
    expect(haversineKm(42.38287, 2.33794, 42.10736, 1.8267)).toBeCloseTo(52.0, 0);
  });

  it("weights nearer stations more strongly", () => {
    // ~5.5 km north versus ~11 km south of the target: the near gauge dominates.
    const result = interpolateStationRain(42.4, 2.3, [
      gauge("NEAR", 42.45, 2.3, 20),
      gauge("FAR", 42.3, 2.3, 0),
    ]);
    expect(result).toBeDefined();
    expect(result!.precipitation_mm).toBeGreaterThan(15);
    expect(result!.stations_used).toBe(2);
    expect(result!.nearest_station_km).toBeCloseTo(5.6, 0);
  });

  it("returns the gauge value itself when a station sits on the target", () => {
    const result = interpolateStationRain(42.4, 2.3, [
      gauge("HERE", 42.4, 2.3, 12.4),
      gauge("AWAY", 42.5, 2.3, 0),
    ]);
    expect(result!.precipitation_mm).toBe(12.4);
  });

  it("refuses to fabricate a value when the network is too thin nearby", () => {
    expect(interpolateStationRain(42.4, 2.3, [gauge("ONLY", 42.45, 2.3, 20)])).toBeUndefined();
    expect(interpolateStationRain(42.4, 2.3, [
      gauge("FAR-A", 41.5, 2.3, 20),
      gauge("FAR-B", 41.6, 2.3, 10),
    ])).toBeUndefined();
  });

  it("caps the field at the configured station count", () => {
    const crowd = Array.from({ length: 10 }, (_, index) => gauge(`S${index}`, 42.4 + index * 0.01, 2.3, index));
    const result = interpolateStationRain(42.4, 2.3, crowd);
    expect(result!.stations_used).toBe(XEMA_INTERPOLATION.maxStations);
  });
});
