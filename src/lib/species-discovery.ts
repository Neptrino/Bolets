import type { SpeciesProfile } from "@/src/lib/types";

/**
 * Search/editorial demand is a discovery concern, not an ecological input.
 * It can order otherwise compatible species, but must never affect a habitat
 * or current-condition score.
 */
export const SPECIES_DISCOVERY_PRIORITY = [
  "lactarius-deliciosus",
  "lactarius-sanguifluus",
  "boletus-edulis",
  "craterellus-lutescens",
  "cantharellus-cibarius",
  "amanita-caesarea",
  "boletus-reticulatus",
  "morchella-esculenta",
  "calocybe-gambosa",
  "marasmius-oreades",
  "tricholoma-terreum",
  "hygrophorus-latitabundus",
] as const;

const discoveryRank = new Map<string, number>(
  SPECIES_DISCOVERY_PRIORITY.map((speciesId, index) => [speciesId, index]),
);

const catalanCollator = new Intl.Collator("ca", { sensitivity: "base" });

export function compareSpeciesDiscoveryPriority(
  left: SpeciesProfile,
  right: SpeciesProfile,
) {
  const demandDifference = (discoveryRank.get(left.speciesId) ?? Number.MAX_SAFE_INTEGER) -
    (discoveryRank.get(right.speciesId) ?? Number.MAX_SAFE_INTEGER);
  const culinaryDifference = right.culinaryProfile.rating - left.culinaryProfile.rating;

  return demandDifference || culinaryDifference || catalanCollator.compare(
    left.identity.commonName,
    right.identity.commonName,
  );
}
