import "@/app/styles/current-readings.css";
import { developmentOverviewSimulation } from "@/src/lib/current-overview-simulation";
import type { Metadata } from "next";
import { IntentLink as Link } from "@/components/intent-link";
import { UmamiEventLink } from "@/components/umami-event-link";
import { UMAMI_EVENTS } from "@/src/lib/umami-goals";
import { Suspense } from "react";
import {
  ArrowUpRight,
  Clock3,
  Map,
} from "lucide-react";
import { DataSourceCredits } from "@/components/editorial-attribution";
import { InstagramMark } from "@/components/instagram-mark";
import { JsonLd } from "@/components/json-ld";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { PredictionMapLegend } from "@/components/prediction-map-legend";
import { LazyCurrentMap } from "@/components/lazy-current-map";
import { editorialArticleFields } from "@/data/editorial";
import { regionSelectItems } from "@/data/regions";
import {
  isAreaOverviewItem,
  rankOverviewItems,
  type RankedOverviewItem,
  type CurrentOverviewItem,
} from "@/src/lib/current-overview";
import { SEASONAL_ACTIVITY_LABELS } from "@/src/lib/seasonality";
import { opportunityLabel } from "@/src/lib/scoring";
import {
  absoluteUrl,
  DEFAULT_SOCIAL_IMAGE,
  metaDescription,
  pageTitle,
  SITE_URL,
  speciesPath,
} from "@/src/lib/seo";
import { speciesMapHref } from "@/src/lib/species-map-pages";
import { territorialMapPath } from "@/src/lib/territorial-map";
import { weekendWindow } from "@/src/lib/week-window";
import { loadOverview, overviewLocationName, overviewMapPath } from "@/src/lib/current-overview-page";
import { WeekendOutlook, WeekendOutlookLoading } from "@/components/weekend-outlook";
import { currentSearchReadings, overviewReadingExplanation } from "@/src/lib/current-overview-copy";

const overviewTitle = "On trobar bolets avui i aquesta setmana";
const overviewDescription = metaDescription(
  "Consulta on buscar bolets avui, aquesta setmana i aquest cap de setmana a Catalunya segons les condicions actuals de pluja, temperatura i hàbitat.",
);

