import { describe, expect, it } from "vitest";
import { rainfallRaster, type RainfallMapCell } from "@/components/region-map/rainfall-raster";
import { rainMapReadBounds, RAIN_MAP_GRID_SIZE_M } from "@/src/lib/rain-map";
import {
  rainfallHeadline,
  rankTerritoryRainfall,
  summariseTerritoryRainfall,
  TERRITORY_WET_THRESHOLD_MM,
  type RainfallCellReading,
} from "@/src/lib/rain-overview";
import {
  formatDays,
  formatMillimetres,
  getRainfallBand,
  RAINFALL_CEILING_MM,
  rainfallColour,
  rainfallScale,
} from "@/src/lib/rainfall-scale";
import { cataloniaSpatialBounds } from "@/data/regions";

describe("rainfall scale", () => {
  it("names the band a measurement falls in", () => {
    expect(getRainfallBand(0).id).toBe("dry");
    expect(getRainfallBand(1.9).id).toBe("dry");
    expect(getRainfallBand(2).id).toBe("trace");
    expect(getRainfallBand(19.9).id).toBe("moderate");
    expect(getRainfallBand(20).id).toBe("wet");
    expect(getRainfallBand(400).id).toBe("soaked");
  });

  it("darkens monotonically as rain increases", () => {
    let previous = Number.POSITIVE_INFINITY;
    for (let millimetres = 2; millimetres <= RAINFALL_CEILING_MM; millimetres += 1) {
      const { red, green, blue } = rainfallColour(millimetres);
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      expect(luminance, `${millimetres} mm`).toBeLessThanOrEqual(previous + 0.001);
      previous = luminance;
    }
  });

  it("keeps one hue: blue stays the strongest channel in every band", () => {
    for (const band of rainfallScale.filter((entry) => entry.id !== "dry")) {
      const { red, green, blue } = rainfallColour(band.minimumMm);
      expect(blue, band.id).toBeGreaterThan(red);
      expect(blue, band.id).toBeGreaterThan(green);
    }
  });

  it("clamps beyond the ceiling instead of inventing a darker step", () => {
    expect(rainfallColour(RAINFALL_CEILING_MM)).toEqual(rainfallColour(RAINFALL_CEILING_MM + 500));
  });

  it("formats measurements in Catalan, and withheld ones as a dash", () => {
    expect(formatMillimetres(12.34)).toBe("12,3 mm");
    expect(formatMillimetres(undefined)).toBe("—");
    expect(formatDays(1)).toBe("1 dia");
    expect(formatDays(3.4)).toBe("3 dies");
    expect(formatDays(undefined)).toBe("—");
  });
});

describe("rain map framing", () => {
  it("covers Catalonia in two adjoining halves", () => {
    const [west, east] = rainMapReadBounds();
    expect(west.west).toBe(cataloniaSpatialBounds.west);
    expect(east.east).toBe(cataloniaSpatialBounds.east);
    expect(west.east).toBe(east.west);
    expect(west.south).toBe(cataloniaSpatialBounds.south);
    expect(east.north).toBe(cataloniaSpatialBounds.north);
  });

  it("paints wet ground and leaves dry ground unpainted", () => {
    const projection = {
      // A window around the sample cells, so they land inside the raster.
      project: ([longitude, latitude]: [number, number]) => ({
        x: (longitude - 1) * 4000,
        y: (41.7 - latitude) * 4000,
      }),
    };
    const cell = (cellId: string, longitude: number, rainfallMm: number | null): RainfallMapCell => ({
      cellId,
      gridSizeM: RAIN_MAP_GRID_SIZE_M,
      cellBounds: [[longitude, 41.6], [longitude + 0.06, 41.65]],
      rainfallMm,
    });
    const paintedPixels = (rainfallMm: number | null) => {
      const raster = rainfallRaster(projection, [
        cell("a", 1.0, rainfallMm),
        cell("b", 1.03, rainfallMm),
      ], 400, 400);
      if (!raster) return { painted: 0, strongest: 0 };
      let painted = 0;
      let strongest = 0;
      for (let index = 3; index < raster.pixels.length; index += 4) {
        const alpha = raster.pixels[index];
        if (alpha > 0) painted += 1;
        if (alpha > strongest) strongest = alpha;
      }
      return { painted, strongest };
    };

    const wet = paintedPixels(60);
    const dry = paintedPixels(0);
    expect(wet.painted).toBeGreaterThan(0);
    expect(wet.strongest).toBeGreaterThan(150);
    expect(dry.painted).toBe(0);
  });

  it("returns nothing when every reading is withheld", () => {
    const projection = { project: () => ({ x: 0, y: 0 }) };
    const withheld: RainfallMapCell = {
      cellId: "withheld",
      gridSizeM: RAIN_MAP_GRID_SIZE_M,
      cellBounds: [[1, 41.6], [1.06, 41.65]],
      rainfallMm: null,
    };
    expect(rainfallRaster(projection, [withheld], 100, 100)).toBeNull();
  });
});

