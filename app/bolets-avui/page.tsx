import { developmentOverviewSimulation } from "@/src/lib/current-overview-simulation";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { cache, Suspense } from "react";
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
import { RegionMap } from "@/components/region-map";
import { editorialArticleFields } from "@/data/editorial";
import { regionSelectItems } from "@/data/regions";
import {
  isAreaOverviewItem,
  loadCachedAreaOverview,
  loadCachedCurrentOverview,
  rankOverviewItems,
  type RankedOverviewItem,
  type CurrentOverviewItem,
} from "@/src/lib/current-overview";
import { GLOBAL_SPECIES_ID } from "@/src/lib/global-map";
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
import { currentSearchReadings, overviewExtent as extentMetric, overviewLimitingFactor as limitingFactor } from "@/src/lib/current-overview-copy";

const overviewTitle = "On trobar bolets avui i aquesta setmana";
const overviewDescription = metaDescription(
  "Consulta on buscar bolets avui i aquesta setmana a Catalunya segons les condicions actuals de pluja, temperatura i hàbitat.",
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

function overviewLocationName(item: RankedOverviewItem) {
  return isAreaOverviewItem(item) ? item.areaName : item.regionName;
}

function catalanList(items: string[]) {
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} i ${items.at(-1)}`;
}

function overviewMapPath(item: RankedOverviewItem) {
  return isAreaOverviewItem(item)
    ? territorialMapPath(item.speciesId, item.regionId, item.bounds)
    : speciesMapHref(item.speciesId, { region: item.regionId });
}

function CurrentOverviewLoading() {
  return (
    <section className="current-board current-board-loading" aria-busy="true" aria-live="polite">
      <Clock3 size={22} aria-hidden="true" />
      <div>
        <strong>Preparant la lectura d’avui…</strong>
        <p>La pàgina ja és disponible mentre comprovem les condicions vigents de cada territori.</p>
      </div>
    </section>
  );
}

const loadOverview = cache(async () => {
  // VPS builds intentionally receive no database credentials. Wait for a real
  // request so the runtime-only internal Supabase URL is available; the two
  // overview loaders share one generation-bound data cache.
  await connection();
  const [loadedCurrentItems, loadedAreaItems] = await Promise.all([
    loadCachedCurrentOverview(),
    loadCachedAreaOverview(),
  ]);
  return { loadedCurrentItems, loadedAreaItems };
});

async function CurrentOverview({ simulate = false, section }: { simulate?: boolean; section: "answer" | "ranking" }) {
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
              <span>Posició</span><span>Zona i bolet</span><span>Condicions</span><span>Abast</span><span>Mapa</span>
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
                  {summary ? (
                    <dl className="current-row-signals">
                      <div><dt>Abast dins la zona</dt><dd>{extentMetric(summary)}</dd></div>
                      <div><dt>Principal fre</dt><dd>{limitingFactor(item)}</dd></div>
                    </dl>
                  ) : (
                    <p className="current-row-signals-empty">—</p>
                  )}
                  <Link href={mapPath} className="current-row-map" aria-label={`Veure al mapa: ${locationName}, ${item.speciesName}`}>
                    <Map size={15} /><span>Veure mapa</span>
                  </Link>
                </li>
              );
              })}
            </ol>
          </> : <div className="current-board-empty"><strong>Avui no hi ha dades suficients</strong><p>Torna-ho a provar més tard per comparar les zones.</p></div>}
        </section>

        <section className="current-reading-notes" aria-labelledby="current-reading-notes-title">
          <h2 id="current-reading-notes-title">Com interpretar les dades</h2>
          <p>La puntuació correspon al millor sector de cada territori; l’abast indica fins on s’estenen les condicions favorables. La comparació inclou espècies comestibles de temporada amb lectures completes.</p>
          <p>Les condicions ambientals no confirmen presència de bolets i no són una previsió dels pròxims set dies. Revisa la lectura abans de sortir. <Link href="/metode">Consulta el mètode i els seus límits</Link>.</p>
          {overviewSources.length > 0 ? (
            <DataSourceCredits
              sources={overviewSources}
              label="Fonts de les dades"
              description="Cartografia i lectures ambientals"
              variant="panel"
            />
          ) : null}
        </section>

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

      </>}
    </>
  );
}

function CurrentMap() {
  return (
    <section className="current-map-overview" aria-labelledby="current-map-title">
      <header className="current-map-heading">
        <div>
          <p className="eyebrow"><Map size={14} aria-hidden="true" /> Mapa combinat</p>
          <h2 id="current-map-title">Les condicions d’avui, sobre el territori</h2>
          <p>El color mostra quina espècie comestible té les millors condicions a cada sector.</p>
        </div>
        <Link href="/map" className="current-map-open">
          Obrir el mapa complet <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </header>
      <div className="current-map-frame">
        <RegionMap
          activeRegions={currentMapRegions}
          autoGeolocate={false}
          className="current-production-map"
          compactLegend
          interactive={false}
          maximumPredictionGridSizeM={2500}
          mode="prediction"
          predictionAvailable
          predictionRendering="heatmap"
          showTimeline
          showReadyStatus={false}
          speciesId={GLOBAL_SPECIES_ID}
        />
      </div>
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
      <Suspense fallback={<CurrentOverviewLoading />}>
        <CurrentOverview simulate={simulate} section="answer" />
      </Suspense>
      <CurrentMap />
      <Suspense fallback={<CurrentOverviewLoading />}>
        <CurrentOverview simulate={simulate} section="ranking" />
      </Suspense>
      <nav className="guide-reading-actions" aria-label="Guies relacionades amb les condicions actuals">
          <Link href="/map">Mapa de bolets de Catalunya <ArrowUpRight size={15} aria-hidden="true" /></Link>
          <Link href="/quan-surten-els-bolets-despres-de-ploure">Quan surten després de ploure <ArrowUpRight size={15} aria-hidden="true" /></Link>
          <Link href="/zones/ceps">Ceps de Catalunya <ArrowUpRight size={15} aria-hidden="true" /></Link>
          <Link href="/zones/rovellons">Rovellons a Catalunya <ArrowUpRight size={15} aria-hidden="true" /></Link>
        <Link href="/preguntes-frequents-bolets#on-buscar">Preguntes freqüents <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </nav>
    </PageShell>
  );
}