export const metadata: Metadata = {
  title: pageTitle(overviewTitle),
  robots: process.env.NODE_ENV === "development" ? { index: false, follow: false } : undefined,
  description: overviewDescription,
  alternates: { canonical: "/bolets-avui" },
  openGraph: {
    url: "/bolets-avui",
    title: overviewTitle,
    description: overviewDescription,
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

const currentMapRegions = regionSelectItems
  .filter(({ value }) => value !== "altres")
  .map(({ value }) => value);
const MAX_OVERVIEW_CARDS = 10;

function observationWindow(items: RankedOverviewItem[]) {
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

function latestObservation(items: RankedOverviewItem[]) {
  const observations = items
    .flatMap((item) => item.summary ? [new Date(item.summary.snapshot.observedAt)] : [])
    .filter((observation) => !Number.isNaN(observation.getTime()));

  return observations.length > 0
    ? new Date(Math.max(...observations.map((observation) => observation.getTime())))
    : null;
}

function monthlyActivityLabel(activity: CurrentOverviewItem["seasonalActivity"]) {
  const label = SEASONAL_ACTIVITY_LABELS[activity];
  return activity === "peak" || activity === "inactive" ? label : `activitat ${label}`;
}

function catalanList(items: string[]) {
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} i ${items.at(-1)}`;
}


async function CurrentOverview({ simulate = false, section }: { simulate?: boolean; section: "answer" | "ranking" | "notes" | "sources" }) {
  const { loadedCurrentItems, loadedAreaItems } = await loadOverview();
  const { currentItems: allItems, areaItems, simulated } = simulate
    ? developmentOverviewSimulation(loadedCurrentItems, loadedAreaItems)
    : { currentItems: loadedCurrentItems, areaItems: loadedAreaItems, simulated: false };
  const items = rankOverviewItems([...allItems, ...areaItems]);
  const visibleItems = items.slice(0, MAX_OVERVIEW_CARDS);
  const observedWindow = observationWindow(items);
  const lastObservedAt = latestObservation(items);
  const searchReadings = currentSearchReadings(items);
  const topLocations = searchReadings.map((item) =>
    `${overviewLocationName(item)} (${item.speciesName.toLocaleLowerCase("ca")})`,
  );
  const availableCount = items.filter((item) => item.status === "available" && item.summary).length;
  const editorialFields = editorialArticleFields("bolets-avui");
  const editorialModifiedAt = new Date(`${editorialFields.dateModified}T00:00:00+02:00`);
  const pageModifiedAt = lastObservedAt && lastObservedAt > editorialModifiedAt
    ? lastObservedAt
    : editorialModifiedAt;
  const overviewSources = [...new Set(
    items.flatMap((item) => item.summary?.snapshot.source ?? []),
  )];
  const structuredItems = visibleItems.filter(
    (item) => item.status === "available" && item.summary,
  );
  const now = new Date();
  const weekend = weekendWindow(now);

  return (
    <>
      {section === "answer" && <>
        {simulated && <aside className="intent-safety-note" role="status">
          <p><strong>Simulació local · dades fictícies.</strong> Només simula el resum i el comparador. El mapa conserva les seves pròpies dades. <Link href="/bolets-avui">Torna a les lectures reals</Link>.</p>
        </aside>}
        {!simulated && <JsonLd data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${absoluteUrl("/bolets-avui")}#webpage`,
          name: overviewTitle,
          headline: "On trobar bolets avui i aquesta setmana a Catalunya",
          description: overviewDescription,
          url: absoluteUrl("/bolets-avui"),
          inLanguage: "ca",
          isPartOf: { "@id": `${SITE_URL}/#website` },
          publisher: { "@id": `${SITE_URL}/#organization` },
          ...editorialFields,
          dateModified: pageModifiedAt.toISOString(),
          mainEntity: {
            "@type": "ItemList",
            "@id": `${absoluteUrl("/bolets-avui")}#classificacio`,
            name: "Zones i espècies amb les condicions actuals més favorables",
            numberOfItems: structuredItems.length,
            itemListElement: structuredItems.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: `${overviewLocationName(item)} — ${item.speciesName}`,
              url: absoluteUrl(overviewMapPath(item)),
            })),
          },
        }} />}

        <section className="current-search-answer" aria-labelledby="current-search-answer-title">
          <p className="eyebrow">Resposta actualitzada</p>
          <h2 id="current-search-answer-title">On trobar bolets avui a Catalunya?</h2>
          <p>{topLocations.length > 0 ? <>
            Amb les lectures més recents, <strong>{catalanList(topLocations)}</strong> encapçalen
            la comparació de territoris per preparar una sortida avui o aquesta setmana.
            Són condicions ambientals favorables; no confirmen que hi hagi bolets.
          </> : availableCount > 0
            ? "Cap de les lectures disponibles mostra sectors favorables ara mateix."
            : "Falten lectures recents i completes per comparar els territoris. Torna-ho a provar més tard."}
          </p>
          {availableCount > 0 && availableCount < items.length && <p>La comparació és parcial: alguns territoris o espècies no tenen lectures completes.</p>}
          <p>Vols saber <a href="#cap-de-setmana">on trobar bolets aquest cap de setmana</a>, {weekend.label}? La predicció es calcula amb el temps previst, no amb les lectures d’avui.</p>
          {observedWindow && <p className="current-search-answer-updated"><Clock3 size={14} aria-hidden="true" /> {observedWindow}</p>}
        </section>
      </>}
      {section === "ranking" && <>
        <section className="current-board" aria-labelledby="current-board-title">
          <header className="current-board-heading">
            <div>
              <p className="eyebrow">Comparador territorial</p>
              <h2 id="current-board-title">Zones i espècies, de més a menys favorables</h2>
            </div>
          </header>

          {items.length > 0 ? <>
            <div className="current-board-columns" aria-hidden="true">
              <span>Posició</span><span>Zona i bolet</span><span>Condicions</span><span>Mapa</span>
            </div>
            <ol className="current-overview-grid" aria-label="Condicions actuals per espècie i territori, de més a menys favorables">
              {visibleItems.map((item, index) => {
              const summary = item.summary;
              const score = summary?.bestCell.score;
              const isAvailable = item.status === "available" && summary !== null && score !== null && score !== undefined;
              const rank = isAvailable ? index + 1 : null;
              const isArea = isAreaOverviewItem(item);
              const locationName = isArea ? item.areaName : item.regionName;
              const locationLabel = isArea ? item.areaTypeLabel : "regió";
              const gridSizeKm = summary ? summary.gridSizeM / 1000 : isArea ? 1 : 10;
              const mapPath = isArea
                ? territorialMapPath(item.speciesId, item.regionId, item.bounds)
                : speciesMapHref(item.speciesId, { region: item.regionId });

              return (
                <li
                  className={`current-overview-card is-${item.status}`}
                  key={`${isArea ? `area:${item.areaSlug}` : `region:${item.regionId}`}:${item.speciesId}`}
                >
                  <span className="current-row-rank" aria-label={rank ? `Posició ${rank}` : "Sense posició"}>{rank ? String(rank).padStart(2, "0") : "—"}</span>
                  <div className="current-overview-card-heading">
                    <h3>{isArea ? <Link href={item.path} className="current-row-species-link">{locationName}<ArrowUpRight size={13} /></Link> : locationName}</h3>
                    <p className="current-row-species"><Link href={speciesPath(item)} className="current-row-species-link">{item.speciesName}<ArrowUpRight size={13} /></Link><span>{locationLabel} · {monthlyActivityLabel(item.seasonalActivity)}</span></p>
                  </div>
                  {isAvailable && summary && score !== null && score !== undefined ? (
                    <div className="current-score" aria-label={`Millor sector de ${gridSizeKm} km: ${score} sobre 100, ${opportunityLabel(score)}`}>
                      <div><strong>{score}</strong><span>/100 · {opportunityLabel(score)}</span></div>
                      <span className="current-score-track" aria-hidden="true"><span style={{ width: `${score}%` }} /></span>
                    </div>
                  ) : (
                    <div className="current-unavailable">
                      <strong>{item.status === "unavailable" ? "Temporalment no disponible" : "Dades insuficients"}</strong>
                      <span>{item.status === "unavailable" ? "No hem rebut les lectures necessàries" : "Falten lectures recents o completes"}</span>
                    </div>
                  )}
                  <UmamiEventLink href={mapPath} className="current-row-map" analyticsEvent={UMAMI_EVENTS.avuiMapOpen} aria-label={`Veure al mapa: ${locationName}, ${item.speciesName}`}>
                    <Map size={15} /><span>Veure mapa</span>
                  </UmamiEventLink>
                </li>
              );
              })}
            </ol>
          </> : <div className="current-board-empty"><strong>Avui no hi ha dades suficients</strong><p>Torna-ho a provar més tard per comparar les zones.</p></div>}
        </section>
      </>}

      {section === "notes" && <>
        <section className="current-reading-notes" aria-labelledby="current-reading-notes-title">
          <div className="current-reading-notes-intro">
            <h2 id="current-reading-notes-title">Com interpretar el comparador d’avui</h2>
            <p>La puntuació correspon al millor sector de cada territori, sobre 100. La comparació inclou espècies comestibles de temporada amb lectures completes; el detall de cada zona, amb l’abast i el factor que la frena, és a sota.</p>
          </div>
          <div className="current-reading-notes-grid">
            {searchReadings.length > 0 && <div className="current-reading-notes-block">
              <h3>Per què destaquen aquestes zones?</h3>
              <ul className="current-reading-highlights">
                {searchReadings.map((item) => <li key={`${overviewLocationName(item)}:${item.speciesId}`}>
                  <strong>{overviewLocationName(item)} · {item.speciesName}</strong>
                  <p>{overviewReadingExplanation(item)}</p>
                  <UmamiEventLink href={overviewMapPath(item)} analyticsEvent={UMAMI_EVENTS.avuiMapOpen}>
                    Compara els sectors al mapa de {item.speciesName.toLocaleLowerCase("ca")}<ArrowUpRight size={14} />
                  </UmamiEventLink>
                </li>)}
              </ul>
              <p className="current-reading-notes-footnote">Els factors descriuen el resum del territori i poden variar entre sectors. Una zona que no apareix entre les primeres pot tenir condicions favorables per a una altra espècie; consulta el mapa abans de descartar-la.</p>
            </div>}
            <div className="current-reading-notes-block">
              <h3>Com preparar la sortida d’aquesta setmana?</h3>
              <p>Revisa la data de les lectures i compara el millor sector amb l’abast de les condicions dins la zona. Un sector ben valorat no vol dir que tot el bosc estigui igual. Consulta la <Link href="/quan-surten-els-bolets-despres-de-ploure">guia dels bolets després de ploure</Link> per entendre per què una pluja recent no garanteix una brotada immediata, i el <Link href="/pluja-i-bolets">mapa de la pluja dels últims dies</Link> per veure on n’ha caigut.</p>
              <p>Les condicions ambientals no confirmen presència de bolets i no són una previsió dels pròxims set dies. Revisa la lectura abans de sortir. <Link href="/metode">Consulta el mètode i els seus límits</Link>.</p>
            </div>
          </div>
        </section>
      </>}

      {section === "sources" && overviewSources.length > 0 && <>
        <section className="current-reading-sources" aria-label="Fonts de les dades">
          <DataSourceCredits
            sources={overviewSources}
            label="Fonts de les dades"
            description="Cartografia i lectures ambientals"
            variant="panel"
          />
        </section>

      </>}
    </>
  );
}


