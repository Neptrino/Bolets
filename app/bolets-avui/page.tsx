import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ArrowUpRight,
  Clock3,
  Gauge,
  Map,
  MapPinned,
  ShieldCheck,
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
  dominantLimitingComponent,
  isAreaOverviewItem,
  loadCachedAreaOverview,
  loadCachedCurrentOverview,
  rankOverviewItems,
  type RankedOverviewItem,
  type CurrentOverviewItem,
} from "@/src/lib/current-overview";
import { GLOBAL_SPECIES_ID } from "@/src/lib/global-map";
import {
  publicConditionFactorLabel,
  publicConditionFactorLabelFromSource,
} from "@/src/lib/condition-presentation";
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
import type { RegionalPredictionSummary } from "@/src/lib/types";

const overviewTitle = "On trobar bolets avui i aquesta setmana";
const overviewDescription = metaDescription(
  "Consulta on buscar bolets avui i aquesta setmana a Catalunya segons les condicions actuals de pluja, temperatura i hàbitat.",
);

export const metadata: Metadata = {
  title: pageTitle(overviewTitle),
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

function limitingFactor(item: RankedOverviewItem) {
  const factor = item.summary?.result.components
    .filter((factor) => factor.score !== null)
    .sort((left, right) => (left.score ?? 0) - (right.score ?? 0))[0];
  return factor ? publicConditionFactorLabel(factor.id) : "Sense cap factor destacat";
}

function extentMetric(summary: RegionalPredictionSummary) {
  if (summary.score20CellCount > 0) {
    return `Condicions favorables en el ${Math.round(summary.score20CellShare * 100)}% de la zona`;
  }
  if (summary.positiveCellCount > 0) {
    return `Alguna resposta favorable en el ${Math.round(summary.positiveCellShare * 100)}% de la zona`;
  }
  return "Sense cap sector favorable ara mateix";
}

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

function topOverviewLocations(items: RankedOverviewItem[]) {
  const locations = new Set<string>();

  for (const item of items) {
    if (item.status !== "available" || !item.summary || (item.summary.bestCell.score ?? 0) <= 0) continue;
    locations.add(overviewLocationName(item));
    if (locations.size === 3) break;
  }

  return [...locations];
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

async function CurrentOverview() {
  // VPS builds intentionally receive no database credentials. Wait for a real
  // request so the runtime-only internal Supabase URL is available; the two
  // overview loaders share one generation-bound data cache.
  await connection();
  const [allItems, areaItems] = await Promise.all([
    loadCachedCurrentOverview(),
    loadCachedAreaOverview(),
  ]);
  const items = rankOverviewItems([...allItems, ...areaItems]);
  const visibleItems = items.slice(0, MAX_OVERVIEW_CARDS);
  const leader = items.find((item) => item.status === "available" && item.summary);
  const leaderScore = leader?.summary?.bestCell.score;
  const observedWindow = observationWindow(items);
  const lastObservedAt = latestObservation(items);
  const topLocations = topOverviewLocations(items);
  const editorialFields = editorialArticleFields("bolets-avui");
  const editorialModifiedAt = new Date(`${editorialFields.dateModified}T00:00:00+02:00`);
  const pageModifiedAt = lastObservedAt && lastObservedAt > editorialModifiedAt
    ? lastObservedAt
    : editorialModifiedAt;
  const overviewSources = [...new Set(
    items.flatMap((item) => item.summary?.snapshot.source ?? []),
  )];
  const leaderName = leader ? overviewLocationName(leader) : null;
  const leaderMapPath = leader ? overviewMapPath(leader) : "/map";
  const structuredItems = visibleItems.filter(
    (item) => item.status === "available" && item.summary,
  );

  return (
    <>
      <JsonLd data={{
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
      }} />

      <section className="current-search-answer" aria-labelledby="current-search-answer-title">
        <p className="eyebrow">Resposta actualitzada</p>
        <h2 id="current-search-answer-title">On trobar bolets ara a Catalunya?</h2>
        {topLocations.length > 0 ? (
          <p>
            Amb les lectures més recents, <strong>{catalanList(topLocations)}</strong> encapçalen
            la comparació de territoris per preparar una sortida avui o aquesta setmana.
            Són condicions ambientals favorables: no confirmen que hi hagi bolets ni són una
            previsió tancada per als pròxims set dies.
          </p>
        ) : (
          <p>
            Ara mateix cap territori comparat mostra una resposta favorable prou clara.
            Aquesta situació pot canviar amb noves pluges i temperatures; no confirma
            l’absència de bolets al bosc.
          </p>
        )}
        {lastObservedAt ? (
          <p className="current-search-answer-updated">
            <Clock3 size={14} aria-hidden="true" /> Darrera lectura: {dateTime.format(lastObservedAt)}
          </p>
        ) : null}
      </section>

      {leader?.summary && leaderScore === 0 ? (
        <aside className="current-leader current-leader-empty">
          <ShieldCheck size={24} />
          <div>
            <strong>Cap zona destaca avui.</strong>
            <p>
              Les condicions no són favorables en cap dels territoris comparats.
              {dominantLimitingComponent(allItems)
                ? <> El principal fre ara mateix és «{publicConditionFactorLabelFromSource(dominantLimitingComponent(allItems)!)}».</>
                : null} Pots consultar totes les zones a continuació.
            </p>
          </div>
        </aside>
      ) : leader?.summary && leaderScore !== null && leaderScore !== undefined ? (
        <section className="current-leader" aria-labelledby="current-leader-title">
          <div className="current-leader-topline">
            <p className="current-leader-eyebrow"><MapPinned size={15} /> Millors condicions ara</p>
            <p className="current-leader-meta"><Clock3 size={14} /> Calculat amb dades de {dateTime.format(new Date(leader.summary.snapshot.observedAt))}</p>
          </div>
          <div className="current-leader-copy">
            <h2 id="current-leader-title">{leaderName}</h2>
            <p><Link href={speciesPath(leader)} className="current-leader-species-link"><strong>{leader.speciesName}</strong><ArrowUpRight size={14} /></Link> és l’espècie amb les condicions més favorables en aquest territori.</p>
            <Link href={leaderMapPath} className="current-leader-link">
              <Map size={16} /> Veure al mapa <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="current-leader-score" aria-label={`Millor sector del territori: ${leaderScore} sobre 100`}>
            <strong>{leaderScore}</strong>
            <span>/ 100</span>
            <small>{opportunityLabel(leaderScore)}</small>
          </div>
          <dl className="current-leader-signals">
            <div><dt><MapPinned size={16} /> Abast dins la zona</dt><dd>{extentMetric(leader.summary)}</dd></div>
            <div><dt><Gauge size={16} /> Principal fre</dt><dd>{limitingFactor(leader)}</dd></div>
          </dl>
        </section>
      ) : (
        <aside className="current-leader current-leader-empty">
          <ShieldCheck size={24} />
          <div><strong>Avui no podem comparar les zones.</strong><p>Falten lectures recents o completes. Torna-ho a provar més tard.</p></div>
        </aside>
      )}

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

      <aside className="current-overview-method">
        <ShieldCheck size={21} aria-hidden="true" />
        <p><strong>El resultat compara territoris; no assenyala troballes.</strong> Només hi entren espècies comestibles que són de temporada i zones amb lectures recents i completes.</p>
      </aside>

      <section className="current-board" aria-labelledby="current-board-title">
        <header className="current-board-heading">
          <div>
            <p className="eyebrow">Comparador territorial</p>
            <h2 id="current-board-title">Zones i espècies, de més a menys favorables</h2>
          </div>
          {observedWindow ? (
            <div>
              <p className="current-board-updated"><Clock3 size={14} /> {observedWindow}</p>
            </div>
          ) : null}
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

      <p className="prediction-zone-note">La valoració resumeix el sector més favorable de cada territori. Consulta el mapa per veure com canvien les condicions dins de la zona.</p>

      {overviewSources.length > 0 ? (
        <DataSourceCredits
          sources={overviewSources}
          label="Fonts de les dades"
          description="Cartografia i lectures ambientals"
          variant="panel"
        />
      ) : null}

    </>
  );
}

export default function MushroomsTodayPage() {
  return (
    <PageShell as="article">
      <PageHeader
        eyebrow={<><Map size={15} /> Condicions actuals per territori</>}
        title={<>On trobar bolets avui<br /><PageTitleAccent>i aquesta setmana?</PageTitleAccent></>}
        description="Compara les espècies comestibles de temporada i descobreix quins territoris de Catalunya tenen ara les condicions més favorables."
        layout="split"
      />
      <Suspense fallback={<CurrentOverviewLoading />}>
        <CurrentOverview />
      </Suspense>
      <section className="current-search-intro" aria-labelledby="current-search-intro-title">
        <div>
          <p className="eyebrow">Com interpretar la lectura</p>
          <h2 id="current-search-intro-title">Condicions de bolets avui, aquesta setmana i per territori</h2>
          <p>Aquesta pàgina compara lectures recents de pluja, temperatura, hàbitat i temporada. No confirma que hi hagi bolets: serveix per ordenar territoris i decidir quines espècies i boscos convé estudiar abans de sortir.</p>
        </div>
        <nav aria-label="Guies relacionades amb les condicions actuals">
          <Link href="/map">Mapa de bolets de Catalunya <ArrowUpRight size={15} aria-hidden="true" /></Link>
          <Link href="/quan-surten-els-bolets-despres-de-ploure">Quan surten després de ploure <ArrowUpRight size={15} aria-hidden="true" /></Link>
          <Link href="/zones/ceps">Ceps de Catalunya <ArrowUpRight size={15} aria-hidden="true" /></Link>
          <Link href="/zones/rovellons">Rovellons a Catalunya <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </nav>
      </section>
      <p className="prediction-zone-note">Prepares una sortida? Consulta les <Link href="/preguntes-frequents-bolets#on-buscar" className="text-link">preguntes freqüents sobre on buscar bolets i com interpretar el mapa.</Link></p>
    </PageShell>
  );
}
