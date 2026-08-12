import type { MetadataRoute } from "next";
import { speciesProfiles } from "@/data/species";
import {
  locationPagePath,
  areaProfiles,
  placePath,
  placeProfiles,
  speciesLocationPages,
} from "@/data/location-pages";
import { absoluteUrl, speciesImage } from "@/src/lib/seo";
import { comparisonPages } from "@/data/comparison-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl(), changeFrequency: "weekly", priority: 1, images: [absoluteUrl("/media/generated/home-hero-boletus-v2.webp")] },
    { url: absoluteUrl("/species"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/bolets-comestibles"), changeFrequency: "weekly", priority: 0.85 },
    { url: absoluteUrl("/bolets-verinosos"), changeFrequency: "weekly", priority: 0.85 },
    { url: absoluteUrl("/temporada"), changeFrequency: "daily", priority: 0.85 },
    { url: absoluteUrl("/map"), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/compare"), changeFrequency: "weekly", priority: 0.7 },
    ...comparisonPages.map((page) => ({
      url: absoluteUrl(`/compare/${page.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    { url: absoluteUrl("/metode"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/zones"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/zones/rovellons"), changeFrequency: "daily", priority: 0.85 },
    ...areaProfiles.map((area) => ({
      url: absoluteUrl(`/zones/${area.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...placeProfiles.map((place) => ({
      url: absoluteUrl(placePath(place)),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...speciesLocationPages.map((page) => {
      const species = speciesProfiles.find((item) => item.speciesId === page.speciesId);
      const image = species ? speciesImage(species) : undefined;
      return {
        url: absoluteUrl(locationPagePath(page)),
        changeFrequency: "monthly" as const,
        priority: 0.75,
        images: image ? [image] : undefined,
      };
    }),
  ];

  return [
    ...pages,
    ...speciesProfiles.map((species) => {
      const image = speciesImage(species);
      return {
        url: absoluteUrl(`/species/${species.speciesId}`),
        changeFrequency: "monthly" as const,
        priority: 0.7,
        images: image ? [image] : undefined,
      };
    })
  ];
}
