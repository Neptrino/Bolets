import { describe, expect, it } from "vitest";
import { getConditionPredictionStatus } from "@/src/lib/condition-presentation";

describe("condition prediction presentation", () => {
  it("reserves no-data copy for unavailable environmental snapshots", () => {
    expect(
      getConditionPredictionStatus(true, {
        score: null,
        label: "sense dades",
      }),
    ).toEqual({ kind: "environment-unavailable", label: "sense dades" });
  });

  it("distinguishes a withheld score from missing weather data", () => {
    expect(
      getConditionPredictionStatus(false, {
        score: null,
        label: "sense dades",
      }),
    ).toEqual({
      kind: "score-withheld",
      label: "puntuació no disponible",
    });
  });

  it("preserves a published opportunity label", () => {
    expect(
      getConditionPredictionStatus(false, {
        score: 72,
        label: "alta",
      }),
    ).toEqual({ kind: "available", label: "alta" });
  });
});
