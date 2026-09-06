import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, MoveHorizontal } from "lucide-react";
import { SectionHeader } from "@/components/page-layout";
import { edibleSpecies } from "@/src/lib/species-collections";
import { SEASON_MONTHS, SEASONAL_ACTIVITY_LABELS, monthWithPreposition, seasonMonthPath } from "@/src/lib/seasonality";
import { speciesPath } from "@/src/lib/seo";
import type { Month, SeasonalActivity } from "@/src/lib/types";
import styles from "./annual-season-calendar.module.css";

// Symbols preserve the distinction between activity levels without colour.
const activitySymbols: Record<SeasonalActivity, string> = {
  inactive: "—",
  possible: "○",
  moderate: "◐",
  good: "●",
  peak: "★",
};

export function AnnualSeasonCalendar({ currentMonth, selectedMonth = currentMonth }: { currentMonth: Month; selectedMonth?: Month }) {
  const selectedIndex = SEASON_MONTHS.findIndex(({ key }) => key === selectedMonth);
  const selected = SEASON_MONTHS[selectedIndex];
  const previous = SEASON_MONTHS[(selectedIndex + 11) % 12];
  const next = SEASON_MONTHS[(selectedIndex + 1) % 12];

  return (
    <section id="calendari-anual" className={styles.calendar} aria-labelledby="annual-calendar-title">
      <SectionHeader
        meta={`${edibleSpecies.length} espècies · 12 mesos`}
        title="La temporada, mes a mes"
        titleId="annual-calendar-title"
        description="Compara el calendari habitual dels bolets comestibles amb informació estacional al catàleg. Cada fila enllaça a la fitxa, on trobaràs l’hàbitat, les confusions i les condicions de consum."
        actions={<Link href="/map" className={`text-link ${styles.mapLink}`}>Condicions al mapa <ArrowUpRight size={16} aria-hidden="true" /></Link>}
      />
      <ul className={styles.legend} aria-label="Llegenda d’activitat estacional">
        {(Object.keys(activitySymbols) as SeasonalActivity[]).map((activity) => (
          <li key={activity}>
            <span className={`${styles.level} ${styles[activity]}`} aria-hidden="true">{activitySymbols[activity]}</span>
            {SEASONAL_ACTIVITY_LABELS[activity]}
          </li>
        ))}
      </ul>
      <p id="annual-calendar-help" className={styles.help}>
        <span className={styles.yearHelp}><MoveHorizontal size={16} aria-hidden="true" /> Desplaça la taula per veure tots els mesos. La columna marcada correspon al mes seleccionat; «Ara» indica el mes actual.</span>
        <span className={styles.monthHelp}>Consulta l’activitat de cada espècie aquest mes. Canvia de mes amb les fletxes.</span>
      </p>
      <nav className={styles.monthNavigation} aria-label="Canvia el mes de la taula">
        <a href={`${seasonMonthPath(previous.key)}#calendari-anual`} aria-label={`Mes anterior: ${previous.label}`}><ArrowLeft size={20} aria-hidden="true" /></a>
        <strong>{selected.label}{selectedMonth === currentMonth ? <small>Mes actual</small> : null}</strong>
        <a href={`${seasonMonthPath(next.key)}#calendari-anual`} aria-label={`Mes següent: ${next.label}`}><ArrowRight size={20} aria-hidden="true" /></a>
      </nav>
      <div className={styles.scroll} role="region" aria-label="Taula del calendari anual" aria-describedby="annual-calendar-help" tabIndex={0}>
        <table className={styles.table}>
          <caption className="sr-only">Calendari anual de fructificació habitual dels bolets comestibles</caption>
          <thead>
            <tr>
              <th scope="col">Bolet</th>
              {SEASON_MONTHS.map(({ key, shortLabel }) => (
                <th key={key} scope="col" data-selected={key === selectedMonth || undefined}>
                  <a href={seasonMonthPath(key)} aria-label={`Bolets ${monthWithPreposition(key)}${key === currentMonth ? ", mes actual" : ""}`} aria-current={key === selectedMonth ? "page" : undefined}>
                    {shortLabel}
                    {key === currentMonth ? <span className={styles.currentLabel}>Ara</span> : null}
                  </a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {edibleSpecies.map((species) => (
              <tr key={species.speciesId}>
                <th scope="row">
                  <Link href={speciesPath(species)} prefetch={false}>
                    <span>{species.identity.commonName}</span>
                    <em>{species.identity.scientificName}</em>
                  </Link>
                </th>
                {SEASON_MONTHS.map(({ key, label }) => {
                  const activity = species.ecologicalConfig.seasonality[key];
                  const description = `${species.identity.commonName}, ${label}: ${SEASONAL_ACTIVITY_LABELS[activity]}`;
                  return (
                    <td key={key} data-selected={key === selectedMonth || undefined}>
                      <span className={`${styles.level} ${styles[activity]}`} title={description}>
                        <span aria-hidden="true">{activitySymbols[activity]}</span>
                        <span className="sr-only">{SEASONAL_ACTIVITY_LABELS[activity]}</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>La temporada és orientativa: no confirma presència ni abundància, i no serveix per identificar un bolet per al consum. Les espècies sense calendari mensual documentat es poden consultar a la <Link href="/bolets" className="text-link">guia de bolets</Link>.</p>
    </section>
  );
}
