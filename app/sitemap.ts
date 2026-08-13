import type { MetadataRoute } from "next";
import { EDITORIAL_LAUNCH_DATE } from "@/data/editorial";
import { comparisonPages } from "@/data/comparison-pages";
import {
  locationPagePath,
  areaProfiles,
  placePath,
  placeProfiles,
  speciesLocationPages,
} from "@/data/location-pages";
import { speciesProfiles } from "@/data/species";
import { seasonMonthPath, SEASON_MONTHS } from "@/src/lib/seasonality";
import { seasonGuides } from "@/src/lib/season-guides";
import { absoluteUrl, speciesImage, speciesPath } from "@/src/lib/seo";

const lastModified = new Date(`${EDITORIAL_LAUNCH_DATE}T00:00:00+02:00`);

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl(), lastModified, images: [absoluteUrl("/media/generated/home-hero-boletus-v2.webp")] },
    { url: absoluteUrl("/bolets"), lastModified },
    { url: absoluteUrl("/bolets-avui"), lastModified },
    ...seasonGuides.map((guide) => ({ url: absoluteUrl(guide.path), lastModified })),
    { url: absoluteUrl("/quan-surten-els-bolets-despres-de-ploure"), lastModified },
    { url: absoluteUrl("/bolets-comestibles"), lastModified },
    { url: absoluteUrl("/bolets-verinosos"), lastModified },
    { url: absoluteUrl("/temporada"), lastModified },
    ...SEASON_MONTHS.map(({ key }) => ({
      url: absoluteUrl(seasonMonthPath(key)),
      lastModified,
    })),
    { url: absoluteUrl("/map"), lastModified },
    { url: absoluteUrl("/compare"), lastModified },
    ...comparisonPages.map((page) => ({
      url: absoluteUrl(`/compare/${page.slug}`),
      lastModified,
    })),
    { url: absoluteUrl("/metode"), lastModified },
    { url: absoluteUrl("/equip-editorial"), lastModified },
    { url: absoluteUrl("/zones"), lastModified },
    { url: absoluteUrl("/zones/rovellons"), lastModified },
    ...areaProfiles.map((area) => ({
      url: absoluteUrl(`/zones/${area.slug}`),
      lastModified,
    })),
    ...placeProfiles.map((place) => ({
      url: absoluteUrl(placePath(place)),
      lastModified,
    })),
    ...speciesLocationPages.map((page) => {
      const species = speciesProfiles.find((item) => item.speciesId === page.speciesId);
      const image = species ? speciesImage(species) : undefined;
      return {
        url: absoluteUrl(locationPagePath(page)),
        lastModified,
        images: image ? [image] : undefined,
      };
    }),
    ...speciesProfiles.map((species) => {
      const image = speciesImage(species);
      return {
        url: absoluteUrl(speciesPath(species)),
        lastModified,
        images: image ? [image] : undefined,
      };
    }),
  ];

  return [...new Map(pages.map((page) => [page.url, page])).values()];
}
