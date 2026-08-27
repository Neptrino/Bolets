import { getEdibilityPresentation } from "@/src/lib/edibility-presentation";
import type {
  CatalogueSpecies,
  EdibilityStatus,
  Month,
  SeasonalActivity,
  SimilarSpecies,
} from "@/src/lib/types";

const months: Month[] = [
  "gen",
  "feb",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "oct",
  "nov",
  "des",
];

const monthLabels: Record<Month, string> = {
  gen: "GEN",
  feb: "FEB",
  mar: "MAR",
  abr: "ABR",
  mai: "MAI",
  jun: "JUN",
  jul: "JUL",
  ago: "AGO",
  set: "SET",
  oct: "OCT",
  nov: "NOV",
  des: "DES",
};

const edibleStatuses = new Set<EdibilityStatus>([
  "excellent_edible",
  "edible",
  "edible_with_conditions",
]);

export interface SpeciesFieldCardProfile {
  speciesId: string;
  commonName: string;
  scientificName: string;
  edibility: EdibilityStatus;
  edibilityLabel: string;
  identificationDifficulty: string;
  typicalSize: string;
  shortDescription: string;
  keyFeatures: string[];
  habitatTypes: string[];
  altitude: [number, number] | null;
  seasonality: Record<Month, SeasonalActivity> | null;
  bestMonths: Month[];
  bestMonthsLabel: string;
  lookalike: Pick<SimilarSpecies, "commonName" | "scientificName" | "mainDifferences" | "edibility"> | null;
  imagePath: string;
  imageAlt: string;
}

function selectLookalike(
  species: CatalogueSpecies,
): SpeciesFieldCardProfile["lookalike"] {
  const currentIsEdible = edibleStatuses.has(species.identity.edibility);
  const preferred = species.similarSpecies.find((candidate) => (
    currentIsEdible
      ? candidate.warning || candidate.edibility.includes("toxic")
      : edibleStatuses.has(candidate.edibility)
  ));
  const fallback = species.similarSpecies.find((candidate) => candidate.warning)
    ?? species.similarSpecies[0];
  const selected = preferred ?? fallback;

  if (!selected) return null;
  return {
    commonName: selected.commonName,
    scientificName: selected.scientificName,
    mainDifferences: selected.mainDifferences,
    edibility: selected.edibility,
  };
}

function bestMonthsFor(
  seasonality: Record<Month, SeasonalActivity>,
): Month[] {
  const peak = months.filter((month) => seasonality[month] === "peak");
  if (peak.length > 0) return peak;
  return months.filter((month) => seasonality[month] === "good");
}

export function toSpeciesFieldCardProfile(
  species: CatalogueSpecies,
): SpeciesFieldCardProfile {
  const referenceImage = species.media.find((asset) => asset.identificationReference);
  if (!referenceImage?.localPath) {
    throw new Error(`Missing local identification image for ${species.speciesId}`);
  }

  const isReference = "ecology" in species;
  const seasonality = isReference ? null : species.ecologicalConfig.seasonality;
  const bestMonths = seasonality ? bestMonthsFor(seasonality) : [];
  const bestMonthsLabel = isReference
    ? species.ecology.season
    : bestMonths.length > 0
      ? bestMonths.map((month) => monthLabels[month]).join(" · ")
      : "Sense pic definit";

  return {
    speciesId: species.speciesId,
    commonName: species.identity.commonName,
    scientificName: species.identity.scientificName,
    edibility: species.identity.edibility,
    edibilityLabel: getEdibilityPresentation(species.identity.edibility).label,
    identificationDifficulty: species.identity.identificationDifficulty,
    typicalSize: species.identity.typicalSize,
    shortDescription: species.identity.shortDescription,
    keyFeatures: species.morphology.keyFeatures.slice(0, 3),
    habitatTypes: isReference
      ? species.ecology.habitats.slice(0, 2)
      : species.ecologicalConfig.habitat.forestTypes.slice(0, 2),
    altitude: isReference ? null : species.ecologicalConfig.habitat.altitude,
    seasonality,
    bestMonths,
    bestMonthsLabel,
    lookalike: selectLookalike(species),
    imagePath: referenceImage.localPath,
    imageAlt: referenceImage.alt,
  };
}
