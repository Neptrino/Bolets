import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { MapPageContent, type MapPageQuery } from "@/app/map/map-page-content";
import { DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";
import { getSpeciesMapPageBySpeciesId } from "@/src/lib/species-map-pages";

export const metadata: Metadata = {
  title: "Mapa de bolets de Catalunya: condicions avui",
  description: "Consulta quines zones de Catalunya tenen avui les condicions més favorables per a cada espècie. El mapa compara l’hàbitat i el temps recent.",
  alternates: { canonical: "/map" },
  openGraph: {
    url: "/map",
    title: "Mapa de bolets de Catalunya",
    description: "Compara les zones més favorables per a les espècies comestibles o centra el mapa en un bolet concret.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mapa de bolets de Catalunya",
    description: "Mapa d’hàbitat i condicions actuals per espècie.",
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
