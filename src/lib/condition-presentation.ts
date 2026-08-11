import type { SuitabilityResult } from "@/src/lib/types";

export type ConditionPredictionStatus =
  | { kind: "available"; label: SuitabilityResult["label"] }
  | { kind: "score-withheld"; label: "puntuació no disponible" }
  | { kind: "environment-unavailable"; label: "sense dades" };

export function getConditionPredictionStatus(
  stale: boolean,
  result: Pick<SuitabilityResult, "score" | "label">,
): ConditionPredictionStatus {
  if (stale) {
    return { kind: "environment-unavailable", label: "sense dades" };
  }

  if (result.score === null) {
    return { kind: "score-withheld", label: "puntuació no disponible" };
  }

  return { kind: "available", label: result.label };
}
