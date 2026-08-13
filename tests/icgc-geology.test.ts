import { describe, expect, it } from "vitest";
import {
  classifyGeologicalUnit,
  descriptionFingerprint,
  loadGeologyMapping,
  mappingFingerprint,
  packGeologyCoverages,
  packGeologySampleCounts,
  parseGeoPackagePolygon,
  polygonContainsPoint,
  summarizeGeologySamples,
  unpackGeologyCoverages,
} from "../scripts/lib/icgc-geology.mjs";

describe("ICGC geology mapping", () => {
  it("is exhaustive, stable and self-fingerprinting", async () => {
    const path = new URL("../data/geology/icgc-geology-50k-units.json", import.meta.url);
    const mapping = await loadGeologyMapping(path.pathname);
    expect(mapping.units).toHaveLength(1055);
    expect(new Set(mapping.units.map((unit) => unit.unitId)).size).toBe(1055);
    expect(new Set(mapping.units.map((unit) => unit.code)).size).toBe(1055);
    expect(mapping.audit.mappingFingerprint).toBe(mappingFingerprint(mapping.units));
    expect(mapping.units.every((unit) => unit.descriptionFingerprint === descriptionFingerprint(unit.description))).toBe(true);
  });

  it("uses conservative generation rules and preserves unknown", () => {
    expect(classifyGeologicalUnit("Granodiorites i granits alcalins", "Carbonífer-Permià")).toBe("silicic");
    expect(classifyGeologicalUnit("Calcàries i dolomies", "Juràssic")).toBe("calcareous");
    expect(classifyGeologicalUnit("Pissarres i calcàries", "Devonià")).toBe("mixed");
    expect(classifyGeologicalUnit("Graves i sorres. Terrassa fluvial", "Quaternari")).toBe("unconsolidated");
    expect(classifyGeologicalUnit("Gresos i lutites", "Cretaci")).toBe("unknown");
  });
});

describe("compact geology coverage evidence", () => {
  it("round-trips four independent 7-bit percentage lanes", () => {
    const coverages = { silicic: 52, calcareous: 20, mixed: 4, unconsolidated: 24 };
    const packed = packGeologyCoverages(coverages);
    expect(packed).toBeGreaterThan(0);
    expect(unpackGeologyCoverages(packed)).toEqual(coverages);
    expect(() => packGeologyCoverages({ ...coverages, mixed: 5 })).toThrow(/exceed/);
    const thirds = packGeologySampleCounts({ silicic: 1, calcareous: 1, mixed: 1 }, 3);
    expect(Object.values(thirds.coverages).reduce((total, value) => total + value, 0)).toBe(100);
  });

  it("keeps mapped unknown separate from the four classified lanes", () => {
    const units = new Map<number, { unitId: number; substrateClass: "silicic" | "unknown" }>([
      [1, { unitId: 1, substrateClass: "silicic" }],
      [2, { unitId: 2, substrateClass: "unknown" }],
    ]);
    const evidence = summarizeGeologySamples([...Array(13).fill(1), ...Array(7).fill(2), ...Array(5).fill(undefined)], units);
    expect(evidence.mappedCoveragePercent).toBe(80);
    expect(evidence.coverages).toEqual({ silicic: 52, calcareous: 0, mixed: 0, unconsolidated: 0 });
    expect(evidence.dominantUnitId).toBe(1);
    expect(evidence.dominantUnitCoveragePercent).toBe(52);
    const narrowSliver = summarizeGeologySamples([1, ...Array(624).fill(undefined)], units, 625);
    expect(narrowSliver.mappedCoveragePercent).toBe(1);
    expect(narrowSliver.coverages.silicic).toBe(1);
    expect(narrowSliver.dominantUnitCoveragePercent).toBe(1);
  });
});

describe("GeoPackage polygon reader", () => {
  it("reads a little-endian GeoPackage polygon and honours holes", async () => {
    const polygonWkb = Buffer.alloc(1 + 4 + 4 + (4 + 5 * 16) * 2);
    let offset = 0;
    polygonWkb.writeUInt8(1, offset++);
    polygonWkb.writeUInt32LE(3, offset); offset += 4;
    polygonWkb.writeUInt32LE(2, offset); offset += 4;
    for (const ring of [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]],
    ]) {
      polygonWkb.writeUInt32LE(ring.length, offset); offset += 4;
      for (const [x, y] of ring) {
        polygonWkb.writeDoubleLE(x, offset); offset += 8;
        polygonWkb.writeDoubleLE(y, offset); offset += 8;
      }
    }
    const header = Buffer.alloc(8);
    header.write("GP", 0, "ascii");
    header.writeUInt8(0, 2);
    header.writeUInt8(1, 3);
    header.writeInt32LE(25831, 4);
    const polygons = parseGeoPackagePolygon(Buffer.concat([header, polygonWkb]).toString("hex"));
    expect(polygonContainsPoint(polygons, 2, 2)).toBe(true);
    expect(polygonContainsPoint(polygons, 5, 5)).toBe(false);
    expect(polygonContainsPoint(polygons, 20, 20)).toBe(false);
  });
});
