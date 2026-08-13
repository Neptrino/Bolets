import Link from "next/link";
import { ArrowUpRight, CalendarDays, CloudRain, Map } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { SpeciesCard } from "@/components/species-card";
import { speciesInSeason } from "@/src/lib/species-collections";
import {
  monthInTimeZone,
  monthWithPreposition,
  seasonMonthPath,
  SEASON_MONTHS,
} from "@/src/lib/seasonality";
import { absoluteUrl, speciesPath } from "@/src/lib/seo";
import { seasonGuideForMonth } from "@/src/lib/season-guides";
import type { Month } from "@/src/lib/types";

type SeasonPageContentProps = {
  canonicalPath: string;
  month: Month;
  overview?: boolean;
};

export function SeasonPageContent({ canonicalPath, month, overview = false }: SeasonPageContentProps) {
  const selectedMonth = SEASON_MONTHS.find((item) => item.key === month)!;
  const currentMonth = monthInTimeZone();
  const activeSpecies = speciesInSeason(month);
  const relatedSeasonGuide = seasonGuideForMonth(month);
  const pageName = overview
    ? "Temporada de bolets a Catalunya"
    : `Bolets de temporada ${monthWithPreposition(month)}: calendari de Catalunya`;

  return (
    <PageShell>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: pageName,
        url: absoluteUrl(canonicalPath),
        inLanguage: "ca",
        description: overview
          ? "Calendari mensual de fructificació de les espècies de bolets de Catalunya."
          : `Calendari de les espècies de bolets amb activitat estacional ${monthWithPreposition(month)} a Catalunya.`,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: activeSpecies.length,
          itemListElement: activeSpecies.map((species, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: species.identity.commonName,
            url: absoluteUrl(speciesPath(species)),
          })),
        },
      }} />
      <PageHeader
        eyebrow={<><CalendarDays size={15} /> Calendari ecològic</>}
        title={overview
          ? <>Temporada de bolets<br /><PageTitleAccent>a Catalunya.</PageTitleAccent></>
          : <>Bolets de temporada<br /><PageTitleAccent>{monthWithPreposition(month)}.</PageTitleAccent></>}
        description={overview
          ? "La tardor concentra més espècies, però no és l’única temporada. Altitud, pluja, temperatura i humitat poden avançar, retardar o interrompre cada fructificació."
          : `${activeSpecies.length} espècies del catàleg poden tenir activitat estacional ${monthWithPreposition(month)}. La pluja, la temperatura, l’altitud i la humitat decideixen si arriben a fructificar.`}
        layout="split"
        tone="forest"
      />

      <section className="season-now-panel">
        <div className="season-now-number">{selectedMonth.shortLabel}</div>
        <div>
          <span>{overview ? "Lectura del mes actual" : "Lectura del mes seleccionat"}</span>
          <h2>Bolets de temporada {monthWithPreposition(month)}</h2>
          <p>{activeSpecies.length} espècies del catàleg tenen activitat estacional possible o superior aquest mes. El calendari descriu potencial: no confirma que estiguin fructificant avui.</p>
        </div>
        <Link href="/map" className="button light-button">Veure condicions actuals <Map size={16} /></Link>
      </section>

      <nav className="season-year" aria-label="Calendari anual de la temporada de bolets">
        {/* Next 16 retains the overview canonical during a soft navigation to
            the dynamic month page. A document navigation keeps one canonical. */}
        {SEASON_MONTHS.map((item) => {
          const count = speciesInSeason(item.key).length;
          const isSelected = item.key === month;
          const isCurrentMonth = item.key === currentMonth;
          const speciesLabel = count === 1 ? "espècie" : "espècies";
          return (
            <a
              aria-current={isSelected ? (overview ? "date" : "page") : undefined}
              aria-label={`Temporada de bolets ${monthWithPreposition(item.key)}: ${count} ${speciesLabel}${isCurrentMonth ? ", mes actual" : ""}`}
              className={isSelected ? "is-selected" : undefined}
              href={seasonMonthPath(item.key)}
              key={item.key}
            >
              <span>{item.shortLabel}</span>
              <strong>{count}</strong>
              <small>{speciesLabel}</small>
            </a>
          );
        })}
      </nav>

      <aside className="intent-safety-note season-explainer">
        <CloudRain size={22} aria-hidden="true" />
        <div><strong>Calendari i condicions no són el mateix.</strong><p>La temporada indica quan una espècie pot fructificar habitualment. Per valorar el moment actual també cal llegir pluja acumulada, humitat, temperatura i hàbitat compatible.</p></div>
      </aside>

      <SectionHeader
        meta={selectedMonth.label}
        title={overview ? "Espècies actives aquest mes" : `Espècies actives ${monthWithPreposition(month)}`}
        actions={<span className="season-related-links"><Link href={relatedSeasonGuide.path} className="text-link">{relatedSeasonGuide.cardTitle} <ArrowUpRight size={16} /></Link><Link href="/bolets" className="text-link">Veure tots els bolets <ArrowUpRight size={16} /></Link></span>}
      />
      {activeSpecies.length ? (
        <div className="species-grid intent-species-grid">
          {activeSpecies.map((species, index) => <SpeciesCard key={species.speciesId} species={species} index={index} currentMonth={month} />)}
        </div>
      ) : <p className="empty-state">No hi ha cap espècie activa aquest mes segons el calendari del catàleg.</p>}
    </PageShell>
  );
}
