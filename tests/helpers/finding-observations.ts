import { getSpecies } from "@/data/species";

/** Alternatives within one recorded taxon, not independently confirmed finds. */
export type FindingObservation = { taxon: string; speciesIds: string[] };

export function observationForSpecies(speciesIds: string[]): FindingObservation {
  const profiles = speciesIds.map((id) => getSpecies(id));
  if (!speciesIds.length || profiles.some((profile) => !profile)) {
    throw new Error("Observation has unknown species");
  }
  const first = profiles[0]!;
  if (speciesIds.length > 1 && profiles.some((p) => p!.identity.genus !== first.identity.genus)) {
    throw new Error("Ambiguous observation alternatives must belong to one genus");
  }
  return {
    taxon: speciesIds.length === 1 ? first.identity.scientificName : first.identity.genus,
    speciesIds: [...speciesIds],
  };
}

export function validateObservations(value: unknown, speciesIds: string[]): FindingObservation[] {
  if (!Array.isArray(value) || !value.length || value.length > 8) {
    throw new Error("Finding observations must contain 1–8 recorded taxa");
  }
  const seen = new Set<string>();
  const observations = value.map((entry) => {
    if (!entry || !Array.isArray(entry.speciesIds) || !entry.speciesIds.length ||
      entry.speciesIds.some((id: unknown) => typeof id !== "string" || !speciesIds.includes(id)) ||
      new Set(entry.speciesIds).size !== entry.speciesIds.length) {
      throw new Error("Observation alternatives must be unique members of the finding speciesIds");
    }
    const observation = observationForSpecies(entry.speciesIds);
    if (entry.taxon !== observation.taxon) throw new Error("Observation taxon does not match its alternatives");
    const key = [...observation.speciesIds].sort().join("|");
    if (seen.has(key)) throw new Error("Duplicate recorded observation group");
    seen.add(key);
    return observation;
  });
  const union = new Set(observations.flatMap((o) => o.speciesIds));
  if (union.size !== speciesIds.length || speciesIds.some((id) => !union.has(id))) {
    throw new Error("Observation groups must account for every finding speciesId");
  }
  return observations;
}
