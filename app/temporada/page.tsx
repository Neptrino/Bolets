import type { Metadata } from "next";
import { SeasonPageContent } from "@/components/season-page-content";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";

export const metadata: Metadata = {
  title: "Temporada de bolets a Catalunya",
  description: "Calendari de la temporada de bolets a Catalunya per mesos i espècies. Consulteu quins bolets poden fructificar ara i quines condicions necessiten.",
  alternates: { canonical: "/temporada" },
  openGraph: {
    url: "/temporada",
    title: "Temporada de bolets a Catalunya",
    description: "Calendari mensual d’espècies i lectura de les condicions ambientals actuals.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

export const revalidate = 3600;

export default function MushroomSeasonPage() {
  const currentMonth = monthInTimeZone();
  return <SeasonPageContent canonicalPath="/temporada" month={currentMonth} overview />;
}
