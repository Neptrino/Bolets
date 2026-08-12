import { beforeEach, describe, expect, it, vi } from "vitest";

const habitatMocks = vi.hoisted(() => ({
  getPotentialHabitatCells: vi.fn(),
  getPotentialHabitatCoverage: vi.fn(),
}));

vi.mock("@/src/lib/habitat", () => habitatMocks);

import { GET } from "@/app/api/habitat/route";

describe("habitat API bounds", () => {
  beforeEach(() => {
    habitatMocks.getPotentialHabitatCells.mockReset();
    habitatMocks.getPotentialHabitatCoverage.mockReset();
  });

  it("rejects unknown species", async () => {
    const response = await GET(new Request("http://localhost/api/habitat?species=unknown&west=0&south=40&east=3&north=43"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Unknown species" });
  });

  it("rejects requests with a missing coordinate", async () => {
    const response = await GET(new Request("http://localhost/api/habitat?species=boletus-edulis&south=40.48&east=3.32&north=42.92"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid or excessive bounding box" });
  });

  it("rejects unsupported map resolutions", async () => {
    const response = await GET(new Request("http://localhost/api/habitat?species=boletus-edulis&west=1&south=41&east=2&north=42&resolution=750"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid map resolution" });
  });

  it("does not make the map wait for optional occurrence evidence", async () => {
    habitatMocks.getPotentialHabitatCoverage.mockResolvedValue({
      cells: [{
        speciesId: "boletus-edulis",
        cellId: "epsg25831:5000:90:936",
        regionId: "pirineus",
        gridSizeM: 5000,
        cellBounds: [[1.1, 41.1], [1.15, 41.15]],
        coverage: 0.62,
        altitudeWeightedCoverage: 0.54,
        eligibleCellCount: 248,
        sourceResolutionM: 250,
        confidence: "high",
        source: ["ICGC", "SoilGrids"],
      }],
      truncated: false,
      modelVersion: "habitat-test",
    });

    const response = await GET(new Request(
      "http://localhost/api/habitat?species=boletus-edulis&west=1&south=41&east=2&north=42&resolution=5000&view=map",
    ));

    expect(response.status).toBe(200);
    expect(habitatMocks.getPotentialHabitatCoverage).toHaveBeenCalledOnce();
    expect(habitatMocks.getPotentialHabitatCells).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      cells: [{
        cellId: "epsg25831:5000:90:936",
        coverage: 0.62,
        altitudeWeightedCoverage: 0.54,
      }],
      truncated: false,
    });
  });
});
