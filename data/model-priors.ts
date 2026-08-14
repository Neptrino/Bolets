import type {
  FruitingGuild,
  FruitingModelConfig,
  Month,
  MonthlyPhenologyAnchors,
  SeasonalActivity,
  TemperatureModelParameters,
  WaterModelParameters,
} from "@/src/lib/types";
import {
  HABITAT_ONLY_MODEL_VERSION,
  HYDROTHERMAL_PRIOR_VERSION,
} from "@/src/lib/model-versions";

// These values are versioned expert priors, not fitted coefficients. The
// cited studies support the response structure and time scale; any later
// numerical revision must bump the model-config version below.
type SupportedGuild = Exclude<FruitingGuild, "hypogeous">;

type SupportedCatalogueEntry = {
  status: "supported";
  guild: SupportedGuild;
  water?: Partial<WaterModelParameters>;
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
      frostHalfLifeHours: 4,
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
      frostHalfLifeHours: 4,
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
      frostHalfLifeHours: 12,
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
      frostHalfLifeHours: 4,
      heatHalfLifeHours: 12,
    },
  },
};

const GUILD_PRIOR_CITATIONS = [
  "https://doi.org/10.1016/j.agrformet.2016.03.015",
  "https://doi.org/10.1016/j.agrformet.2017.10.024",
] as const;

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
    water: { rainfallWindowDays: 26 },
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
  "boletus-pinophilus": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "boletus-aereus": {
    status: "supported", guild: "ectomycorrhizal",
  },
  "boletus-reticulatus": {
    status: "supported", guild: "ectomycorrhizal",
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
