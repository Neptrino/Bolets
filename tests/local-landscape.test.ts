import { describe, expect, it } from "vitest";
import { localLandscapeParagraphs, summariseLocalLandscape } from "@/src/lib/local-landscape";

function cell(overrides: Partial<{ forestTypes: string[]; altitudeM: number; soilPh: number; soilTexture: string; habitatCoveragePercent: number; substrate: "silicic" | "calcareous" | "mixed" | "unconsolidated" | "unknown" }>) {
  const { substrate, ...values } = overrides;
  return { values: { forestTypes: ["fagedes", "rouredes"], altitudeM: 1000, soilPh: 6.3, soilTexture: "franca", habitatCoveragePercent: 40, ...values, geologicalSubstrate: substrate ? { class: substrate, dominantCoverage: 0.6, mappedCoverage: 1, sourceId: "icgc-geology-50k-v3" as const, mapScaleDenominator: 50000 as const } : undefined } };
}

const window = [
  ...Array.from({ length: 30 }, (_, index) => cell({ altitudeM: 800 + index * 30, forestTypes: ["fagedes", "rouredes", "prats"], substrate: "mixed" })),
  ...Array.from({ length: 15 }, (_, index) => cell({ altitudeM: 1500 + index * 20, forestTypes: ["pinedes", "boscos de coníferes"], habitatCoveragePercent: 0, substrate: "silicic" })),
  ...Array.from({ length: 5 }, () => cell({ forestTypes: [] })),
];

describe("local landscape", () => {
  it("reads forest presence, altitude band, soil and habitat share from the window cells", () => {
    const landscape = summariseLocalLandscape(window)!;
    expect(landscape.cellCount).toBe(50);
    expect(landscape.forests.map((forest) => forest.key)).toEqual(["planifolis", "coniferes"]);
    expect(landscape.forests[0].share).toBeCloseTo(30 / 45, 5);
    expect(landscape.openGroundShare).toBeCloseTo(30 / 45, 5);
    expect(landscape.altitude.low).toBeGreaterThanOrEqual(800);
    expect(landscape.altitude.high).toBeLessThanOrEqual(1800);
    expect(landscape.soil).toEqual({ phMedian: 6.3, texture: "franca", substrate: "mixed" });
    expect(landscape.habitatShare).toBeCloseTo(35 / 50, 5);
    expect(landscape.habitatAltitude?.high).toBeLessThan(landscape.altitude.high);
  });

  it("withholds the portrait when the window has too few mapped cells", () => {
    expect(summariseLocalLandscape(window.slice(0, 10))).toBeNull();
    expect(summariseLocalLandscape([])).toBeNull();
  });

  it("writes plain Catalan without model vocabulary", () => {
    const text = localLandscapeParagraphs(summariseLocalLandscape(window)!, { placeName: "Camprodon", speciesWithArticle: "el cep" }).join(" ");
    expect(text).toContain("Al voltant de Camprodon hi ha fagedes i rouredes");
    expect(text).toContain("pinedes");
    expect(text).toContain("pH 6,3");
    expect(text).toContain("Per al cep");
    expect(text).not.toMatch(/sector|cel·la|cobertura/i);
  });
});
