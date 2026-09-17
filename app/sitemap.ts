import type { MetadataRoute } from "next";
import { getEditorialMetadata } from "@/data/editorial";
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
import { INFOGRAPHIC_INDEXED_IMAGE_PATH } from "@/src/lib/infographic-media";
import { absoluteUrl, speciesImage, speciesPath } from "@/src/lib/seo";
import { speciesMapPages } from "@/src/lib/species-map-pages";
import { speciesTerritoryGuides } from "@/src/lib/species-territory-guides";

/**
 * A public URL and the editorial content id that dates it. Every entry is
 * dated through `getEditorialMetadata`, so `data/editorial.ts` is the single
 * place where a page's last change is recorded, and
 * `tests/editorial-freshness.test.ts` can check those dates against git.
 */
export interface SitemapContentEntry {
  path: string;
  contentId: string;
  images?: string[];
}

export function editorialLastModified(contentId: string) {
  return new Date(`${getEditorialMetadata(contentId).updatedAt}T00:00:00+02:00`);
}

export function sitemapContentEntries(): SitemapContentEntry[] {
  const entries: SitemapContentEntry[] = [
    { path: "/", contentId: "home", images: [absoluteUrl("/media/generated/home-hero-boletus-v2.webp")] },
    { path: "/bolets", contentId: "bolets" },
    { path: "/noms-de-bolets-catala-castella", contentId: "noms-de-bolets-catala-castella" },
    { path: "/bolets/infografia", contentId: "bolets-infografia", images: [absoluteUrl(INFOGRAPHIC_INDEXED_IMAGE_PATH)] },
    { path: "/bolets-avui", contentId: "bolets-avui" },
    ...seasonGuides.map((guide) => ({ path: guide.path, contentId: guide.path.slice(1) })),
    { path: "/quan-surten-els-bolets-despres-de-ploure", contentId: "quan-surten-els-bolets-despres-de-ploure" },
    { path: "/mapa-pluja", contentId: "mapa-pluja" },
    { path: "/conservar-bolets", contentId: "conservar-bolets" },
    { path: "/parts-dun-bolet", contentId: "parts-dun-bolet" },
    { path: "/bolets-de-soca", contentId: "bolets-de-soca" },
    { path: "/fals-rossinyol", contentId: "fals-rossinyol" },
    { path: "/normativa-bolets", contentId: "normativa-bolets" },
    { path: "/preguntes-frequents-bolets", contentId: "preguntes-frequents-bolets" },
    { path: "/bolets-comestibles", contentId: "bolets-comestibles" },
    { path: "/bolets-verinosos", contentId: "bolets-verinosos" },
    { path: "/temporada", contentId: "temporada" },
    ...SEASON_MONTHS.map(({ key }) => ({ path: seasonMonthPath(key), contentId: "temporada" })),
    { path: "/map", contentId: "map" },
    ...speciesMapPages.map((page) => ({ path: `/map/${page.slug}`, contentId: `map:${page.slug}` })),
    { path: "/troballes", contentId: "troballes" },
    { path: "/compare", contentId: "compare" },
    { path: "/joc", contentId: "joc" },
    ...comparisonPages.map((page) => ({ path: `/compare/${page.slug}`, contentId: `compare:${page.slug}` })),
    { path: "/metode", contentId: "metode" },
    { path: "/col-labora", contentId: "col-labora" },
    { path: "/equip-editorial", contentId: "equip-editorial" },
    { path: "/avis-legal", contentId: "avis-legal" },
    { path: "/guies", contentId: "guies" },
    ...speciesTerritoryGuides.map((guide) => ({ path: guide.path, contentId: guide.contentId })),
    { path: "/zones/pirineu", contentId: "zones-pirineu" },
    ...areaProfiles.map((area) => ({ path: `/zones/${area.slug}`, contentId: `zone:${area.slug}` })),
    ...placeProfiles.map((place) => ({ path: placePath(place), contentId: `place:${place.areaSlug}:${place.slug}` })),
    ...speciesLocationPages.map((page) => {
      const species = speciesProfiles.find((item) => item.speciesId === page.speciesId);
      const image = species ? speciesImage(species) : undefined;
      return {
        path: locationPagePath(page),
        // Same id the local guide page uses for its JSON-LD dateModified.
        contentId: `guide:${page.areaSlug}:${page.placeSlug}:${page.speciesId}`,
        images: image ? [image] : undefined,
      };
    }),
    ...catalogueSpecies.map((species) => {
      const image = speciesImage(species);
      return {
        path: speciesPath(species),
        contentId: `species:${species.speciesId}`,
        images: image ? [image] : undefined,
      };
    }),
  ];

  return [...new Map(entries.map((entry) => [entry.path, entry])).values()];
}

export function buildSitemap(
  currentOverviewLastModified = editorialLastModified("bolets-avui"),
): MetadataRoute.Sitemap {
  return sitemapContentEntries().map((entry) => ({
    url: absoluteUrl(entry.path),
    lastModified:
      entry.contentId === "bolets-avui" ? currentOverviewLastModified : editorialLastModified(entry.contentId),
    ...(entry.images ? { images: entry.images } : {}),
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { readCurrentOverviewLastModified } = await import(
    "@/src/lib/current-overview-generation-server"
  );
  const publishedAt = await readCurrentOverviewLastModified();

  return buildSitemap(publishedAt ?? editorialLastModified("bolets-avui"));
}
