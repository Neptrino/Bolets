import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MethodPage from "@/app/metode/page";
import { ConditionComparison } from "@/components/condition-comparison";
import { getSpecies } from "@/data/species";
import { calculateSuitability } from "@/src/lib/scoring";
import {
  conditionSnapshotSchema,
  geologicalSubstrateEvidenceSchema,
} from "@/src/lib/schema";
import { scoringValues } from "@/supabase/functions/_shared/scoring-values";
import type {
  ConditionSnapshot,
  GeologicalSubstrateEvidence,
  SuitabilityResult,
} from "@/src/lib/types";

const exactEvidence = {
  class: "silicic",
  dominantCoverage: 0.76,
  mappedCoverage: 1,
  sourceId: "icgc-geology-50k-v3",
  mapScaleDenominator: 50000,
  dominantUnitCode: "Ggd",
  dominantUnitDescription: "Granodiorites",
  dominantUnitCoverage: 0.64,
} satisfies GeologicalSubstrateEvidence;

function snapshot(
  geologicalSubstrate?: GeologicalSubstrateEvidence,
): ConditionSnapshot {
  return {
    regionId: "pirineus",
    observedAt: "2026-08-13T06:00:00Z",
    source: ["test"],
    confidence: "moderate",
    stale: false,
    unavailableFields: [],
    values: { geologicalSubstrate },
  };
}

const unavailableResult: SuitabilityResult = {
  score: null,
  fruitingConditionsScore: null,
  opportunityIndex: null,
  rawHabitatCoverage: null,
  effectiveHabitatCoverage: null,
  label: "sense dades",
  components: [
    { id: "habitatCoverage", label: "Coberta d’hàbitat compatible", score: null, state: "unknown" },
    { id: "altitude", label: "Idoneïtat altitudinal dins l’hàbitat", score: null, state: "unknown" },
    { id: "phenology", label: "Fenologia", score: null, state: "unknown" },
    { id: "water", label: "Estat hídric unificat", score: null, state: "unknown" },
    { id: "temperature", label: "Resposta tèrmica", score: null, state: "unknown" },
    { id: "extremes", label: "Exposició a gelada i calor", score: null, state: "unknown" },
  ],
  modelVersion: "test",
  dataCompleteness: 0,
  missingComponents: [
    "habitatCoverage",
    "altitude",
    "phenology",
    "water",
    "temperature",
    "extremes",
  ],
};

function renderSubstrate(
  geologicalSubstrate?: GeologicalSubstrateEvidence,
  cellGridSizeM: 250 | 1000 = 250,
) {
  return renderToStaticMarkup(createElement(ConditionComparison, {
    species: getSpecies("boletus-edulis")!,
    snapshot: snapshot(geologicalSubstrate),
    result: unavailableResult,
    cellId: `epsg25831:${cellGridSizeM}:1:1`,
    cellGridSizeM,
  }));
}

describe("geological substrate evidence", () => {
  it("keeps the structured ICGC evidence in parsed detailed snapshots", () => {
    const parsed = conditionSnapshotSchema.parse(snapshot(exactEvidence));

    expect(parsed.values.geologicalSubstrate).toEqual(exactEvidence);
  });

  it("rejects inconsistent coverage, source and coarse-resolution metadata", () => {
    expect(() => geologicalSubstrateEvidenceSchema.parse({
      ...exactEvidence,
      dominantCoverage: 0.9,
      mappedCoverage: 0.8,
    })).toThrow();
    expect(() => geologicalSubstrateEvidenceSchema.parse({
      ...exactEvidence,
      sourceId: "another-map",
    })).toThrow();
    expect(() => geologicalSubstrateEvidenceSchema.parse({
      ...exactEvidence,
      aggregationBaseM: 1000,
    })).toThrow();
    expect(() => geologicalSubstrateEvidenceSchema.parse({
      ...exactEvidence,
      dominantUnitCoverage: undefined,
    })).toThrow();
    expect(() => geologicalSubstrateEvidenceSchema.parse({
      ...exactEvidence,
      dominantUnitCode: undefined,
      dominantUnitCoverage: undefined,
    })).toThrow();
  });

  it("does not include geology in the compact scoring contract", () => {
    expect(scoringValues({
      soilPh: 5.8,
      geologicalSubstrate: exactEvidence,
    })).toEqual({ soilPh: 5.8 });
  });

  it.each(["silicic", "calcareous", "mixed", "unconsolidated", "unknown"] as const)(
    "keeps the score and completeness unchanged for %s context",
    (substrateClass) => {
      const species = getSpecies("boletus-edulis")!;
      const base = {
        ...snapshot(),
        values: { soilPh: 5.8, soilTexture: "franca" },
      } satisfies ConditionSnapshot;
      const withGeology = {
        ...base,
        values: {
          ...base.values,
          geologicalSubstrate: {
            ...exactEvidence,
            class: substrateClass,
          },
        },
      } satisfies ConditionSnapshot;

      expect(calculateSuitability(species, withGeology)).toEqual(
        calculateSuitability(species, base),
      );
    },
  );

  it("shows the mapped class and species preference without technical provenance", () => {
    const html = renderSubstrate(exactEvidence);

    expect(html).toContain("Substrat geològic");
    expect(html).toContain("Silícic");
    expect(html).toContain("Preferència de l’espècie:");
    expect(html).not.toContain("ICGC");
    expect(html).not.toContain("1:50.000");
    expect(html).not.toContain("unitat Ggd");
    expect(html).not.toContain("No afecta la puntuació");
  });

  it("distinguishes coarse, mixed, unknown, unconsolidated and absent evidence", () => {
    const coarseMixed = renderSubstrate({
      ...exactEvidence,
      class: "mixed",
      dominantCoverage: 0.92,
      mappedCoverage: 0.92,
      dominantUnitCode: undefined,
      dominantUnitCoverage: undefined,
      aggregationBaseM: 250,
    }, 1000);
    const unknown = renderSubstrate({
      ...exactEvidence,
      class: "unknown",
      dominantUnitCode: "EÇOrgl",
      dominantUnitDescription: "Alternança centimètrica de gresos i lutites. Formació Jújols",
      dominantUnitCoverage: 1,
    });
    const unconsolidated = renderSubstrate({
      ...exactEvidence,
      class: "unconsolidated",
    });
    const absent = renderSubstrate();

    expect(coarseMixed).toContain("Mixt");
    expect(unknown).toContain("Alternança centimètrica de gresos i lutites. Formació Jújols");
    expect(unknown).not.toContain("Família de substrat no determinada");
    expect(unknown).toContain("class=\"geological-unit-description\"");
    expect(unknown).toContain("title=\"Alternança centimètrica de gresos i lutites. Formació Jújols\"");
    expect(unknown).not.toContain("EÇOrgl");
    expect(unconsolidated).toContain("Materials no consolidats");
    expect(absent).toContain("Sense cartografia geològica");
  });

  it("documents geology as a scale-preserving, display-only source on the method page", () => {
    const html = renderToStaticMarkup(createElement(MethodPage));

    expect(html).toContain("Mapa geològic de Catalunya");
    expect(html).toContain("escala 1:50.000");
    expect(html).toContain("context geològic · fora d’H/F/O");
    expect(html).toContain("no equival a una resolució de 50 m");
    expect(html).not.toContain("250 m, 500 m, 1 km");
  });
});
