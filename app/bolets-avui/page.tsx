import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  CloudRain,
  Database,
  Gauge,
  Map,
  MapPinned,
  ShieldCheck,
  ThermometerSun,
} from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { editorialArticleFields, environmentalSources } from "@/data/editorial";
import {
  loadCurrentOverview,
  topCurrentOverviewItems,
  type CurrentOverviewItem,
} from "@/src/lib/current-overview";
import { SEASONAL_ACTIVITY_LABELS } from "@/src/lib/seasonality";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, SITE_URL, speciesPath } from "@/src/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Bolets avui: millors zones i condicions",
  description: "Descobreix les deu millors combinacions prioritàries d’espècie i zona a Catalunya, comparades amb dades vigents de pluja, temperatura i hàbitat.",
  alternates: { canonical: "/bolets-avui" },
  openGraph: {
    url: "/bolets-avui",
    title: "Bolets avui: millors zones i condicions",
    description: "Top 10 de combinacions d’espècie i zona, calculat entre les candidates estacionals prioritàries i amb dades ambientals vigents.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

const dateTime = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

const dateOnly = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "medium",
  timeZone: "Europe/Madrid",
});

const timeOnly = new Intl.DateTimeFormat("ca-ES", {
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

function metric(value: number | undefined, unit: string, fractionDigits = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("ca-ES", { maximumFractionDigits: fractionDigits })}${unit}`;
}

function limitingFactor(item: CurrentOverviewItem) {
  return item.summary?.result.contributions
    .filter((factor) => factor.score !== null)
    .sort((left, right) => (left.score ?? 0) - (right.score ?? 0))[0]?.label ?? "Sense factor limitant publicat";
}

function readingMetrics(item: CurrentOverviewItem) {
  const values = item.summary?.snapshot.values;
  return {
    rainfall: metric(values?.rainfall7dMm, " mm", 1),
    temperature: metric(values?.temperatureAvg10dC ?? values?.temperatureAvg24hC, " °C", 1),
  };
}

function observationWindow(items: CurrentOverviewItem[]) {
  const observations = items
    .flatMap((item) => item.summary ? [new Date(item.summary.snapshot.observedAt)] : [])
    .sort((left, right) => left.getTime() - right.getTime());
  const first = observations[0];
  const last = observations.at(-1);

  if (!first || !last) return null;
  if (dateOnly.format(first) === dateOnly.format(last)) {
    return `Lectures del ${dateOnly.format(last)}, entre les ${timeOnly.format(first)} i les ${timeOnly.format(last)}`;
  }
  return `Lectures entre ${dateTime.format(first)} i ${dateTime.format(last)}`;
}

function monthlyActivityLabel(activity: CurrentOverviewItem["seasonalActivity"]) {
  const label = SEASONAL_ACTIVITY_LABELS[activity];
  return activity === "peak" || activity === "inactive" ? label : `activitat ${label}`;
}

export default async function MushroomsTodayPage() {
  const allItems = await loadCurrentOverview();
  const items = topCurrentOverviewItems(allItems);
  const leader = items[0];
  const speciesEvaluated = new Set(allItems.map((item) => item.speciesId)).size;
  const availableReadings = allItems.filter((item) => item.status === "available").length;
  const observedWindow = observationWindow(items);
  const overviewSources = [...new Set(
    allItems.flatMap((item) => item.summary?.snapshot.source ?? []),
  )];

  return (
    <PageShell as="article">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Bolets avui: millors zones i condicions a Catalunya",
        description: metadata.description,
        url: absoluteUrl("/bolets-avui"),
        inLanguage: "ca",
        publisher: { "@id": `${SITE_URL}/#organization` },
        ...editorialArticleFields("bolets-avui"),
      }} />
      <PageHeader
        eyebrow={<><Map size={15} /> Predicció amb les últimes dades disponibles</>}
        title={<>Bolets avui<br /><PageTitleAccent>a Catalunya.</PageTitleAccent></>}
        description="Per cada zona general seleccionem les tres espècies comestibles més rellevants aquest mes, segons activitat estacional, prioritat editorial i de cerca i valor culinari. Després comparem ambientalment les candidates i publiquem el top 10."
        layout="split"
      />

      {leader?.summary && leader.summary.result.score !== null ? (
        <section className="current-leader" aria-labelledby="current-leader-title">
          <div className="current-leader-copy">
            <p className="current-leader-eyebrow"><MapPinned size={15} /> Lectura més favorable ara</p>
            <h2 id="current-leader-title">{leader.regionName}</h2>
            <p><Link href={speciesPath(leader)} className="current-leader-species-link"><strong>{leader.speciesName}</strong><ArrowUpRight size={14} /></Link> forma la combinació amb més puntuació entre totes les parelles d’espècie i zona que han passat els controls de publicació.</p>
            <Link href={`/map?species=${leader.speciesId}&region=${leader.regionId}`} className="current-leader-link">
              <Map size={16} /> Veure al mapa <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="current-leader-score" aria-label={`Puntuació ${leader.summary.result.score} sobre 100`}>
            <strong>{leader.summary.result.score}</strong>
            <span>/ 100</span>
            <small>{leader.summary.result.label}</small>
          </div>
          <dl className="current-leader-signals">
            <div><dt><CloudRain size={16} /> Pluja 7 dies</dt><dd>{readingMetrics(leader).rainfall}</dd></div>
            <div><dt><ThermometerSun size={16} /> Temperatura</dt><dd>{readingMetrics(leader).temperature}</dd></div>
            <div><dt><Gauge size={16} /> Factor més limitant</dt><dd>{limitingFactor(leader)}</dd></div>
          </dl>
          <p className="current-leader-meta"><Clock3 size={14} /> Observat {dateTime.format(new Date(leader.summary.snapshot.observedAt))}</p>
        </section>
      ) : (
        <aside className="current-leader current-leader-empty">
          <ShieldCheck size={24} />
          <div><strong>Avui no hi ha cap lectura publicable.</strong><p>Hem comprovat les combinacions estacionals vàlides, però no calculem cap substitut quan les dades no passen els controls de vigència i completitud.</p></div>
        </aside>
      )}

      <aside className="current-overview-method">
        <ShieldCheck size={21} aria-hidden="true" />
        <p><strong>Això compara combinacions de zona i espècie, no punts on hi hagi bolets.</strong> Avaluem fins a tres candidates per zona: prioritzem l’activitat estacional i, a igual activitat, l’interès editorial i de cerca i el valor culinari. Només incloem espècies amb predicció actual i configuració ecològica compatible. Aquesta selecció no modifica la puntuació, no confirma presència ni garanteix cap troballa.</p>
      </aside>

      <section className="current-board" aria-labelledby="current-board-title">
        <header className="current-board-heading">
          <div>
            <p className="eyebrow">Comparador territorial</p>
            <h2 id="current-board-title">Top 10 de combinacions d’avui</h2>
          </div>
          <div>
            <p>Hem avaluat <strong>{allItems.length} combinacions prioritàries</strong> de {speciesEvaluated} espècies en nou zones; {availableReadings} han generat una lectura publicable. Aquí mostrem les deu puntuacions més altes.</p>
            <p className="current-board-key"><strong>Calendari</strong>: activitat habitual de l’espècie aquest mes. <strong>Condició</strong>: lectura ambiental d’avui.</p>
            {observedWindow ? <p className="current-board-updated"><Clock3 size={14} /> {observedWindow}</p> : null}
          </div>
        </header>

        {items.length > 0 ? <>
          <div className="current-board-columns" aria-hidden="true">
            <span>Posició</span><span>Zona i espècie</span><span>Condició</span><span>Senyals</span><span>Mapa</span>
          </div>
          <ol className="current-overview-grid" aria-label="Top 10 de condicions actuals per espècie i regió">
            {items.map((item, index) => {
            const summary = item.summary;
            const score = summary?.result.score;
            const isAvailable = item.status === "available" && summary !== null && score !== null && score !== undefined;
            const rank = isAvailable ? index + 1 : null;
            const signals = readingMetrics(item);

            return (
              <li className={`current-overview-card is-${item.status}`} key={`${item.speciesId}-${item.regionId}`}>
                <span className="current-row-rank" aria-label={rank ? `Posició ${rank}` : "Sense posició"}>{rank ? String(rank).padStart(2, "0") : "—"}</span>
                <div className="current-overview-card-heading">
                  <h3>{item.regionName}</h3>
                  <p className="current-row-species"><Link href={speciesPath(item)} className="current-row-species-link">{item.speciesName}<ArrowUpRight size={13} /></Link><span>Calendari: {monthlyActivityLabel(item.seasonalActivity)}</span></p>
                </div>
                {isAvailable && summary && score !== null && score !== undefined ? (
                  <div className="current-score">
                    <div><strong>{score}</strong><span>/100 · {summary.result.label}</span></div>
                    <span className="current-score-track" aria-hidden="true"><span style={{ width: `${score}%` }} /></span>
                  </div>
                ) : (
                  <div className="current-unavailable">
                    <strong>{item.status === "unavailable" ? "Temporalment no disponible" : "Dades insuficients"}</strong>
                    <span>{item.status === "unavailable" ? "La font ambiental no ha respost" : "Resultat retingut pels controls"}</span>
                  </div>
                )}
                <dl className="current-row-signals">
                  <div><dt>Pluja 7 d</dt><dd>{signals.rainfall}</dd></div>
                  <div><dt>Temp.</dt><dd>{signals.temperature}</dd></div>
                </dl>
                <Link href={`/map?species=${item.speciesId}&region=${item.regionId}`} className="current-row-map" aria-label={`Veure al mapa: ${item.regionName}, ${item.speciesName}`}>
                  <Map size={15} /><span>Veure mapa</span>
                </Link>
              </li>
            );
            })}
          </ol>
        </> : <div className="current-board-empty"><strong>Cap combinació publicable ara mateix</strong><p>Les dades insuficients o temporalment no disponibles no reben cap puntuació substitutiva.</p></div>}
      </section>

      {overviewSources.length > 0 ? (
        <aside className="current-overview-provenance" aria-label="Procedència de les dades">
          <Database size={14} aria-hidden="true" />
          <p><strong>Fonts de les dades:</strong> {overviewSources.join(" · ")}</p>
        </aside>
      ) : null}

      <EditorialAttribution contentId="bolets-avui" sources={environmentalSources} />
    </PageShell>
  );
}
