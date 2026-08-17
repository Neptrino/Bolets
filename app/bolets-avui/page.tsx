import type { Metadata } from "next";
import Link from "next/link";
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
  loadAreaOverview,
  loadCurrentOverview,
  rankAreaOverviewItems,
  topCurrentOverviewItems,
  type CurrentOverviewItem,
} from "@/src/lib/current-overview";
import { SEASONAL_ACTIVITY_LABELS } from "@/src/lib/seasonality";
import {
  absoluteUrl,
  DEFAULT_SOCIAL_IMAGE,
  metaDescription,
  pageTitle,
  SITE_URL,
  speciesPath,
} from "@/src/lib/seo";

export const revalidate = 300;

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

function scoreMetric(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}/100` : "—";
}

function limitingFactor(item: CurrentOverviewItem) {
  return item.summary?.result.components
    .filter((factor) => factor.score !== null)
    .sort((left, right) => (left.score ?? 0) - (right.score ?? 0))[0]?.label ?? "Sense factor limitant publicat";
}

/**
 * The zone score is a region-wide median, so a localized pocket (a rained-on
 * valley, for instance) can sit far above it. The best 10 km cell surfaces
 * that pocket without changing what the median communicates. A verified zero
 * reads as "no area stands out" — distinct from "—", which means withheld.
 */
function bestAreaMetric(item: CurrentOverviewItem) {
  const score = item.summary?.bestCell.score;
  if (score === 0) return "Cap àrea destaca";
  return scoreMetric(score);
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
  const [allItems, areaItems] = await Promise.all([
    loadCurrentOverview(),
    loadAreaOverview(),
  ]);
  const items = topCurrentOverviewItems(allItems);
  const rankedAreaItems = rankAreaOverviewItems(areaItems);
  const leader = items[0];
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
        description="Comparem zones i espècies amb dades ambientals vigents i mostrem les deu puntuacions més favorables. Cada puntuació combina l’hàbitat adequat amb les condicions per fructificar-hi; no confirma presència ni garanteix trobar bolets."
        layout="split"
      />

      <Link href="/compartir" className="daily-share-entry"><Share2 size={16} /> Prepara targetes per compartir la lectura d’avui <ArrowUpRight size={16} /></Link>

      {leader?.summary && leader.summary.result.opportunityIndex === 0 ? (
        <aside className="current-leader current-leader-empty">
          <ShieldCheck size={24} />
          <div>
            <strong>Cap zona destaca avui.</strong>
            <p>
              Totes les combinacions publicables puntuen 0 sobre 100, així que no
              destaquem cap «lectura més favorable»: ordenar zeros no aporta
              informació. {dominantLimitingComponent(allItems)
                ? <>El component més limitant a la majoria de zones és «{dominantLimitingComponent(allItems)}».</>
                : null} La taula següent mostra igualment totes les lectures avaluades.
            </p>
          </div>
        </aside>
      ) : leader?.summary && leader.summary.result.opportunityIndex !== null ? (
        <section className="current-leader" aria-labelledby="current-leader-title">
          <div className="current-leader-copy">
            <p className="current-leader-eyebrow"><MapPinned size={15} /> Lectura més favorable ara</p>
            <h2 id="current-leader-title">{leader.regionName}</h2>
            <p><Link href={speciesPath(leader)} className="current-leader-species-link"><strong>{leader.speciesName}</strong><ArrowUpRight size={14} /></Link> forma la combinació amb la puntuació més alta entre les parelles d’espècie i zona que han passat els controls de publicació.</p>
            <Link href={`/map?species=${leader.speciesId}&region=${leader.regionId}`} className="current-leader-link">
              <Map size={16} /> Veure al mapa <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="current-leader-score" aria-label={`Puntuació de la zona ${leader.summary.result.opportunityIndex} sobre 100`}>
            <strong>{leader.summary.result.opportunityIndex}</strong>
            <span>/ 100</span>
            <small>Puntuació de la zona · {leader.summary.result.label}</small>
          </div>
          <dl className="current-leader-signals">
            <div><dt><MapPinned size={16} /> Millor àrea (cel·la de 10 km)</dt><dd>{bestAreaMetric(leader)}</dd></div>
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
        <p><strong>Això compara combinacions de zona i espècie, no punts on hi hagi bolets.</strong> Avaluem fins a quatre candidates per zona segons el calendari ecològic, la rellevància editorial i una representant d’alta muntanya; la selecció no modifica la puntuació. Només publiquem un resultat quan l’hàbitat, les condicions ambientals i totes les dades requerides són complets i vigents. Si falta evidència o una font falla, no calculem cap substitut.</p>
      </aside>

      <section className="current-board" aria-labelledby="current-board-title">
        <header className="current-board-heading">
          <div>
            <p className="eyebrow">Comparador territorial</p>
            <h2 id="current-board-title">Top 10 de zones i espècies</h2>
          </div>
          {observedWindow ? (
            <div>
              <p className="current-board-updated"><Clock3 size={14} /> {observedWindow}</p>
            </div>
          ) : null}
        </header>

        {items.length > 0 ? <>
          <div className="current-board-columns" aria-hidden="true">
            <span>Posició</span><span>Zona i espècie</span><span>Puntuació</span><span>Millor àrea</span><span>Mapa</span>
          </div>
          <ol className="current-overview-grid" aria-label="Top 10 de puntuacions actuals per espècie i zona">
            {items.map((item, index) => {
            const summary = item.summary;
            const score = summary?.result.opportunityIndex;
            const isAvailable = item.status === "available" && summary !== null && score !== null && score !== undefined;
            const rank = isAvailable ? index + 1 : null;
            const bestCellScore = summary?.bestCell.score;

            return (
              <li className={`current-overview-card is-${item.status}`} key={`${item.speciesId}-${item.regionId}`}>
                <span className="current-row-rank" aria-label={rank ? `Posició ${rank}` : "Sense posició"}>{rank ? String(rank).padStart(2, "0") : "—"}</span>
                <div className="current-overview-card-heading">
                  <h3>{item.regionName}</h3>
                  <p className="current-row-species"><Link href={speciesPath(item)} className="current-row-species-link">{item.speciesName}<ArrowUpRight size={13} /></Link><span>Calendari: {monthlyActivityLabel(item.seasonalActivity)}</span></p>
                </div>
                {isAvailable && summary && score !== null && score !== undefined ? (
                  <div className="current-score" aria-label={`Puntuació de la zona ${score} sobre 100, ${summary.result.label}`}>
                    <div><strong>{score}</strong><span>/100 · {summary.result.label}</span></div>
                    <span className="current-score-track" aria-hidden="true"><span style={{ width: `${score}%` }} /></span>
                  </div>
                ) : (
                  <div className="current-unavailable">
                    <strong>{item.status === "unavailable" ? "Temporalment no disponible" : "Dades insuficients"}</strong>
                    <span>{item.status === "unavailable" ? "La font ambiental no ha respost" : "Resultat retingut pels controls"}</span>
                  </div>
                )}
                {typeof bestCellScore === "number" && bestCellScore > 0 ? (
                  <dl className="current-row-signals">
                    <div><dt>{item.speciesName} · cel·la de 10 km</dt><dd>{scoreMetric(bestCellScore)}</dd></div>
                  </dl>
                ) : (
                  <p className="current-row-signals-empty">{bestCellScore === 0 ? "Cap àrea destaca" : "—"}</p>
                )}
                <Link href={`/map?species=${item.speciesId}&region=${item.regionId}`} className="current-row-map" aria-label={`Veure al mapa: ${item.regionName}, ${item.speciesName}`}>
                  <Map size={15} /><span>Veure mapa</span>
                </Link>
              </li>
            );
            })}
          </ol>
        </> : <div className="current-board-empty"><strong>Cap combinació publicable ara mateix</strong><p>Les dades insuficients o temporalment no disponibles no reben cap puntuació substitutiva.</p></div>}
      </section>

      {rankedAreaItems.length > 0 ? (
        <section className="current-board" aria-labelledby="area-board-title">
          <header className="current-board-heading">
            <div>
              <p className="eyebrow">Massissos, paratges i comarques</p>
              <h2 id="area-board-title">La mateixa lectura, a escala de massís, paratge i comarca</h2>
            </div>
          </header>
          <p className="current-board-updated">Cada hub territorial es llegeix sobre la seva pròpia finestra — el massís o la comarca que un boletaire diu en veu alta — amb l’espècie de calendari més fort d’entre les guies locals publicades. Una tempesta que mulla una vall puntua aquí sense diluir-se en una regió de cent quilòmetres.</p>
          <ol className="current-overview-grid" aria-label="Lectura actual per massís i comarca">
            {rankedAreaItems.map((item, index) => {
              const summary = item.summary;
              const score = summary?.result.opportunityIndex;
              const isAvailable = item.status === "available" && summary !== null && score !== null && score !== undefined;
              const bestCellScore = summary?.bestCell.score;
              return (
                <li className={`current-overview-card is-${item.status}`} key={item.areaSlug}>
                  <span className="current-row-rank" aria-label={isAvailable ? `Posició ${index + 1}` : "Sense posició"}>{isAvailable ? String(index + 1).padStart(2, "0") : "—"}</span>
                  <div className="current-overview-card-heading">
                    <h3><Link href={item.path} className="current-row-species-link">{item.areaName}<ArrowUpRight size={13} /></Link></h3>
                    <p className="current-row-species"><span>{item.areaTypeLabel} · {item.speciesName} · {monthlyActivityLabel(item.seasonalActivity)}</span></p>
                  </div>
                  {isAvailable && summary && score !== null && score !== undefined ? (
                    <div className="current-score" aria-label={`Puntuació del hub ${score} sobre 100, ${summary.result.label}`}>
                      <div><strong>{score}</strong><span>/100 · {summary.result.label}</span></div>
                      <span className="current-score-track" aria-hidden="true"><span style={{ width: `${score}%` }} /></span>
                    </div>
                  ) : (
                    <div className="current-unavailable">
                      <strong>{item.status === "unavailable" ? "Temporalment no disponible" : "Dades insuficients"}</strong>
                      <span>{item.status === "unavailable" ? "La font ambiental no ha respost" : "Resultat retingut pels controls"}</span>
                    </div>
                  )}
                  {typeof bestCellScore === "number" && bestCellScore > 0 ? (
                    <dl className="current-row-signals">
                      <div><dt>Millor cel·la de 10 km</dt><dd>{scoreMetric(bestCellScore)}</dd></div>
                    </dl>
                  ) : (
                    <p className="current-row-signals-empty">{bestCellScore === 0 ? "Cap àrea destaca" : "—"}</p>
                  )}
                  <Link href={`/map?species=${item.speciesId}&region=${item.regionId}`} className="current-row-map" aria-label={`Veure al mapa: ${item.speciesName} ${item.prepositionalName}`}>
                    <Map size={15} /><span>Veure mapa</span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <p className="prediction-zone-note">Les finestres territorials es construeixen al voltant dels indrets documentats de cada hub i es calculen amb les mateixes dades i controls que la resta de lectures. No confirmen presència ni garanteixen trobar bolets.</p>
        </section>
      ) : null}

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
