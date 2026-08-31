import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConditionSnapshot, PredictionCellTimeline } from "@/src/lib/types";

const { getPredictionCellHistory } = vi.hoisted(() => ({
  getPredictionCellHistory: vi.fn(),
}));

vi.mock("@/src/lib/predictions", () => ({ getPredictionCellHistory }));

import { POST } from "@/app/api/predictions/history/route";

const requestValues = {
  altitudeM: 1200,
  habitatAltitudeSuitability: 100,
  habitatCoveragePercent: 60,
  soilTexture: "Franca",
  soilMoistureAvg7d: 0.24,
  soilMoistureMin7d: 0.225,
  temperatureAvg7dC: 13,
  relativeHumidityAvg7d: 90,
  drySpellDays: 0,
  rainfall7dMm: 18,
  rainfallDays7d: 3,
  evapotranspiration7dMm: 8,
  rainfall14dMm: 32,
  rainfallDays14d: 5,
  evapotranspiration14dMm: 15,
  rainfall26dMm: 50,
  rainfallDays26d: 6,
  evapotranspiration26dMm: 22,
  temperatureAvg20dC: 13.5,
  frostHours20d: 0,
  heatHours20d: 0,
} satisfies ConditionSnapshot["values"];

function request(speciesId = "boletus-edulis") {
  return new Request("http://localhost/api/predictions/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      speciesId,
      cellId: "epsg25831:2500:1:1",
      gridSizeM: 2500,
      regionId: "pirineus",
      values: requestValues,
    }),
  });
}

describe("prediction history and forecast route", () => {
  beforeEach(() => {
    getPredictionCellHistory.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns structurally separate observed and projected values with cache policy", async () => {
    const timeline: PredictionCellTimeline = {
      modelVersion: "hydrothermal-v1-priors-2026-08+hydrothermal-v1",
      observed: [{
        observedAt: "2026-10-10T12:00:00Z",
        score: 38,
        fruitingConditionsScore: 64,
        opportunityIndex: 38,
      }],
      forecast: {
        generatedAt: "2026-10-10T13:00:00Z",
        calibratedAt: "2026-10-10T12:00:00Z",
        correctionMethod: "observed-anomaly-v1" as const,
        anchor: {
          observedAt: "2026-10-10T12:00:00Z",
          score: 38,
          fruitingConditionsScore: 64,
          opportunityIndex: 38,
        },
        source: ["ECMWF IFS HRES via Open-Meteo"],
        sourceResolutionM: 9000,
        points: [1, 2, 3, 4, 5].map((horizonDays) => {
          const fruitingConditionsScore = 68 + horizonDays * 2;
          const opportunityIndex = Math.round(fruitingConditionsScore * 0.6);
          return {
            validAt: new Date(Date.parse("2026-10-10T12:00:00Z") + horizonDays * 86_400_000).toISOString(),
            score: opportunityIndex,
            fruitingConditionsScore,
            opportunityIndex,
            horizonDays: horizonDays as 1 | 2 | 3 | 4 | 5,
            horizonConfidence: horizonDays === 1 ? "high" : horizonDays <= 3 ? "moderate" : "limited",
          };
        }),
      },
    };
    getPredictionCellHistory.mockResolvedValue(timeline);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    await expect(response.json()).resolves.toEqual(timeline);
    expect(timeline.forecast).not.toBeNull();
    const forecast = timeline.forecast!;
    expect(forecast.points).toHaveLength(5);
    expect(forecast.points.every((point) =>
      point.score === point.opportunityIndex &&
      point.fruitingConditionsScore !== null &&
      point.opportunityIndex !== null &&
      point.fruitingConditionsScore > point.opportunityIndex
    )).toBe(true);
    expect(getPredictionCellHistory).toHaveBeenCalledWith(
      "boletus-edulis",
      expect.objectContaining({
        cellId: "epsg25831:2500:1:1",
        gridSizeM: 2500,
        values: expect.objectContaining({ habitatCoveragePercent: 60 }),
      }),
    );
  });

  it("keeps history available when the forecast is unavailable", async () => {
    getPredictionCellHistory.mockResolvedValue({
      modelVersion: "hydrothermal-v1-priors-2026-08+hydrothermal-v1",
      observed: [{
        observedAt: "2026-10-10T12:00:00Z",
        score: 38,
        fruitingConditionsScore: 64,
        opportunityIndex: 38,
      }],
      forecast: null,
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ forecast: null });
  });

  it("simulates an uncached and labelled forecast only in local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    getPredictionCellHistory.mockResolvedValue({
      modelVersion: "hydrothermal-v1-priors-2026-08+hydrothermal-v1",
      observed: [{
        observedAt: "2026-10-10T12:00:00Z",
        score: 38,
        fruitingConditionsScore: 64,
        opportunityIndex: 38,
      }],
      forecast: null,
    });

    const response = await POST(request());
    const body = await response.json() as PredictionCellTimeline;

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.forecast).toMatchObject({
      simulated: true,
      correctionMethod: "development-simulation-v1",
      source: ["Simulació local · dades fictícies"],
    });
    expect(body.forecast?.points).toHaveLength(5);
  });

  it("simulates the full timeline when local history storage has no cell", async () => {
    vi.stubEnv("NODE_ENV", "development");
    getPredictionCellHistory.mockRejectedValue(
      new Error("Spatial environment history returned 404"),
    );

    const response = await POST(request());
    const body = await response.json() as PredictionCellTimeline;

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.simulated).toBe(true);
    expect(body.observed).toHaveLength(7);
    expect(body.forecast?.simulated).toBe(true);
    expect(body.forecast?.points).toHaveLength(5);
  });

  it("rejects invalid and habitat-only requests", async () => {
    const invalid = await POST(new Request("http://localhost/api/predictions/history", {
      method: "POST",
      body: "{}",
    }));
    expect(invalid.status).toBe(400);

    const habitatOnly = await POST(request("tuber-melanosporum"));
    expect(habitatOnly.status).toBe(422);
    expect(getPredictionCellHistory).not.toHaveBeenCalled();
  });

  it("returns a temporary failure without leaking provider details", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getPredictionCellHistory.mockRejectedValue(new Error("provider secret"));

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Prediction history is temporarily unavailable",
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
