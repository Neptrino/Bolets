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
    title: "Rovellons: quan surten i on trobar-ne a Catalunya",
    description:
      "Quan surten els rovellons, on trobar-ne, quins tipus hi ha i com distingir el rovelló del pinetell.",
    profileLinkTitle: "On trobar rovellons i quan surten",
    speciesIds: ["lactarius-sanguifluus", "lactarius-deliciosus"],
  },
  {
    contentId: "zones-ceps",
    path: "/zones/ceps",
    title: "Ceps de Catalunya: tipus, temporada i zones",
    description:
      "Quatre tipus de ceps, com distingir-los, quan surten i en quines zones mirar a Catalunya.",
    profileLinkTitle: "On trobar ceps i quan surten",
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
