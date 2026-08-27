import type { Metadata } from "next";
import { Images } from "lucide-react";
import { CatalogueInfographic } from "@/components/catalogue-infographic";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { PageHeader, PageShell } from "@/components/page-layout";
import { catalogueSpecies } from "@/data/catalogue";
import { coreEditorialSources } from "@/data/editorial";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";

const posterPath = "/downloads/infografies/bolets-catalunya-infografia.png";

export const metadata: Metadata = {
  title: "Infografia dels bolets de Catalunya",
  description: `Pòster visual amb ${catalogueSpecies.length} espècies de bolets de Catalunya, fotografies, noms, millors mesos, hàbitat, altitud i comestibilitat.`,
  alternates: { canonical: "/bolets/infografia" },
  openGraph: {
    url: "/bolets/infografia",
    title: "Infografia dels bolets de Catalunya",
    description: `Pòster visual de ${catalogueSpecies.length} espècies amb temporada, hàbitat i altitud.`,
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

export default function MushroomInfographicPage() {
  return (
    <PageShell as="article">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ImageObject",
          name: "Bolets de Catalunya",
          caption: `Infografia de ${catalogueSpecies.length} espècies agrupades per comestibilitat, amb temporada, hàbitat i altitud.`,
          contentUrl: absoluteUrl(posterPath),
          url: absoluteUrl("/bolets/infografia"),
          width: 3508,
          height: 4961,
          inLanguage: "ca",
        }}
      />
      <PageHeader
        eyebrow={<><Images size={16} aria-hidden="true" /> Recurs visual</>}
        title={<>Infografia dels bolets<br />de Catalunya.</>}
        description={`Consulteu en una sola làmina les ${catalogueSpecies.length} espècies del catàleg, agrupades per comestibilitat i resumides amb els millors mesos, l’hàbitat i l’altitud documentada.`}
        tone="forest"
      />
      <CatalogueInfographic speciesCount={catalogueSpecies.length} />
      <EditorialAttribution contentId="bolets" sources={coreEditorialSources} />
    </PageShell>
  );
}
