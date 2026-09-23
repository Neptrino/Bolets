import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { SeasonTabs, SeasonMonthColumns, SeasonProtagonists, SeasonSpeciesCollections } from "@/components/season-guide-sections";
import { coreEditorialSources, editorialArticleFields, officialSafetySource } from "@/data/editorial";
import { speciesAlphabetical } from "@/data/species";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, SITE_URL, speciesPath } from "@/src/lib/seo";
import { seasonGuidesById } from "@/src/lib/season-guides";

export const metadata: Metadata = {
  title: "Bolets de primavera a Catalunya",
  description: "Guia de bolets de primavera a Catalunya, derivada del calendari de març a juny: múrgola, moixernó, cama-sec i totes les espècies actives.",
  alternates: { canonical: "/bolets-de-primavera" },
  openGraph: {
    url: "/bolets-de-primavera",
    title: "Bolets de primavera a Catalunya",
    description: "Espècies actives de març a juny, hàbitats, temporada i confusions que cal conèixer.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

const springGuide = seasonGuidesById.primavera;
const springMonths = springGuide.months;
const featuredIds = ["morchella-esculenta", "calocybe-gambosa", "marasmius-oreades"];
const springSpecies = speciesAlphabetical
  .filter((species) => springMonths.some((month) => species.ecologicalConfig.seasonality[month] !== "inactive"))
  .sort((left, right) => {
    const leftOrder = featuredIds.indexOf(left.speciesId);
    const rightOrder = featuredIds.indexOf(right.speciesId);
    if (leftOrder >= 0 || rightOrder >= 0) return (leftOrder < 0 ? 99 : leftOrder) - (rightOrder < 0 ? 99 : rightOrder);
    return left.identity.commonName.localeCompare(right.identity.commonName, "ca");
  });


export default function SpringMushroomsPage() {
  return (
    <PageShell as="article">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Bolets de primavera a Catalunya",
        url: absoluteUrl("/bolets-de-primavera"),
        inLanguage: "ca",
        publisher: { "@id": `${SITE_URL}/#organization` },
        ...editorialArticleFields("bolets-de-primavera"),
        mainEntity: { "@type": "ItemList", numberOfItems: springSpecies.length, itemListElement: springSpecies.map((species, index) => ({ "@type": "ListItem", position: index + 1, name: species.identity.commonName, url: absoluteUrl(speciesPath(species)) })) },
      }} />
      <PageHeader
        eyebrow={<SeasonTabs current="primavera" />}
        title={<>Bolets<br /><PageTitleAccent>de primavera.</PageTitleAccent></>}
        description="La selecció inclou totes les espècies del catàleg amb activitat possible o superior entre març i juny. La múrgola, el moixernó i el cama-sec encapçalen la guia, però el calendari real depèn d’altitud, pluja i temperatura."
        layout="split"
      />

      <SeasonProtagonists guide={springGuide} species={springSpecies} />
      <SeasonMonthColumns guide={springGuide} species={springSpecies} description={<><strong>La primavera també té confusions de risc.</strong> Identifica exemplars complets i no decideixis el consum amb una fotografia; la pluja, la temperatura i l’altitud marquen cada finestra.</>} />
      <SeasonSpeciesCollections
        guide={springGuide}
        species={springSpecies}
        meta={<span className="season-range-meta"><CalendarDays size={14} /> {springGuide.rangeLabel}</span>}
      />

      <section className="intent-reading-section season-reading-section" aria-labelledby="spring-reading-title">
        <SectionHeader
          meta="Temporada, no promesa"
          title="Com interpretar els bolets de primavera"
          titleId="spring-reading-title"
        />
        <div className="intent-reading-grid">
          <div>
            <p>La selecció de bolets de primavera es basa en el calendari ecològic de cada espècie. La data orienta, però la pluja acumulada, la temperatura, l’altitud i el bosc decideixen si pot fructificar en un lloc concret.</p>
            <p>Per preparar una sortida, consulta les <Link href="/bolets-avui">condicions actuals</Link> i el <Link href="/map">mapa de bolets de Catalunya</Link>; després contrasta sempre l’exemplar amb la seva fitxa.</p>
          </div>
          <ol>
            <li>Comença per espècies que encaixin amb el mes i l’hàbitat.</li>
            <li>Comprova si les condicions recents són favorables a la zona.</li>
            <li>Revisa les confusions abans de collir o consumir.</li>
          </ol>
        </div>
      </section>

      <EditorialAttribution contentId="bolets-de-primavera" sources={[officialSafetySource, ...coreEditorialSources, ...springSpecies.flatMap((species) => species.references)]} variant="compact" />
    </PageShell>
  );
}
