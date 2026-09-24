import type { Metadata } from "next";
import { Images } from "lucide-react";
import { CatalogueInfographic } from "@/components/catalogue-infographic";
import { CatalogueInfographicSpecies } from "@/components/catalogue-infographic-species";
import { JsonLd } from "@/components/json-ld";
import { PageHeader, PageShell } from "@/components/page-layout";
import { catalogueSpecies } from "@/data/catalogue";
import { speciesIllustrationPath } from "@/data/species-illustrations";
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
import { speciesArticle } from "@/src/lib/species-headings";
import { staticMediaVariantPath } from "@/src/lib/static-media";

const socialWidth = 1280;
const socialHeight = infographicVariantHeight(socialWidth);
const indexedHeight = infographicVariantHeight(indexedWidth);

// Searchers ask for «bolet dibuix» and «guia de bolets pdf», not «infografia»
// (keyword clusters, Sept 2026); «tipus de bolets» belongs to /bolets.
const pageTitle = "Dibuixos de bolets de Catalunya: infografia en PDF";
const pageDescription = `Dibuixos de les ${catalogueSpecies.length} espècies de bolets de Catalunya en una guia visual en PDF per imprimir: noms, temporada, hàbitat, altitud i comestibilitat. Descarrega el pòster A3 en PDF o PNG.`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/bolets/infografia" },
  openGraph: {
    url: "/bolets/infografia",
    title: pageTitle,
    description: `Els ${catalogueSpecies.length} bolets de Catalunya en dibuix, amb temporada, hàbitat i altitud, en un pòster A3 per imprimir.`,
    images: [{
      url: staticMediaVariantPath(posterPreviewPath, socialWidth),
      width: socialWidth,
      height: socialHeight,
      alt: "Infografia amb dibuixos dels bolets de Catalunya",
    }],
  },
};

const creator = { "@type": "Organization", name: "Bolets Atles", url: absoluteUrl("/") } as const;

/** Every drawing on the poster, so image search can match «dibuix de …» queries. */
function drawingImageObjects() {
  return catalogueSpecies.flatMap((species) => {
    const src = speciesIllustrationPath(species.speciesId);
    if (!src) return [];
    const name = `Dibuix ${speciesArticle(species.identity.commonName).ofSpecies} (${species.identity.scientificName})`;
    return [{
      "@type": "ImageObject",
      name,
      contentUrl: absoluteUrl(src),
      encodingFormat: "image/webp",
      creditText: "Bolets Atles · il·lustració generada amb IA",
      creator,
      license: absoluteUrl(creditsPath),
      acquireLicensePage: absoluteUrl("/bolets/infografia"),
    }];
  });
}

const posterImageObject = {
  "@type": "ImageObject",
  name: "Dibuixos dels bolets de Catalunya: infografia dels tipus de bolets",
  caption: `Infografia de ${catalogueSpecies.length} espècies de bolets de Catalunya agrupades per comestibilitat, amb temporada, hàbitat i altitud.`,
  description: `Pòster A3 en PDF amb els dibuixos de ${catalogueSpecies.length} espècies de bolets de Catalunya: nom català i científic, temporada, hàbitat i altitud, agrupades per comestibilitat.`,
  contentUrl: absoluteUrl(indexedImagePath),
  thumbnailUrl: absoluteUrl(staticMediaVariantPath(posterPreviewPath, 640)),
  url: absoluteUrl("/bolets/infografia"),
  width: indexedWidth,
  height: indexedHeight,
  encodingFormat: "image/webp",
  inLanguage: "ca",
  creditText: "Bolets Atles · il·lustracions generades amb IA",
  creator,
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
};

export default function MushroomInfographicPage() {
  return (
    <PageShell as="article">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [posterImageObject, ...drawingImageObjects()],
        }}
      />
      <PageHeader
        eyebrow={<><Images size={16} aria-hidden="true" /> Infografia en PDF</>}
        title={<>Bolets de Catalunya<br />en dibuix.</>}
        description={`Les ${catalogueSpecies.length} espècies del catàleg dibuixades en una sola làmina: una guia visual en PDF per imprimir, agrupada per comestibilitat, amb la temporada, l’hàbitat i l’altitud de cada bolet.`}
        tone="forest"
      />
      <CatalogueInfographic speciesCount={catalogueSpecies.length} />
      <CatalogueInfographicSpecies speciesCount={catalogueSpecies.length} />
    </PageShell>
  );
}
