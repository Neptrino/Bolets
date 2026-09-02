import { beforeEach, describe, expect, it, vi } from "vitest";

const predictionMocks = vi.hoisted(() => ({
  getPredictionCells: vi.fn(),
}));

const globalPredictionMocks = vi.hoisted(() => ({
  getGlobalPredictionCells: vi.fn(),
  getGlobalCellRanking: vi.fn(),
}));

const timelineMocks = vi.hoisted(() => ({
  getPredictionMapTimelineFrame: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (callback: (...args: never[]) => unknown) => callback,
}));
vi.mock("@/src/lib/predictions", () => predictionMocks);
vi.mock("@/src/lib/global-predictions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/lib/global-predictions")>()),
  ...globalPredictionMocks,
}));
vi.mock("@/src/lib/prediction-map-timeline", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/lib/prediction-map-timeline")>()),
  ...timelineMocks,
}));

import { GET } from "@/app/api/predictions/route";

describe("prediction API bounds", () => {
  beforeEach(() => {
    predictionMocks.getPredictionCells.mockReset();
    globalPredictionMocks.getGlobalPredictionCells.mockReset();
    globalPredictionMocks.getGlobalCellRanking.mockReset();
    timelineMocks.getPredictionMapTimelineFrame.mockReset();
  });

  it("rejects requests with a missing coordinate", async () => {
    const response = await GET(new Request("http://localhost/api/predictions?species=boletus-edulis&south=40.48&east=3.32&north=42.92"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid or excessive bounding box" });
  });

  it("rejects excessive map extents", async () => {
    const response = await GET(new Request("http://localhost/api/predictions?species=boletus-edulis&west=-1&south=39&east=5&north=44"));

    expect(response.status).toBe(400);
  });

  it("rejects unsupported map resolutions", async () => {
    const response = await GET(new Request("http://localhost/api/predictions?species=boletus-edulis&west=1&south=41&east=2&north=42&resolution=750"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid map resolution" });
  });

  it.each([-4, 6])("rejects unsupported timeline offset %s", async (offset) => {
    const response = await GET(new Request(
      `http://localhost/api/predictions?species=all&west=1&south=41&east=1.1&north=41.1&resolution=5000&time=${offset}`,
    ));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid prediction timeline offset" });
  });

  it("serves a cacheable combined-map forecast frame", async () => {
    timelineMocks.getPredictionMapTimelineFrame.mockResolvedValue({
      cells: [{ cellId: "frame-cell", score: 58 }],
      truncated: false,
    });
    const response = await GET(new Request(
      "http://localhost/api/predictions?species=all&view=map&west=1&south=41&east=1.1&north=41.1&resolution=5000&time=3",
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    );
    await expect(response.json()).resolves.toMatchObject({
      cells: [{ cellId: "frame-cell", score: 58 }],
    });
    expect(timelineMocks.getPredictionMapTimelineFrame).toHaveBeenCalledWith(
      "all",
      { west: 1, south: 41, east: 1.1, north: 41.1 },
      1000,
      5000,
      3,
    );
  });

  it("does not expose internal model versions", async () => {
    predictionMocks.getPredictionCells.mockResolvedValue({
      cells: [{
        cellId: "epsg25831:5000:90:936",
        score: 72,
        modelVersion: "internal-model-version",
      }],
      truncated: false,
    });

    const response = await GET(new Request(
      "http://localhost/api/predictions?species=boletus-edulis&west=1&south=41&east=1.1&north=41.1&resolution=5000",
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cells[0]).toMatchObject({
      cellId: "epsg25831:5000:90:936",
      score: 72,
    });
    expect(body.cells[0]).not.toHaveProperty("modelVersion");
  });

  it("serves the combined map for species=all", async () => {
    globalPredictionMocks.getGlobalPredictionCells.mockResolvedValue({
      cells: [{
        cellId: "epsg25831:5000:90:936",
        gridSizeM: 5000,
        cellBounds: [[1.1, 41.1], [1.15, 41.15]],
        score: 64,
        habitatCoverage: 0.4,
        topSpeciesId: "boletus-edulis",
      }],
      truncated: false,
    });

    const response = await GET(new Request(
      "http://localhost/api/predictions?species=all&view=map&west=1&south=41&east=1.1&north=41.1&resolution=5000",
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=600",
    );
    expect(body.cells[0]).toMatchObject({ score: 64, topSpeciesId: "boletus-edulis" });
    expect(globalPredictionMocks.getGlobalPredictionCells).toHaveBeenCalledWith(
      { west: 1, south: 41, east: 1.1, north: 41.1 },
      1000,
      5000,
    );
    expect(predictionMocks.getPredictionCells).not.toHaveBeenCalled();
  });

  it("rejects the 250 m resolution for the combined map", async () => {
    const response = await GET(new Request(
      "http://localhost/api/predictions?species=all&west=1&south=41&east=1.01&north=41.01&resolution=250",
    ));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "The combined map requires a resolution of 1 km or coarser",
    });
    expect(globalPredictionMocks.getGlobalPredictionCells).not.toHaveBeenCalled();
  });

  it("returns the top-species ranking and detail cell for a combined cell", async () => {
    globalPredictionMocks.getGlobalCellRanking.mockResolvedValue({
      mapCell: {
        cellId: "epsg25831:5000:90:936",
        gridSizeM: 5000,
        cellBounds: [[1.1, 41.1], [1.15, 41.15]],
        score: 64,
        habitatCoverage: 0.4,
        topSpeciesId: "boletus-edulis",
      },
      ranking: [
        { speciesId: "boletus-edulis", score: 64, fruitingConditionsScore: 80, effectiveHabitatCoverage: 0.4 },
        { speciesId: "lactarius-deliciosus", score: 31, fruitingConditionsScore: 70, effectiveHabitatCoverage: 0.2 },
        { speciesId: "hydnum-repandum", score: 22, fruitingConditionsScore: 60, effectiveHabitatCoverage: 0.15 },
        { speciesId: "macrolepiota-procera", score: 9, fruitingConditionsScore: 40, effectiveHabitatCoverage: 0.1 },
      ],
    });
    predictionMocks.getPredictionCells.mockResolvedValue({
      cells: [{
        cellId: "epsg25831:5000:90:936",
        score: 64,
        modelVersion: "internal-model-version",
      }],
      truncated: false,
    });

    const response = await GET(new Request(
      "http://localhost/api/predictions?species=all&west=1&south=41&east=1.1&north=41.1&resolution=5000&cell=epsg25831:5000:90:936",
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cell).toMatchObject({ cellId: "epsg25831:5000:90:936", score: 64 });
    expect(body.cell).not.toHaveProperty("modelVersion");
    expect(body.topSpecies).toHaveLength(4);
    expect(body.topSpecies[0].speciesId).toBe("boletus-edulis");
    expect(body.score).toBe(64);
    expect(predictionMocks.getPredictionCells).toHaveBeenCalledWith(
      "boletus-edulis",
      { west: 1, south: 41, east: 1.1, north: 41.1 },
      16,
      5000,
      false,
    );
  });

  it("bounds the combined ranking payload at eight species", async () => {
    const ranking = Array.from({ length: 12 }, (_, index) => ({
      speciesId: `species-${index}`,
      score: 90 - index,
      fruitingConditionsScore: 90 - index,
      effectiveHabitatCoverage: 0.5,
    }));
    globalPredictionMocks.getGlobalCellRanking.mockResolvedValue({
      mapCell: {
        cellId: "epsg25831:5000:90:936",
        gridSizeM: 5000,
        cellBounds: [[1.1, 41.1], [1.15, 41.15]],
        score: 90,
        habitatCoverage: 0.5,
        topSpeciesId: "species-0",
      },
      ranking,
    });
    predictionMocks.getPredictionCells.mockResolvedValue({ cells: [], truncated: false });

    const response = await GET(new Request(
      "http://localhost/api/predictions?species=all&west=1&south=41&east=1.1&north=41.1&resolution=5000&cell=epsg25831:5000:90:936",
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.topSpecies).toHaveLength(8);
    expect(body.topSpecies.at(-1).speciesId).toBe("species-7");
  });

  it("returns an empty detail payload for a withheld combined cell", async () => {
    globalPredictionMocks.getGlobalCellRanking.mockResolvedValue({
      mapCell: {
        cellId: "epsg25831:5000:90:936",
        gridSizeM: 5000,
        cellBounds: [[1.1, 41.1], [1.15, 41.15]],
        score: null,
        habitatCoverage: null,
        topSpeciesId: null,
      },
      ranking: [],
    });

    const response = await GET(new Request(
      "http://localhost/api/predictions?species=all&west=1&south=41&east=1.1&north=41.1&resolution=5000&cell=epsg25831:5000:90:936",
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ cell: null, topSpecies: [], score: null });
    expect(predictionMocks.getPredictionCells).not.toHaveBeenCalled();
  });
});
