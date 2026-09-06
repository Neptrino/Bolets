import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowUpRight, BookOpenCheck, CalendarDays, Clock3, Gauge, Info, Layers3, Map, MapPinned, Mountain, ShieldAlert, Sprout, Trees } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { MediaImage } from "@/components/media-image";
import { LazyHabitatMap } from "@/components/lazy-habitat-map";
import { UmamiEventLink } from "@/components/umami-event-link";
import { UMAMI_EVENTS } from "@/src/lib/umami-goals";
import { SeasonCalendar } from "@/components/season-calendar";
import { getSpecies } from "@/data/species";
import { editorialArticleFields, environmentalSources } from "@/data/editorial";
import { areasBySlug, displaySearchName, getLocationPage, getPlace, locationPagePath, locationPagesForPlace, locationPagesForSpecies, placeBounds, placePath, speciesLocationPages } from "@/data/location-pages";
import { loadLocalGuideCondition } from "@/src/lib/local-guide-conditions-server";
import { loadLocalGuideFacts } from "@/src/lib/local-guide-facts-server";
import { opportunityLabel } from "@/src/lib/scoring";
import { absoluteUrl, metaDescription, pageTitle, SITE_URL, speciesDescription, speciesImage, speciesPath } from "@/src/lib/seo";
import { monthInTimeZone, SEASON_MONTHS } from "@/src/lib/seasonality";
import { territorialMapPath } from "@/src/lib/territorial-map";
import { publicConditionFactorLabel } from "@/src/lib/condition-presentation";
import type { AreaProfile, PlaceProfile } from "@/data/location-pages";
import type { SourceReference, SpeciesProfile } from "@/src/lib/types";

type Props = { params: Promise<{ place: string; species: string; guide: string }> };

const dateTime = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

const localFactNumber = new Intl.NumberFormat("ca-ES", {
  maximumFractionDigits: 1,
});

