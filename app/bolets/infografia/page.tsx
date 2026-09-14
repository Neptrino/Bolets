import type { Metadata } from "next";
import { Images } from "lucide-react";
import { CatalogueInfographic } from "@/components/catalogue-infographic";
import { CatalogueInfographicSpecies } from "@/components/catalogue-infographic-species";
import { JsonLd } from "@/components/json-ld";
import { PageHeader, PageShell } from "@/components/page-layout";
import { catalogueSpecies } from "@/data/catalogue";
import {
  INFOGRAPHIC_CREDITS_PATH as creditsPath,
  INFOGRAPHIC_HEIGHT as posterHeight,
  INFOGRAPHIC_INDEXED_IMAGE_PATH as indexedImagePath,
  INFOGRAPHIC_INDEXED_WIDTH as indexedWidth,
  INFOGRAPHIC_PDF_PATH as pdfPath,
  INFOGRAPHIC_POSTER_PATH as posterPath,
  INFOGRAPHIC_PREVIEW_PATH as posterPreviewPath,
  INFOGRAPHIC_WIDTH as posterWidth,
  infographicVariantHeight,
} from "@/src/lib/infographic-media";
import { absoluteUrl } from "@/src/lib/seo";
import { staticMediaVariantPath } from "@/src/lib/static-media";

const socialWidth = 1280;
const socialHeight = infographicVariantHeight(socialWidth);
const indexedHeight = infographicVariantHeight(indexedWidth);

export const metadata: Metadata = {
  title: "Infografia dels bolets de Catalunya",
  description: `Pòster visual amb ${catalogueSpecies.length} espècies de bolets de Catalunya: fotografies, noms, millors mesos, hàbitat, altitud i comestibilitat. Descarrega la guia en PDF o PNG.`,
  alternates: { canonical: "/bolets/infografia" },
  openGraph: {
    url: "/bolets/infografia",
    title: "Infografia dels bolets de Catalunya",
    description: `Pòster visual de ${catalogueSpecies.length} espècies amb temporada, hàbitat i altitud.`,
    images: [{
      url: staticMediaVariantPath(posterPreviewPath, socialWidth),
      width: socialWidth,
      height: socialHeight,
      alt: "Infografia dels bolets de Catalunya",
    }],
  },
};

export default function MushroomInfographicPage() {
  return (
    <PageShell as="article">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ImageObject",
          name: "Infografia dels tipus de bolets de Catalunya",
          caption: `Infografia de ${catalogueSpecies.length} espècies de bolets de Catalunya agrupades per comestibilitat, amb temporada, hàbitat i altitud.`,
          description: `Pòster A3 amb ${catalogueSpecies.length} espècies de bolets de Catalunya: fotografia, nom català i científic, millors mesos, hàbitat i altitud, agrupades per comestibilitat.`,
          contentUrl: absoluteUrl(indexedImagePath),
          thumbnailUrl: absoluteUrl(staticMediaVariantPath(posterPreviewPath, 640)),
          url: absoluteUrl("/bolets/infografia"),
          width: indexedWidth,
          height: indexedHeight,
          encodingFormat: "image/webp",
          inLanguage: "ca",
          creditText: "Bolets Atles",
          creator: { "@type": "Organization", name: "Bolets Atles", url: absoluteUrl("/") },
          license: absoluteUrl(creditsPath),
          acquireLicensePage: absoluteUrl("/bolets/infografia"),
          associatedMedia: [
            {
              "@type": "ImageObject",
              name: "Pòster PNG a mida completa",
              contentUrl: absoluteUrl(posterPath),
              width: posterWidth,
              height: posterHeight,
              encodingFormat: "image/png",
            },
            {
              "@type": "MediaObject",
              name: "Pòster en PDF per imprimir (A3)",
              contentUrl: absoluteUrl(pdfPath),
              encodingFormat: "application/pdf",
            },
          ],
        }}
      />
      <PageHeader
        eyebrow={<><Images size={16} aria-hidden="true" /> Recurs visual</>}
        title={<>Infografia dels bolets<br />de Catalunya.</>}
        description={`Consulta en una sola làmina les ${catalogueSpecies.length} espècies del catàleg, agrupades per comestibilitat i resumides amb els millors mesos, l’hàbitat i l’altitud documentada.`}
        tone="forest"
      />
      <CatalogueInfographic speciesCount={catalogueSpecies.length} />
      <CatalogueInfographicSpecies speciesCount={catalogueSpecies.length} />
    </PageShell>
  );
}
