import "@/app/styles/local-guides.css";
import "@/app/styles/place-hub.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { headers } from "next/headers";
import { isMapWarmRequestAuthorized } from "@/src/lib/cache-warm-auth.server";
import { Suspense, type CSSProperties, type ReactNode } from "react";
import { ArrowUpRight, BookOpenCheck, CalendarDays, Compass, Droplets, Info, Map as MapIcon, MapPinned, Mountain, ShieldAlert, Sprout, Sun, Trees, TrendingUp, type LucideIcon } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { LocalResources } from "@/components/local-resources";
import { MediaImage } from "@/components/media-image";
import { MushroomSpecimen } from "@/components/mushroom-game-illustrations";
import { HubTodayPanel } from "@/components/hub-sections";
import { UmamiEventLink } from "@/components/umami-event-link";
import { UMAMI_EVENTS } from "@/src/lib/umami-goals";
import { LazyHabitatMap } from "@/components/lazy-habitat-map";
import { SeasonCalendar } from "@/components/season-calendar";
import { getSpecies } from "@/data/species";
import { speciesSameAs } from "@/data/species-identifiers";
import { editorialArticleFields, environmentalSources } from "@/data/editorial";
import { areasBySlug, displaySearchName, getLocationPage, getPlace, locationPagePath, locationPagesForPlace, locationPagesForSpecies, placeBounds, placePath, speciesLocationPages } from "@/data/location-pages";
import { loadLocalGuideCondition } from "@/src/lib/local-guide-conditions-server";
import { loadLocalGuideFacts } from "@/src/lib/local-guide-facts-server";
import { localLandscapeParagraphs } from "@/src/lib/local-landscape";
import { loadLocalLandscape } from "@/src/lib/local-landscape-server";
import { absoluteUrl, metaDescription, pageTitle, SITE_URL, speciesImage, speciesPath } from "@/src/lib/seo";
import { monthInTimeZone, SEASON_MONTHS } from "@/src/lib/seasonality";
import { placeBannerSpec, placeMapPath } from "@/src/lib/place-map";
import { speciesArticle } from "@/src/lib/species-headings";
import { speciesDrawing, speciesIllustration } from "@/src/lib/species-illustrations";
import { territorialMapPath } from "@/src/lib/territorial-map";
import type { AreaProfile, PlaceProfile } from "@/data/location-pages";
import type { SourceReference, SpeciesProfile } from "@/src/lib/types";

type Props = { params: Promise<{ place: string; species: string; guide: string }> };

const localFactNumber = new Intl.NumberFormat("ca-ES", {
  maximumFractionDigits: 0,
});

