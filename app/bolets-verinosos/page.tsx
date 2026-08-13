import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ShieldAlert } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { SpeciesCard } from "@/components/species-card";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { editorialArticleFields, officialSafetySource } from "@/data/editorial";
import { toxicSpecies } from "@/src/lib/species-collections";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, SITE_URL, speciesPath } from "@/src/lib/seo";

export const metadata: Metadata = {
  title: "Bolets verinosos de Catalunya: identificació i riscos",
  description: `Guia de ${toxicSpecies.length} bolets verinosos de Catalunya amb fotografies, trets d’identificació, espècies semblants i advertiments de toxicitat.`,
  alternates: { canonical: "/bolets-verinosos" },
  openGraph: {
    url: "/bolets-verinosos",
    title: "Bolets verinosos de Catalunya",
    description: "Fitxes visuals per conèixer espècies tòxiques i les confusions que poden causar intoxicacions.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

export const revalidate = 3600;

export default function PoisonousMushroomsPage() {
  const currentMonth = monthInTimeZone();

  return (
    <div className="intent-page page-width">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Bolets verinosos de Catalunya",
        url: absoluteUrl("/bolets-verinosos"),
        inLanguage: "ca",
        publisher: { "@id": `${SITE_URL}/#organization` },
        ...editorialArticleFields("bolets-verinosos"),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: toxicSpecies.length,
          itemListElement: toxicSpecies.map((species, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: species.identity.commonName,
            url: absoluteUrl(speciesPath(species)),
          })),
        },
      }} />
      <header className="intent-hero intent-hero-toxic">
        <div>
          <p className="eyebrow"><ShieldAlert size={15} /> Identificació i risc</p>
          <h1>Bolets verinosos<br /><i>de Catalunya.</i></h1>
        </div>
        <p>Espècies tòxiques presents al nostre entorn, des de bolets que causen trastorns digestius fins a confusions potencialment mortals.</p>
      </header>

      <aside className="intent-emergency-note">
        <ShieldAlert size={23} aria-hidden="true" />
        <div><strong>Davant una ingestió sospitosa, actua de seguida.</strong><p>Segueix la <a href={officialSafetySource.url} target="_blank" rel="noreferrer">guia de l’ACSA</a>, truca al 061 Salut Respon i conserva restes del bolet. No esperis que apareguin símptomes ni apliquis remeis casolans.</p></div>
      </aside>

      <div className="intent-section-heading">
        <div><span>{toxicSpecies.length} espècies</span><h2>Fitxes de bolets tòxics</h2></div>
        <Link href="/bolets-comestibles" className="text-link">Veure bolets comestibles <ArrowUpRight size={16} /></Link>
      </div>
      <div className="species-grid intent-species-grid">
        {toxicSpecies.map((species, index) => <SpeciesCard key={species.speciesId} species={species} index={index} currentMonth={currentMonth} />)}
      </div>
      <EditorialAttribution contentId="bolets-verinosos" sources={[officialSafetySource, ...toxicSpecies.flatMap((species) => species.references)]} />
    </div>
  );
}
