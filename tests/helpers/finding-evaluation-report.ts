import {
  bottleneck,
  componentFactors,
  distribution,
  FINDING_EVALUATION_VERSION,
  hitRates,
  logDamage,
  mannWhitneyAuc,
  mean,
  type ModelExponents,
  neutralizedScores,
  rankPercentile,
  type ReplayRaw,
  waterFactors,
} from "@/tests/helpers/finding-evaluation";

/**
 * Turns saved replay artifacts into the diagnostic report. Each section answers
 * one hypothesis about why hydrothermal-v1 underestimates genuine finds.
 */

export type EvaluationRecord = {
  location: number;
  speciesId: string;
  kind: "event" | "control" | "observed-negative";
  date: string;
  opportunityIndex: number | null;
  fruitingConditionsScore: number | null;
  bestWithin3d?: number | null;
  raw: ReplayRaw;
  exponents: ModelExponents;
  optimumC?: number | null;
  windowMeanTemperatureC?: number | null;
  iconEuWater?: number | null;
  iconEuFruitingConditions?: number | null;
  unavailableFields?: string[];
};

const OPPORTUNITY_BANDS = [20, 40, 60, 80];
const CONDITION_BANDS = [40, 60, 80];
/** "Alta" starts at 60, so habitat below 0.6 makes that band unreachable. */
const ALTA_BAND_THRESHOLD = 0.6;

function positives(records: EvaluationRecord[]) {
  return records.filter((record) => record.kind === "event");
}

function backgrounds(records: EvaluationRecord[]) {
  return records.filter((record) => record.kind !== "event");
}

function definedScores(records: EvaluationRecord[], pick: (record: EvaluationRecord) => number | null) {
  return records.map(pick).filter((value): value is number => value !== null && Number.isFinite(value));
}

function factorSeries(records: EvaluationRecord[]) {
  const series = new Map<string, number[]>();
  for (const record of records) {
    const factors = componentFactors(record.raw, record.exponents);
    if (!factors) continue;
    const water = waterFactors(record.raw, record.exponents);
    const all: Record<string, number> = {
      ...factors,
      ...(water
        ? {
            waterSoilState: water.soilWaterState,
            waterTrigger: water.trigger,
            waterVpdRetention: water.vpdRetention,
            waterDrySpellRetention: water.drySpellRetention,
          }
        : {}),
    };
    for (const [id, value] of Object.entries(all)) {
      const existing = series.get(id) ?? [];
      existing.push(value);
      series.set(id, existing);
    }
  }
  return series;
}

function discrimination(records: EvaluationRecord[]) {
  const events = positives(records);
  const controls = backgrounds(records);
  const eventOpportunity = definedScores(events, (record) => record.opportunityIndex);
  const controlOpportunity = definedScores(controls, (record) => record.opportunityIndex);
  const eventConditions = definedScores(events, (record) => record.fruitingConditionsScore);
  const controlConditions = definedScores(controls, (record) => record.fruitingConditionsScore);

  const eventFactors = factorSeries(events);
  const controlFactors = factorSeries(controls);
  const factorAuc: Record<string, number | null> = {};
  for (const [id, values] of eventFactors) {
    factorAuc[id] = mannWhitneyAuc(values, controlFactors.get(id) ?? []);
  }

  // Each event is also ranked against only its own location's controls, which
  // removes between-site differences from the comparison.
  const withinLocation: number[] = [];
  for (const event of events) {
    if (event.opportunityIndex === null) continue;
    const matched = definedScores(
      controls.filter(
        (record) => record.location === event.location && record.speciesId === event.speciesId,
      ),
      (record) => record.opportunityIndex,
    );
    const percentile = rankPercentile(event.opportunityIndex, matched);
    if (percentile !== null) withinLocation.push(percentile);
  }

  return {
    events: events.length,
    controls: controls.length,
    aucOpportunity: mannWhitneyAuc(eventOpportunity, controlOpportunity),
    aucFruitingConditions: mannWhitneyAuc(eventConditions, controlConditions),
    aucByFactor: factorAuc,
    eventOpportunity: distribution(eventOpportunity),
    controlOpportunity: distribution(controlOpportunity),
    eventFruitingConditions: distribution(eventConditions),
    controlFruitingConditions: distribution(controlConditions),
    eventHitRatesOpportunity: hitRates(eventOpportunity, OPPORTUNITY_BANDS),
    eventHitRatesFruitingConditions: hitRates(eventConditions, CONDITION_BANDS),
    eventWithinLocationPercentile: distribution(withinLocation),
  };
}

