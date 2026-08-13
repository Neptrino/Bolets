import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPredictionCellHistory } = vi.hoisted(() => ({
  getPredictionCellHistory: vi.fn(),
}));

vi.mock("@/src/lib/predictions", () => ({ getPredictionCellHistory }));

import { POST } from "@/app/api/predictions/history/route";

function request(speciesId = "boletus-edulis") {
  return new Request("http://localhost/api/predictions/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      speciesId,
      cellId: "epsg25831:2500:1:1",
      gridSizeM: 2500,
      regionId: "pirineus",
      values: { altitudeM: 1200, forestCompatibility: 100, soilCompatibility: 100 },
    }),
  });
}

describe("prediction history and forecast route", () => {
  beforeEach(() => {
    getPredictionCellHistory.mockReset();
  });

  it("returns structurally separate observed and projected values with cache policy", async () => {
    const timeline = {
      observed: [{ observedAt: "2026-10-10T12:00:00Z", score: 64 }],
      forecast: {
        generatedAt: "2026-10-10T13:00:00Z",
        calibratedAt: "2026-10-10T12:00:00Z",
        correctionMethod: "observed-anomaly-v1" as const,
        anchor: { observedAt: "2026-10-10T12:00:00Z", score: 64 },
        source: ["ECMWF IFS HRES via Open-Meteo"],
        sourceResolutionM: 9000,
        points: [1, 2, 3, 4, 5].map((horizonDays) => ({
          validAt: new Date(Date.parse("2026-10-10T12:00:00Z") + horizonDays * 86_400_000).toISOString(),
          score: 68 + horizonDays * 2,
          horizonDays,
          horizonConfidence: horizonDays === 1 ? "high" : horizonDays <= 3 ? "moderate" : "limited",
        })),
      },
    };
    getPredictionCellHistory.mockResolvedValue(timeline);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    await expect(response.json()).resolves.toEqual(timeline);
    expect(timeline.forecast.points).toHaveLength(5);
    expect(getPredictionCellHistory).toHaveBeenCalledWith("boletus-edulis", expect.objectContaining({
      cellId: "epsg25831:2500:1:1",
      gridSizeM: 2500,
    }));
  });

  it("keeps history available when the forecast is unavailable", async () => {
    getPredictionCellHistory.mockResolvedValue({
      observed: [{ observedAt: "2026-10-10T12:00:00Z", score: 64 }],
      forecast: null,
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ forecast: null });
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
