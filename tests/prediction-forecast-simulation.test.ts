import { describe, expect, it } from "vitest";
import {
  developmentForecastSimulation,
  developmentTimelineSimulation,
} from "@/src/lib/prediction-forecast-simulation";
import type { PredictionCellTimeline } from "@/src/lib/types";

const timeline: PredictionCellTimeline = {
  modelVersion: "test-model",
  observed: [
    {
      observedAt: "2026-08-29T12:00:00.000Z",
      score: 42,
      fruitingConditionsScore: 58,
      opportunityIndex: 42,
    },
    {
      observedAt: "2026-08-30T12:00:00.000Z",
      score: 46,
      fruitingConditionsScore: 62,
      opportunityIndex: 46,
    },
  ],
  forecast: null,
};

describe("development forecast simulation", () => {
  it("creates a deterministic and explicitly fictitious five-day projection", () => {
    const options = {
      environment: { NODE_ENV: "development" },
      generatedAt: "2026-08-31T12:00:00.000Z",
    };
    const first = developmentForecastSimulation(timeline, "cep:test-cell", options);
    const second = developmentForecastSimulation(timeline, "cep:test-cell", options);

    expect(first).toEqual(second);
    expect(first.simulated).toBe(true);
    expect(first.timeline.forecast).toMatchObject({
      simulated: true,
      correctionMethod: "development-simulation-v1",
      source: ["Simulació local · dades fictícies"],
      sourceResolutionM: 0,
      anchor: timeline.observed[1],
    });
    expect(first.timeline.forecast?.points).toHaveLength(5);
    expect(first.timeline.forecast?.points.map((point) => point.horizonDays)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(first.timeline.forecast?.points.every((point) =>
      point.horizonConfidence === "limited"
    )).toBe(true);
  });

  it("never replaces production or a real forecast", () => {
    expect(developmentForecastSimulation(
      timeline,
      "cep:test-cell",
      { environment: { NODE_ENV: "production" } },
    )).toEqual({ timeline, simulated: false });

    const development = developmentForecastSimulation(
      timeline,
      "cep:test-cell",
      {
        environment: { NODE_ENV: "development" },
        generatedAt: "2026-08-31T12:00:00.000Z",
      },
    );
    expect(developmentForecastSimulation(
      development.timeline,
      "cep:test-cell",
      { environment: { NODE_ENV: "development" } },
    )).toEqual({ timeline: development.timeline, simulated: false });
  });

  it("creates seven fictitious historical points when local history is unavailable", () => {
    const simulated = developmentTimelineSimulation(
      {
        observedAt: "2026-08-31T12:00:00.000Z",
        score: 58,
        fruitingConditionsScore: 71,
        opportunityIndex: 58,
      },
      "test-model",
      "cep:missing-history",
      {
        environment: { NODE_ENV: "development" },
        generatedAt: "2026-08-31T12:00:00.000Z",
      },
    );

    expect(simulated?.simulated).toBe(true);
    expect(simulated?.timeline.simulated).toBe(true);
    expect(simulated?.timeline.observed).toHaveLength(7);
    expect(simulated?.timeline.observed.at(-1)).toMatchObject({
      score: 58,
      fruitingConditionsScore: 71,
      opportunityIndex: 58,
    });
    expect(simulated?.timeline.forecast?.points).toHaveLength(5);
  });
});
