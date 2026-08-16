import type { PrivateHistoricalFinding } from "@/tests/helpers/historical-finding-replay";
import { MINIMUM_AROME_ARCHIVE_DATE } from "@/tests/helpers/historical-finding-replay";

/**
 * Offline metrics for the fruiting-model diagnosis: control sampling, exact
 * component attribution, discrimination, and single-factor sensitivity. Every
 * function here is pure so the whole report can be recomputed from saved replay
 * artifacts without touching the network.
 */

export const FINDING_EVALUATION_VERSION = "finding-evaluation-v1";

const MILLISECONDS_PER_DAY = 86_400_000;
/** The longest production window needs 38 days of lead-in before a target. */
const ARCHIVE_LEAD_IN_DAYS = 38;

export const DEFAULT_CONTROL_CONFIG = {
  controlsPerEvent: 3,
  seasonWindowDays: 30,
  exclusionDays: 10,
} as const;

export type ControlConfig = {
  controlsPerEvent?: number;
  seasonWindowDays?: number;
  exclusionDays?: number;
  seed?: number;
  /** Latest selectable control date; defaults to yesterday. */
  today?: string;
};

export type ControlTarget = {
  location: number;
  date: string;
  observedAt: string;
};

/** Deterministic PRNG so a report can always be reproduced from its seed. */
export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function dayNumber(isoDate: string) {
  return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / MILLISECONDS_PER_DAY);
}

function isoFromDayNumber(day: number) {
  return new Date(day * MILLISECONDS_PER_DAY).toISOString().slice(0, 10);
}

function dayOfYear(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - start) / MILLISECONDS_PER_DAY) + 1;
}

/** Circular day-of-year distance, so late December and early January are near. */
export function seasonalDistance(left: string, right: string) {
  const delta = Math.abs(dayOfYear(left) - dayOfYear(right));
  return Math.min(delta, 365 - delta);
}

/**
 * Draws control dates at the same location and species set as each event, so
 * habitat, altitude and soil texture are matched by construction and only the
 * dynamic components differ. Candidates must sit inside the AROME archive, land
 * within the event's season, and stay clear of every known event at that
 * location (a nearby date is likely the same fruiting flush, not background).
 *
 * Presence-only data means a control day can still have been fruiting
 * unobserved, so discrimination measured against these controls is a lower
 * bound on the model's true skill.
 */
export function sampleControlDates(
  events: PrivateHistoricalFinding[],
  config: ControlConfig = {},
): ControlTarget[] {
  const {
    controlsPerEvent = DEFAULT_CONTROL_CONFIG.controlsPerEvent,
    seasonWindowDays = DEFAULT_CONTROL_CONFIG.seasonWindowDays,
    exclusionDays = DEFAULT_CONTROL_CONFIG.exclusionDays,
    seed = 1,
    today = new Date().toISOString().slice(0, 10),
  } = config;
  if (!Number.isInteger(controlsPerEvent) || controlsPerEvent < 0) {
    throw new Error("controlsPerEvent must be a non-negative integer");
  }

  const earliestDay = dayNumber(MINIMUM_AROME_ARCHIVE_DATE) + ARCHIVE_LEAD_IN_DAYS;
  const latestDay = dayNumber(today) - 1;
  const random = mulberry32(seed);

  // Events at the same coordinates share an exclusion set: a control must not
  // sit near ANY known finding at that spot, not just the one it pairs with.
  const eventDaysByPlace = new Map<string, number[]>();
  for (const event of events) {
    const key = `${event.latitude}|${event.longitude}`;
    const days = eventDaysByPlace.get(key) ?? [];
    days.push(dayNumber(event.observedAt.slice(0, 10)));
    eventDaysByPlace.set(key, days);
  }

  const controls: ControlTarget[] = [];
  events.forEach((event, index) => {
    const eventDate = event.observedAt.slice(0, 10);
    const excluded = eventDaysByPlace.get(`${event.latitude}|${event.longitude}`) ?? [];
    const candidates: number[] = [];
    for (let day = earliestDay; day <= latestDay; day += 1) {
      const candidate = isoFromDayNumber(day);
      if (seasonalDistance(candidate, eventDate) > seasonWindowDays) continue;
      if (excluded.some((eventDay) => Math.abs(day - eventDay) <= exclusionDays)) continue;
      candidates.push(day);
    }

    const picked = new Set<number>();
    const wanted = Math.min(controlsPerEvent, candidates.length);
    while (picked.size < wanted) {
      picked.add(candidates[Math.floor(random() * candidates.length)]);
    }
    for (const day of [...picked].sort((left, right) => left - right)) {
      const date = isoFromDayNumber(day);
      controls.push({
        location: index + 1,
        date,
        // Controls reuse the event's time of day so the scoring window aligns.
        observedAt: `${date}T${event.observedAt.slice(11)}`,
      });
    }
  });
  return controls;
}

export type WaterDetails = {
  soilWaterState: number;
  rainTrigger: number;
  atmosphericRetention: number;
  drySpellRetention: number;
  relativeExtractableWaterMean: number;
  relativeExtractableWaterFloor: number;
  vapourPressureDeficitKpa: number;
};

