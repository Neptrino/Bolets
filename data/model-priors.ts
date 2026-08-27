import type {
  CombinationModelParameters,
  FruitingGuild,
  FruitingModelConfig,
  Month,
  MonthlyPhenologyAnchors,
  SeasonalActivity,
  TemperatureModelParameters,
  WaterModelParameters,
  WaterModelParametersV2,
} from "@/src/lib/types";
import {
  HABITAT_ONLY_MODEL_VERSION,
  HYDROTHERMAL_PRIOR_VERSION,
  HYDROTHERMAL_V2_PRIOR_VERSION,
  speciesUsesHydrothermalV2,
} from "@/src/lib/model-versions";

// These values are versioned expert priors, not fitted coefficients. The
// cited studies support the response structure and time scale; any later
// numerical revision must bump the model-config version below.
type SupportedGuild = Exclude<FruitingGuild, "hypogeous">;

type SupportedCatalogueEntry = {
  status: "supported";
  guild: SupportedGuild;
  water?: Partial<WaterModelParametersV2>;
  temperature?: Partial<TemperatureModelParameters>;
  evidence?: {
    status: "expert-prior" | "species-literature";
    citations: readonly string[];
  };
};

type HabitatOnlyCatalogueEntry = {
  status: "habitat-only";
  guild: "hypogeous";
  evidence: {
    status: "unsupported";
    citations: readonly string[];
  };
};

// Frost half-lives were raised 8x on 2026-08-16: dated montane finds fruited
// through substantial accumulated sub-zero hours (findings conditions AUC
// 0.654 -> 0.691, events at 40+: 64% -> 73%), and a lag variant that only
// forgave recent frost changed nothing, so this is genuine tolerance rather
// than timing. The exponential kill is kept for sustained deep frost.
const GUILD_PRIORS: Record<SupportedGuild, {
  water: WaterModelParameters;
  temperature: TemperatureModelParameters;
}> = {
  ectomycorrhizal: {
    water: {
      waterExponent: 0.6,
      moistureWindowDays: 7,
      rewBand: [0.15, 0.5, 0.9, 1.2],
      rainfallWindowDays: 21,
      rainfallHalfSaturationMm: 25,
      wetDaysHalfSaturation: 4,
      triggerDependency: 0.35,
      drySpellGraceDays: 3,
      drySpellDecayDays: 14,
      drySpellExponent: 0.25,
      vpdComfortKpa: 0.8,
      vpdDecayKpa: 1,
      vpdExponent: 0.15,
    },
    temperature: {
      windowDays: 20,
      optimumC: 13,
      coldHalfWidthC: 4,
      warmHalfWidthC: 5,
      frostHalfLifeHours: 32,
      heatHalfLifeHours: 12,
    },
  },
  "litter-soil-saprotroph": {
    water: {
      waterExponent: 0.65,
      moistureWindowDays: 7,
      rewBand: [0.15, 0.55, 0.9, 1.15],
      rainfallWindowDays: 14,
      rainfallHalfSaturationMm: 20,
      wetDaysHalfSaturation: 3,
      triggerDependency: 0.5,
      drySpellGraceDays: 2,
      drySpellDecayDays: 8,
      drySpellExponent: 0.35,
      vpdComfortKpa: 0.8,
      vpdDecayKpa: 0.8,
      vpdExponent: 0.25,
    },
    temperature: {
      windowDays: 14,
      optimumC: 12,
      coldHalfWidthC: 4,
      warmHalfWidthC: 5,
      frostHalfLifeHours: 32,
      heatHalfLifeHours: 12,
    },
  },
  "wood-decayer": {
    water: {
      waterExponent: 0.55,
      moistureWindowDays: 7,
      rewBand: [0.1, 0.4, 1, 1.35],
      rainfallWindowDays: 21,
      rainfallHalfSaturationMm: 25,
      wetDaysHalfSaturation: 4,
      triggerDependency: 0.2,
      drySpellGraceDays: 5,
      drySpellDecayDays: 21,
      drySpellExponent: 0.15,
      vpdComfortKpa: 1,
      vpdDecayKpa: 1.2,
      vpdExponent: 0.1,
    },
    temperature: {
      windowDays: 14,
      optimumC: 12,
      coldHalfWidthC: 5,
      warmHalfWidthC: 6,
      frostHalfLifeHours: 96,
      heatHalfLifeHours: 24,
    },
  },
  grassland: {
    water: {
      waterExponent: 0.65,
      moistureWindowDays: 7,
      rewBand: [0.15, 0.5, 0.85, 1.1],
      rainfallWindowDays: 14,
      rainfallHalfSaturationMm: 20,
      wetDaysHalfSaturation: 3,
      triggerDependency: 0.45,
      drySpellGraceDays: 2,
      drySpellDecayDays: 10,
      drySpellExponent: 0.3,
      vpdComfortKpa: 0.8,
      vpdDecayKpa: 0.8,
      vpdExponent: 0.25,
    },
    temperature: {
      windowDays: 14,
      optimumC: 11,
      coldHalfWidthC: 4,
      warmHalfWidthC: 5,
      frostHalfLifeHours: 32,
      heatHalfLifeHours: 12,
    },
  },
};

