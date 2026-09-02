import { describe, expect, it } from "vitest";
import {
  predictionTimelineLabel,
  predictionTimelinePosition,
} from "@/components/prediction-timeline-control";

describe("prediction map timeline labels", () => {
  it("distinguishes observed, current, and forecast frames", () => {
    expect(predictionTimelineLabel(-1)).toEqual({ phase: "Evolució", detail: "Fa 1 dia" });
    expect(predictionTimelineLabel(-3)).toEqual({ phase: "Evolució", detail: "Fa 3 dies" });
    expect(predictionTimelineLabel(0)).toEqual({ phase: "Avui", detail: "Condicions observades" });
    expect(predictionTimelineLabel(1)).toEqual({ phase: "Previsió", detail: "Demà" });
    expect(predictionTimelineLabel(5)).toEqual({ phase: "Previsió", detail: "D'aquí 5 dies" });
  });

  it("positions today from the current timeline bounds", () => {
    expect(predictionTimelinePosition(-3)).toBe(0);
    expect(predictionTimelinePosition(0)).toBe(37.5);
    expect(predictionTimelinePosition(5)).toBe(100);
  });
});
