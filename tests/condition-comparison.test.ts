import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConditionComparison } from "@/components/condition-comparison";
import { getSpecies } from "@/data/species";
import type { ConditionSnapshot, SuitabilityResult } from "@/src/lib/types";

const snapshot: ConditionSnapshot = {
  regionId: "pirineus",
  observedAt: "2026-08-14T08:45:00Z",
  source: ["test"],
  confidence: "moderate",
  stale: false,
  unavailableFields: [],
  values: {
    atmosphericResolutionM: 2500,
    soilMoistureResolutionM: 9000,
    weatherModel: "Météo-France AROME France",
  },
};

const result: SuitabilityResult = {
  score: 22,
  fruitingConditionsScore: 35,
  opportunityIndex: 22,
  rawHabitatCoverage: 0.84,
  effectiveHabitatCoverage: 0.62,
  label: "baixa",
  components: [
    { id: "habitatCoverage", label: "Coberta d’hàbitat compatible", score: 84, state: "favourable" },
    { id: "altitude", label: "Idoneïtat altitudinal dins l’hàbitat", score: 74, state: "favourable" },
    { id: "phenology", label: "Fenologia", score: 50, state: "favourable" },
    { id: "water", label: "Estat hídric unificat", score: 68, state: "favourable" },
    { id: "temperature", label: "Resposta tèrmica", score: 73, state: "favourable" },
    { id: "extremes", label: "Exposició a gelada i calor", score: 100, state: "favourable" },
  ],
  modelVersion: "test-hydrothermal-v1",
  dataCompleteness: 1,
  missingComponents: [],
};

describe("condition calculation presentation", () => {
  it("shows how high component responses produce the lower final cell score", () => {
    const html = renderToStaticMarkup(createElement(ConditionComparison, {
      species: getSpecies("boletus-edulis")!,
      snapshot,
      result,
      cellId: "epsg25831:250:1:1",
      cellGridSizeM: 250,
    }));

    expect(html).toContain("Càlcul de la puntuació de la cel·la");
    expect(html).toContain("Condicions per fructificar");
    expect(html).toContain("35<small>/100</small>");
    expect(html).toContain("62<small>% de la cel·la</small>");
    expect(html).toContain("22<small>/100</small>");
    expect(html).toContain("Les barres són multiplicadors, no punts que se sumin");
    expect(html).toContain("Temperatura mitjana");
    expect(html).toContain("Gelades i calor extrema");
    expect(html).toContain("factor-tooltip-habitatCoverage");
    expect(html).toContain("factor-tooltip-altitude");
    expect(html).toContain("factor-tooltip-phenology");
    expect(html).toContain("factor-tooltip-water");
    expect(html).toContain("factor-tooltip-temperature");
    expect(html).toContain("factor-tooltip-extremes");
    expect(html).toContain("Penalitza les hores ≤ 0 °C i ≥ 27 °C");
    expect(html).toContain("no és una probabilitat de trobar bolets");
    expect(html).toContain("68%<sup>0,60</sup>");
    expect(html).toContain("73%<sup>0,40</sup>");
    expect(html).toContain("Més restrictiu");
    expect(html).not.toContain("factor-scale");
    expect(html).not.toContain("Evidència històrica");
    expect(html).not.toContain("Météo-France AROME France");
    expect(html).not.toContain("Humitat del sòl: 9 km");
  });
});