const GUILD_PRIOR_CITATIONS = [
  "https://doi.org/10.1016/j.agrformet.2016.03.015",
  "https://doi.org/10.1016/j.agrformet.2017.10.024",
] as const;

/**
 * v2 parameters revised against dated fruiting observations rather than expert
 * judgement alone; see docs/fruiting-model-diagnosis.md for the measurements
 * behind each change. The response structure and its citations are unchanged —
 * these are re-weightings of inputs whose reliability was measured.
 */

/**
 * Confidence in the modelled 3-9 cm soil series. It was anti-predictive at
 * observed finds (AUC 0.145) and degrades with altitude (r = -0.73). While
 * past rain was itself modelled, 0.15 kept the term alive at near-zero cost;
 * once station-rain-v1 replaced past rain with gauge measurements, the
 * 2026-08-16 refit sweep showed the modelled-soil residue only subtracts
 * (conditions AUC 0.605 at w=0.15 versus 0.620 at zero on the mixed set, and
 * raising it to 0.3 fell to 0.590), so the term is switched off. The
 * structure stays: a trustworthy observation source (CLMS 1 km SWI) earns a
 * positive weight here after a season of shadow validation.
 */
const COARSE_SOIL_WEIGHT = 0;
/** Below-band soil no longer means "impossible", only "unfavourable". */
const SOIL_DRY_FLOOR = 0.25;
/** Waterlogging never zeroed an observed find, so the wet tail is gentler. */
const SOIL_WET_FLOOR = 0.4;
/** A rainless window is real evidence, so the rain floor stays low. */
const RAIN_FLOOR = 0.1;
/** v1 gave the 7-day soil minimum 0.25; one dry hour in a coarse cell is weak. */
const SOIL_FLOOR_WEIGHT = 0.15;
/**
 * Editorial temperature ranges describe daytime conditions but are scored
 * against 14-20 day means that include nights. Observed finds sat 4.0 degrees
 * below their species optimum on montane data and 1.1 on lowland records.
 */
const TEMPERATURE_OPTIMUM_SHIFT_C = 3;

/**
 * Calendar days read ahead per 100 m above the species' reference altitude.
 * Fitted cluster across dated autumn observations: 25-40 days earlier per
 * 1000 m (L. deliciosus -27 d, A. muscaria -27 d, T. terreum -30 d,
 * A. phalloides -34 d). Applied only to autumn-shaped calendars; spring
 * calendars shift the opposite way and are left unshifted until fitted.
 */
const PHENOLOGY_SHIFT_DAYS_PER_100M = 3;
const PHENOLOGY_SHIFT_MAX_DAYS = 45;

/**
 * A calendar is autumn-shaped when its strongest month falls in
 * August-December and spring never rises above "moderate". Detected from the
 * anchors themselves so no per-species list can drift out of date.
 */