function habitatCeiling(records: EvaluationRecord[]) {
  const events = positives(records);
  const habitat = events
    .map((record) => record.raw.effectiveHabitat)
    .filter((value): value is number => value !== null);
  // The ceiling is what habitat alone permits, so it must follow whichever
  // weighting the scored model applied rather than assuming v1's linear one.
  const weighted = events
    .map((record) => record.raw.habitatFactor ?? record.raw.effectiveHabitat)
    .filter((value): value is number => value !== null);
  const belowAlta = weighted.filter((value) => value < ALTA_BAND_THRESHOLD).length;
  const maximumReachable = weighted.map((value) => value * 100);
  return {
    effectiveHabitat: distribution(habitat),
    eventsWithHabitat: habitat.length,
    eventsWhereAltaBandUnreachable: belowAlta,
    shareWhereAltaBandUnreachable: weighted.length ? belowAlta / weighted.length : null,
    maximumReachableOpportunity: distribution(maximumReachable),
  };
}

function attribution(records: EvaluationRecord[]) {
  const events = positives(records);
  const topLevelCounts: Record<string, number> = {};
  const expandedCounts: Record<string, number> = {};
  const damage: Record<string, number[]> = {};

  let frostOrHeatCrushed = 0;
  let waterlogZeroed = 0;
  let soilFloorZeroed = 0;
  let phenologyBelowPeak = 0;
  const effectiveRainShare: number[] = [];

  for (const record of events) {
    const factors = componentFactors(record.raw, record.exponents);
    if (!factors) continue;
    const water = waterFactors(record.raw, record.exponents);
    const top = bottleneck(factors);
    topLevelCounts[top.id] = (topLevelCounts[top.id] ?? 0) + 1;

    const expanded: Record<string, number> = {
      phenology: factors.phenology,
      temperature: factors.temperature,
      extremes: factors.extremes,
      ...(water
        ? {
            waterSoilState: water.soilWaterState,
            waterTrigger: water.trigger,
            waterVpdRetention: water.vpdRetention,
            waterDrySpellRetention: water.drySpellRetention,
          }
        : { water: factors.water }),
    };
    const expandedTop = bottleneck(expanded);
    expandedCounts[expandedTop.id] = (expandedCounts[expandedTop.id] ?? 0) + 1;

    for (const [id, value] of Object.entries({ ...factors, ...expanded })) {
      damage[id] = damage[id] ?? [];
      damage[id].push(logDamage(value));
    }

    if (record.raw.extremes !== null && record.raw.extremes < 0.5) frostOrHeatCrushed += 1;
    if (record.raw.phenology !== null && record.raw.phenology < 1) phenologyBelowPeak += 1;
    const details = record.raw.waterDetails;
    if (details && details.soilWaterState === 0) {
      // Distinguish the two hard zeros: too wet after triggering rain versus
      // genuinely dry soil. Only the first one is a modelling artifact.
      if (details.relativeExtractableWaterMean > 1) waterlogZeroed += 1;
      else soilFloorZeroed += 1;
    }
    if (details) effectiveRainShare.push(details.rainTrigger);
  }

  return {
    bottleneckCountsTopLevel: topLevelCounts,
    bottleneckCountsWaterExpanded: expandedCounts,
    meanLogDamage: Object.fromEntries(
      Object.entries(damage)
        .map(([id, values]) => [id, mean(values.filter(Number.isFinite))])
        .sort((left, right) => (Number(right[1] ?? 0) - Number(left[1] ?? 0))),
    ),
    eventsWithExtremesBelowHalf: frostOrHeatCrushed,
    eventsZeroedByWaterlogging: waterlogZeroed,
    eventsZeroedByDrySoil: soilFloorZeroed,
    eventsBelowPeakPhenology: phenologyBelowPeak,
    eventRainTrigger: distribution(effectiveRainShare),
  };
}

