import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, CloudRain, Map } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { SpeciesCard } from "@/components/species-card";
import { speciesInSeason } from "@/src/lib/species-collections";
import { monthInTimeZone, monthWithPreposition, SEASON_MONTHS } from "@/src/lib/seasonality";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";

export const metadata: Metadata = {
  title: "Temporada de bolets a Catalunya: calendari per espècie",
  description: "Calendari de la temporada de bolets a Catalunya per mesos i espècies. Consulta quins bolets poden fructificar ara i quines condicions necessiten.",
  alternates: { canonical: "/temporada" },
  openGraph: {
    url: "/temporada",
    title: "Temporada de bolets a Catalunya",
    description: "Calendari mensual d’espècies i lectura de les condicions ambientals actuals.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

export const revalidate = 3600;

export default function MushroomSeasonPage() {
  const currentMonth = monthInTimeZone();
  const month = SEASON_MONTHS.find((item) => item.key === currentMonth)!;
  const activeSpecies = speciesInSeason(currentMonth);

  return (
    <div className="intent-page page-width">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Temporada de bolets a Catalunya",
        url: absoluteUrl("/temporada"),
        inLanguage: "ca",
        description: "Calendari mensual de fructificació de les espècies de bolets de Catalunya.",
      }} />
      <header className="intent-hero intent-hero-season">
        <div>
          <p className="eyebrow"><CalendarDays size={15} /> Calendari ecològic</p>
          <h1>Temporada de bolets<br /><i>a Catalunya.</i></h1>
        </div>
        <p>La tardor concentra més espècies, però no és l’única temporada. Altitud, pluja, temperatura i humitat poden avançar, retardar o interrompre cada fructificació.</p>
      </header>

      <section className="season-now-panel">
        <div className="season-now-number">{month.shortLabel}</div>
        <div><span>Lectura del mes actual</span><h2>Bolets de temporada {monthWithPreposition(currentMonth)}</h2><p>{activeSpecies.length} espècies del catàleg tenen activitat estacional possible o superior aquest mes. El calendari descriu potencial: no confirma que estiguin fructificant avui.</p></div>
        <Link href="/map" className="button light-button">Veure condicions actuals <Map size={16} /></Link>
      </section>

      <div className="season-year" aria-label="Calendari anual de la temporada de bolets">
        {SEASON_MONTHS.map((item) => {
          const count = speciesInSeason(item.key).length;
          return <div className={item.key === currentMonth ? "is-current" : ""} key={item.key}><span>{item.shortLabel}</span><strong>{count}</strong><small>{count === 1 ? "espècie" : "espècies"}</small></div>;
        })}
      </div>

      <aside className="intent-safety-note season-explainer">
        <CloudRain size={22} aria-hidden="true" />
        <div><strong>Calendari i condicions no són el mateix.</strong><p>La temporada indica quan una espècie pot fructificar habitualment. Per valorar el moment actual també cal llegir pluja acumulada, humitat, temperatura i hàbitat compatible.</p></div>
      </aside>

      <div className="intent-section-heading">
        <div><span>{month.label}</span><h2>Espècies actives aquest mes</h2></div>
        <Link href="/species" className="text-link">Veure totes les espècies <ArrowUpRight size={16} /></Link>
      </div>
      {activeSpecies.length ? (
        <div className="species-grid intent-species-grid">
          {activeSpecies.map((species, index) => <SpeciesCard key={species.speciesId} species={species} index={index} currentMonth={currentMonth} />)}
        </div>
      ) : <p className="empty-state">No hi ha cap espècie activa aquest mes segons el calendari del catàleg.</p>}
    </div>
  );
}
