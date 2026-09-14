import { catalogueSpecies } from "@/data/catalogue";
import { toSpeciesFieldCardProfile, type SpeciesFieldCardProfile } from "@/src/lib/species-field-card";
import type { CatalogueSpecies, EdibilityStatus } from "@/src/lib/types";

/**
 * Edibility groups of the printed poster, in poster order. The species list on
 * the infographic page mirrors scripts/create-mushroom-infographic.mjs so the
 * text version never disagrees with the image.
 */
export const infographicGroups = [
  { id: "excellent", title: "Excel·lents comestibles", statuses: ["excellent_edible"], colour: "#b9572c" },
  { id: "edible", title: "Comestibles", statuses: ["edible"], colour: "#406b4a" },
  { id: "conditional", title: "Comestibles amb condicions", statuses: ["edible_with_conditions"], colour: "#a67522" },
  { id: "avoid", title: "No recomanats o no comestibles", statuses: ["not_recommended", "inedible"], colour: "#77756d" },
  { id: "toxic", title: "Tòxics", statuses: ["toxic"], colour: "#bd5038" },
  { id: "danger", title: "Molt tòxics", statuses: ["dangerously_toxic"], colour: "#7d2730" },
] as const satisfies ReadonlyArray<{ id: string; title: string; statuses: readonly EdibilityStatus[]; colour: string }>;

export type InfographicGroupId = (typeof infographicGroups)[number]["id"];

export interface InfographicRow {
  speciesId: string;
  species: CatalogueSpecies;
  commonName: string;
  scientificName: string;
  edibilityLabel: string;
  bestMonthsLabel: string;
  habitatLabel: string;
  altitudeLabel: string;
}

export interface InfographicGroup {
  id: InfographicGroupId;
  title: string;
  colour: string;
  rows: InfographicRow[];
}

const collator = new Intl.Collator("ca", { sensitivity: "base" });

function toRow(species: CatalogueSpecies, profile: SpeciesFieldCardProfile): InfographicRow {
  return {
    speciesId: species.speciesId,
    species,
    commonName: profile.commonName,
    scientificName: profile.scientificName,
    edibilityLabel: profile.edibilityLabel,
    bestMonthsLabel: profile.bestMonthsLabel,
    habitatLabel: profile.habitatTypes.length > 0 ? profile.habitatTypes.join(" · ") : "Hàbitat divers",
    altitudeLabel: profile.altitude ? `${profile.altitude[0]}–${profile.altitude[1]} m` : "Sense dada",
  };
}

/** Species of the poster, grouped and ordered exactly like the printed sheet. */
export function infographicSpeciesGroups(species: readonly CatalogueSpecies[] = catalogueSpecies): InfographicGroup[] {
  const groups = infographicGroups.map((group) => ({
    id: group.id,
    title: group.title,
    colour: group.colour,
    rows: species
      .filter((item) => (group.statuses as readonly EdibilityStatus[]).includes(item.identity.edibility))
      .map((item) => toRow(item, toSpeciesFieldCardProfile(item)))
      .sort((left, right) => collator.compare(left.commonName, right.commonName)),
  }));

  const accountedFor = groups.reduce((sum, group) => sum + group.rows.length, 0);
  if (accountedFor !== species.length) {
    throw new Error(`Infographic groups include ${accountedFor} of ${species.length} species`);
  }

  return groups;
}
