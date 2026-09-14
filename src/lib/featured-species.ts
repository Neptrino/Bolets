import type { SeasonalActivity, SpeciesProfile } from "@/src/lib/types";
import { monthInTimeZone } from "@/src/lib/seasonality";

// Editorial discovery priorities, not measured search popularity or model inputs.
export const familiarSpeciesIds = [
  "lactarius-sanguifluus",
  "lactarius-deliciosus",
  "boletus-edulis",
  "craterellus-lutescens",
  "hygrophorus-latitabundus",
  "tricholoma-terreum",
  "cantharellus-cibarius",
  "amanita-caesarea",
  "craterellus-cornucopioides",
  "morchella-esculenta",
  "calocybe-gambosa",
  "hygrophorus-marzuolus",
] as const;

const activityRank: Record<SeasonalActivity, number> = {
  inactive: 0, possible: 1, moderate: 2, good: 3, peak: 4,
};
const familiarOrder = new Map<string, number>(familiarSpeciesIds.map((id, index) => [id, index]));
const edibleStatuses = new Set(["excellent_edible", "edible", "edible_with_conditions"]);

const civilDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
});
const milkcaps = new Set(["lactarius-sanguifluus", "lactarius-deliciosus"]);

function rotationDay(date: Date) {
  const parts = civilDateFormatter.formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)!.value);
  // Count civil days, not elapsed 24-hour periods: DST must not shift the rotation.
  return Math.floor(Date.UTC(value("year"), value("month") - 1, value("day")) / 86_400_000);
}

function rotate<T>(items: T[], day: number): T[] {
  if (!items.length) return [];
  const start = ((day % items.length) + items.length) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

/** Daily editorial rotation of two familiar seasonal picks and one discovery. */
export function selectFeaturedSpecies(profiles: readonly SpeciesProfile[], date: Date, limit = 3) {
  if (limit <= 0) return [];
  const month = monthInTimeZone(date);
  const day = rotationDay(date);
  const rank = (species: SpeciesProfile) => activityRank[species.ecologicalConfig.seasonality[month]];
  const candidates = profiles.filter((species) =>
    species.predictionMode === "current" && edibleStatuses.has(species.identity.edibility) && rank(species) > 0,
  );
  const familiar = rotate(candidates.filter((species) => familiarOrder.has(species.speciesId)).sort((a, b) =>
    familiarOrder.get(a.speciesId)! - familiarOrder.get(b.speciesId)!,
  ), day);
  const discoveries = rotate(candidates.filter((species) => !familiarOrder.has(species.speciesId))
    .sort((a, b) => a.speciesId.localeCompare(b.speciesId)), day);
  const selected: SpeciesProfile[] = [];
  const add = (species: SpeciesProfile) => {
    if (selected.some((item) => item.speciesId === species.speciesId ||
      (milkcaps.has(item.speciesId) && milkcaps.has(species.speciesId)))) return;
    selected.push(species);
  };
  for (const species of familiar) {
    if (selected.length >= Math.min(2, limit)) break;
    add(species);
  }
  for (const species of [...discoveries, ...familiar]) {
    if (selected.length >= limit) break;
    add(species);
  }
  return selected;
}
