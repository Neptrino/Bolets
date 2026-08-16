import { describe, expect, it } from "vitest";
import {
  aemetDailyClimatologyPath,
  normalizeAemetDailyRain,
  normalizeAemetStations,
  parseAemetDegrees,
  parseAemetMillimetres,
} from "../scripts/lib/aemet-rain.mjs";

describe("AEMET coordinate parsing", () => {
  it("converts inventory degrees-minutes-seconds strings to decimal degrees", () => {
    expect(parseAemetDegrees("412342N")).toBeCloseTo(41 + 23 / 60 + 42 / 3600, 6);
    expect(parseAemetDegrees("0021342E")).toBeCloseTo(2 + 13 / 60 + 42 / 3600, 6);
    expect(parseAemetDegrees("0003730W")).toBeCloseTo(-(0 + 37 / 60 + 30 / 3600), 6);
    expect(parseAemetDegrees("391500S")).toBeCloseTo(-39.25, 6);
  });

  it("rejects malformed or out-of-range sexagesimal values", () => {
    expect(parseAemetDegrees("417000N")).toBeUndefined();
    expect(parseAemetDegrees("410070N")).toBeUndefined();
    expect(parseAemetDegrees("41.2342N")).toBeUndefined();
    expect(parseAemetDegrees("412342X")).toBeUndefined();
    expect(parseAemetDegrees(412342)).toBeUndefined();
  });
});

describe("AEMET precipitation parsing", () => {
  it("reads comma decimals and treats inappreciable rain as zero", () => {
    expect(parseAemetMillimetres("12,3")).toBe(12.3);
    expect(parseAemetMillimetres("0,0")).toBe(0);
    expect(parseAemetMillimetres("Ip")).toBe(0);
    expect(parseAemetMillimetres(4.2)).toBe(4.2);
  });

  it("returns undefined for markers that make a single day unusable", () => {
    expect(parseAemetMillimetres("Acum")).toBeUndefined();
    expect(parseAemetMillimetres("-1")).toBeUndefined();
    expect(parseAemetMillimetres("12.3")).toBeUndefined();
    expect(parseAemetMillimetres(undefined)).toBeUndefined();
  });
});

describe("AEMET requests and normalization", () => {
  it("builds the documented daily climatology path", () => {
    expect(aemetDailyClimatologyPath("2026-08-01", "2026-08-15")).toBe(
      "/valores/climatologicos/diarios/datos/fechaini/2026-08-01T00:00:00UTC/fechafin/2026-08-15T00:00:00UTC/todasestaciones",
    );
    expect(() => aemetDailyClimatologyPath("01/08/2026", "2026-08-15")).toThrow(/ISO date/);
  });

  it("keeps only rows with usable station, date and rain values", () => {
    expect(normalizeAemetDailyRain([
      { indicativo: "0201D", fecha: "2026-08-15", prec: "23,4" },
      { indicativo: "0201D", fecha: "2026-08-16", prec: "Acum" },
      { indicativo: "", fecha: "2026-08-15", prec: "1,0" },
      null,
    ])).toEqual([{ stationId: "0201D", date: "2026-08-15", precipitationMm: 23.4 }]);
  });

  it("keeps only stations with parseable coordinates", () => {
    expect(normalizeAemetStations([
      { indicativo: "0201D", nombre: "BARCELONA", latitud: "412342N", longitud: "0021342E" },
      { indicativo: "0202X", nombre: "BROKEN", latitud: "banana", longitud: "0021342E" },
    ])).toEqual([{
      stationId: "0201D",
      name: "BARCELONA",
      latitude: expect.closeTo(41.395, 2),
      longitude: expect.closeTo(2.228, 2),
    }]);
  });
});