function isAutumnCalendar(anchors: MonthlyPhenologyAnchors) {
  const strongest = anchors.indexOf(Math.max(...anchors));
  const springMax = Math.max(anchors[2], anchors[3], anchors[4], anchors[5]);
  return strongest >= 7 && springMax <= 0.5;
}

const COMBINATION_V2: CombinationModelParameters = {
  // A 30% compatible cell could never exceed a score of 30 under v1, leaving
  // the upper bands unreachable at most observed finds.
  habitatExponent: 0.4,
  // Fitted on abundance-graded findings against modelled rain (0.8), then
  // refitted 2026-08-16 when station-rain-v1 replaced past rain with gauge
  // measurements: measured windows carry less rain than AROME's phantom
  // storms did, and 0.7 restores observed finds to their bands (events at
  // conditions >= 40: 50% -> 58% mixed set, 51% -> 64% on graded findings)
  // while background days stay put. Monotone, so discrimination is unchanged
  // by construction.
  calibrationGamma: 0.7,
};

/**
 * v2 scores matured rain: for slow guilds the last seven days are excluded
 * from the rain window because fruiting bodies found today developed before
 * them (see rainfallWindow in hydrothermal-v2.ts). Fitted 2026-08-16 with
 * the 7-day exclusion under gauge rain: findings conditions AUC
 * 0.691 -> 0.723, and a same-week storm false positive fell from 48 to 31.
 * Fast saprotrophs fruit within days of rain — the dated grassland finds
 * (spring fairy rings) lost 14-18 conditions points under the exclusion —
 * so those guilds keep the plain trailing window.
 */
const RECENT_RAIN_WEIGHT_BY_GUILD: Record<SupportedGuild, number> = {
  ectomycorrhizal: 0,
  "wood-decayer": 0,
  "litter-soil-saprotroph": 1,
  grassland: 1,
};

/**
 * The saturation constants were fitted to full trailing windows, so guilds
 * that exclude the fresh week shrink them to match the shorter accumulation
 * (0.7 restores band hit-rates while keeping the exclusion's discrimination
 * gain); guilds that keep the full window keep their original constants.
 */
const MATURED_RAIN_HALF_SATURATION_SCALE = 0.7;

function halfSaturationScale(recentRainWeight: number) {
  return MATURED_RAIN_HALF_SATURATION_SCALE +
    (1 - MATURED_RAIN_HALF_SATURATION_SCALE) * recentRainWeight;
}

function hydrothermalV2Config({
  guild,
  prior,
  temperatureMidpoint,
  waterOverrides,
  temperatureOverrides,
  monthlyAnchors,
  altitudeRange,
  evidence,
}: {
  guild: SupportedGuild;
  prior: { water: WaterModelParameters; temperature: TemperatureModelParameters };
  temperatureMidpoint: number;
  waterOverrides?: Partial<WaterModelParametersV2>;
  temperatureOverrides?: Partial<TemperatureModelParameters>;
  monthlyAnchors: MonthlyPhenologyAnchors;
  altitudeRange?: readonly [number, number];
  evidence?: { status: "expert-prior" | "species-literature"; citations: readonly string[] };
}): FruitingModelConfig {
  // The matured-rain scale applies to the resolved value so species-level
  // half-saturation overrides shrink with the shortened window too.
  const water = { ...waterParametersV2(prior.water, guild), ...(waterOverrides ?? {}) };
  const scale = halfSaturationScale(water.recentRainWeight);
  water.rainfallHalfSaturationMm *= scale;
  water.wetDaysHalfSaturation *= scale;
  return {
    model: "hydrothermal-v2" as const,
    version: HYDROTHERMAL_V2_PRIOR_VERSION,
    status: "supported" as const,
    guild,
    water,
    // v2 keeps the guild's asymmetric half-widths instead of replacing them
    // with the editorial half-range, and shifts the optimum down towards the
    // multi-day mean the model actually scores.
    temperature: {
      ...prior.temperature,
      optimumC: temperatureMidpoint - TEMPERATURE_OPTIMUM_SHIFT_C,
      ...(temperatureOverrides ?? {}),
    },
    combination: { ...COMBINATION_V2 },
    phenology: {
      monthlyAnchors,
      ...(altitudeRange && isAutumnCalendar(monthlyAnchors)
        ? {
            altitudeShift: {
              daysPer100m: PHENOLOGY_SHIFT_DAYS_PER_100M,
              referenceAltitudeM: (altitudeRange[0] + altitudeRange[1]) / 2,
              maxShiftDays: PHENOLOGY_SHIFT_MAX_DAYS,
            },
          }
        : {}),
    },
    evidence: evidence
      ? { status: evidence.status, citations: [...evidence.citations] }
      : { status: "expert-prior" as const, citations: [...GUILD_PRIOR_CITATIONS] },
  };
}

