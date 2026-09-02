import { describe, expect, it } from "vitest";
import { predictionTimelineLabel } from "@/components/prediction-timeline-control";

describe("prediction map timeline labels", () => {
  it("distinguishes observed, current, and forecast frames", () => {
    expect(predictionTimelineLabel(-1)).toEqual({ phase: "Evolució", detail: "Fa 1 dia" });
    expect(predictionTimelineLabel(-6)).toEqual({ phase: "Evolució", detail: "Fa 6 dies" });
    expect(predictionTimelineLabel(0)).toEqual({ phase: "Avui", detail: "Condicions observades" });
    expect(predictionTimelineLabel(1)).toEqual({ phase: "Previsió", detail: "Demà" });
    expect(predictionTimelineLabel(5)).toEqual({ phase: "Previsió", detail: "D'aquí 5 dies" });
  });
});
