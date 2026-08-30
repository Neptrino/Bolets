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
    expect(html).toContain("La condició més desfavorable pot limitar el resultat");
    expect(html).toContain("Temperatura mitjana");
    expect(html).toContain("Gelades i calor extrema");
    expect(html).toContain("factor-tooltip-habitatCoverage");
    expect(html).toContain("factor-tooltip-altitude");
    expect(html).toContain("factor-tooltip-phenology");
    expect(html).toContain("Encaix de la data actual amb la temporada habitual");
    expect(html).toContain("factor-tooltip-water");
    expect(html).toContain("factor-tooltip-temperature");
    expect(html).toContain("factor-tooltip-extremes");
    expect(html).toContain("Reflecteix l’efecte recent de les gelades");
    expect(html).toContain("No és una probabilitat de trobar bolets");
    expect(html).toContain("68%</span>");
    expect(html).toContain("73%</span>");
    expect(html).not.toContain("<sup>");
    expect(html).toContain("Més restrictiu");
    expect(html).not.toContain("factor-scale");
    expect(html).not.toContain("Evidència històrica");
    expect(html).not.toContain("Météo-France AROME France");
    expect(html).not.toContain("Humitat del sòl: 9 km");
    expect(html).toContain("Pluja · 3 dies");
    expect(html).toContain("Pluja · 7 dies");
    expect(html).toContain("Ratxa seca");
    expect(html).toContain("Pluja · 24 h");
    expect(html).not.toContain("Pluja · dies 8–30");
    expect(html).not.toContain("Pluja · 30 dies");
    expect(html).not.toContain("condition-context-note");
    expect(html.match(/class="condition-card-help"/g)).toHaveLength(5);
    expect(html).toContain('aria-label="Informació de Temperatura"');
    expect(html).toContain('aria-label="Informació de Humitat del sòl"');
    expect(html).toContain('aria-label="Informació de Humitat de l’aire"');
    expect(html).toContain('aria-label="Informació de Pluja acumulada"');
    expect(html).toContain('aria-label="Informació de Vent"');
    expect(html).toContain('id="condition-card-context-1" role="tooltip"');
    expect(html).toContain("Període: darrera lectura");
    expect(html).toContain("Període: últims 26 dies");
    expect(html).toContain("Compara la temperatura recent amb el rang preferit");
    expect(html).toContain("Preferència: 400–1900 m");
    expect(html).toContain("Part de la cel·la que coincideix amb la coberta preferida");
    expect(html).toContain("Preferència: pH 4.5–6.5");
    expect(html).not.toContain("Substrat geològic");
    expect(html).not.toContain("Drenatge de l’espècie");
    expect(html).toContain("Aigua disponible a la capa superficial del sòl");
    expect(html).toContain("el vent ajuda a entendre l’assecament");
  });
});