/**
 * Builds the v2 counterpart of a shipped v1 config using the same production
 * constants. Shadow evaluation scores both versions from one source of truth,
 * so a validated v2 config cannot drift from the one a cutover would ship.
 */
export function hydrothermalV2ConfigFrom(
  config: Extract<FruitingModelConfig, { status: "supported"; model: "hydrothermal-v1" }>,
): FruitingModelConfig {
  const prior = GUILD_PRIORS[config.guild];
  // v1 replaced the guild half-widths with the editorial half-range, so the
  // shipped optimum is the editorial midpoint that v2 shifts down.
  return hydrothermalV2Config({
    guild: config.guild,
    prior,
    temperatureMidpoint: config.temperature.optimumC,
    temperatureOverrides: {
      frostHalfLifeHours: config.temperature.frostHalfLifeHours,
      heatHalfLifeHours: config.temperature.heatHalfLifeHours,
      windowDays: config.temperature.windowDays,
    },
    monthlyAnchors: config.phenology.monthlyAnchors,
    evidence: config.evidence,
  });
}

function waterParametersV2(
  prior: WaterModelParameters,
  guild: SupportedGuild,
): WaterModelParametersV2 {
  // triggerDependency is intentionally dropped: v2 weights the rain estimator
  // through soilWeight instead of damping it into a fixed range.
  const shared: Omit<WaterModelParameters, "triggerDependency"> = {
    waterExponent: prior.waterExponent,
    moistureWindowDays: prior.moistureWindowDays,
    rewBand: prior.rewBand,
    rainfallWindowDays: prior.rainfallWindowDays,
    rainfallHalfSaturationMm: prior.rainfallHalfSaturationMm,
    wetDaysHalfSaturation: prior.wetDaysHalfSaturation,
    drySpellGraceDays: prior.drySpellGraceDays,
    drySpellDecayDays: prior.drySpellDecayDays,
    drySpellExponent: prior.drySpellExponent,
    vpdComfortKpa: prior.vpdComfortKpa,
    vpdDecayKpa: prior.vpdDecayKpa,
    vpdExponent: prior.vpdExponent,
  };
  return {
    ...shared,
    soilWeight: COARSE_SOIL_WEIGHT,
    soilFloorWeight: SOIL_FLOOR_WEIGHT,
    soilDryFloor: SOIL_DRY_FLOOR,
    soilWetFloor: SOIL_WET_FLOOR,
    rainFloor: RAIN_FLOOR,
    recentRainWeight: RECENT_RAIN_WEIGHT_BY_GUILD[guild],
    recentWindowDays: 7 as const,
  };
}

const MONTHS = [
  "gen", "feb", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "oct", "nov", "des",
] as const satisfies readonly Month[];

const PHENOLOGY_ANCHOR: Record<SeasonalActivity, number> = {
  inactive: 0,
  possible: 0.25,
  moderate: 0.5,
  good: 0.8,
  peak: 1,
};