describe("territorial rain readings", () => {
  const territory = {
    slug: "provaria",
    name: "Provària",
    typeLabel: "massís",
    prepositionalName: "a la Provària",
    path: "/zones/provaria",
    bounds: { west: 1, south: 41.5, east: 2, north: 42 },
  };
  const cells: RainfallCellReading[] = [
    { cellId: "in-1", centre: [1.2, 41.7], rainfall7dMm: 30, rainfall14dMm: 44, rainfallDays7d: 3, drySpellDays: 0 },
    { cellId: "in-2", centre: [1.8, 41.9], rainfall7dMm: 10, rainfall14dMm: 16, rainfallDays7d: 1, drySpellDays: 2 },
    { cellId: "outside", centre: [2.6, 41.7], rainfall7dMm: 90, rainfall14dMm: 120, rainfallDays7d: 6, drySpellDays: 0 },
  ];

  it("averages only the cells inside the territory window", () => {
    const reading = summariseTerritoryRainfall(territory, cells);
    expect(reading.cellCount).toBe(2);
    expect(reading.meanRainfall7dMm).toBe(20);
    expect(reading.maxRainfall7dMm).toBe(30);
    expect(reading.meanRainfall14dMm).toBe(30);
    expect(reading.meanRainfallDays7d).toBe(2);
    expect(reading.meanDrySpellDays).toBe(1);
  });

  it("withholds an average instead of reporting zero when nothing was measured", () => {
    const reading = summariseTerritoryRainfall(territory, [
      { cellId: "in", centre: [1.5, 41.7] },
    ]);
    expect(reading.cellCount).toBe(1);
    expect(reading.meanRainfall7dMm).toBeUndefined();
    expect(reading.maxRainfall7dMm).toBeUndefined();
  });

  it("ranks wettest first and drops territories with no cells", () => {
    const wetter = { ...territory, slug: "molla", name: "Mollada", bounds: { west: 2.5, south: 41.5, east: 3, north: 42 } };
    const empty = { ...territory, slug: "buida", name: "Buida", bounds: { west: 10, south: 10, east: 11, north: 11 } };
    const ranked = rankTerritoryRainfall([territory, empty, wetter], cells);
    expect(ranked.map((reading) => reading.slug)).toEqual(["molla", "provaria"]);
    expect(ranked.every((reading) => reading.cellCount > 0)).toBe(true);
  });

  it("summarises the country and lists only territories over the wet threshold", () => {
    const ranked = rankTerritoryRainfall([territory], cells);
    const headline = rainfallHeadline(ranked, cells);
    expect(headline.countryMax7dMm).toBe(90);
    expect(headline.countryMean7dMm).toBeCloseTo((30 + 10 + 90) / 3, 5);
    expect(headline.wettest).toHaveLength(1);
    expect(headline.wettest[0].meanRainfall7dMm).toBeGreaterThanOrEqual(TERRITORY_WET_THRESHOLD_MM);
  });
});