function LocalResources({ location }: { location: PlaceProfile }) {
  const resources = [
    { label: "Context local", ...location.source },
    ...location.resources,
  ];

  return (
    <aside className="local-resource-shelf" aria-labelledby="local-resources-title">
      <header>
        <p className="eyebrow">Més informació</p>
        <h3 id="local-resources-title">Descobreix {location.name}</h3>
        <p>Webs externes per preparar una visita i conèixer millor el territori.</p>
      </header>
      <ul>
        {resources.map((resource) => (
          <li key={resource.url}>
            <a href={resource.url} target="_blank" rel="noreferrer" aria-label={`${resource.title} (s’obre en una pestanya nova)`}>
              <span>{resource.label}</span>
              <strong>{resource.title}</strong>
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function LocalEvidenceLoading({ location }: { location: PlaceProfile }) {
  return (
    <section className="local-evidence-strip local-evidence-loading" aria-busy="true" aria-live="polite">
      <header>
        <Layers3 size={20} aria-hidden="true" />
        <div>
          <p className="eyebrow">Dades de l’entorn</p>
          <h2>Preparant l’hàbitat al voltant de {location.name}…</h2>
          <p>La resta de la guia ja és disponible mentre carreguem aquestes dades.</p>
        </div>
      </header>
      <div className="local-fact-placeholder" aria-hidden="true"><span /><span /><span /></div>
    </section>
  );
}

async function LocalEvidencePanel({
  species,
  location,
}: {
  species: SpeciesProfile;
  location: PlaceProfile;
}) {
  const bounds = placeBounds(location);
  await connection();
  let evidence = null;
  try {
    evidence = await loadLocalGuideFacts(
      species.speciesId,
      `${location.areaSlug}/${location.slug}`,
      bounds,
      `entorn de ${location.name}`,
    );
  } catch {
    evidence = null;
  }

  return (
    <section className="local-evidence-strip" aria-labelledby="local-evidence-title">
      <header>
        <Layers3 size={20} aria-hidden="true" />
        <div>
          <p className="eyebrow">Dades de l’entorn</p>
          <h2 id="local-evidence-title">L’hàbitat al voltant de {location.name}</h2>
          <p>Resum d’una àrea àmplia al voltant del lloc, no d’un límit oficial ni d’un bosc concret.</p>
        </div>
      </header>
      {evidence ? (
        <div className="local-evidence-body">
          <ul className="local-fact-grid" aria-label={`Dades d’hàbitat de ${species.identity.commonName} al voltant de ${location.name}`}>
            {evidence.facts.filter((fact) => fact.kind === "derived").map((fact) => (
              <li key={fact.metric}>
                <span>{fact.label}</span>
                <strong>{fact.metric === "compatible-cells" ? Math.round(fact.value) : localFactNumber.format(fact.value)} <small>{fact.unit}</small></strong>
                <p>{fact.description}</p>
              </li>
            ))}
          </ul>
          <footer className="local-evidence-provenance">
            <Info size={16} aria-hidden="true" />
            <p>Aquest resum compara el tipus de bosc, el sòl i l’altitud d’una àrea àmplia. No fa servir observacions de bolets.</p>
          </footer>
        </div>
      ) : (
        <div className="local-evidence-unavailable">
          <p><strong>Ara no podem mostrar aquestes xifres.</strong> Falten dades completes de l’entorn i no volem omplir els buits amb suposicions.</p>
          <p>La resta de la guia continua disponible sense indicar boscos ni coordenades de recol·lecció.</p>
        </div>
      )}
      <LocalResources location={location} />
    </section>
  );
}

function extentMetric(summary: Awaited<ReturnType<typeof loadLocalGuideCondition>>) {
  if (!summary) return "Sense dades suficients";
  if (summary.score20CellCount > 0) {
    return `Condicions favorables en el ${Math.round(summary.score20CellShare * 100)}% de la zona`;
  }
  if (summary.positiveCellCount > 0) {
    return `Alguna resposta favorable en el ${Math.round(summary.positiveCellShare * 100)}% de la zona`;
  }
  return "Cap sector favorable ara mateix";
}

function limitingFactor(summary: NonNullable<Awaited<ReturnType<typeof loadLocalGuideCondition>>>) {
  const factor = summary.result.components
    .filter((component) => component.score !== null)
    .sort((left, right) => (left.score ?? 0) - (right.score ?? 0))[0];
  return factor ? publicConditionFactorLabel(factor.id) : "Sense cap factor destacat";
}

function LocalConditionsLoading() {
  return (
    <aside className="local-map-cta local-current-loading" aria-busy="true" aria-live="polite">
      <Clock3 size={20} aria-hidden="true" />
      <p className="eyebrow light">Condicions actuals</p>
      <h2>Comprovant la lectura local…</h2>
      <p>La guia ja és disponible mentre carreguem les dades més recents.</p>
    </aside>
  );
}

async function LocalConditionsCard({
  species,
  area,
  location,
}: {
  species: SpeciesProfile;
  area: AreaProfile;
  location: PlaceProfile;
}) {
  const bounds = placeBounds(location);
  const mapPath = territorialMapPath(species.speciesId, area.regionId, bounds);
  const month = monthInTimeZone();
  const seasonalActivity = species.ecologicalConfig.seasonality[month];
  const eligible = species.predictionMode === "current" &&
    species.ecologicalConfig.regions.includes(area.regionId) &&
    seasonalActivity !== "inactive";

  if (!eligible) {
    return (
      <aside className="local-map-cta">
        <Map size={20} aria-hidden="true" />
        <p className="eyebrow light">Condicions actuals</p>
        <h2>{species.predictionMode === "current" ? "Fora de temporada" : "Només hàbitat"}</h2>
        <p>{species.predictionMode === "current" ? "Ara no és la temporada habitual d’aquesta espècie. Encara pots consultar els boscos adequats." : "Per a aquesta espècie mostrem on encaixa el terreny, però no una valoració actual."}</p>
        <Link href={mapPath} className="button light-button">Veure el mapa <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </aside>
    );
  }

  // Production builds intentionally have no database credentials. Defer this
  // bounded, generation-cached read until a real request reaches the page.
  await connection();
  let summary = null;
  try {
    summary = await loadLocalGuideCondition(
      species.speciesId,
      `${area.slug}/${location.slug}`,
      area.regionId,
      bounds,
    );
  } catch {
    summary = null;
  }
  if (!summary ||
    summary.result.score === null ||
    summary.result.missingComponents.length > 0 ||
    summary.snapshot.stale) {
    return (
      <aside className="local-map-cta local-current-unavailable">
        <Gauge size={20} aria-hidden="true" />
        <p className="eyebrow light">Condicions actuals</p>
        <h2>Condicions no disponibles</h2>
        <p>Falten lectures recents per donar una valoració completa. Torna-ho a provar més tard.</p>
        <Link href={mapPath} className="button light-button">Obrir el mapa <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </aside>
    );
  }

  const score = summary.bestCell.score;
  return (
    <aside className="local-map-cta local-current-card" aria-labelledby="local-current-title">
      <div className="local-current-heading">
        <div><p className="eyebrow light"><Gauge size={15} aria-hidden="true" /> Condicions actuals</p><h2 id="local-current-title">Lectura {location.prepositionalName}</h2></div>
        <div className="local-current-score" aria-label={`Millor sector ${score} sobre 100, ${opportunityLabel(score)}`}><strong>{score}</strong><span>/100</span></div>
      </div>
      <p className="local-current-interpretation">Millor sector · {opportunityLabel(score)}. Les condicions poden variar dins l’indret.</p>
      <dl className="local-current-signals">
        <div><dt>Abast dins la zona</dt><dd>{extentMetric(summary)}</dd></div>
        <div><dt>Principal fre</dt><dd>{limitingFactor(summary)}</dd></div>
      </dl>
      <p className="local-current-updated"><Clock3 size={14} aria-hidden="true" /> Dades de {dateTime.format(new Date(summary.snapshot.observedAt))}</p>
      <UmamiEventLink href={mapPath} analyticsEvent={UMAMI_EVENTS.speciesMapOpen} className="button light-button"><Map size={16} aria-hidden="true" /> Mapa de {species.identity.commonName.toLocaleLowerCase("ca")} {location.prepositionalName}</UmamiEventLink>
    </aside>
  );
}

export function generateStaticParams() {
  return speciesLocationPages.map((page) => ({ place: page.areaSlug, species: page.placeSlug, guide: page.speciesSlug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { place: areaSlug, species: placeSlug, guide: speciesSlug } = await params;
  const page = getLocationPage(areaSlug, placeSlug, speciesSlug);
  const location = getPlace(areaSlug, placeSlug);
  const species = page ? getSpecies(page.speciesId) : undefined;
  if (!page || !location || !species) notFound();
  const path = locationPagePath(page);
  const description = metaDescription(page.habitatNote);
  const image = speciesImage(species);
  return {
    title: pageTitle(page.titlePhrase), description, alternates: { canonical: path },
    keywords: [page.titlePhrase, `${page.searchName} ${location.name}`, `temporada ${page.searchName} ${location.name}`, species.identity.scientificName],
    openGraph: { type: "article", url: path, title: pageTitle(page.titlePhrase), description, images: image ? [{ url: image, alt: species.media[0]?.alt ?? page.titlePhrase }] : undefined },
    twitter: { card: "summary_large_image", title: pageTitle(page.titlePhrase), description, images: image ? [image] : undefined },
  };
}

export default async function SpeciesLocationPage({ params }: Props) {
  const { place: areaSlug, species: placeSlug, guide: speciesSlug } = await params;
  const page = getLocationPage(areaSlug, placeSlug, speciesSlug);
  const location = getPlace(areaSlug, placeSlug);
  const area = areasBySlug[areaSlug];
  const species = page ? getSpecies(page.speciesId) : undefined;
  if (!page || !location || !area || !species) notFound();
  const url = absoluteUrl(locationPagePath(page));
  const image = speciesImage(species);
  const referenceImage = species.media.find((asset) => asset.identificationReference) ?? species.media[0];
  const habitat = species.ecologicalConfig.habitat;
  const soil = species.ecologicalConfig.soil;
  const peakMonths = SEASON_MONTHS.filter(({ key }) => species.ecologicalConfig.seasonality[key] === "peak").map(({ label }) => label);
  const editorialContentId = `guide:${area.slug}:${location.slug}:${species.speciesId}`;
  const territorialSource: SourceReference = {
    id: `territory-${area.slug}-${location.slug}`,
    title: location.source.title,
    publisher: location.source.title,
    url: location.source.url,
    confidence: "high",
  };
  const samePlaceGuides = locationPagesForPlace(area.slug, location.slug)
    .filter((candidate) => candidate.speciesId !== species.speciesId);
  const sameSpeciesGuides = locationPagesForSpecies(species.speciesId)
    .filter((candidate) => candidate.areaSlug !== area.slug || candidate.placeSlug !== location.slug)
    .slice(0, 6);

  return (
    <article className="local-species-page">
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [{ "@type": "Article", "@id": `${url}#article`, headline: page.titlePhrase, description: page.habitatNote, url, inLanguage: "ca", image, isPartOf: { "@id": `${SITE_URL}/#website` }, publisher: { "@id": `${SITE_URL}/#organization` }, ...editorialArticleFields(editorialContentId), about: [{ "@type": "Taxon", name: species.identity.scientificName, alternateName: [species.identity.commonName, ...species.identity.alternateNames], taxonRank: "species" }, { "@type": "Place", name: location.name, containedInPlace: { "@type": "Place", name: area.name } }] }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Inici", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Guies", item: absoluteUrl("/guies") }, { "@type": "ListItem", position: 3, name: area.name, item: absoluteUrl(`/zones/${area.slug}`) }, { "@type": "ListItem", position: 4, name: location.name, item: absoluteUrl(placePath(location)) }, { "@type": "ListItem", position: 5, name: displaySearchName(page.searchName), item: url }] }] }} />
      <header className="local-species-hero">
        <div className="page-width local-species-hero-grid">
          <div>
            <nav className="local-species-breadcrumbs" aria-label="Fil d’Ariadna"><Link href="/guies">Guies</Link><span aria-hidden="true">/</span><Link href={`/zones/${area.slug}`}>{area.name}</Link><span aria-hidden="true">/</span><Link href={placePath(location)}>{location.name}</Link><span aria-hidden="true">/</span><span aria-current="page">{displaySearchName(page.searchName)}</span></nav>
            <p className="eyebrow light"><MapPinned size={15} /> {area.name} · guia ecològica local</p>
            <h1>{page.titlePhrase}</h1><em>{species.identity.scientificName}</em><p>{page.introduction}</p>
          </div>
          {referenceImage && <div className="local-species-image"><MediaImage asset={referenceImage} alt={referenceImage.alt} fill preload sizes="(max-width: 760px) calc(100vw - 48px), 42vw" /></div>}
        </div>
      </header>
      <div className="page-width local-species-content">
        <nav className="guide-reading-actions" aria-label="Prepara la sortida">
          <a href="#local-current">Consulta la lectura local <ArrowUpRight size={16} aria-hidden="true" /></a>
          <UmamiEventLink href={territorialMapPath(species.speciesId, area.regionId, placeBounds(location))} analyticsEvent={UMAMI_EVENTS.speciesMapOpen}>
            <Map size={16} aria-hidden="true" /> Mapa de {species.identity.commonName.toLocaleLowerCase("ca")} {location.prepositionalName}
          </UmamiEventLink>
          <Link href="/bolets-avui">Compara les condicions d’avui a Catalunya <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </nav>
        <section className="local-species-summary" aria-label="Resum ecològic">
          <div><Trees size={19} /><span>Bosc habitual</span><strong>{habitat.forestTypes.slice(0, 2).join(" i ")}</strong></div>
          <div><Mountain size={19} /><span>Altitud habitual</span><strong>{habitat.altitude[0]}–{habitat.altitude[1]} m</strong></div>
          <div><CalendarDays size={19} /><span>Millors mesos</span><strong>{peakMonths.join(" i ") || "Sense un pic clar"}</strong></div>
        </section>
        <div className="local-species-columns">
          <div className="local-current-slot" id="local-current"><Suspense fallback={<LocalConditionsLoading />}><LocalConditionsCard species={species} area={area} location={location} /></Suspense></div>
          <div className="local-species-main">
            <section className="local-landscape-section"><p className="eyebrow">Lectura del paisatge</p><h2>Quins sectors poden encaixar-hi</h2><p>{page.habitatNote}</p><p>{location.landscape}</p></section>
            <section className="local-factors-section"><p className="eyebrow">Bosc i terreny</p><h2>Què necessita aquesta espècie</h2><p>El tipus de bosc, el sòl i el relleu ajuden a saber on pot encaixar l’espècie.</p><div className="local-factor-grid">
              <article><Trees size={20} /><h3>Bosc i arbres</h3><p>{habitat.forestTypes.join(", ")}.{habitat.treeAssociations.length > 0 ? ` Arbres habituals: ${habitat.treeAssociations.join(", ")}.` : ""}</p></article>
              <article><Sprout size={20} /><h3>Sòl</h3><p>{habitat.soilPreference}. {soil.texture}, de reacció {soil.reaction.toLocaleLowerCase("ca")} i amb drenatge {soil.drainage.toLocaleLowerCase("ca")}.</p></article>
              <article><Mountain size={20} /><h3>Relleu</h3><p>{habitat.altitude[0]}–{habitat.altitude[1]} m, {habitat.aspect.toLocaleLowerCase("ca")}; {habitat.landscapePosition.toLocaleLowerCase("ca")}.</p></article>
            </div></section>
            <section className="local-habitat-section">
              <p className="eyebrow">Mapa de l’espècie</p>
              <h2>On podria créixer {location.prepositionalName}</h2>
              <p>El blau mostra on el bosc, el sòl i l’altitud encaixen amb {species.identity.commonName}. No confirma que hi hagi bolets.</p>
              <LazyHabitatMap
                activeRegions={species.ecologicalConfig.regions}
                autoGeolocate={false}
                compactLegend
                initialCentre={location.mapCentre}
                initialZoom={12}
                selectedRegion={area.regionId}
                speciesId={species.speciesId}
              />
            </section>
            <section className="local-calendar-section"><p className="eyebrow">Calendari ecològic</p><h2>Quan és temporada</h2><p>{page.seasonNote}</p><SeasonCalendar species={species} /></section>
          </div>
          <aside className="local-species-aside">
            <div className="local-safety-card"><ShieldAlert size={20} /><div><strong>No és una guia de recol·lecció</strong><p>No publiquem coordenades ni presències exactes. No consumeixis cap bolet sense una identificació experta. <Link href="/normativa-bolets">Comprova els permisos i les restriccions d’accés</Link> abans de sortir.</p></div></div>
            <Link href={speciesPath(species)} className="local-profile-link"><span>Fitxa completa</span><strong>{species.identity.commonName}</strong><small>{speciesDescription(species)}</small><ArrowUpRight size={18} /></Link>
          </aside>
        </div>
        <Suspense fallback={<LocalEvidenceLoading location={location} />}><LocalEvidencePanel species={species} location={location} /></Suspense>
        <EditorialAttribution contentId={editorialContentId} sources={[...species.references, territorialSource, ...environmentalSources]} variant="compact" />
        {(samePlaceGuides.length > 0 || sameSpeciesGuides.length > 0) ? <section className="local-related-guides" aria-labelledby="local-related-title"><header><p className="eyebrow"><BookOpenCheck size={15} aria-hidden="true" /> Continua explorant</p><h2 id="local-related-title">Guies relacionades</h2></header><div>{samePlaceGuides.length > 0 ? <section><h3>Altres espècies {location.prepositionalName}</h3><ul>{samePlaceGuides.map((candidate) => <li key={locationPagePath(candidate)}><Link href={locationPagePath(candidate)}><span>{candidate.titlePhrase}</span><ArrowUpRight size={15} aria-hidden="true" /></Link></li>)}</ul></section> : null}{sameSpeciesGuides.length > 0 ? <section><h3>{species.identity.commonName} en altres territoris</h3><ul>{sameSpeciesGuides.map((candidate) => { const candidatePlace = getPlace(candidate.areaSlug, candidate.placeSlug); return <li key={locationPagePath(candidate)}><Link href={locationPagePath(candidate)}><span>{candidate.titlePhrase}<small>{candidatePlace?.typeLabel} · {areasBySlug[candidate.areaSlug]?.name}</small></span><ArrowUpRight size={15} aria-hidden="true" /></Link></li>; })}</ul></section> : null}</div></section> : null}
      </div>
    </article>
  );
}
