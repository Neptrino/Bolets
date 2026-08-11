import { describe, expect, it } from "vitest";
import { resolveOccurrenceEvidence } from "@/src/lib/predictions";
import { occurrenceSupportResponseSchema } from "@/src/lib/schema";
import type { OccurrenceSupportCell } from "@/src/lib/types";

const support: OccurrenceSupportCell = {
  supportCellId: "epsg25831:10000:45:468",
  gridSizeM: 10000,
  bounds: [[1.9, 42.1], [2.02, 42.2]],
  recordCount: 12,
  observedYearMin: 1981,
  observedYearMax: 2022,
  observedMonths: [8, 9, 10],
  sources: [{
    sourceId: "fungacat-gbif",
    title: "FungaCAT: Banco de datos de los hongos de Cataluña",
    datasetKey: "8583f4f6-f762-11e1-a439-00145eb45e9a",
    doi: "10.15468/ttivpp",
    licenseUrl: "https://creativecommons.org/licenses/by-nc/4.0/",
    sourceUrl: "https://www.gbif.org/dataset/8583f4f6-f762-11e1-a439-00145eb45e9a",
    lastSyncedAt: "2026-08-11T15:00:00Z"
  }]
};

describe("historical occurrence evidence", () => {
  it("returns corroborating evidence for a prediction cell inside a 10 km support cell", () => {
    expect(resolveOccurrenceEvidence([[1.95, 42.13], [1.96, 42.14]], [support], true)).toEqual({
      occurrenceEvidence: {
        supportCellId: support.supportCellId,
        gridSizeM: 10000,
        recordCount: 12,
        observedYearMin: 1981,
        observedYearMax: 2022,
        observedMonths: [8, 9, 10],
        sources: support.sources
      },
      occurrenceEvidenceStatus: "supported"
    });
  });

  it("treats a successful empty lookup as no records, not absence", () => {
    expect(resolveOccurrenceEvidence([[2.2, 42.2], [2.21, 42.21]], [support], true)).toEqual({
      occurrenceEvidence: null,
      occurrenceEvidenceStatus: "no-records"
    });
  });

  it("distinguishes an unavailable source from an empty result", () => {
    expect(resolveOccurrenceEvidence([[1.95, 42.13], [1.96, 42.14]], [support], false)).toEqual({
      occurrenceEvidence: null,
      occurrenceEvidenceStatus: "unavailable"
    });
  });

  it("validates the privacy-safe Edge Function contract", () => {
    expect(occurrenceSupportResponseSchema.parse({
      cells: [{
        cellId: support.supportCellId,
        gridSizeM: support.gridSizeM,
        bounds: support.bounds,
        recordCount: support.recordCount,
        observedYearMin: support.observedYearMin,
        observedYearMax: support.observedYearMax,
        observedMonths: support.observedMonths,
        sources: support.sources
      }],
      truncated: false,
      bounds: { west: 1.9, south: 42.1, east: 2.02, north: 42.2 },
      speciesId: "amanita-caesarea"
    }).cells[0].recordCount).toBe(12);
  });
});
