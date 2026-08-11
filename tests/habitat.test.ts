import { afterEach, describe, expect, it, vi } from "vitest";
import { getSpecies, speciesProfiles } from "@/data/species";
import { assessPotentialHabitat, getPotentialHabitatCells, habitatForestTerms } from "@/src/lib/habitat";

const boletusEdulis = getSpecies("boletus-edulis")!;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("potential habitat", () => {
  it("requires compatible forest, altitude, and soil pH for Boletus edulis", () => {
    const result = assessPotentialHabitat(boletusEdulis, {
      forestTypes: ["fagedes", "rouredes", "boscos de planifolis"],
      altitudeM: 1150,
      soilPh: 5.4
    });

    expect(result).toEqual({
      eligible: true,
      complete: true,
      gates: { forest: "compatible", altitude: "compatible", soilPh: "compatible" }
    });
  });

  it.each<{ values: { forestTypes: string[]; altitudeM: number; soilPh: number }; gate: "forest" | "altitude" | "soilPh" }>([
    { values: { forestTypes: ["prats"], altitudeM: 1150, soilPh: 5.4 }, gate: "forest" },
    { values: { forestTypes: ["fagedes"], altitudeM: 120, soilPh: 5.4 }, gate: "altitude" },
    { values: { forestTypes: ["fagedes"], altitudeM: 1150, soilPh: 7.8 }, gate: "soilPh" }
  ])("excludes a cell when the $gate gate is incompatible", ({ values, gate }) => {
    const result = assessPotentialHabitat(boletusEdulis, values);

    expect(result.eligible).toBe(false);
    expect(result.gates[gate]).toBe("incompatible");
  });

  it("withholds cells with missing required static evidence", () => {
    const result = assessPotentialHabitat(boletusEdulis, {
      forestTypes: ["fagedes"],
      altitudeM: 1150
    });

    expect(result).toMatchObject({ eligible: false, complete: false });
    expect(result.gates.soilPh).toBe("unknown");
  });

  it("derives exact ICGC habitat labels from the versioned forest profile", () => {
    expect(habitatForestTerms(boletusEdulis)).toEqual(expect.arrayContaining([
      "fagedes", "avetanoses", "rouredes", "pinedes", "pinedes de muntanya"
    ]));
  });

  it("derives land-cover gates for every configured species", () => {
    for (const species of speciesProfiles) {
      expect(habitatForestTerms(species), species.speciesId).not.toHaveLength(0);
    }
  });

  it("returns FungaCAT support as a separate 10 km evidence layer", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("read-occurrence-support")) {
        return Response.json({
          speciesId: "boletus-edulis",
          truncated: false,
          bounds: { west: 1, south: 41, east: 2, north: 42 },
          cells: [{
            cellId: "epsg25831:10000:45:468",
            gridSizeM: 10000,
            bounds: [[1.1, 41.1], [1.2, 41.2]],
            recordCount: 8,
            observedYearMin: 1982,
            observedYearMax: 2021,
            observedMonths: [9, 10],
            sources: [{
              sourceId: "fungacat-gbif",
              title: "FungaCAT",
              datasetKey: "8583f4f6-f762-11e1-a439-00145eb45e9a",
              doi: "10.15468/ttivpp",
              licenseUrl: "https://creativecommons.org/licenses/by-nc/4.0/",
              sourceUrl: "https://www.gbif.org/dataset/8583f4f6-f762-11e1-a439-00145eb45e9a",
              lastSyncedAt: "2026-08-11T15:00:00Z"
            }]
          }]
        });
      }
      return Response.json({
        cells: [{
          cellId: "epsg25831:5000:90:936",
          regionId: "catalunya-central",
          gridSizeM: 5000,
          bounds: [[1.1, 41.1], [1.15, 41.15]],
          coverage: 0.62,
          eligibleCellCount: 248,
          sourceResolutionM: 250,
          confidence: "high",
          source: ["ICGC", "SoilGrids"]
        }],
        truncated: false,
        bounds: { west: 1, south: 41, east: 2, north: 42 },
        resolution: 5000
      });
    }));

    const result = await getPotentialHabitatCells("boletus-edulis", { west: 1, south: 41, east: 2, north: 42 });

    expect(result.cells).toHaveLength(1);
    expect(result.occurrenceEvidence).toMatchObject({
      available: true,
      cells: [{ supportCellId: "epsg25831:10000:45:468", gridSizeM: 10000, recordCount: 8 }]
    });
  });

  it("keeps modeled habitat available when occurrence evidence is unavailable", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => String(input).includes("read-occurrence-support")
      ? new Response(null, { status: 503 })
      : Response.json({
        cells: [{
          cellId: "epsg25831:5000:90:936",
          regionId: "catalunya-central",
          gridSizeM: 5000,
          bounds: [[1.1, 41.1], [1.15, 41.15]],
          coverage: 0.62,
          eligibleCellCount: 248,
          sourceResolutionM: 250,
          confidence: "high",
          source: ["ICGC", "SoilGrids"]
        }],
        truncated: false,
        bounds: { west: 1, south: 41, east: 2, north: 42 },
        resolution: 5000
      })));

    const result = await getPotentialHabitatCells("boletus-edulis", { west: 1, south: 41, east: 2, north: 42 });

    expect(result.cells).toHaveLength(1);
    expect(result.occurrenceEvidence).toEqual({ available: false, cells: [] });
  });
});