function LocalEvidenceLoading({ location }: { location: PlaceProfile }) {
  return (
    <div className="local-evidence local-evidence-loading" aria-busy="true" aria-live="polite">
      <p className="guide-panel-text"><strong>Comptant el bosc al voltant de {location.nameWithArticle}…</strong> La resta de la guia ja es pot llegir.</p>
    </div>
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
  let evidenceFailed = false;
  try {
    evidence = await loadLocalGuideFacts(
      species.speciesId,
      `${location.areaSlug}/${location.slug}`,
      bounds,
      `entorn de ${location.name}`,
    );
  } catch {
    evidenceFailed = true;
  }
  const name = species.identity.commonName.toLocaleLowerCase("ca");
  const area = evidence?.facts.find((fact) => fact.kind === "derived" && fact.metric === "compatible-area");
  const altitude = evidence?.facts.find((fact) => fact.kind === "derived" && fact.metric === "altitude-retention");

  return (
    <div className="local-evidence" id="local-evidence" data-local-evidence-state={evidenceFailed ? "unavailable" : evidence ? "available" : "empty"}>
      <p className="guide-panel-text"><strong>Quant bosc hi ha al voltant de {location.nameWithArticle}.</strong> Comptat en uns 15 km al voltant del poble, no dins el terme municipal ni en un bosc concret.</p>
      {area?.kind === "derived" && altitude?.kind === "derived" ? (
        <GuideFacts
          label={`Bosc adequat per a ${species.identity.commonName} al voltant de ${location.nameWithArticle}`}
          items={[
            { key: "area", icon: <Trees size={16} />, term: "Bosc on pot créixer", value: `${localFactNumber.format(area.value)} km²`, detail: `Bosc amb els arbres i el sòl que necessita el ${name}.` },
            { key: "altitude", icon: <Mountain size={16} />, term: "A l’altitud que li convé", value: `${localFactNumber.format(altitude.value)} %`, detail: "Part d’aquest bosc dins la franja d’altitud on l’espècie sol fructificar." },
          ]}
        />
      ) : (
        <p className="guide-panel-note"><Info size={14} aria-hidden="true" /><span><strong>Ara no podem mostrar aquestes xifres.</strong> Falten dades de l’entorn i no volem omplir els buits amb suposicions.</span></p>
      )}
      {area ? <p className="guide-panel-note"><Info size={14} aria-hidden="true" /><span>Calculat amb mapes de bosc, sòl i relleu, no amb troballes de bolets.</span></p> : null}
    </div>
  );
}

type GuideFact = { key: string; icon: ReactNode; term: string; value?: ReactNode; detail: ReactNode; wide?: boolean };

/** Icon, label, optional big value and a line of detail; two columns with hairlines, no boxes. */
function GuideFacts({ label, items }: { label: string; items: GuideFact[] }) {
  return (
    <dl className="guide-facts" aria-label={label}>
      {items.map((item) => (
        <div key={item.key} className={item.wide ? "is-wide" : undefined}>
          <dt><span className="icon-tile guide-fact-icon" aria-hidden="true">{item.icon}</span>{item.term}</dt>
          <dd>{item.value ? <strong>{item.value}</strong> : null}<span>{item.detail}</span></dd>
        </div>
      ))}
    </dl>
  );
}

/** Terrain portrait built from the 1 km cells around the place; silent when the data is short. */
async function LocalLandscapeText({ species, location }: { species: SpeciesProfile; location: PlaceProfile }) {
  await connection();
  let landscape = null;
  try {
    landscape = await loadLocalLandscape(species.speciesId, `${location.areaSlug}/${location.slug}`, placeBounds(location));
  } catch {
    landscape = null;
  }
  if (!landscape) return null;
  const paragraphs = localLandscapeParagraphs(landscape, { placeName: location.nameWithArticle, speciesWithArticle: speciesArticle(species.identity.commonName).withArticle });
  return (
    <div className="local-landscape" data-local-landscape-state="available">
      {paragraphs.map((paragraph) => <p className="guide-panel-text" key={paragraph}>{paragraph}</p>)}
      <p className="guide-panel-note"><Info size={14} aria-hidden="true" /><span>Comptat en uns 15 km al voltant del poble amb mapes de cobertes del sòl, relleu, sòls i geologia.</span></p>
    </div>
  );
}

/** "per al cep", "per a la múrgola", "per a l’apagallums". */
function forSpecies(name: string) {
  const { withArticle } = speciesArticle(name);
  return withArticle.startsWith("el ") ? `per al ${withArticle.slice(3)}` : `per a ${withArticle}`;
}

/** One card per section, with the Today panel's chrome: inline icon in the eyebrow, heading, lede. */
function GuideSection({ id, icon: Icon, eyebrow, title, lede, action, flush, children }: {
  id: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  lede?: ReactNode;
  action?: ReactNode;
  /** Body without padding, for the map. */
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="card guide-panel" aria-labelledby={`${id}-title`}>
      <header className="guide-panel-head">
        <div>
          <p className="eyebrow"><Icon size={15} aria-hidden="true" /> {eyebrow}</p>
          <h2 id={`${id}-title`}>{title}</h2>
          {lede ? <p className="guide-panel-lede">{lede}</p> : null}
        </div>
        {action}
      </header>
      <div className={flush ? "guide-panel-body is-flush" : "guide-panel-body"}>{children}</div>
    </section>
  );
}

/** The H2 repeats the guide's own search phrase (plural common name + place) and adds the "avui" intent. */
function todayCopy(species: SpeciesProfile, location: PlaceProfile, titlePhrase: string) {
  const name = species.identity.commonName.toLocaleLowerCase("ca");
  return {
    title: `${titlePhrase} avui: com estan els boscos`,
    intro: `Condicions actuals per anar a buscar ${name} ${location.prepositionalName}, calculades amb la pluja, la humitat i la temperatura dels boscos de l’entorn. Comparen sectors: no confirmen que hi hagi bolets ni mostren punts exactes.`,
    liveMapLabel: `Mapa de ${name} ${location.prepositionalName}`,
  };
}

function LocalConditionsLoading({ species, location, titlePhrase, mapPath }: { species: SpeciesProfile; location: PlaceProfile; titlePhrase: string; mapPath: string }) {
  return <HubTodayPanel id="local-current" {...todayCopy(species, location, titlePhrase)} liveMapHref={mapPath} readings={[]} state="loading" />;
}

async function LocalConditionsCard({
  species,
  area,
  location,
  titlePhrase,
}: {
  species: SpeciesProfile;
  area: AreaProfile;
  location: PlaceProfile;
  titlePhrase: string;
}) {
  const bounds = placeBounds(location);
  const mapPath = territorialMapPath(species.speciesId, area.regionId, bounds);
  const month = monthInTimeZone();
  const seasonalActivity = species.ecologicalConfig.seasonality[month];
  const eligible = species.predictionMode === "current" &&
    species.ecologicalConfig.regions.includes(area.regionId) &&
    seasonalActivity !== "inactive";
  const copy = todayCopy(species, location, titlePhrase);

  if (!eligible) {
    const note = species.predictionMode === "current"
      ? "Ara no és la temporada habitual d’aquesta espècie. Els boscos adequats es poden consultar igualment al mapa."
      : "Per a aquesta espècie mostrem on encaixa el terreny, però no una valoració actual.";
    return <HubTodayPanel id="local-current" className="local-current-unavailable" {...copy} liveMapHref={mapPath} readings={[]} state="off-season" note={<p className="place-today-note">{note}</p>} />;
  }

  // Production builds intentionally have no database credentials. Defer this
  // bounded, generation-cached read until a real request reaches the page.
  await connection();
  let summary = null;
  const background = isMapWarmRequestAuthorized(await headers());
  try {
    summary = await loadLocalGuideCondition(species.speciesId, `${area.slug}/${location.slug}`, area.regionId, bounds, background);
  } catch {
    summary = null;
  }
  const usable = summary && summary.result.score !== null && summary.result.missingComponents.length === 0 && !summary.snapshot.stale
    ? summary
    : null;
  const reading = { species, score: usable ? usable.bestCell.score : null, guideHref: speciesPath(species), mapHref: mapPath };
  return (
    <HubTodayPanel
      id="local-current"
      className={usable ? "local-current-card" : "local-current-unavailable"}
      {...copy}
      liveMapHref={mapPath}
      readings={[reading]}
      observedAt={usable ? usable.snapshot.observedAt : undefined}
      note={usable ? undefined : <p className="place-today-note">Falten lectures recents per donar una valoració completa. Torna-hi més tard.</p>}
      state={usable ? "available" : "unavailable"}
    />
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
  const mapPath = territorialMapPath(species.speciesId, area.regionId, placeBounds(location));
  const image = speciesImage(species);
  const referenceImage = species.media.find((asset) => asset.identificationReference) ?? species.media[0];
  const banner = placeBannerSpec(location);
  const drawing = speciesDrawing(species.speciesId);
  const illustration = speciesIllustration(species.speciesId);
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
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [{ "@type": "Article", "@id": `${url}#article`, headline: page.titlePhrase, description: page.habitatNote, url, inLanguage: "ca", image, isPartOf: { "@id": `${SITE_URL}/#website` }, publisher: { "@id": `${SITE_URL}/#organization` }, ...editorialArticleFields(editorialContentId), about: [{ "@type": "Taxon", name: species.identity.scientificName, alternateName: [species.identity.commonName, ...species.identity.alternateNames], taxonRank: "species", sameAs: speciesSameAs(species.speciesId) }, { "@type": "Place", name: location.name, containedInPlace: { "@type": "Place", name: area.name } }] }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Inici", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Guies", item: absoluteUrl("/guies") }, { "@type": "ListItem", position: 3, name: area.name, item: absoluteUrl(`/zones/${area.slug}`) }, { "@type": "ListItem", position: 4, name: location.name, item: absoluteUrl(placePath(location)) }, { "@type": "ListItem", position: 5, name: displaySearchName(page.searchName), item: url }] }] }} />
      <header className="local-species-hero guide-hero">
        <div className="guide-hero-map" aria-hidden="true">
          <Image src={placeMapPath(location, "banner")} alt="" width={banner.width} height={banner.height} unoptimized priority style={{ objectPosition: `${banner.focus.x * 100}% ${banner.focus.y * 100}%` }} />
        </div>
        <div className="guide-hero-pin" style={{ "--pin-x": `${banner.focus.x * 100}%`, "--pin-y": `${banner.focus.y * 100}%` } as CSSProperties}>
          <span className={`icon-tile guide-hero-pin-badge${drawing ? " has-drawing" : illustration ? "" : " has-photo"}`}>
            {drawing
              ? <Image src={drawing.src} alt={species.identity.commonName} width={240} height={240} unoptimized />
              : illustration
                ? <MushroomSpecimen kind={illustration} />
                : referenceImage && <MediaImage asset={referenceImage} alt={species.identity.commonName} fill sizes="120px" />}
          </span>
          <span className="guide-hero-pin-tail" aria-hidden="true" />
          <strong>{location.name}</strong>
        </div>
        <div className="guide-hero-scale" role="img" aria-label={`Escala: ${banner.scaleBar.metres / 1000} km`}>
          <i style={{ width: `${banner.scaleBar.widthPercent}%` }} /><span>{banner.scaleBar.metres / 1000} km</span>
        </div>
        <small className="guide-hero-credit">Base topogràfica © ICGC</small>
        <div className="guide-hero-fade" aria-hidden="true" />
        <div className="page-width guide-hero-layout">
          <div className="guide-hero-copy">
            <nav className="local-species-breadcrumbs" aria-label="Fil d’Ariadna"><Link href="/guies">Guies</Link><span aria-hidden="true">/</span><Link href={`/zones/${area.slug}`}>{area.name}</Link><span aria-hidden="true">/</span><Link href={placePath(location)}>{location.name}</Link><span aria-hidden="true">/</span><span aria-current="page">{displaySearchName(page.searchName)}</span></nav>
            <p className="eyebrow light"><MapPinned size={15} /> {location.typeLabel} · {area.name}</p>
            <h1>{page.titlePhrase}</h1><em>{species.identity.scientificName}</em><p>{page.introduction}</p>
          </div>
        </div>
      </header>
      <div className="page-width local-species-content">
        <section className="card local-species-summary" aria-label="Resum ecològic">
          <div><Trees size={19} /><span>Bosc habitual</span><strong>{habitat.forestTypes.slice(0, 2).join(" i ")}</strong></div>
          <div><Mountain size={19} /><span>Altitud habitual</span><strong>{habitat.altitude[0]}–{habitat.altitude[1]} m</strong></div>
          <div><CalendarDays size={19} /><span>Millors mesos</span><strong>{peakMonths.join(" i ") || "Sense un pic clar"}</strong></div>
        </section>
        <Suspense fallback={<LocalConditionsLoading species={species} location={location} titlePhrase={page.titlePhrase} mapPath={mapPath} />}><LocalConditionsCard species={species} area={area} location={location} titlePhrase={page.titlePhrase} /></Suspense>
        <div className="local-species-columns">
          <GuideSection id="paisatge" icon={MapPinned} eyebrow="Lectura del paisatge" title={`Els boscos de ${location.nameWithArticle} ${forSpecies(species.identity.commonName)}`} lede={page.habitatNote}>
            <Suspense fallback={null}><LocalLandscapeText species={species} location={location} /></Suspense>
            <p className="guide-panel-text">{location.landscape}</p>
            <p className="guide-panel-text"><strong>{area.name}.</strong> {area.landscape}</p>
            <GuideFacts
              label="Com reconèixer un bon racó"
              items={[
                { key: "moisture", icon: <Droplets size={16} />, term: "Humitat del sòl", detail: habitat.moisture },
                { key: "shade", icon: <Sun size={16} />, term: "Ombra", detail: habitat.shade },
                { key: "slope", icon: <TrendingUp size={16} />, term: "Pendent", detail: habitat.slope },
                { key: "aspect", icon: <Compass size={16} />, term: "Orientació", detail: habitat.aspect },
              ]}
            />
            <p className="guide-panel-note"><ShieldAlert size={14} aria-hidden="true" /><span><Link href="/normativa-bolets">Comprova els permisos i les restriccions d’accés</Link> abans de sortir.</span></p>
          </GuideSection>
          <GuideSection id="bosc-i-terreny" icon={Trees} eyebrow="Bosc i terreny" title="Què necessita aquesta espècie" lede="El tipus de bosc, el sòl i el relleu diuen on pot encaixar; el temps decideix si fructifica.">
            <GuideFacts
              label="Bosc, sòl i relleu"
              items={[
                { key: "relief", icon: <Mountain size={16} />, term: "Altitud i relleu", value: `${habitat.altitude[0]}–${habitat.altitude[1]} m`, detail: `${habitat.landscapePosition}.` },
                { key: "soil", icon: <Sprout size={16} />, term: "Sòl", detail: `${habitat.soilPreference}. ${soil.texture}, ${soil.reaction.toLocaleLowerCase("ca")}, ${soil.drainage.toLocaleLowerCase("ca")}.` },
                { key: "forest", icon: <Trees size={16} />, term: "Bosc i arbres", detail: `${habitat.forestTypes.join(", ")}.${habitat.treeAssociations.length > 0 ? ` Arbres habituals: ${habitat.treeAssociations.join(", ")}.` : ""}`, wide: true },
              ]}
            />
          </GuideSection>
          <GuideSection
            id="mapa"
            icon={MapIcon}
            eyebrow="Mapa de l’espècie"
            title={`On podria créixer ${location.prepositionalName}`}
            lede={<>El blau mostra on el bosc, el sòl i l’altitud encaixen amb el {species.identity.commonName.toLocaleLowerCase("ca")}. No confirma que hi hagi bolets.</>}
            action={<UmamiEventLink href={mapPath} className="button" analyticsEvent={UMAMI_EVENTS.guideMapOpen}><MapIcon size={17} aria-hidden="true" /> Condicions d’avui al mapa</UmamiEventLink>}
            flush
          >
            <LazyHabitatMap
              activeRegions={species.ecologicalConfig.regions}
              autoGeolocate={false}
              compactLegend
              initialCentre={location.mapCentre}
              initialZoom={12}
              selectedRegion={area.regionId}
              speciesId={species.speciesId}
            />
          </GuideSection>
          <GuideSection id="temporada" icon={CalendarDays} eyebrow="Temporada i entorn" title={`Quan és temporada ${location.prepositionalName}`} lede={page.seasonNote}>
            <SeasonCalendar species={species} />
            <Suspense fallback={<LocalEvidenceLoading location={location} />}><LocalEvidencePanel species={species} location={location} /></Suspense>
          </GuideSection>
        </div>
        <LocalResources location={location} />
        <EditorialAttribution contentId={editorialContentId} sources={[...species.references, territorialSource, ...environmentalSources, ...(drawing?.credit ? [{ id: `illustration-${species.speciesId}`, title: drawing.credit.text, publisher: drawing.credit.license, url: drawing.credit.url, confidence: "high" as const }] : [])]} variant="compact" />
        {(samePlaceGuides.length > 0 || sameSpeciesGuides.length > 0) ? <section className="local-related-guides" aria-labelledby="local-related-title"><header><p className="eyebrow"><BookOpenCheck size={15} aria-hidden="true" /> Continua explorant</p><h2 id="local-related-title">Guies relacionades</h2></header><div>{samePlaceGuides.length > 0 ? <section><h3>Altres espècies {location.prepositionalName}</h3><ul>{samePlaceGuides.map((candidate) => <li key={locationPagePath(candidate)}><Link href={locationPagePath(candidate)}><span>{candidate.titlePhrase}</span><ArrowUpRight size={15} aria-hidden="true" /></Link></li>)}</ul></section> : null}{sameSpeciesGuides.length > 0 ? <section><h3>{species.identity.commonName} en altres territoris</h3><ul>{sameSpeciesGuides.map((candidate) => { const candidatePlace = getPlace(candidate.areaSlug, candidate.placeSlug); return <li key={locationPagePath(candidate)}><Link href={locationPagePath(candidate)}><span>{candidate.titlePhrase}<small>{candidatePlace?.typeLabel} · {areasBySlug[candidate.areaSlug]?.name}</small></span><ArrowUpRight size={15} aria-hidden="true" /></Link></li>; })}</ul></section> : null}</div></section> : null}
      </div>
    </article>
  );
}
