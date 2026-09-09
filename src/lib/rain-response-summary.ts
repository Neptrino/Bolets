import type {
  FruitingModelConfig,
  PhenologyAltitudeShift,
  WaterModelParametersV2,
} from "@/src/lib/types";

/**
 * Public, derived reading of the hydrothermal-v2 water response. Every number
 * here is computed from the shipped model parameters so the species page, the
 * map cell detail and the rain guide stay true after every refit instead of
 * carrying hand-written thresholds.
 */

export type ScoredRainWindow = {
  /** First day of the scored window, counted back from today (1 = last 24 h). */
  startDaysAgo: number;
  /** Last day of the scored window, counted back from today. */
  endDaysAgo: number;
  lengthDays: number;
  /** True when the fresh week or fortnight is left out because the flush trails it. */
  excludesRecent: boolean;
  /** Net rain (after interception and evaporation) at half of the rain response. */
  halfResponseNetMm: number;
  /** Net rain at nine tenths of the rain response. */
  nearFullNetMm: number;
  /** Gauge rain that typically yields the half response in an autumn window. */
  typicalHalfResponseMm: number;
  /** Gauge rain that typically yields nine tenths of the response in autumn. */
  typicalNearFullMm: number;
};

/**
 * Reference evapotranspiration assumed when translating net rain back into
 * gauge millimetres for a reader. Catalan forests lose roughly 3 mm/day in
 * September and just over 1 mm/day in November; 2.5 keeps the printed figure
 * honest for the main autumn season without claiming a per-day forecast.
 */
export const TYPICAL_AUTUMN_ET0_MM_PER_DAY = 2.5;

const NEAR_FULL_RESPONSE = 0.9;

function hillInverse(response: number, halfSaturation: number) {
  if (!(response > 0 && response < 1)) {
    throw new RangeError("A Hill response can only be inverted strictly inside (0, 1)");
  }
  return halfSaturation * Math.sqrt(response / (1 - response));
}

function roundToFive(value: number) {
  return Math.max(5, Math.round(value / 5) * 5);
}

export function scoredRainWindow(water: WaterModelParametersV2): ScoredRainWindow {
  const excludesRecent = water.recentRainWeight < 1;
  const startDaysAgo = excludesRecent ? water.recentWindowDays + 1 : 1;
  const endDaysAgo = water.rainfallWindowDays;
  if (startDaysAgo > endDaysAgo) {
    throw new RangeError("The recent-rain exclusion cannot cover the whole rain window");
  }
  const lengthDays = endDaysAgo - startDaysAgo + 1;
  const halfResponseNetMm = water.rainfallHalfSaturationMm;
  const nearFullNetMm = hillInverse(NEAR_FULL_RESPONSE, water.rainfallHalfSaturationMm);
  // A typical episode in the window: as many wet days as the wet-day term
  // half-saturates on, plus half the reference evaporation of the window.
  const typicalDeductionMm =
    Math.round(water.wetDaysHalfSaturation) +
    0.5 * TYPICAL_AUTUMN_ET0_MM_PER_DAY * lengthDays;
  return {
    startDaysAgo,
    endDaysAgo,
    lengthDays,
    excludesRecent,
    halfResponseNetMm,
    nearFullNetMm,
    typicalHalfResponseMm: roundToFive(halfResponseNetMm + typicalDeductionMm),
    typicalNearFullMm: roundToFive(nearFullNetMm + typicalDeductionMm),
  };
}

export function scoredRainWindowForModel(config: FruitingModelConfig) {
  return config.status === "supported" && config.model === "hydrothermal-v2"
    ? scoredRainWindow(config.water)
    : null;
}

/** "entre 15 i 26 dies abans" or "els últims 14 dies". */
export function rainWindowPhrase(window: ScoredRainWindow) {
  return window.excludesRecent
    ? `entre ${window.startDaysAgo} i ${window.endDaysAgo} dies abans`
    : `els últims ${window.endDaysAgo} dies`;
}

/**
 * The one-sentence answer a forager wants, phrased from the parameters as
 * species behaviour: which days' rain it responds to and how much moves it.
 */