// Follow prompt placed right after the map, where most visitors stop scrolling:
// on a phone the old position, after the twenty-row board, sat eight screens down.
function CurrentInstagramCard() {
  return (
      <aside className="current-instagram" aria-labelledby="current-instagram-title">
        <div className="current-instagram-mark" aria-hidden="true">
          <InstagramMark size={28} />
        </div>
        <div className="current-instagram-copy">
          <p className="eyebrow">Cada matí · 07:00</p>
          <h2 id="current-instagram-title">La lectura d’avui, també a Instagram</h2>
          <p>
            Segueix <strong>@bolets.app</strong> per veure el mapa vigent a Stories i la
            lectura del cap de setmana en format Reel.
          </p>
        </div>
        <Link
          className="current-instagram-link"
          href="/instagram"
          rel="me noopener noreferrer"
          target="_blank"
        >
          Segueix @bolets.app <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </aside>
  );
}

function CurrentMap() {
  return (
    <section className="current-map-overview" aria-labelledby="current-map-title">
      <header className="current-map-heading">
        <div>
          <p className="eyebrow"><Map size={14} aria-hidden="true" /> Mapa de bolets · avui</p>
          <h2 id="current-map-title">Mapa de bolets de Catalunya avui</h2>
          <p>El mapa de predicció pinta cada sector amb l’espècie comestible que hi té avui les millors condicions; com més intens el color, més alta la puntuació. Si només vols veure l’aigua que ha caigut, mira el <Link href="/pluja-i-bolets">mapa de la pluja dels últims 7 dies</Link>.</p>
        </div>
        <UmamiEventLink href="/map" className="current-map-open" analyticsEvent={UMAMI_EVENTS.avuiMapOpen}>
          Obrir el mapa de bolets de Catalunya <ArrowUpRight size={16} aria-hidden="true" />
        </UmamiEventLink>
      </header>
      <LazyCurrentMap activeRegions={currentMapRegions} />
      <footer className="current-map-footer">
        <PredictionMapLegend />
      </footer>
    </section>

  );
}

