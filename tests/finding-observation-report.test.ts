import { describe, expect, it } from "vitest";
import { convertFindings } from "@/tests/helpers/findings-spreadsheet";
import { parsePrivateEvaluationFindings } from "@/tests/helpers/historical-finding-replay";
import { observationForSpecies, validateObservations } from "@/tests/helpers/finding-observations";
import { aggregateObservations, attachObservationInputs, summarizeObservationEvaluation } from "@/tests/helpers/finding-observation-report";
import type { EvaluationRecord } from "@/tests/helpers/finding-evaluation-report";

const ids = ["boletus-edulis", "boletus-pinophilus", "boletus-aereus", "boletus-reticulatus"];
const genus = observationForSpecies(ids);
const explicit = observationForSpecies(["lactarius-deliciosus"]);
function row(speciesId: string, score: number | null, kind: EvaluationRecord["kind"] = "event") {
  return {
    location: 1, speciesId, kind, date: kind === "control" ? "2025-10-20" : "2025-10-01",
    offsetDaysFromFinding: kind === "event" ? 0 : null,
    opportunityIndex: score, fruitingConditionsScore: score,
    observations: [genus],
    raw: { habitat: 1, altitude: 1, effectiveHabitat: 1, phenology: 1,
      water: 1, temperature: 1, extremes: 1, fruitingConditions: 1, opportunity: 1 },
    exponents: { waterExponent: 0.6, triggerDependency: 0, vpdExponent: 0, drySpellExponent: 0 },
  } satisfies EvaluationRecord & { offsetDaysFromFinding: number | null };
}

describe("recorded taxon preservation", () => {
  it("round trips a genus plus an explicit species without confirming the alternatives", () => {
    const converted = convertFindings([
      "date,species,GPS,abundance",
      '2025-10-01,Boletus,"42.1, 2.1",2',
      '2025-10-01,Lactarius deliciosus,"42.1, 2.1",2',
      '2025-10-01,Lactarius deliciosus,"42.1, 2.1",2',
      '2025-10-02,Boletus,"42.1, 2.1",0',
    ].join("\n"));
    const finding = parsePrivateEvaluationFindings(JSON.stringify(converted.events))[0];
    expect(finding.observations).toEqual([genus, explicit]);
    expect(finding.speciesIds).toHaveLength(5);
    expect(converted.observedNegatives[0].observations).toEqual([genus]);
  });

  it("does not merge explicitly identified species of the same genus", () => {
    const converted = convertFindings([
      "date,species,GPS,abundance",
      '2025-10-01,Boletus edulis,"42.1, 2.1",2',
      '2025-10-01,Boletus pinophilus,"42.1, 2.1",1',
    ].join("\n"));
    expect(converted.events[0].observations).toEqual(ids.slice(0, 2).map((id) => observationForSpecies([id])));
  });

  it("rejects malformed groups, invented labels, duplicates and incomplete unions", () => {
    expect(() => validateObservations([{ taxon: "Boletus", speciesIds: [ids[0], ids[0]] }], ids)).toThrow();
    expect(() => validateObservations([{ ...genus, taxon: "private place name" }], ids)).toThrow();
    expect(() => validateObservations([genus, genus], ids)).toThrow();
    expect(() => validateObservations([observationForSpecies([ids[0]])], ids)).toThrow();
    expect(() => observationForSpecies([ids[0], "lactarius-deliciosus"])).toThrow();
  });
});

describe("observation-level evaluation", () => {
  it("counts genus observations once, with identical max aggregation for positives and negatives", () => {
    const records = ["event", "control", "observed-negative"].flatMap((kind) =>
      ids.map((id, i) => row(id, [65, 40, 0, 0][i], kind as EvaluationRecord["kind"])));
    const report = summarizeObservationEvaluation(records);
    expect(report.discrimination).toMatchObject({ events: 1, backgroundDates: 1, observedNegatives: 1, aucOpportunity: 0.5 });
    expect(report.observations.map((r) => r.opportunityIndex)).toEqual([65, 65, 65]);
    expect(report.resolvedSpeciesDiagnostics.meta.events).toBe(0);
    expect(report.expandedCandidateDiagnostics.meta.events).toBe(4);
    expect(report.expandedCandidateDiagnostics).not.toHaveProperty("verdicts");
    expect(JSON.stringify(report)).not.toMatch(/latitude|longitude|cellId/i);
  });

  it("keeps explicit co-reports separate and does not assign a winning species as truth", () => {
    const records = [...ids.map((id, i) => row(id, [60, 30, 0, 0][i])), row("lactarius-deliciosus", 20)]
      .map((r) => ({ ...r, observations: [genus, explicit] }));
    const report = summarizeObservationEvaluation(records);
    expect(report.discrimination.events).toBe(2);
    expect(report.observations.map((r) => r.taxon)).toEqual(["Boletus", "Lactarius deliciosus"]);
    expect(report.resolvedSpeciesDiagnostics.meta.events).toBe(1);
    expect(report.observations[0].speciesIds).toEqual(ids);
  });

  it("withholds missing and unavailable candidates, while keeping verified zeros", () => {
    expect(aggregateObservations(ids.slice(0, 3).map((id) => row(id, 60))).scores[0].opportunityIndex).toBeNull();
    expect(aggregateObservations(ids.map((id, i) => row(id, i === 2 ? null : 60))).scores[0].opportunityIndex).toBeNull();
    expect(aggregateObservations(ids.map((id) => row(id, 0))).scores[0].opportunityIndex).toBe(0);
  });

  it("rejects duplicate candidates and conflicting group metadata", () => {
    const records = ids.map((id) => row(id, 60));
    expect(() => aggregateObservations([...records, records[0]])).toThrow(/Duplicate/);
    records[0].observations = ids.map((id) => observationForSpecies([id]));
    expect(() => aggregateObservations(records)).toThrow(/Inconsistent/);
  });

  it("excludes flanking days and is deterministic without changing source records", () => {
    const records = ids.map((id) => row(id, 60));
    const before = JSON.stringify(records);
    const report = summarizeObservationEvaluation([...records, ...records.map((r) => ({ ...r, offsetDaysFromFinding: -1, date: "2025-09-30" }))]);
    expect(report.discrimination.events).toBe(1);
    expect(JSON.stringify(records)).toBe(before);
    expect(summarizeObservationEvaluation(records)).toEqual(summarizeObservationEvaluation(records));
  });

  it("requires provenance for legacy artifacts and checks re-converted input identity", () => {
    const legacy = ids.map((id) => ({ ...row(id, 60), observations: undefined }));
    expect(() => aggregateObservations(legacy)).toThrow(/re-converted/);
    const input = { observedAt: "2025-10-01T10:00:00Z", latitude: 42.1, longitude: 2.1, speciesIds: ids, observations: [genus] };
    const enriched = attachObservationInputs(legacy, [input]);
    expect(summarizeObservationEvaluation(enriched).discrimination.events).toBe(1);
    expect(legacy.every((r) => r.observations === undefined)).toBe(true);
    expect(() => attachObservationInputs(legacy, [{ ...input, observedAt: "2025-10-02T10:00:00Z" }])).toThrow(/does not match/);
    expect(() => attachObservationInputs(legacy, [{ ...input, observations: undefined }])).toThrow();
  });
});
