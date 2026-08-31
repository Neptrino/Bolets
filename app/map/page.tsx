import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { MapPageContent, type MapPageQuery } from "@/app/map/map-page-content";
import {
  MAP_PREDICTION_DESCRIPTION,
  MAP_PREDICTION_TITLE,
} from "@/src/lib/map-seo";
import { DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";
import { getSpeciesMapPageBySpeciesId } from "@/src/lib/species-map-pages";

export const metadata: Metadata = {
  title: MAP_PREDICTION_TITLE,
  description: MAP_PREDICTION_DESCRIPTION,
  alternates: { canonical: "/map" },
  openGraph: {
    url: "/map",
    title: MAP_PREDICTION_TITLE,
    description: MAP_PREDICTION_DESCRIPTION,
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: MAP_PREDICTION_TITLE,
    description: MAP_PREDICTION_DESCRIPTION,
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};

export default async function MapPage({ searchParams }: { searchParams: Promise<MapPageQuery> }) {
  const query = await searchParams;
  const speciesPage = getSpeciesMapPageBySpeciesId(query.species);

  if (speciesPage) {
    const nextQuery = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key !== "species" && value) nextQuery.set(key, value);
    }
    const suffix = nextQuery.toString();
    permanentRedirect(`/map/${speciesPage.slug}${suffix ? `?${suffix}` : ""}`);
  }

  return <MapPageContent query={query} />;
}