export function rainWindowSentence(window: ScoredRainWindow) {
  const when = window.excludesRecent
    ? `caiguts ${rainWindowPhrase(window)}`
    : `en ${rainWindowPhrase(window)}`;
  return `Amb uns ${window.typicalHalfResponseMm} mm ${when} comença a sortir; amb ${window.typicalNearFullMm} mm, surt amb força.`;
}

export type RainResponseState = {
  /** Fraction of the effective-rain term, 0 to 1. */
  response: number;
  label: "escassa" | "parcial" | "gairebé plena" | "plena";
};

/** Where a measured net-rain total sits on the species' response curve. */
export function rainResponseState(
  netRainMm: number,
  water: Pick<WaterModelParametersV2, "rainfallHalfSaturationMm">,
): RainResponseState {
  const squared = Math.max(0, netRainMm) ** 2;
  const response = squared / (squared + water.rainfallHalfSaturationMm ** 2);
  const label = response >= NEAR_FULL_RESPONSE
    ? "plena"
    : response >= 0.75
      ? "gairebé plena"
      : response >= 0.25
        ? "parcial"
        : "escassa";
  return { response, label };
}

export type AltitudeCalendarShift = {
  daysPer100m: number;
  referenceAltitudeM: number;
  maxShiftDays: number;
  /** Days the calendar runs ahead at the top of the species' altitude range. */
  daysAheadAtTop: number;
  topAltitudeM: number;
  /** Days the calendar runs behind at the bottom of the species' altitude range. */
  daysBehindAtBottom: number;
  bottomAltitudeM: number;
};

export function altitudeCalendarShift(
  shift: PhenologyAltitudeShift | undefined,
  altitudeRange: readonly [number, number],
): AltitudeCalendarShift | null {
  if (!shift) return null;
  const [bottomAltitudeM, topAltitudeM] = altitudeRange;
  const days = (altitudeM: number) => {
    const raw = ((altitudeM - shift.referenceAltitudeM) / 100) * shift.daysPer100m;
    return Math.max(-shift.maxShiftDays, Math.min(shift.maxShiftDays, raw));
  };
  return {
    daysPer100m: shift.daysPer100m,
    referenceAltitudeM: shift.referenceAltitudeM,
    maxShiftDays: shift.maxShiftDays,
    daysAheadAtTop: Math.round(days(topAltitudeM)),
    topAltitudeM,
    daysBehindAtBottom: Math.round(-days(bottomAltitudeM)),
    bottomAltitudeM,
  };
}

export function altitudeCalendarSentence(shift: AltitudeCalendarShift) {
  if (shift.daysAheadAtTop < 1 && shift.daysBehindAtBottom < 1) return null;
  return `El calendari es llegeix segons l’altitud: a ${shift.topAltitudeM} m va uns ${shift.daysAheadAtTop} dies avançat i a ${shift.bottomAltitudeM} m uns ${shift.daysBehindAtBottom} dies endarrerit respecte als ${shift.referenceAltitudeM} m.`;
}

export type RainWindowGroup = {
  window: ScoredRainWindow;
  speciesNames: string[];
};

/**
 * Groups species that share a scored window and thresholds, ordered from the
 * fastest flush to the slowest, for the rain guide's table.
 */
export function groupSpeciesByRainWindow(
  species: ReadonlyArray<{ commonName: string; modelConfig: FruitingModelConfig }>,
): RainWindowGroup[] {
  const groups = new Map<string, RainWindowGroup>();
  for (const item of species) {
    const window = scoredRainWindowForModel(item.modelConfig);
    if (!window) continue;
    const key = [
      window.startDaysAgo,
      window.endDaysAgo,
      window.typicalHalfResponseMm,
      window.typicalNearFullMm,
    ].join(":");
    const group = groups.get(key) ?? { window, speciesNames: [] };
    group.speciesNames.push(item.commonName);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      speciesNames: [...group.speciesNames].sort((left, right) => left.localeCompare(right, "ca")),
    }))
    .sort((left, right) =>
      left.window.startDaysAgo - right.window.startDaysAgo ||
      left.window.endDaysAgo - right.window.endDaysAgo ||
      left.window.typicalHalfResponseMm - right.window.typicalHalfResponseMm,
    );
}
