import {
  extremeTemperatureMultiplier,
  missingHydrothermalFields,
  temperatureSuitability,
  waterSuitability,
} from "@/src/lib/hydrothermal";
import {
  calibrate,
  habitatWeight,
  missingHydrothermalFieldsV2,
  phenologyObservationDate,
  terrainThermalCorrection,
  waterSuitabilityV2,
} from "@/src/lib/hydrothermal-v2";
import { predictionModelVersion } from "@/src/lib/model-versions";
import type {
  ConditionSnapshot,
  ModelComponent,
  ModelComponentId,
  MonthlyPhenologyAnchors,
  SpeciesProfile,
  SuitabilityResult,
} from "@/src/lib/types";

const COMPONENT_LABELS: Record<ModelComponentId, string> = {
  habitatCoverage: "Coberta d’hàbitat compatible",
  altitude: "Idoneïtat altitudinal dins l’hàbitat",
  phenology: "Fenologia",
  water: "Estat hídric unificat",
  temperature: "Resposta tèrmica",
  extremes: "Exposició a gelada i calor",
};

function boundedFraction(value: number | undefined) {
  return value === undefined || !Number.isFinite(value)
    ? null
    : Math.max(0, Math.min(1, value / 100));
}

function roundIndex(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function availableValues(snapshot: ConditionSnapshot): ConditionSnapshot["values"] {
  if (!snapshot.unavailableFields.length) return snapshot.values;
  const unavailable = new Set(snapshot.unavailableFields);
  return Object.fromEntries(
    Object.entries(snapshot.values).filter(([field]) => !unavailable.has(field)),
  ) as ConditionSnapshot["values"];
}

function localDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const numberPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: numberPart("year"),
    month: numberPart("month"),
    day: numberPart("day"),
    hour: numberPart("hour"),
    minute: numberPart("minute"),
    second: numberPart("second"),
  };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Interpolates explicit month-centre anchors without discontinuities at month
 * boundaries. Calendar arithmetic is performed in Europe/Madrid because the
 * public phenology catalogue is defined in local ecological time.
 */
export function phenologySuitability(
  observedAt: string,
  anchors: MonthlyPhenologyAnchors,
) {
  const date = new Date(observedAt);
  if (Number.isNaN(date.getTime())) return null;
  const local = localDateParts(date);
  if (![local.year, local.month, local.day, local.hour, local.minute, local.second]
    .every(Number.isFinite)) return null;

  const currentIndex = local.month - 1;
  const dayFraction = (local.hour + local.minute / 60 + local.second / 3600) / 24;
  let startIndex: number;
  let endIndex: number;
  let progress: number;
  if (local.day >= 15) {
    startIndex = currentIndex;
    endIndex = (currentIndex + 1) % 12;
    progress = (local.day - 15 + dayFraction) / daysInMonth(local.year, local.month);
  } else {
    startIndex = (currentIndex + 11) % 12;
    endIndex = currentIndex;
    const previousMonth = local.month === 1 ? 12 : local.month - 1;
    const previousYear = local.month === 1 ? local.year - 1 : local.year;
    const intervalDays = daysInMonth(previousYear, previousMonth);
    progress = (intervalDays - 15 + local.day + dayFraction) / intervalDays;
  }
  const eased = (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, progress)))) / 2;
  return anchors[startIndex] * (1 - eased) + anchors[endIndex] * eased;
}

function state(score: number | null): ModelComponent["state"] {
  return score === null
    ? "unknown"
    : score >= 70
      ? "favourable"
      : score >= 45
        ? "mixed"
        : "unfavourable";
}

function component(id: ModelComponentId, fraction: number | null): ModelComponent {
  const score = fraction === null ? null : roundIndex(fraction * 100);
  return { id, label: COMPONENT_LABELS[id], score, state: state(score) };
}

function resultFrom({
  components,
  modelVersion,
  fruitingConditionsScore,
  opportunityIndex,
  rawHabitatCoverage,
  effectiveHabitatCoverage,
}: {
  components: ModelComponent[];
  modelVersion: string;
  fruitingConditionsScore: number | null;
  opportunityIndex: number | null;
  rawHabitatCoverage: number | null;
  effectiveHabitatCoverage: number | null;
}): SuitabilityResult {
  const missingComponents = components
    .filter((item) => item.score === null)
    .map((item) => item.id);
  return {
    score: opportunityIndex,
    fruitingConditionsScore,
    opportunityIndex,
    rawHabitatCoverage,
    effectiveHabitatCoverage,
    label: opportunityIndex === null ? "sense dades" : opportunityLabel(opportunityIndex),
    components,
    modelVersion,
    dataCompleteness: (components.length - missingComponents.length) / components.length,
    missingComponents,
  };
}

/**
 * Required environmental fields for whichever model version scores a species.
 * Both versions read the same inputs today; keeping one dispatch point means a
 * v2-only field cannot silently bypass the availability check.
 */
