import type { ModelComponentId, SuitabilityResult } from "@/src/lib/types";

export type ConditionPredictionStatus =
  | { kind: "available"; label: SuitabilityResult["label"] }
  | { kind: "score-withheld"; label: "valoració no disponible" }
  | { kind: "environment-unavailable"; label: "sense dades" };

const publicFactorLabels: Record<ModelComponentId, string> = {
  habitatCoverage: "Bosc i sòl",
  altitude: "Altitud",
  phenology: "Temporada habitual",
  water: "Aigua disponible",
  temperature: "Temperatura",
  extremes: "Gelades i calor extrema",
};

const publicFactorLabelsBySource = new Map([
  ["Coberta d’hàbitat compatible", publicFactorLabels.habitatCoverage],
  ["Idoneïtat altitudinal dins l’hàbitat", publicFactorLabels.altitude],
  ["Fenologia", publicFactorLabels.phenology],
  ["Estat hídric unificat", publicFactorLabels.water],
  ["Resposta tèrmica", publicFactorLabels.temperature],
  ["Exposició a gelada i calor", publicFactorLabels.extremes],
]);

export function publicConditionFactorLabel(id: ModelComponentId) {
  return publicFactorLabels[id];
}

export function publicConditionFactorLabelFromSource(label: string) {
  return publicFactorLabelsBySource.get(label) ?? label;
}

export function getConditionPredictionStatus(
  stale: boolean,
  result: Pick<SuitabilityResult, "score" | "label">,
): ConditionPredictionStatus {
  if (stale) {
    return { kind: "environment-unavailable", label: "sense dades" };
  }

  if (result.score === null) {
    return { kind: "score-withheld", label: "valoració no disponible" };
  }

  return { kind: "available", label: result.label };
}
