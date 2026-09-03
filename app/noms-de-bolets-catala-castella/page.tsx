import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Languages } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { SpeciesNameGlossary } from "@/components/species-name-glossary";
import { editorialArticleFields } from "@/data/editorial";
import { speciesNameGlossaryRows, speciesNameSources } from "@/data/species-common-names";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, SITE_URL, speciesPath } from "@/src/lib/seo";

const path = "/noms-de-bolets-catala-castella";
const title = "Noms de bolets en català i castellà";
const description = "Glossari de noms de bolets en català, castellà i nom científic, amb variants populars i enllaços a les fitxes d’identificació.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: { type: "article", url: path, title, description, images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }] },
};

export default function MushroomNamesPage() {
  const rows = speciesNameGlossaryRows.map((row) => ({ ...row, path: speciesPath({ speciesId: row.speciesId }) }));
  const citedSources = Object.values(speciesNameSources).map((source) => ({
    id: source.url,
    title: source.label,
    publisher: source.label.split(" — ")[0],
    url: source.url,
    confidence: "high" as const,
  }));

  return (
    <PageShell as="article">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Article", "@id": `${absoluteUrl(path)}#article`, headline: title, description, url: absoluteUrl(path), inLanguage: "ca", isPartOf: { "@id": `${SITE_URL}/#website` }, publisher: { "@id": `${SITE_URL}/#organization` }, ...editorialArticleFields("noms-de-bolets-catala-castella") },
          { "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Inici", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Bolets", item: absoluteUrl("/bolets") },
            { "@type": "ListItem", position: 3, name: "Noms en català i castellà", item: absoluteUrl(path) },
          ] },
        ],
      }} />
      <PageHeader
        eyebrow={<><Languages size={15} /> Terminologia boletaire</>}
        title={<>Noms de bolets<br /><PageTitleAccent>en català i castellà.</PageTitleAccent></>}
        description="Consulta el nom català, l’equivalent castellà verificat i el nom científic. El nom científic és la referència estable quan els noms populars canvien segons el territori."
        layout="split"
      />
      <section className="species-name-section" aria-labelledby="species-name-title">
        <SectionHeader meta={`${rows.length} espècies del catàleg`} title="Glossari català, castellà i científic" titleId="species-name-title" description="Només publiquem una equivalència castellana quan l’hem pogut documentar. La resta de files conserven el nom català i el científic sense inventar una traducció." />
        <SpeciesNameGlossary rows={rows} />
      </section>
      <nav className="rain-guide-actions" aria-label="Continuar consultant el catàleg">
        <Link href="/bolets">Veure totes les fitxes <ArrowUpRight size={16} aria-hidden="true" /></Link>
        <Link href="/bolets-verinosos">Bolets tòxics i confusions <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </nav>
      <EditorialAttribution contentId="noms-de-bolets-catala-castella" sources={citedSources} />
    </PageShell>
  );
}