export function missingModelFields(
  species: SpeciesProfile,
  values: ConditionSnapshot["values"],
) {
  const model = species.modelConfig;
  if (model.status !== "supported") return [];
  return model.model === "hydrothermal-v2"
    ? missingHydrothermalFieldsV2(values, model.water, model.temperature)
    : missingHydrothermalFields(values, model.water, model.temperature);
}

export function calculateSuitability(
  species: SpeciesProfile,
  snapshot: ConditionSnapshot,
): SuitabilityResult {
  const model = species.modelConfig;
  const modelVersion = predictionModelVersion(model.version);
  const values = availableValues(snapshot);
  const rawHabitatCoverage = boundedFraction(values.habitatCoveragePercent);
  const altitude = boundedFraction(values.habitatAltitudeSuitability);
  const effectiveHabitatCoverage = rawHabitatCoverage === null || altitude === null
    ? rawHabitatCoverage === 0 || altitude === 0 ? 0 : null
    : rawHabitatCoverage * altitude;

  if (model.status === "habitat-only" || species.predictionMode === "habitat_only") {
    const components = [
      component("habitatCoverage", rawHabitatCoverage),
      component("altitude", altitude),
      component("phenology", null),
      component("water", null),
      component("temperature", null),
      component("extremes", null),
    ];
    return resultFrom({
      components,
      modelVersion,
      fruitingConditionsScore: null,
      opportunityIndex: null,
      rawHabitatCoverage,
      effectiveHabitatCoverage,
    });
  }

  const phenology = phenologySuitability(
    model.model === "hydrothermal-v2"
      ? phenologyObservationDate(
          snapshot.observedAt,
          values.altitudeM,
          model.phenology.altitudeShift,
        )
      : snapshot.observedAt,
    model.phenology.monthlyAnchors,
  );
  const hardHabitatExclusion = effectiveHabitatCoverage === 0;
  const hardSeasonalExclusion = phenology === 0;

  if (snapshot.stale) {
    const components = [
      component("habitatCoverage", rawHabitatCoverage),
      component("altitude", altitude),
      component("phenology", phenology),
      component("water", null),
      component("temperature", null),
      component("extremes", null),
    ];
    return resultFrom({
      components,
      modelVersion,
      fruitingConditionsScore: hardSeasonalExclusion ? 0 : null,
      opportunityIndex: hardHabitatExclusion || hardSeasonalExclusion ? 0 : null,
      rawHabitatCoverage,
      effectiveHabitatCoverage,
    });
  }

  const water = model.model === "hydrothermal-v2"
    ? waterSuitabilityV2(values, model.water)?.score ?? null
    : waterSuitability(values, model.water)?.score ?? null;
  // v2 reads the window means at the cell's true altitude rather than the
  // provider grid's representative elevation.
  const thermalValues = model.model === "hydrothermal-v2"
    ? { ...values, ...terrainThermalCorrection(values) }
    : values;
  const temperature = temperatureSuitability(thermalValues, model.temperature);
  const extremes = extremeTemperatureMultiplier(thermalValues, model.temperature);
  const components = [
    component("habitatCoverage", rawHabitatCoverage),
    component("altitude", altitude),
    component("phenology", phenology),
    component("water", water),
    component("temperature", temperature),
    component("extremes", extremes),
  ];

  if (
    rawHabitatCoverage === null ||
    altitude === null ||
    phenology === null ||
    water === null ||
    temperature === null ||
    extremes === null
  ) {
    return resultFrom({
      components,
      modelVersion,
      fruitingConditionsScore: hardSeasonalExclusion ? 0 : null,
      opportunityIndex: hardHabitatExclusion || hardSeasonalExclusion ? 0 : null,
      rawHabitatCoverage,
      effectiveHabitatCoverage,
    });
  }

  const rawFruitingConditions =
    phenology *
    water ** model.water.waterExponent *
    temperature ** (1 - model.water.waterExponent) *
    extremes;
  // v2 applies a versioned calibration to the raw product, and weights habitat
  // concavely so that a partly compatible cell can still reach the upper bands.
  const fruitingConditions = model.model === "hydrothermal-v2"
    ? calibrate(rawFruitingConditions, model.combination.calibrationGamma)
    : rawFruitingConditions;
  const habitatFactor = model.model === "hydrothermal-v2"
    ? habitatWeight(effectiveHabitatCoverage ?? 0, model.combination.habitatExponent)
    : effectiveHabitatCoverage ?? 0;
  const fruitingConditionsScore = roundIndex(fruitingConditions * 100);
  const opportunityIndex = roundIndex(habitatFactor * fruitingConditions * 100);

  return resultFrom({
    components,
    modelVersion,
    fruitingConditionsScore,
    opportunityIndex,
    rawHabitatCoverage,
    effectiveHabitatCoverage,
  });
}

export function opportunityLabel(
  score: number,
): Exclude<SuitabilityResult["label"], "sense dades"> {
  return score >= 80
    ? "molt alta"
    : score >= 60
      ? "alta"
      : score >= 40
        ? "mitjana"
        : score >= 20
          ? "baixa"
          : "molt baixa";
}
