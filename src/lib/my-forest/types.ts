import type { AreaPredictionSummary, SeasonalActivity } from "@/src/lib/types";

export type ForestPreferences = {
  speciesIds: string[];
  territorySlugs: string[];
};

export type ForestPreferenceOption = {
  value: string;
  label: string;
  detail?: string;
};

export type JournalSeasonSummary = {
  seasonLabel: string;
  startDate: string;
  endDate: string;
  total: number;
  speciesCount: number;
  publicCount: number;
  privateCount: number;
  topSpecies: { speciesId: string; name: string; count: number } | null;
  firstObservedOn: string | null;
  latestObservedOn: string | null;
};

export type SavedForestReading = {
  speciesId: string;
  speciesName: string;
  territorySlug: string;
  territoryName: string;
  territoryType: string;
  territoryPath: string;
  mapPath: string;
  status: "available" | "withheld" | "unavailable" | "outside-season";
  seasonalActivity: SeasonalActivity;
  rainfallWindowDays: number;
  recentRainWindowDays: number | null;
  temperatureWindowDays: number;
  summary: AreaPredictionSummary | null;
};

export type SavedForestUnavailableCombination = {
  speciesId: string;
  speciesName: string;
  territorySlug: string;
  territoryName: string;
};
