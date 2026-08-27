import type {
  EdibilityStatus,
  MediaAsset,
  Month,
  SeasonalActivity,
  SpeciesProfile,
  CatalogueSpecies,
} from "@/src/lib/types";

export interface SpeciesCardProfile {
  speciesId: string;
  identity: {
    commonName: string;
    alternateNames: string[];
    scientificName: string;
    family: string;
    genus: string;
    edibility: EdibilityStatus;
    shortDescription: string;
  };
  culinaryProfile: {
    kind: SpeciesProfile["culinaryProfile"]["kind"];
    rating: SpeciesProfile["culinaryProfile"]["rating"];
    ratingLabel: string;
  };
  ecologicalConfig: {
    habitat: {
      forestTypes: string[];
      altitude: [number, number] | null;
    };
    seasonality: Record<Month, SeasonalActivity> | null;
  };
  seasonLabel?: string;
  media: MediaAsset[];
}

export function toSpeciesCardProfile(species: CatalogueSpecies): SpeciesCardProfile {
  const referenceImage = species.media.find((asset) => asset.identificationReference);

  return {
    speciesId: species.speciesId,
    identity: {
      commonName: species.identity.commonName,
      alternateNames: species.identity.alternateNames,
      scientificName: species.identity.scientificName,
      family: species.identity.family,
      genus: species.identity.genus,
      edibility: species.identity.edibility,
      shortDescription: species.identity.shortDescription,
    },
    culinaryProfile: {
      kind: species.culinaryProfile.kind,
      rating: species.culinaryProfile.rating,
      ratingLabel: species.culinaryProfile.ratingLabel,
    },
    ecologicalConfig: {
      habitat: {
        forestTypes: "ecology" in species ? species.ecology.habitats : species.ecologicalConfig.habitat.forestTypes,
        altitude: "ecology" in species ? null : species.ecologicalConfig.habitat.altitude,
      },
      seasonality: "ecology" in species ? null : species.ecologicalConfig.seasonality,
    },
    ...("ecology" in species ? { seasonLabel: species.ecology.season } : {}),
    media: referenceImage ? [referenceImage] : [],
  };
}