function sensitivity(records: EvaluationRecord[]) {
  const events = positives(records);
  const controls = backgrounds(records);
  const baselineEvents = definedScores(events, (record) => record.fruitingConditionsScore);
  const baselineAuc = mannWhitneyAuc(
    baselineEvents,
    definedScores(controls, (record) => record.fruitingConditionsScore),
  );

  const neutralizedByFactor = new Map<string, { events: number[]; controls: number[] }>();
  for (const record of records) {
    const factors = componentFactors(record.raw, record.exponents);
    if (!factors) continue;
    for (const [id, value] of Object.entries(neutralizedScores(factors))) {
      const bucket = neutralizedByFactor.get(id) ?? { events: [], controls: [] };
      (record.kind === "event" ? bucket.events : bucket.controls).push(value * 100);
      neutralizedByFactor.set(id, bucket);
    }
  }

  const perFactor: Record<string, unknown> = {};
  for (const [id, bucket] of neutralizedByFactor) {
    const auc = mannWhitneyAuc(bucket.events, bucket.controls);
    perFactor[id] = {
      meanEventFruitingConditions: mean(bucket.events),
      auc,
      // A factor whose removal lifts scores without hurting AUC is pure
      // downward bias; one whose removal collapses AUC carries real signal.
      aucDelta: auc === null || baselineAuc === null ? null : auc - baselineAuc,
      eventsReachingSixty: bucket.events.length
        ? bucket.events.filter((score) => score >= 60).length / bucket.events.length
        : null,
    };
  }

  return {
    baselineMeanEventFruitingConditions: mean(baselineEvents),
    baselineAuc,
    byFactorNeutralized: perFactor,
  };
}

function temperatureBias(records: EvaluationRecord[]) {
  const offsets: number[] = [];
  for (const record of positives(records)) {
    if (
      record.optimumC === undefined || record.optimumC === null ||
      record.windowMeanTemperatureC === undefined || record.windowMeanTemperatureC === null
    ) continue;
    offsets.push(record.windowMeanTemperatureC - record.optimumC);
  }
  return {
    // A systematically negative offset means the editorial daytime midpoint
    // sits above the multi-day mean the model actually scores.
    windowMeanMinusOptimumC: distribution(offsets),
    suggestedOptimumShiftC: offsets.length ? mean(offsets) : null,
  };
}

function soilInputError(records: EvaluationRecord[]) {
  const waterDeltas: number[] = [];
  const conditionDeltas: number[] = [];
  for (const record of positives(records)) {
    if (record.iconEuWater !== undefined && record.iconEuWater !== null && record.raw.water !== null) {
      waterDeltas.push(Math.abs(record.iconEuWater - record.raw.water));
    }
    if (
      record.iconEuFruitingConditions !== undefined &&
      record.iconEuFruitingConditions !== null &&
      record.fruitingConditionsScore !== null
    ) {
      conditionDeltas.push(Math.abs(record.iconEuFruitingConditions - record.fruitingConditionsScore));
    }
  }
  return {
    available: waterDeltas.length > 0,
    absoluteWaterDelta: distribution(waterDeltas),
    absoluteFruitingConditionsDelta: distribution(conditionDeltas),
  };
}

type Verdict = {
  hypothesis: string;
  claim: string;
  verdict: "supported" | "not-supported" | "inconclusive";
  evidence: string;
};

