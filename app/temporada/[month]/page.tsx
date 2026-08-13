import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeasonPageContent } from "@/components/season-page-content";
import { speciesInSeason } from "@/src/lib/species-collections";
import {
  monthFromSeasonSlug,
  monthWithPreposition,
  seasonMonthPath,
  SEASON_MONTHS,
} from "@/src/lib/seasonality";
import { DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";

type Props = { params: Promise<{ month: string }> };

export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return SEASON_MONTHS.map(({ slug }) => ({ month: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { month: slug } = await params;
  const month = monthFromSeasonSlug(slug);
  if (!month) notFound();

  const activeSpecies = speciesInSeason(month);
  const path = seasonMonthPath(month);
  const title = `Bolets de temporada ${monthWithPreposition(month)}: calendari de Catalunya`;
  const description = `Consulta ${activeSpecies.length} espècies de bolets actives ${monthWithPreposition(month)}: hàbitat, identificació i calendari ecològic de la temporada a Catalunya.`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      url: path,
      title,
      description,
      images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
    },
  };
}

export default async function SeasonMonthPage({ params }: Props) {
  const { month: slug } = await params;
  const month = monthFromSeasonSlug(slug);
  if (!month) notFound();

  return <SeasonPageContent canonicalPath={seasonMonthPath(month)} month={month} />;
}
