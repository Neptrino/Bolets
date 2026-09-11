import { distribution, hitRates, mannWhitneyAuc, rankPercentile } from "@/tests/helpers/finding-evaluation";
import { summarizeEvaluation, type EvaluationRecord } from "@/tests/helpers/finding-evaluation-report";
import { validateObservations, type FindingObservation } from "@/tests/helpers/finding-observations";
import type { PrivateHistoricalFinding } from "@/tests/helpers/historical-finding-replay";

type ReplayRecord = EvaluationRecord & { offsetDaysFromFinding?: number | null };
export type ObservationScore = {
  location: number;
  date: string;
  kind: EvaluationRecord["kind"];
  taxon: string;
  speciesIds: string[];
  ambiguous: boolean;
  opportunityIndex: number | null;
  fruitingConditionsScore: number | null;
};

/** Join re-converted taxonomic metadata to immutable older scores. */
export function attachObservationInputs(records: ReplayRecord[], inputs: PrivateHistoricalFinding[]) {
  const represented = new Set<number>();
  const result = records.map((r) => {
    const input = inputs[r.location - 1];
    if (!input?.observations || !input.speciesIds.includes(r.speciesId) ||
      (r.kind !== "control" && (r.kind !== "event" || r.offsetDaysFromFinding === 0) &&
        input.observedAt.slice(0, 10) !== r.date)) {
      throw new Error(`Observation input does not match replay location ${r.location}; re-convert the original source and preserve input order`);
    }
    const observations = validateObservations(input.observations, input.speciesIds);
    if (r.observations && groupKey(r.observations) !== groupKey(observations)) {
      throw new Error(`Conflicting observation metadata at replay location ${r.location}`);
    }
    represented.add(r.location);
    return { ...r, observations };
  });
  // A replay may legitimately omit a failed location, but an input must not be
  // silently skipped by an index mismatch beyond the supplied list.
  if (!represented.size) throw new Error("No replay locations matched observation inputs");
  return result;
}

function groupKey(groups: FindingObservation[]) {
  return JSON.stringify(groups.map((g) => [g.taxon, [...g.speciesIds].sort()]).sort());
}

export function aggregateObservations(records: ReplayRecord[]) {
  const central = records.filter((r) => r.kind !== "event" || r.offsetDaysFromFinding === 0);
  const visits = new Map<string, ReplayRecord[]>();
  for (const r of central) {
    const key = JSON.stringify([r.location, r.kind, r.date]);
    const rows = visits.get(key) ?? [];
    rows.push(r);
    visits.set(key, rows);
  }
  const scores: ObservationScore[] = [];
  const resolved: EvaluationRecord[] = [];
  for (const rows of visits.values()) {
    const first = rows[0];
    if (!first.observations || rows.some((r) => !r.observations)) {
      throw new Error("Replay lacks recorded-taxon metadata. Supply --input with re-converted source findings; a flat species list cannot distinguish alternatives from co-reported species.");
    }
    const allIds = [...new Set(first.observations.flatMap((g) => g.speciesIds))];
    const groups = validateObservations(first.observations, allIds);
    if (rows.some((r) => groupKey(r.observations!) !== groupKey(groups) || !allIds.includes(r.speciesId))) {
      throw new Error(`Inconsistent recorded taxa at replay location ${first.location}`);
    }
    const bySpecies = new Map(rows.map((r) => [r.speciesId, r]));
    if (bySpecies.size !== rows.length) throw new Error(`Duplicate species replay at location ${first.location}`);
    for (const observation of groups) {
      const candidates = observation.speciesIds.map((id) => bySpecies.get(id));
      // Missing candidates must never promote a partial replay to a complete
      // group score. Max is applied symmetrically to positives and controls.
      const maximum = (field: "opportunityIndex" | "fruitingConditionsScore") => {
        const values = candidates.map((r) => r?.[field]);
        return values.every((value) => typeof value === "number" && Number.isFinite(value))
          ? Math.max(...values as number[])
          : null;
      };
      scores.push({
        location: first.location, date: first.date, kind: first.kind,
        taxon: observation.taxon, speciesIds: observation.speciesIds,
        ambiguous: observation.speciesIds.length > 1,
        opportunityIndex: maximum("opportunityIndex"),
        fruitingConditionsScore: maximum("fruitingConditionsScore"),
      });
      if (observation.speciesIds.length === 1 && candidates[0]) resolved.push(candidates[0]);
    }
  }
  return { scores, resolved, central };
}

