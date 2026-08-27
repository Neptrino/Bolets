export interface SpeciesTerritoryGuide {
  contentId: `zones-${string}`;
  path: `/zones/${string}`;
  title: string;
  description: string;
  profileLinkTitle: string;
  speciesIds: readonly string[];
}

export const speciesTerritoryGuides = [
  {
    contentId: "zones-rovellons",
    path: "/zones/rovellons",
    title: "Rovellons a Catalunya: tipus, hàbitat i temporada",
    description:
      "Tipus de rovellons, diferències entre rovelló i pinetell, hàbitat, temporada, zones i condicions actuals.",
    profileLinkTitle: "Rovellons: tipus, hàbitat i temporada",
    speciesIds: ["lactarius-sanguifluus", "lactarius-deliciosus"],
  },
  {
    contentId: "zones-ceps",
    path: "/zones/ceps",
    title: "Ceps de Catalunya: tipus, diferències i temporada",
    description:
      "Quatre tipus de ceps, diferències d’identificació, hàbitats, temporada, zones i condicions actuals.",
    profileLinkTitle: "Ceps: tipus, diferències i temporada",
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
