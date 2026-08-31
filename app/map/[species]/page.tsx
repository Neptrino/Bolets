import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPageContent, type MapPageQuery } from "@/app/map/map-page-content";
import { DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";
import {
  getSpeciesMapPageBySlug,
  speciesMapPages,
} from "@/src/lib/species-map-pages";

type SpeciesMapPageProps = {
  params: Promise<{ species: string }>;
  searchParams: Promise<MapPageQuery>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return speciesMapPages.map((page) => ({ species: page.slug }));
}

export async function generateMetadata({ params }: SpeciesMapPageProps): Promise<Metadata> {
  const { species: slug } = await params;
  const mapPage = getSpeciesMapPageBySlug(slug);
  if (!mapPage) return {};

  const canonicalPath = `/map/${mapPage.slug}`;
  return {
    title: mapPage.title,
    description: mapPage.description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      url: canonicalPath,
      title: mapPage.heading,
      description: mapPage.description,
      images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: mapPage.heading,
      description: mapPage.description,
      images: [DEFAULT_SOCIAL_IMAGE],
    },
  };
}

export default async function SpeciesMapPage({ params, searchParams }: SpeciesMapPageProps) {
  const [{ species: slug }, query] = await Promise.all([params, searchParams]);
  const mapPage = getSpeciesMapPageBySlug(slug);
  if (!mapPage) notFound();

  return <MapPageContent query={query} mapPage={mapPage} />;
}
