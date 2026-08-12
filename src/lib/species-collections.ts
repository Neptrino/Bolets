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

export function speciesInSeason(month: Month) {
  return speciesAlphabetical
    .filter((species) => species.ecologicalConfig.seasonality[month] !== "inactive")
    .sort((left, right) => {
      const activityDifference =
        activityRank[right.ecologicalConfig.seasonality[month]] -
        activityRank[left.ecologicalConfig.seasonality[month]];

      return activityDifference || left.identity.commonName.localeCompare(right.identity.commonName, "ca");
    });
}
