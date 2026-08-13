import Link from "next/link";
import { ArrowUpRight, CalendarDays, CircleAlert, CloudRain, Leaf, Snowflake, Sun, Trees } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { SeasonGuideSwitcher } from "@/components/season-guide-switcher";
import { SpeciesCard } from "@/components/species-card";
import { coreEditorialSources, editorialArticleFields, officialSafetySource } from "@/data/editorial";
import { absoluteUrl, SITE_URL, speciesPath } from "@/src/lib/seo";
import { speciesForSeasonGuide, type SeasonGuide } from "@/src/lib/season-guides";

const seasonIcons = {
  primavera: Leaf,
  estiu: Sun,
  tardor: Trees,
  hivern: Snowflake,
};

export function SeasonalGuidePage({ guide }: { guide: SeasonGuide }) {
  const species = speciesForSeasonGuide(guide);
  const SeasonIcon = seasonIcons[guide.id];

  return (
    <article className="seo-guide page-width seasonal-guide-page">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `${guide.cardTitle} a Catalunya`,
        description: guide.intro,
        url: absoluteUrl(guide.path),
        inLanguage: "ca",
        publisher: { "@id": `${SITE_URL}/#organization` },
        ...editorialArticleFields(guide.path.slice(1)),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: species.length,
          itemListElement: species.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.identity.commonName,
            url: absoluteUrl(speciesPath(item)),
          })),
        },
      }} />
      <header className="seo-guide-hero">
        <p className="eyebrow"><SeasonIcon size={15} /> Calendari {guide.rangeSentence}</p>
        <h1>Bolets<br /><i>{guide.heroAccent}</i></h1>
        <p>{guide.intro} La guia inclou totes les espècies del catàleg amb activitat possible o superior durant aquests mesos.</p>
      </header>

      <section className="seasonal-guide-notes" aria-label={`Com interpretar la temporada ${guide.id}`}>
        <article><CloudRain size={21} aria-hidden="true" /><div><h2>{guide.conditionTitle}</h2><p>{guide.conditionText}</p></div></article>
        <article><CircleAlert size={21} aria-hidden="true" /><div><h2>Calendari no vol dir presència</h2><p>No consumeixis cap bolet sense una identificació experta. El calendari descriu potencial estacional i no confirma que una espècie estigui fructificant.</p></div></article>
      </section>

      <section aria-labelledby={`${guide.id}-catalogue-title`}>
        <div className="intent-section-heading">
          <div>
            <div className="seasonal-calendar-controls">
              <span><CalendarDays size={14} /> {guide.rangeLabel}</span>
              <SeasonGuideSwitcher current={guide.id} />
            </div>
            <h2 id={`${guide.id}-catalogue-title`}>{species.length} espècies del calendari</h2>
          </div>
          <Link href="/temporada" className="text-link">Veure els mesos <ArrowUpRight size={16} /></Link>
        </div>
        <div className="species-grid intent-species-grid">{species.map((item, index) => <SpeciesCard key={item.speciesId} species={item} index={index} currentMonth={guide.representativeMonth} />)}</div>
      </section>
      <EditorialAttribution contentId={guide.path.slice(1)} sources={[officialSafetySource, ...coreEditorialSources, ...species.flatMap((item) => item.references)]} />
    </article>
  );
}
