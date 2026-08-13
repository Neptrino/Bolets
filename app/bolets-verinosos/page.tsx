import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ShieldAlert } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
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
    <PageShell>
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
      <PageHeader
        eyebrow={<><ShieldAlert size={15} /> Identificació i risc</>}
        title={<>Bolets verinosos<br /><PageTitleAccent>de Catalunya.</PageTitleAccent></>}
        description="Espècies tòxiques presents al nostre entorn, des de bolets que causen trastorns digestius fins a confusions potencialment mortals."
        layout="split"
        tone="danger"
      />

      <aside className="intent-emergency-note">
        <ShieldAlert size={23} aria-hidden="true" />
        <div><strong>Davant una ingestió sospitosa, actueu de seguida.</strong><p>Seguiu la <a href={officialSafetySource.url} target="_blank" rel="noreferrer">guia de l’ACSA</a>, truqueu al 061 Salut Respon i conserveu restes del bolet. No espereu que apareguin símptomes ni apliqueu remeis casolans.</p></div>
      </aside>

      <SectionHeader
        meta={`${toxicSpecies.length} espècies`}
        title="Fitxes de bolets tòxics"
        actions={<Link href="/bolets-comestibles" className="text-link">Veure bolets comestibles <ArrowUpRight size={16} /></Link>}
      />
      <div className="species-grid intent-species-grid">
        {toxicSpecies.map((species, index) => <SpeciesCard key={species.speciesId} species={species} index={index} currentMonth={currentMonth} />)}
      </div>
      <EditorialAttribution contentId="bolets-verinosos" sources={[officialSafetySource, ...toxicSpecies.flatMap((species) => species.references)]} />
    </PageShell>
  );
}
