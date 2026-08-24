import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ArrowUpRight,
  Clock3,
  Database,
  Gauge,
  Map,
  MapPinned,
  ShieldCheck,
  Share2,
} from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { editorialArticleFields, environmentalSources } from "@/data/editorial";
import {
  dominantLimitingComponent,
  isAreaOverviewItem,
  loadCachedAreaOverview,
  loadCachedCurrentOverview,
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
import { territorialMapPath } from "@/src/lib/territorial-map";
import type { RegionalPredictionSummary } from "@/src/lib/types";

export const metadata: Metadata = {
  title: pageTitle("On trobar bolets avui a Catalunya"),
  description: metaDescription("Consulteu les zones i espècies amb les condicions més favorables avui a Catalunya, comparades amb dades vigents de pluja, temperatura i hàbitat."),
  alternates: { canonical: "/bolets-avui" },
  openGraph: {
    url: "/bolets-avui",
    title: "On trobar bolets avui a Catalunya",
    description: "Zones i espècies amb les condicions més favorables avui, comparades amb dades ambientals vigents.",
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

function limitingFactor(item: RankedOverviewItem) {
  return item.summary?.result.components
    .filter((factor) => factor.score !== null)
    .sort((left, right) => (left.score ?? 0) - (right.score ?? 0))[0]?.label ?? "Sense factor limitant publicat";
}

function extentMetric(summary: RegionalPredictionSummary) {
  if (summary.score20CellCount > 0) {
    return `${summary.score20CellCount} ${summary.score20CellCount === 1 ? "cel·la" : "cel·les"} amb 20 o més · ${Math.round(summary.score20CellShare * 100)}%`;
  }
  if (summary.positiveCellCount > 0) {
    return `${summary.positiveCellCount} ${summary.positiveCellCount === 1 ? "cel·la positiva" : "cel·les positives"} · ${Math.round(summary.positiveCellShare * 100)}%`;
  }
  return "Cap cel·la positiva";
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

function monthlyActivityLabel(activity: CurrentOverviewItem["seasonalActivity"]) {
  const label = SEASONAL_ACTIVITY_LABELS[activity];
  return activity === "peak" || activity === "inactive" ? label : `activitat ${label}`;
}

function overviewLocationName(item: RankedOverviewItem) {
  return isAreaOverviewItem(item) ? item.areaName : item.regionName;
}

function overviewMapPath(item: RankedOverviewItem) {
  return isAreaOverviewItem(item)
    ? territorialMapPath(item.speciesId, item.regionId, item.bounds)
    : `/map?species=${item.speciesId}&region=${item.regionId}`;
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
  // overview loaders retain their shared twice-daily data cache.
  await connection();
  const [allItems, areaItems] = await Promise.all([
    loadCachedCurrentOverview(),
    loadCachedAreaOverview(),
  ]);
  const items = rankOverviewItems([...allItems, ...areaItems]);
  const leader = items.find((item) => item.status === "available" && item.summary);
  const leaderScore = leader?.summary?.bestCell.score;
  const observedWindow = observationWindow(items);
  const overviewSources = [...new Set(
    items.flatMap((item) => item.summary?.snapshot.source ?? []),
  )];
  const leaderName = leader ? overviewLocationName(leader) : null;
  const leaderGridSizeKm = leader?.summary ? leader.summary.gridSizeM / 1000 : null;
  const leaderMapPath = leader ? overviewMapPath(leader) : "/map";

  return (
    <>
      <Link href="/compartir" className="daily-share-entry"><Share2 size={16} /> Prepara targetes per compartir la lectura d’avui <ArrowUpRight size={16} /></Link>

      {leader?.summary && leaderScore === 0 ? (
        <aside className="current-leader current-leader-empty">
          <ShieldCheck size={24} />
          <div>
            <strong>Cap zona destaca avui.</strong>
            <p>
              Totes les millors cel·les publicables puntuen 0 sobre 100, així que no
              destaquem cap «lectura més favorable»: ordenar zeros no aporta
              informació. {dominantLimitingComponent(allItems)
                ? <>El component més limitant a la majoria de zones és «{dominantLimitingComponent(allItems)}».</>
                : null} La taula següent mostra igualment totes les lectures avaluades.
            </p>
          </div>
        </aside>
      ) : leader?.summary && leaderScore !== null && leaderScore !== undefined ? (
        <section className="current-leader" aria-labelledby="current-leader-title">
          <div className="current-leader-copy">
            <p className="current-leader-eyebrow"><MapPinned size={15} /> Lectura més favorable ara</p>
            <h2 id="current-leader-title">{leaderName}</h2>
            <p><Link href={speciesPath(leader)} className="current-leader-species-link"><strong>{leader.speciesName}</strong><ArrowUpRight size={14} /></Link> forma la combinació amb la puntuació més alta entre les parelles d’espècie i zona que han passat els controls de publicació.</p>
            <Link href={leaderMapPath} className="current-leader-link">
              <Map size={16} /> Veure al mapa <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="current-leader-score" aria-label={`Millor cel·la territorial ${leaderScore} sobre 100`}>
            <strong>{leaderScore}</strong>
            <span>/ 100</span>
            <small>Millor cel·la de {leaderGridSizeKm} km · {opportunityLabel(leaderScore)}</small>
          </div>
          <dl className="current-leader-signals">
            <div><dt><MapPinned size={16} /> Extensió compatible</dt><dd>{extentMetric(leader.summary)}</dd></div>
            <div><dt><Gauge size={16} /> Component més limitant</dt><dd>{limitingFactor(leader)}</dd></div>
          </dl>
          <p className="current-leader-meta"><Clock3 size={14} /> Calculat amb dades de {dateTime.format(new Date(leader.summary.snapshot.observedAt))}</p>
        </section>
      ) : (
        <aside className="current-leader current-leader-empty">
          <ShieldCheck size={24} />
          <div><strong>Avui no hi ha cap lectura publicable.</strong><p>Hem comprovat les combinacions estacionals vàlides, però no calculem cap substitut quan les dades no passen els controls de vigència i completitud.</p></div>
        </aside>
      )}

      <aside className="current-overview-method">
        <ShieldCheck size={21} aria-hidden="true" />
        <p><strong>Això compara combinacions de zona i espècie, no punts on hi hagi bolets.</strong> Avaluem totes les espècies comestibles amb model vigent que són dins la seva temporada ecològica. La puntuació actual decideix el resultat; el calendari i la rellevància editorial no trien el guanyador. Només publiquem quan l’hàbitat, les condicions ambientals i totes les dades requerides són complets i vigents.</p>
      </aside>

      <section className="current-board" aria-labelledby="current-board-title">
        <header className="current-board-heading">
          <div>
            <p className="eyebrow">Comparador territorial</p>
            <h2 id="current-board-title">Zones i espècies, de més a menys puntuació</h2>
          </div>
          {observedWindow ? (
            <div>
              <p className="current-board-updated"><Clock3 size={14} /> {observedWindow}</p>
            </div>
          ) : null}
        </header>

        {items.length > 0 ? <>
          <div className="current-board-columns" aria-hidden="true">
            <span>Posició</span><span>Zona i espècie</span><span>Millor cel·la</span><span>Extensió</span><span>Mapa</span>
          </div>
          <ol className="current-overview-grid" aria-label="Puntuacions actuals per espècie i territori, de més a menys">
            {items.map((item, index) => {
            const summary = item.summary;
            const score = summary?.bestCell.score;
            const isAvailable = item.status === "available" && summary !== null && score !== null && score !== undefined;
            const rank = isAvailable ? index + 1 : null;
            const isArea = isAreaOverviewItem(item);
            const locationName = isArea ? item.areaName : item.regionName;
            const locationLabel = isArea ? item.areaTypeLabel : "regió de predicció";
            const gridSizeKm = summary ? summary.gridSizeM / 1000 : isArea ? 1 : 10;
            const mapPath = isArea
              ? territorialMapPath(item.speciesId, item.regionId, item.bounds)
              : `/map?species=${item.speciesId}&region=${item.regionId}`;

            return (
              <li className={`current-overview-card is-${item.status}`} key={`${isArea ? item.areaSlug : item.regionId}-${item.speciesId}`}>
                <span className="current-row-rank" aria-label={rank ? `Posició ${rank}` : "Sense posició"}>{rank ? String(rank).padStart(2, "0") : "—"}</span>
                <div className="current-overview-card-heading">
                  <h3>{isArea ? <Link href={item.path} className="current-row-species-link">{locationName}<ArrowUpRight size={13} /></Link> : locationName}</h3>
                  <p className="current-row-species"><Link href={speciesPath(item)} className="current-row-species-link">{item.speciesName}<ArrowUpRight size={13} /></Link><span>{locationLabel} · {monthlyActivityLabel(item.seasonalActivity)}</span></p>
                </div>
                {isAvailable && summary && score !== null && score !== undefined ? (
                  <div className="current-score" aria-label={`Millor cel·la de ${gridSizeKm} km ${score} sobre 100, ${opportunityLabel(score)}`}>
                    <div><strong>{score}</strong><span>/100 · {opportunityLabel(score)}</span></div>
                    <span className="current-score-track" aria-hidden="true"><span style={{ width: `${score}%` }} /></span>
                  </div>
                ) : (
                  <div className="current-unavailable">
                    <strong>{item.status === "unavailable" ? "Temporalment no disponible" : "Dades insuficients"}</strong>
                    <span>{item.status === "unavailable" ? "La font ambiental no ha respost" : "Resultat retingut pels controls"}</span>
                  </div>
                )}
                {summary ? (
                  <dl className="current-row-signals">
                    <div><dt>Cel·les compatibles de {gridSizeKm} km</dt><dd>{extentMetric(summary)}</dd></div>
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
        </> : <div className="current-board-empty"><strong>Cap combinació publicable ara mateix</strong><p>Les dades insuficients o temporalment no disponibles no reben cap puntuació substitutiva.</p></div>}
      </section>

      <p className="prediction-zone-note">Les regions es comparen amb cel·les de 10 km i les comarques, massissos i paratges amb cel·les d’1 km. La millor cel·la és una comparació territorial, no una promesa sobre tota la zona. No confirma presència ni garanteix trobar bolets.</p>

      {overviewSources.length > 0 ? (
        <aside className="current-overview-provenance" aria-label="Procedència de les dades">
          <Database size={14} aria-hidden="true" />
          <p><strong>Fonts de les dades:</strong> {overviewSources.join(" · ")}</p>
        </aside>
      ) : null}

      <EditorialAttribution contentId="bolets-avui" sources={environmentalSources} />
    </>
  );
}

export default function MushroomsTodayPage() {
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
        description="Comparem totes les espècies comestibles en temporada i destaquem la millor cel·la de cada territori. La puntuació combina l’hàbitat adequat amb les condicions per fructificar-hi; no confirma presència ni garanteix trobar bolets."
        layout="split"
      />
      <Suspense fallback={<CurrentOverviewLoading />}>
        <CurrentOverview />
      </Suspense>
    </PageShell>
  );
}