export type ReplayRaw = {
  habitat: number | null;
  altitude: number | null;
  effectiveHabitat: number | null;
  /** Habitat as the scored model weighted it; equals effectiveHabitat under v1. */
  habitatFactor?: number | null;
  phenology: number | null;
  water: number | null;
  waterDetails?: WaterDetails | null;
  temperature: number | null;
  extremes: number | null;
  fruitingConditions: number | null;
  opportunity: number | null;
};

export type ModelExponents = {
  waterExponent: number;
  triggerDependency: number;
  vpdExponent: number;
  drySpellExponent: number;
};

export type ComponentFactors = {
  phenology: number;
  water: number;
  temperature: number;
  extremes: number;
};

export type WaterFactors = {
  soilWaterState: number;
  trigger: number;
  vpdRetention: number;
  drySpellRetention: number;
};

/**
 * Decomposes fruiting conditions into the exact multipliers the production
 * model multiplies together, so attribution measures the real formula rather
 * than a reimplementation of it.
 */
export function componentFactors(
  raw: ReplayRaw,
  exponents: ModelExponents,
): ComponentFactors | null {
  const { phenology, water, temperature, extremes } = raw;
  if (phenology === null || water === null || temperature === null || extremes === null) {
    return null;
  }
  return {
    phenology,
    water: water ** exponents.waterExponent,
    temperature: temperature ** (1 - exponents.waterExponent),
    extremes,
  };
}

export function waterFactors(
  raw: ReplayRaw,
  exponents: ModelExponents,
): WaterFactors | null {
  const details = raw.waterDetails;
  if (!details) return null;
  return {
    soilWaterState: details.soilWaterState,
    trigger: (1 - exponents.triggerDependency) +
      exponents.triggerDependency * details.rainTrigger,
    vpdRetention: details.atmosphericRetention ** exponents.vpdExponent,
    drySpellRetention: details.drySpellRetention ** exponents.drySpellExponent,
  };
}

export function productOf(factors: Record<string, number>) {
  return Object.values(factors).reduce((total, value) => total * value, 1);
}

export type Bottleneck = {
  id: string;
  value: number;
  ranking: { id: string; value: number }[];
};

/** The factor that costs the most score is the one closest to zero. */
export function bottleneck(factors: Record<string, number>): Bottleneck {
  const ranking = Object.entries(factors)
    .map(([id, value]) => ({ id, value }))
    .sort((left, right) => left.value - right.value);
  if (ranking.length === 0) throw new Error("Bottleneck needs at least one factor");
  return { id: ranking[0].id, value: ranking[0].value, ranking };
}

/**
 * Score with one factor neutralised to 1, computed as the product of the
 * remaining factors so a zero factor stays recoverable (dividing would not).
 */
export function neutralizedScores(factors: Record<string, number>) {
  const entries = Object.entries(factors);
  return Object.fromEntries(entries.map(([id]) => [
    id,
    entries.reduce(
      (total, [otherId, value]) => otherId === id ? total : total * value,
      1,
    ),
  ]));
}

/** −ln(factor) is additive across a product, so it ranks score damage directly. */
export function logDamage(value: number) {
  if (!(value > 0)) return Number.POSITIVE_INFINITY;
  return -Math.log(value);
}

/** Rank-based AUC (Mann-Whitney U) with half credit for ties. */
export function mannWhitneyAuc(positives: number[], negatives: number[]) {
  if (positives.length === 0 || negatives.length === 0) return null;
  let wins = 0;
  for (const positive of positives) {
    for (const negative of negatives) {
      if (positive > negative) wins += 1;
      else if (positive === negative) wins += 0.5;
    }
  }
  return wins / (positives.length * negatives.length);
}

/** Where an event sits inside its own control distribution, 0-1. */
export function rankPercentile(value: number, comparisons: number[]) {
  if (comparisons.length === 0) return null;
  let below = 0;
  for (const comparison of comparisons) {
    if (value > comparison) below += 1;
    else if (value === comparison) below += 0.5;
  }
  return below / comparisons.length;
}

export function hitRates(scores: number[], thresholds: number[]) {
  return Object.fromEntries(thresholds.map((threshold) => [
    `atLeast${threshold}`,
    scores.length === 0
      ? null
      : scores.filter((score) => score >= threshold).length / scores.length,
  ]));
}

export function quantile(values: number[], fraction: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function distribution(values: number[]) {
  const finite = values.filter((value) => Number.isFinite(value));
  return {
    count: finite.length,
    min: finite.length ? Math.min(...finite) : null,
    p25: quantile(finite, 0.25),
    median: quantile(finite, 0.5),
    p75: quantile(finite, 0.75),
    max: finite.length ? Math.max(...finite) : null,
    mean: finite.length
      ? finite.reduce((total, value) => total + value, 0) / finite.length
      : null,
  };
}

export function mean(values: number[]) {
  const finite = values.filter((value) => Number.isFinite(value));
  return finite.length
    ? finite.reduce((total, value) => total + value, 0) / finite.length
    : null;
}
