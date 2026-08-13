export interface SpeciesTerritoryGuide {
  path: `/zones/${string}`;
  title: string;
  description: string;
  profileLinkTitle: string;
  speciesIds: readonly string[];
}

export const speciesTerritoryGuides = [
  {
    path: "/zones/rovellons",
    title: "On trobar rovellons a Catalunya",
    description:
      "Hàbitat, temporada, condicions actuals i diferències entre rovelló i pinetell.",
    profileLinkTitle: "On trobar rovellons: zones i temporada",
    speciesIds: ["lactarius-sanguifluus", "lactarius-deliciosus"],
  },
  {
    path: "/zones/ceps",
    title: "On trobar ceps a Catalunya",
    description:
      "Tipus de ceps, hàbitats, temporada i condicions actuals arreu del país.",
    profileLinkTitle: "On trobar ceps: tipus, zones i temporada",
    speciesIds: [
      "boletus-edulis",
      "boletus-pinophilus",
      "boletus-aereus",
      "boletus-reticulatus",
    ],
  },
] as const satisfies readonly SpeciesTerritoryGuide[];

export function territoryGuideForSpecies(speciesId: string) {
  return speciesTerritoryGuides.find((guide) =>
    guide.speciesIds.some((guideSpeciesId) => guideSpeciesId === speciesId),
  );
}