function phenologyAnchors(
  seasonality: Readonly<Record<Month, SeasonalActivity>>,
): MonthlyPhenologyAnchors {
  const anchor = (month: Month) => PHENOLOGY_ANCHOR[seasonality[month]];
  return [
    anchor(MONTHS[0]), anchor(MONTHS[1]), anchor(MONTHS[2]),
    anchor(MONTHS[3]), anchor(MONTHS[4]), anchor(MONTHS[5]),
    anchor(MONTHS[6]), anchor(MONTHS[7]), anchor(MONTHS[8]),
    anchor(MONTHS[9]), anchor(MONTHS[10]), anchor(MONTHS[11]),
  ];
}

export const TUBER_SHORT_TERM_CAVEAT =
  "La tòfona negra és hipogea i es desenvolupa durant mesos. El mapa només pot indicar compatibilitat edàfica i forestal; el model meteorològic de curt termini no calcula la probabilitat de trobar tòfones madures.";

const SPECIES_MODEL_CATALOGUE = {
  "rubroboletus-satanas": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "tylopilus-felleus": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "amanita-muscaria": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "cortinarius-rubellus": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "omphalotus-olearius": {
    status: "supported", guild: "wood-decayer",
  },
  "boletus-edulis": {
    status: "supported", guild: "ectomycorrhizal",
    // The 14-day recent exclusion shifts the matured-rain window to rain
    // fallen 15-26 days ago: cep flushes trailed the storms by ~2 weeks in
    // both observed seasons (2025-09 peak, 2026-08 ramp), and the shifted
    // window validated cross-set on the private findings + GBIF replay
    // (2026-08-27, refit/q-blag-A).
    water: { rainfallWindowDays: 26, recentWindowDays: 14 },
    temperature: {
      windowDays: 20,
      optimumC: 13.5,
      coldHalfWidthC: 3.5,
      warmHalfWidthC: 4.5,
    },
    evidence: {
      status: "species-literature",
      citations: [
        // The current preprint reports a roughly 20-day temperature response
        // and 26-day rainfall accumulation for B. edulis fruiting.
        "https://doi.org/10.64898/2025.12.12.693895",
      ],
    },
  },
  // The other boletus species share edulis's slow flush: same shifted
  // matured-rain window (rain 15-26 days ago).
  "boletus-pinophilus": {
    status: "supported", guild: "ectomycorrhizal",
    water: { rainfallWindowDays: 26, recentWindowDays: 14 },
  },
  "boletus-aereus": {
    status: "supported", guild: "ectomycorrhizal",
    water: { rainfallWindowDays: 26, recentWindowDays: 14 },
  },
  "boletus-reticulatus": {
    status: "supported", guild: "ectomycorrhizal",
    water: { rainfallWindowDays: 26, recentWindowDays: 14 },
  },
  "lactarius-deliciosus": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "lactarius-sanguifluus": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "cantharellus-cibarius": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "craterellus-lutescens": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "craterellus-cornucopioides": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "hydnum-repandum": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "macrolepiota-procera": {
    status: "supported", guild: "litter-soil-saprotroph",
  },
  "tricholoma-terreum": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "hygrophorus-latitabundus": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "amanita-caesarea": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "marasmius-oreades": {
    status: "supported", guild: "grassland",
  },
  "calocybe-gambosa": {
    status: "supported", guild: "grassland",
  },
  "hygrophorus-russula": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "morchella-esculenta": {
    status: "supported", guild: "litter-soil-saprotroph",
  },
  "lepista-nuda": {
    status: "supported", guild: "litter-soil-saprotroph",
  },
  "suillus-luteus": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "chroogomphus-rutilus": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "ramaria-aurea": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "agaricus-campestris": {
    status: "supported", guild: "grassland",
  },
  "pleurotus-ostreatus": {
    status: "supported", guild: "wood-decayer",
  },
  "hygrophorus-eburneus": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "craterellus-tubaeformis": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "amanita-pantherina": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "amanita-verna": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "amanita-virosa": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "clitocybe-rivulosa": {
    status: "supported", guild: "grassland",
  },
  "coprinus-comatus": {
    status: "supported", guild: "grassland",
  },
  "cortinarius-orellanus": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "cyclocybe-cylindracea": {
    status: "supported", guild: "wood-decayer",
  },
  "entoloma-sinuatum": {
    status: "supported", guild: "litter-soil-saprotroph",
  },
  "galerina-marginata": {
    status: "supported", guild: "wood-decayer",
  },
  "gyromitra-esculenta": {
    status: "supported", guild: "litter-soil-saprotroph",
  },
  "hygrophorus-marzuolus": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "inocybe-erubescens": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "lepiota-brunneoincarnata": {
    status: "supported", guild: "litter-soil-saprotroph",
  },
  "paxillus-involutus": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "pleurotus-eryngii": {
    status: "supported", guild: "grassland",
  },
  "russula-virescens": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "suillus-granulatus": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "tricholoma-pardinum": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "tricholoma-portentosum": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "tuber-melanosporum": {
    status: "habitat-only",
    guild: "hypogeous",
    evidence: {
      status: "unsupported",
      citations: [],
    },
  },
  "amanita-phalloides": {
    status: "supported", guild: "ectomycorrhizal",
  },
} as const satisfies Record<string, SupportedCatalogueEntry | HabitatOnlyCatalogueEntry>;

