import type { MetadataRoute } from "next";
import { EDITORIAL_LAUNCH_DATE, getEditorialMetadata } from "@/data/editorial";
import { comparisonPages } from "@/data/comparison-pages";
import {
  locationPagePath,
  areaProfiles,
  placePath,
  placeProfiles,
  speciesLocationPages,
} from "@/data/location-pages";
import { speciesProfiles } from "@/data/species";
import { catalogueSpecies } from "@/data/catalogue";
import { seasonMonthPath, SEASON_MONTHS } from "@/src/lib/seasonality";
import { seasonGuides } from "@/src/lib/season-guides";
import { absoluteUrl, speciesImage, speciesPath } from "@/src/lib/seo";
import { speciesTerritoryGuides } from "@/src/lib/species-territory-guides";

const lastModified = new Date(`${EDITORIAL_LAUNCH_DATE}T00:00:00+02:00`);
const rainGuideLastModified = new Date(
  `${getEditorialMetadata("quan-surten-els-bolets-despres-de-ploure").updatedAt}T00:00:00+02:00`,
);
const currentOverviewLastModified = new Date(
  `${getEditorialMetadata("bolets-avui").updatedAt}T00:00:00+02:00`,
);
const mushroomPartsGuideLastModified = new Date(
  `${getEditorialMetadata("parts-dun-bolet").updatedAt}T00:00:00+02:00`,
);
const edibleGuideLastModified = new Date(
  `${getEditorialMetadata("bolets-comestibles").updatedAt}T00:00:00+02:00`,
);
const poisonousGuideLastModified = new Date(
  `${getEditorialMetadata("bolets-verinosos").updatedAt}T00:00:00+02:00`,
);

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl(), lastModified, images: [absoluteUrl("/media/generated/home-hero-boletus-v2.webp")] },
    { url: absoluteUrl("/bolets"), lastModified: new Date(`${getEditorialMetadata("bolets").updatedAt}T00:00:00+02:00`) },
    { url: absoluteUrl("/bolets/infografia"), lastModified, images: [absoluteUrl("/media/editorial/bolets-catalunya-infografia.webp")] },
    { url: absoluteUrl("/bolets-avui"), lastModified: currentOverviewLastModified },
    ...seasonGuides.map((guide) => ({ url: absoluteUrl(guide.path), lastModified })),
    { url: absoluteUrl("/quan-surten-els-bolets-despres-de-ploure"), lastModified: rainGuideLastModified },
    { url: absoluteUrl("/parts-dun-bolet"), lastModified: mushroomPartsGuideLastModified },
    { url: absoluteUrl("/bolets-de-soca"), lastModified: new Date(`${getEditorialMetadata("bolets-de-soca").updatedAt}T00:00:00+02:00`) },
    { url: absoluteUrl("/fals-rossinyol"), lastModified: new Date(`${getEditorialMetadata("fals-rossinyol").updatedAt}T00:00:00+02:00`) },
    { url: absoluteUrl("/normativa-bolets"), lastModified: new Date(`${getEditorialMetadata("normativa-bolets").updatedAt}T00:00:00+02:00`) },
    { url: absoluteUrl("/preguntes-frequents-bolets"), lastModified: new Date(`${getEditorialMetadata("preguntes-frequents-bolets").updatedAt}T00:00:00+02:00`) },
    { url: absoluteUrl("/bolets-comestibles"), lastModified: edibleGuideLastModified },
    { url: absoluteUrl("/bolets-verinosos"), lastModified: poisonousGuideLastModified },
    { url: absoluteUrl("/temporada"), lastModified },
    ...SEASON_MONTHS.map(({ key }) => ({
      url: absoluteUrl(seasonMonthPath(key)),
      lastModified,
    })),
    { url: absoluteUrl("/map"), lastModified },
    { url: absoluteUrl("/troballes"), lastModified },
    { url: absoluteUrl("/compare"), lastModified },
    ...comparisonPages.map((page) => ({
      url: absoluteUrl(`/compare/${page.slug}`),
      lastModified,
    })),
    { url: absoluteUrl("/metode"), lastModified },
    { url: absoluteUrl("/equip-editorial"), lastModified: new Date(`${getEditorialMetadata("equip-editorial").updatedAt}T00:00:00+02:00`) },
    { url: absoluteUrl("/avis-legal"), lastModified },
    { url: absoluteUrl("/zones"), lastModified },
    { url: absoluteUrl("/guies"), lastModified },
    ...speciesTerritoryGuides.map((guide) => ({
      url: absoluteUrl(guide.path),
      lastModified: new Date(
        `${getEditorialMetadata(guide.contentId).updatedAt}T00:00:00+02:00`,
      ),
    })),
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
    ...catalogueSpecies.map((species) => {
      const image = speciesImage(species);
      return {
        url: absoluteUrl(speciesPath(species)),
        lastModified: new Date(`${getEditorialMetadata(`species:${species.speciesId}`).updatedAt}T00:00:00+02:00`),
        images: image ? [image] : undefined,
      };
    }),
  ];

  return [...new Map(pages.map((page) => [page.url, page])).values()];
}
