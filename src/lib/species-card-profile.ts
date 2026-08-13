import type {
  EdibilityStatus,
  MediaAsset,
  Month,
  SeasonalActivity,
  SpeciesProfile,
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
      altitude: [number, number];
    };
    seasonality: Record<Month, SeasonalActivity>;
  };
  media: MediaAsset[];
}

export function toSpeciesCardProfile(species: SpeciesProfile): SpeciesCardProfile {
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
        forestTypes: species.ecologicalConfig.habitat.forestTypes,
        altitude: species.ecologicalConfig.habitat.altitude,
      },
      seasonality: species.ecologicalConfig.seasonality,
    },
    media: referenceImage ? [referenceImage] : [],
  };
}
