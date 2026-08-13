import { speciesAlphabetical } from "@/data/species";
import type { Month, SeasonalActivity } from "@/src/lib/types";

const edibleStatuses = new Set([
  "excellent_edible",
  "edible",
  "edible_with_conditions",
]);

const toxicStatuses = new Set(["toxic", "dangerously_toxic"]);

const activityRank: Record<SeasonalActivity, number> = {
  inactive: 0,
  possible: 1,
  moderate: 2,
  good: 3,
  peak: 4,
};

export const edibleSpecies = speciesAlphabetical.filter((species) =>
  edibleStatuses.has(species.identity.edibility),
);

export const toxicSpecies = speciesAlphabetical.filter((species) =>
  toxicStatuses.has(species.identity.edibility),
);

export function speciesAcrossMonths(months: readonly Month[]) {
  return speciesAlphabetical
    .filter((species) => months.some((month) => species.ecologicalConfig.seasonality[month] !== "inactive"))
    .sort((left, right) => {
      const highestActivity = (species: typeof left) => Math.max(
        ...months.map((month) => activityRank[species.ecologicalConfig.seasonality[month]]),
      );
      const activityDifference = highestActivity(right) - highestActivity(left);

      return activityDifference || left.identity.commonName.localeCompare(right.identity.commonName, "ca");
    });
}

export function speciesInSeason(month: Month) {
  return speciesAcrossMonths([month]);
}
