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
  title: "Bolets verinosos i tòxics de Catalunya",
  description: `Guia de ${toxicSpecies.length} bolets verinosos i tòxics de Catalunya, amb fotografies, confusions i diferències respecte d’altres bolets no comestibles.`,
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

      <section className="intent-reading-section" aria-labelledby="poisonous-reading-title">
        <SectionHeader
          meta="Identificació responsable"
          title="Bolets tòxics, verinosos i no comestibles"
          titleId="poisonous-reading-title"
        />
        <div className="intent-reading-grid">
          <div>
            <p>“Tòxic” i “verinós” descriuen espècies que poden causar una intoxicació. “No comestible” és més ampli: també inclou bolets que es desaconsellen per l’amargor, la textura, la preparació exigent o el risc de confusió. Aquesta pàgina prioritza les espècies tòxiques; el <Link href="/bolets">catàleg complet</Link> també recull les altres categories.</p>
            <p>Una fotografia, el color o el lloc on creix no basten per decidir que un bolet és segur. Contrasteu l’exemplar complet amb la fitxa, reviseu els semblants i, davant de qualsevol dubte, demaneu una identificació experta.</p>
          </div>
          <ol>
            <li>Observeu un exemplar complet, inclosa la base del peu.</li>
            <li>Compareu làmines, porus, anell, volva, olor i canvi de color.</li>
            <li>Obriu la fitxa de les espècies semblants abans de prendre cap decisió.</li>
          </ol>
        </div>
        <nav className="species-topic-links seasonal-guide-topic-links" aria-label="Comparacions de bolets tòxics i comestibles">
          <Link href="/compare/ou-de-reig-vs-reig-bord"><ShieldAlert size={18} aria-hidden="true" /><span><strong>Ou de reig o reig bord</strong><small>Làmines, peu, volva i risc de confusió</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
          <Link href="/compare/rossinyol-vs-bolet-olivera"><ShieldAlert size={18} aria-hidden="true" /><span><strong>Rossinyol o bolet d’olivera</strong><small>Plecs, làmines, substrat i toxicitat</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
          <Link href="/compare/cep-vs-matagent"><ShieldAlert size={18} aria-hidden="true" /><span><strong>Cep o matagent</strong><small>Porus, peu, canvi de color i seguretat</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
        </nav>
      </section>

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