export default async function MushroomsTodayPage({ searchParams }: {
  searchParams: Promise<{ simula?: string }>;
}) {
  const simulate = process.env.NODE_ENV === "development" && (await searchParams).simula === "lectures";
  return (
    <PageShell as="article">
      <PageHeader
        eyebrow={<><Map size={15} /> Condicions actuals per territori</>}
        title={<>On trobar bolets avui<br /><PageTitleAccent>i aquesta setmana?</PageTitleAccent></>}
        description="Compara les espècies comestibles de temporada i descobreix quins territoris de Catalunya tenen ara les condicions més favorables."
        layout="split"
      />
      {/* The answer, the comparator and their notes come from one cached
          overview load and ship in the first HTML on purpose: crawlers that
          do not run JavaScript, such as the AI answer engines, read them as
          plain text instead of finding them in a hidden streamed chunk. Only
          the weekend block streams, because its frames can be cold for a few
          minutes after a new publication. */}
      <CurrentOverview simulate={simulate} section="answer" />
      <CurrentMap />
      <CurrentInstagramCard />
      <CurrentOverview simulate={simulate} section="ranking" />
      <CurrentOverview simulate={simulate} section="notes" />
      <Suspense fallback={<WeekendOutlookLoading />}>
        <WeekendOutlook />
      </Suspense>
      <CurrentOverview simulate={simulate} section="sources" />
      <nav className="guide-reading-actions" aria-label="Guies relacionades amb les condicions actuals">
          <UmamiEventLink href="/map" analyticsEvent={UMAMI_EVENTS.avuiMapOpen}>Mapa de bolets de Catalunya <ArrowUpRight size={15} aria-hidden="true" /></UmamiEventLink>
          <Link href="/quan-surten-els-bolets-despres-de-ploure">Quan surten després de ploure <ArrowUpRight size={15} aria-hidden="true" /></Link>
          <Link href="/zones/ceps">Ceps de Catalunya <ArrowUpRight size={15} aria-hidden="true" /></Link>
          <Link href="/zones/rovellons">Rovellons a Catalunya <ArrowUpRight size={15} aria-hidden="true" /></Link>
        <Link href="/preguntes-frequents-bolets#on-buscar">Preguntes freqüents <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </nav>
    </PageShell>
  );
}