function scoreSummary(rows: ObservationScore[]) {
  const events = rows.filter((r) => r.kind === "event");
  const background = rows.filter((r) => r.kind === "control");
  const negatives = rows.filter((r) => r.kind === "observed-negative");
  const values = (items: ObservationScore[], field: "opportunityIndex" | "fruitingConditionsScore") =>
    items.map((r) => r[field]).filter((v): v is number => v !== null);
  const eventOpportunity = values(events, "opportunityIndex");
  const controls = [...background, ...negatives];
  const controlOpportunity = values(controls, "opportunityIndex");
  const matchedRanks = events.flatMap((event) => {
    if (event.opportunityIndex === null) return [];
    const matched = background.filter((r) => r.location === event.location && r.taxon === event.taxon &&
      [...r.speciesIds].sort().join("|") === [...event.speciesIds].sort().join("|"));
    const rank = rankPercentile(event.opportunityIndex, values(matched, "opportunityIndex"));
    return rank === null ? [] : [rank];
  });
  return {
    events: events.length, controls: controls.length,
    backgroundDates: background.length, observedNegatives: negatives.length,
    aucOpportunity: mannWhitneyAuc(eventOpportunity, controlOpportunity),
    aucOpportunityBackground: mannWhitneyAuc(eventOpportunity, values(background, "opportunityIndex")),
    aucOpportunityObservedNegatives: mannWhitneyAuc(eventOpportunity, values(negatives, "opportunityIndex")),
    aucFruitingConditions: mannWhitneyAuc(values(events, "fruitingConditionsScore"), values(controls, "fruitingConditionsScore")),
    eventOpportunity: distribution(eventOpportunity), controlOpportunity: distribution(controlOpportunity),
    eventFruitingConditions: distribution(values(events, "fruitingConditionsScore")),
    controlFruitingConditions: distribution(values(controls, "fruitingConditionsScore")),
    eventHitRatesOpportunity: hitRates(eventOpportunity, [20, 40, 60, 80]),
    backgroundHitRatesOpportunity: hitRates(values(background, "opportunityIndex"), [20, 40, 60, 80]),
    observedNegativeHitRatesOpportunity: hitRates(values(negatives, "opportunityIndex"), [20, 40, 60, 80]),
    eventWithinLocationPercentile: distribution(matchedRanks),
    unavailableOpportunity: rows.filter((r) => r.opportunityIndex === null).length,
  };
}

export function summarizeObservationEvaluation(records: ReplayRecord[], meta: Record<string, unknown> = {}) {
  const { scores, resolved, central } = aggregateObservations(records);
  const expanded = summarizeEvaluation(central);
  return {
    reportVersion: "finding-observation-evaluation-v2",
    meta: { ...meta, sourceRecords: records.length, candidateRows: central.length, observationGroups: scores.length,
      evaluationUnit: "One recorded taxon per visit/date; co-reported identified species remain separate",
      aggregation: "Maximum across the recorded alternatives, independently per score, for events and controls alike; incomplete groups withhold",
      limitation: "Genus-level group opportunity does not confirm any candidate species. Background dates are unlabelled, not verified absences. This is retrospective evaluation, not independent validation." },
    discrimination: scoreSummary(scores),
    resolvedSpeciesDiagnostics: summarizeEvaluation(resolved, { interpretation: "Explicit single-species observations only" }),
    expandedCandidateDiagnostics: {
      interpretation: "Candidate compatibility only: rows are not independent confirmed findings or absences",
      meta: expanded.meta, discrimination: expanded.discrimination,
      habitatCeiling: expanded.habitatCeiling, attribution: expanded.attribution,
      sensitivity: expanded.sensitivity, temperatureBias: expanded.temperatureBias,
      soilInputError: expanded.soilInputError,
    },
    observations: scores,
  };
}

export function renderObservationSummary(report: ReturnType<typeof summarizeObservationEvaluation>) {
  const d = report.discrimination;
  return [
    `Recorded taxa: ${d.events} positive · ${d.backgroundDates} background · ${d.observedNegatives} observed-negative`,
    `AUC opportunity ${d.aucOpportunity?.toFixed(3) ?? "n/a"} · background only ${d.aucOpportunityBackground?.toFixed(3) ?? "n/a"}`,
    `Explicit-species diagnostics: ${report.resolvedSpeciesDiagnostics.meta.events} positive rows`,
    `${d.unavailableOpportunity} unavailable group scores; expanded species rows are compatibility diagnostics only`,
  ].join("\n");
}