function verdicts(sections: {
  discrimination: ReturnType<typeof discrimination>;
  habitatCeiling: ReturnType<typeof habitatCeiling>;
  attribution: ReturnType<typeof attribution>;
  sensitivity: ReturnType<typeof sensitivity>;
  temperatureBias: ReturnType<typeof temperatureBias>;
}): Verdict[] {
  const list: Verdict[] = [];
  const eventCount = sections.discrimination.events;
  const enough = eventCount >= 8;

  const share = sections.habitatCeiling.shareWhereAltaBandUnreachable;
  list.push({
    hypothesis: "a-habitat-ceiling",
    claim: "Multiplying by habitat area fraction makes the upper bands unreachable at real finds",
    verdict: share === null ? "inconclusive" : share >= 0.5 ? "supported" : "not-supported",
    evidence: share === null
      ? "No event carried an effective habitat value"
      : `${Math.round(share * 100)}% of events sit in cells where the "alta" band cannot be reached at any weather`,
  });

  const extremesShare = eventCount
    ? sections.attribution.eventsWithExtremesBelowHalf / eventCount
    : null;
  list.push({
    hypothesis: "b-extremes-crush",
    claim: "Cumulative frost/heat hours halve or worse the score at genuine finds",
    verdict: !enough || extremesShare === null
      ? "inconclusive"
      : extremesShare >= 0.3 ? "supported" : "not-supported",
    evidence: extremesShare === null
      ? "No event produced an extremes multiplier"
      : `${Math.round(extremesShare * 100)}% of events had an extremes multiplier below 0.5`,
  });

  const waterlogShare = eventCount
    ? sections.attribution.eventsZeroedByWaterlogging / eventCount
    : null;
  list.push({
    hypothesis: "c-waterlog-zero",
    claim: "Soil wetter than the band maximum returns a hard zero right after triggering rain",
    verdict: !enough || waterlogShare === null
      ? "inconclusive"
      : waterlogShare > 0 ? "supported" : "not-supported",
    evidence: `${sections.attribution.eventsZeroedByWaterlogging} of ${eventCount} events were zeroed by waterlogging (${sections.attribution.eventsZeroedByDrySoil} by dry soil)`,
  });

  const shift = sections.temperatureBias.suggestedOptimumShiftC;
  list.push({
    hypothesis: "f-temperature-optimum",
    claim: "Optimum temperature derived from editorial daytime ranges sits above the window mean",
    verdict: shift === null ? "inconclusive" : shift <= -1 ? "supported" : "not-supported",
    evidence: shift === null
      ? "No event carried both a window mean and a species optimum"
      : `Window mean minus optimum averages ${shift.toFixed(1)} °C at events`,
  });

  const aucOpportunity = sections.discrimination.aucOpportunity;
  const aucConditions = sections.discrimination.aucFruitingConditions;
  list.push({
    hypothesis: "g-compounding-bias",
    claim: "The model ranks finds above background but compresses them into the low bands",
    verdict: aucOpportunity === null || aucConditions === null
      ? "inconclusive"
      : aucConditions >= 0.6 &&
          (sections.discrimination.eventHitRatesOpportunity.atLeast40 ?? 0) < 0.5
        ? "supported"
        : "not-supported",
    evidence: `AUC(opportunity)=${aucOpportunity?.toFixed(3) ?? "n/a"}, AUC(conditions)=${aucConditions?.toFixed(3) ?? "n/a"}, events reaching score 40+: ${formatShare(sections.discrimination.eventHitRatesOpportunity.atLeast40)}`,
  });

  return list;
}

function formatShare(value: unknown) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "n/a";
}

export function summarizeEvaluation(
  records: EvaluationRecord[],
  meta: Record<string, unknown> = {},
) {
  const sections = {
    discrimination: discrimination(records),
    habitatCeiling: habitatCeiling(records),
    attribution: attribution(records),
    sensitivity: sensitivity(records),
    temperatureBias: temperatureBias(records),
  };
  return {
    reportVersion: FINDING_EVALUATION_VERSION,
    meta: {
      ...meta,
      records: records.length,
      events: sections.discrimination.events,
      controls: sections.discrimination.controls,
      observedNegatives: records.filter((record) => record.kind === "observed-negative").length,
      limitation:
        "Controls are presence-only background days and may contain unobserved fruiting, so discrimination is a lower bound",
    },
    ...sections,
    soilInputError: soilInputError(records),
    verdicts: verdicts(sections),
  };
}

export function renderSummaryTable(report: ReturnType<typeof summarizeEvaluation>) {
  const lines: string[] = [];
  lines.push(`events ${report.meta.events} · controls ${report.meta.controls}`);
  lines.push(
    `AUC opportunity ${report.discrimination.aucOpportunity?.toFixed(3) ?? "n/a"} · AUC conditions ${report.discrimination.aucFruitingConditions?.toFixed(3) ?? "n/a"}`,
  );
  lines.push(
    `events reaching score 20/40/60: ${formatShare(report.discrimination.eventHitRatesOpportunity.atLeast20)} / ${formatShare(report.discrimination.eventHitRatesOpportunity.atLeast40)} / ${formatShare(report.discrimination.eventHitRatesOpportunity.atLeast60)}`,
  );
  const topBottlenecks = Object.entries(report.attribution.bottleneckCountsWaterExpanded)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([id, count]) => `${id}×${count}`);
  lines.push(`top bottlenecks: ${topBottlenecks.join(", ") || "n/a"}`);
  const topDamage = Object.entries(report.attribution.meanLogDamage)
    .filter(([, value]) => typeof value === "number")
    .slice(0, 3)
    .map(([id, value]) => `${id} ${(value as number).toFixed(2)}`);
  lines.push(`most score damage: ${topDamage.join(", ") || "n/a"}`);
  for (const verdict of report.verdicts) {
    lines.push(`[${verdict.verdict}] ${verdict.hypothesis}: ${verdict.evidence}`);
  }
  return lines.join("\n");
}
