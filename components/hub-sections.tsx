import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, BookOpen, CalendarRange, Clock3, Gauge, Map as MapIcon, Mountain } from "lucide-react";
import { UmamiEventLink } from "@/components/umami-event-link";
import { opportunityLabel } from "@/src/lib/scoring";
import { SEASON_MONTHS, SEASONAL_ACTIVITY_LABELS } from "@/src/lib/seasonality";
import { getSuitabilityBand, predictionMapCellColour } from "@/src/lib/suitability-scale";
import { UMAMI_EVENTS } from "@/src/lib/umami-goals";
import type { Month, SpeciesProfile } from "@/src/lib/types";

/* Sections shared by the place hub and the zone hub: facts strip, Today panel, calendar. */

const dateTime = new Intl.DateTimeFormat("ca-ES", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid" });

/** Months where at least one species is in good or peak activity, as a readable window. */
export function hubSeasonWindow(species: SpeciesProfile[]) {
  const months = SEASON_MONTHS
    .map((month, index) => ({ month, index }))
    .filter(({ month }) => species.some((entry) => ["good", "peak"].includes(entry.ecologicalConfig.seasonality[month.key])));
  if (months.length === 0) return "Sense pic definit";
  const contiguous = months.every((entry, position) => position === 0 || entry.index === months[position - 1].index + 1);
  if (months.length === 1) return months[0].month.label;
  if (contiguous) return `${months[0].month.label} – ${months[months.length - 1].month.label}`;
  return months.map(({ month }) => month.shortLabel.toLocaleLowerCase("ca")).join(", ");
}

export function hubAltitudeBand(species: SpeciesProfile[]) {
  const ranges = species.map((entry) => entry.ecologicalConfig.habitat.altitude);
  if (ranges.length === 0) return "—";
  const low = Math.min(...ranges.map(([from]) => from));
  const high = Math.max(...ranges.map(([, to]) => to));
  return low === 0 ? `fins a ${high} m` : `${low}–${high} m`;
}

/** "cep, rossinyol i pinetell" for running text. */
export function hubSpeciesList(species: SpeciesProfile[]) {
  const names = species.map((entry) => entry.identity.commonName.toLocaleLowerCase("ca"));
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} i ${names[names.length - 1]}` : names[0] ?? "";
}

export function HubFacts({ species }: { species: SpeciesProfile[] }) {
  return (
    <section className="location-hub-facts" aria-label="Resum">
      <div><BookOpen size={19} /><span>Bolets amb guia</span><strong>{species.map((entry) => entry.identity.commonName).join(", ")}</strong></div>
      <div><CalendarRange size={19} /><span>Temporada habitual</span><strong>{hubSeasonWindow(species)}</strong></div>
      <div><Mountain size={19} /><span>Altitud dels boscos</span><strong>{hubAltitudeBand(species)}</strong></div>
    </section>
  );
}

export type HubReading = {
  species: SpeciesProfile;
  /** Best-sector score, or null when the reading is missing or incomplete. */
  score: number | null;
  guideHref: string;
  mapHref: string;
};

export function HubTodayPanel({
  id,
  className,
  title,
  intro,
  note,
  liveMapHref,
  liveMapLabel,
  observedAt,
  readings,
  state,
}: {
  /** Anchor target and extra classes for pages whose tests or links address the panel. */
  id?: string;
  className?: string;
  title: string;
  intro: string;
  note?: ReactNode;
  liveMapHref?: string;
  liveMapLabel: string;
  observedAt?: string;
  readings: HubReading[];
  state: "loading" | "available" | "unavailable" | "off-season";
}) {
  return (
    <section
      id={id}
      className={className ? `place-today ${className}` : "place-today"}
      aria-labelledby="place-today-title"
      aria-busy={state === "loading" ? true : undefined}
      aria-live={state === "loading" ? "polite" : undefined}
      data-place-conditions-state={state}
    >
      <header className="place-today-head">
        <div className="place-today-intro">
          <p className="eyebrow"><Gauge size={15} aria-hidden="true" /> Avui</p>
          <h2 id="place-today-title">{title}</h2>
          <p>{intro}</p>
          {state === "loading" ? <p className="place-today-note"><Clock3 size={14} aria-hidden="true" /> Comprovant les lectures més recents…</p> : note}
        </div>
        <div className="place-today-actions">
          {liveMapHref ? <UmamiEventLink href={liveMapHref} analyticsEvent={UMAMI_EVENTS.guideMapOpen} className="button"><MapIcon size={17} aria-hidden="true" /> {liveMapLabel}</UmamiEventLink> : null}
          <Link href="/bolets-avui" className="place-today-link">Condicions d’avui a Catalunya <ArrowUpRight size={15} aria-hidden="true" /></Link>
          {observedAt ? <p className="place-today-updated"><Clock3 size={14} aria-hidden="true" /> Dades de {dateTime.format(new Date(observedAt))}</p> : null}
        </div>
      </header>
      {readings.length > 0 ? (
        <ol className="place-today-grid" aria-label="Lectures actuals per espècie">
          {readings.map(({ species, score, guideHref, mapHref }) => (
            <li className={`place-today-card${score === null ? " is-unavailable" : ""}`} key={species.speciesId}>
              <div className="place-today-card-head">
                <h3>{species.identity.commonName}</h3>
                {score !== null ? (
                  <p className="place-today-score" aria-label={`Millor sector ${score} sobre 100, ${opportunityLabel(score)}`}><strong>{score}</strong><span>/100</span></p>
                ) : null}
              </div>
              {score !== null ? (
                <>
                  <p className="place-today-verdict" style={{ color: getSuitabilityBand(score).color }}>{opportunityLabel(score)}</p>
                  <span className="place-today-track" aria-hidden="true"><span style={{ width: `${score}%`, background: predictionMapCellColour(score) }} /></span>
                </>
              ) : (
                <p className="place-today-verdict">Sense lectura: falten dades recents. Torna-hi més tard.</p>
              )}
              <div className="place-today-card-links">
                <Link href={guideHref}>Guia <ArrowUpRight size={14} aria-hidden="true" /></Link>
                <UmamiEventLink href={mapHref} analyticsEvent={UMAMI_EVENTS.guideMapOpen} aria-label={`Veure al mapa: ${species.identity.commonName}`}>Veure mapa <ArrowUpRight size={14} aria-hidden="true" /></UmamiEventLink>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

export function HubSeasonMatrix({
  title,
  rows,
  month,
}: {
  title: string;
  rows: Array<{ species: SpeciesProfile; href: string }>;
  month: Month;
}) {
  return (
    <section className="place-season-matrix" id="local-species-comparison" aria-labelledby="local-species-comparison-title">
      <header>
        <div><p className="eyebrow"><CalendarRange size={15} aria-hidden="true" /> Calendari</p><h2 id="local-species-comparison-title">{title}</h2></div>
        <p>Activitat habitual de cada espècie mes a mes, amb el mes actual destacat. És el calendari típic: l’any real depèn de la pluja i la temperatura.</p>
      </header>
      <div className="place-season-table-scroll" role="region" aria-label="Calendari per espècie" tabIndex={0}>
        <table className="place-season-table">
          <caption className="sr-only">Activitat mensual de les espècies amb guia</caption>
          <thead>
            <tr>
              <th scope="col">Espècie</th>
              {SEASON_MONTHS.map(({ key, shortLabel, label }) => (
                <th scope="col" key={key} className={`place-season-month${key === month ? " is-current" : ""}`} abbr={label} aria-current={key === month ? "date" : undefined}>{shortLabel}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ species, href }) => (
              <tr key={species.speciesId}>
                <th scope="row"><Link href={href}>{species.identity.commonName}</Link><small>{species.identity.scientificName}</small></th>
                {SEASON_MONTHS.map(({ key, label }) => {
                  const level = species.ecologicalConfig.seasonality[key];
                  return (
                    <td key={key} className={`place-season-month${key === month ? " is-current" : ""}`}>
                      <i className={`place-season-level ${level}`} aria-hidden="true" />
                      <span className="sr-only">{label}: {SEASONAL_ACTIVITY_LABELS[level]}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="place-season-legend">
        <span><i className="place-season-level possible" aria-hidden="true" />possible</span>
        <span><i className="place-season-level moderate" aria-hidden="true" />moderada</span>
        <span><i className="place-season-level good" aria-hidden="true" />bona</span>
        <span><i className="place-season-level peak" aria-hidden="true" />pic</span>
      </p>
    </section>
  );
}