export function modelConfigForSpecies(
  speciesId: string,
  temperatureRange: readonly [number, number],
  seasonality: Readonly<Record<Month, SeasonalActivity>>,
  // v1/v2 dispatch normally follows HYDROTHERMAL_V2_SPECIES; regression tests
  // and dual-model shadow replays force the legacy branch explicitly.
  forceModel?: "hydrothermal-v1",
  altitudeRange?: readonly [number, number],
): FruitingModelConfig {
  const entry = SPECIES_MODEL_CATALOGUE[speciesId as keyof typeof SPECIES_MODEL_CATALOGUE];
  if (!entry) throw new Error(`Missing hydrothermal model config for ${speciesId}`);

  if (entry.status === "habitat-only") {
    return {
      model: "hydrothermal-v1" as const,
      version: HABITAT_ONLY_MODEL_VERSION,
      status: entry.status,
      guild: entry.guild,
      evidence: {
        status: entry.evidence.status,
        citations: [...entry.evidence.citations],
      },
    };
  }

  const supportedEntry = entry as SupportedCatalogueEntry;
  const prior = GUILD_PRIORS[supportedEntry.guild];
  const [minimumTemperature, maximumTemperature] = temperatureRange;
  const temperatureMidpoint = (minimumTemperature + maximumTemperature) / 2;
  const temperatureHalfWidth = (maximumTemperature - minimumTemperature) / 2;

  if (forceModel !== "hydrothermal-v1" && speciesUsesHydrothermalV2(speciesId)) {
    return hydrothermalV2Config({
      guild: supportedEntry.guild,
      prior,
      temperatureMidpoint,
      waterOverrides: supportedEntry.water,
      temperatureOverrides: supportedEntry.temperature,
      monthlyAnchors: phenologyAnchors(seasonality),
      altitudeRange,
      evidence: supportedEntry.evidence,
    });
  }

  return {
    model: "hydrothermal-v1" as const,
    version: HYDROTHERMAL_PRIOR_VERSION,
    status: supportedEntry.status,
    guild: supportedEntry.guild,
    water: { ...prior.water, ...(supportedEntry.water ?? {}) },
    // Guild priors define the response form and exposure memory. The numeric
    // species ecology initializes the curve itself: its documented range is
    // the half-response envelope around the midpoint. Explicit species
    // evidence (currently B. edulis) takes precedence over that initialization.
    temperature: {
      ...prior.temperature,
      optimumC: temperatureMidpoint,
      coldHalfWidthC: temperatureHalfWidth,
      warmHalfWidthC: temperatureHalfWidth,
      ...(supportedEntry.temperature ?? {}),
    },
    phenology: { monthlyAnchors: phenologyAnchors(seasonality) },
    evidence: supportedEntry.evidence
      ? {
          status: supportedEntry.evidence.status,
          citations: [...supportedEntry.evidence.citations],
        }
      : {
          status: "expert-prior" as const,
          citations: [...GUILD_PRIOR_CITATIONS],
        },
  };
}
