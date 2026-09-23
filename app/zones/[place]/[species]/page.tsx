import "@/app/styles/local-guides.css";
import "@/app/styles/place-hub.css";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { headers } from "next/headers";
import { Suspense } from "react";
import { ArrowLeft, ArrowUpRight, Compass, MapPinned, Mountain, Trees } from "lucide-react";
import { DataSourceCredits } from "@/components/editorial-attribution";
import { HubFacts, HubSeasonMatrix, HubTodayPanel, hubSpeciesList, type HubReading } from "@/components/hub-sections";
import { HubMapPortrait } from "@/components/hub-map-portrait";
import { JsonLd } from "@/components/json-ld";
import { LocalResources } from "@/components/local-resources";
import { MediaImage } from "@/components/media-image";
import { getSpecies } from "@/data/species";
import { areaPath, areasBySlug, displaySearchName, getPlace, locationPagePath, locationPagesForPlace, nearbyPlaces, placeBounds, placePath, placeProfiles } from "@/data/location-pages";
import { regionLabels } from "@/data/regions";
import { isMapWarmRequestAuthorized } from "@/src/lib/cache-warm-auth.server";
import { loadLocalGuideCondition } from "@/src/lib/local-guide-conditions-server";
import { placeMapPath, placeMapSpec } from "@/src/lib/place-map";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";
import { territorialMapPath } from "@/src/lib/territorial-map";
import type { AreaProfile, PlaceProfile, SpeciesLocationPage } from "@/data/location-pages";
import type { Month, SpeciesProfile } from "@/src/lib/types";

type Props = { params: Promise<{ place: string; species: string }> };
type PlaceGuide = { page: SpeciesLocationPage; species: SpeciesProfile };

function readsConditionsNow(species: SpeciesProfile, area: AreaProfile, month: Month) {
  return species.predictionMode === "current" &&
    species.ecologicalConfig.regions.includes(area.regionId) &&
    species.ecologicalConfig.seasonality[month] !== "inactive";
}

function todayCopy(location: PlaceProfile, species: SpeciesProfile[]) {
  return {
    title: `Bolets ${location.prepositionalName} avui: com estan els boscos`,
    intro: `Condicions actuals per anar a buscar ${hubSpeciesList(species)} ${location.prepositionalName}, calculades amb la pluja, la humitat i la temperatura dels boscos de l’entorn. Comparen sectors: no confirmen que hi hagi bolets ni mostren punts exactes.`,
    liveMapLabel: `Mapa en viu ${location.prepositionalName}`,
  };
}

/** Live best-sector readings for every guide species in season, over the place window. */
async function PlaceConditionsBoard({ area, location, guides, liveMapHref }: { area: AreaProfile; location: PlaceProfile; guides: PlaceGuide[]; liveMapHref?: string }) {
  const month = monthInTimeZone();
  const active = guides.filter(({ species }) => readsConditionsNow(species, area, month));
  const resting = guides.filter(({ species }) => !readsConditionsNow(species, area, month));
  const note = resting.length > 0
    ? <p className="place-today-note">Fora de temporada ara: {resting.map(({ species }) => species.identity.commonName).join(", ")}.</p>
    : undefined;
  const copy = todayCopy(location, (active.length > 0 ? active : guides).map(({ species }) => species));
  if (active.length === 0) {
    return <HubTodayPanel {...copy} liveMapHref={liveMapHref} readings={[]} state="off-season" note={note ?? <p className="place-today-note">Cap espècie amb guia és en temporada ara mateix.</p>} />;
  }

  // Production builds intentionally have no database credentials. Defer this
  // bounded, generation-cached read until a real request reaches the page.
  await connection();
  const background = isMapWarmRequestAuthorized(await headers());
  const bounds = placeBounds(location);
  const readings = await Promise.all(active.map(async ({ page, species }): Promise<HubReading & { observedAt?: string }> => {
    const base = { species, guideHref: locationPagePath(page), mapHref: territorialMapPath(species.speciesId, area.regionId, bounds) };
    try {
      const summary = await loadLocalGuideCondition(species.speciesId, `${area.slug}/${location.slug}`, area.regionId, bounds, background);
      const usable = summary && summary.result.score !== null && summary.result.missingComponents.length === 0 && !summary.snapshot.stale;
      return usable ? { ...base, score: summary.bestCell.score, observedAt: summary.snapshot.observedAt } : { ...base, score: null };
    } catch {
      return { ...base, score: null };
    }
  }));
  readings.sort((left, right) => (right.score ?? -1) - (left.score ?? -1));
  const observedAt = readings.map((reading) => reading.observedAt).filter((value): value is string => Boolean(value)).sort().at(-1);
  return <HubTodayPanel {...copy} liveMapHref={liveMapHref} readings={readings} observedAt={observedAt} note={note} state={readings.some((reading) => reading.score !== null) ? "available" : "unavailable"} />;
}

export function generateStaticParams() {
  return placeProfiles.map((location) => ({ place: location.areaSlug, species: location.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { place: areaSlug, species: placeSlug } = await params;
  const location = getPlace(areaSlug, placeSlug);
  if (!location) notFound();
  const path = placePath(location);
  return { title: `Bolets ${location.prepositionalName}`, description: `Guies de bolets ${location.prepositionalName}: hàbitat, temporada i condicions ecològiques per espècie.`, alternates: { canonical: path }, openGraph: { url: path, title: `Bolets ${location.prepositionalName}`, description: location.description, images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }] } };
}

export default async function PlacePage({ params }: Props) {
  const { place: areaSlug, species: placeSlug } = await params;
  const location = getPlace(areaSlug, placeSlug);
  const area = areasBySlug[areaSlug];
  if (!location || !area) notFound();
  const pages = locationPagesForPlace(areaSlug, placeSlug);
  const guides: PlaceGuide[] = pages.map((page) => ({ page, species: getSpecies(page.speciesId)! }));
  const species = guides.map((guide) => guide.species);
  const month = monthInTimeZone();
  const bounds = placeBounds(location);
  const liveMapSpecies = guides.find((guide) => readsConditionsNow(guide.species, area, month))?.species ?? species[0];
  const liveMapHref = liveMapSpecies ? territorialMapPath(liveMapSpecies.speciesId, area.regionId, bounds) : undefined;
  const nearby = nearbyPlaces(location, 4);

  return (
    <div className="location-hub">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: `Bolets ${location.prepositionalName}`, url: absoluteUrl(placePath(location)), inLanguage: "ca", about: { "@type": "Place", name: location.name, containedInPlace: { "@type": "Place", name: area.name }, geo: { "@type": "GeoCoordinates", latitude: location.mapCentre[1], longitude: location.mapCentre[0] } }, mainEntity: { "@type": "ItemList", itemListElement: pages.map((page, index) => ({ "@type": "ListItem", position: index + 1, name: page.titlePhrase, url: absoluteUrl(locationPagePath(page)) })) } }} />
      <header className="panel-dark location-hub-hero"><div className="page-width location-hub-hero-grid">
        <div className="location-hub-copy"><Link href={areaPath(area)} className="back-link location-back"><ArrowLeft size={15} /> Bolets {area.prepositionalName}</Link><p className="eyebrow light"><MapPinned size={15} /> {location.typeLabel} · {area.name}</p><h1>Bolets<br /><i>{location.prepositionalName}.</i></h1><p>{location.description} {location.landscape}</p></div>
        <HubMapPortrait
          src={placeMapPath(location)}
          spec={placeMapSpec(location)}
          name={location.name}
          regionLabel={`${location.typeLabel} · ${regionLabels[area.regionId]}`}
          atlasLabel="Guies de l’indret"
          count={guides.length}
          countLabel={guides.length === 1 ? "guia ecològica publicada" : "guies ecològiques publicades"}
          liveMapHref={liveMapHref}
        />
      </div></header>
      <div className="page-width location-hub-body">
        <HubFacts species={species} />

        <Suspense fallback={<HubTodayPanel {...todayCopy(location, species)} liveMapHref={liveMapHref} readings={[]} state="loading" />}>
          <PlaceConditionsBoard area={area} location={location} guides={guides} liveMapHref={liveMapHref} />
        </Suspense>

        <HubSeasonMatrix title={`Quan és temporada ${location.prepositionalName}`} rows={guides.map(({ page, species }) => ({ species, href: locationPagePath(page) }))} month={month} />

        <section className="location-guide-gallery" aria-labelledby="guides-title"><header><div><p className="eyebrow">Guies</p><h2 id="guides-title">Els bolets de {location.nameWithArticle}</h2></div><p>Una guia per espècie: en quin bosc creix, a quina altitud i què cal saber abans de sortir.</p></header><div className="location-guide-grid">
          {guides.map(({ page, species }, index) => { const image = species.media.find((asset) => asset.identificationReference) ?? species.media[0]; const habitat = species.ecologicalConfig.habitat; return <Link href={locationPagePath(page)} className="card location-guide-card" key={page.speciesSlug}><div className={`location-guide-card-media${image ? " has-image" : ""}`}>{image && <MediaImage asset={image} alt={image.alt} fill preload={index === 0} sizes="(max-width: 760px) calc(100vw - 48px), 50vw" />}<span>{species.identity.scientificName}</span></div><div className="location-guide-card-copy"><div className="location-guide-card-title"><h3>{page.titlePhrase}</h3><ArrowUpRight size={20} /></div><p>{page.habitatNote}</p><div className="location-guide-card-facts"><span><Trees size={15} /> {habitat.forestTypes[0]}</span><span><Mountain size={15} /> {habitat.altitude[0]}–{habitat.altitude[1]} m</span></div></div></Link>; })}
        </div></section>

        <LocalResources location={location} />

        {nearby.length > 0 ? (
          <section className="place-nearby" aria-labelledby="nearby-title">
            <header><p className="eyebrow"><Compass size={15} aria-hidden="true" /> A prop</p><h2 id="nearby-title">Altres indrets a prop</h2></header>
            <div className="place-nearby-grid">
              {nearby.map(({ place, distanceKm }) => {
                const placePages = locationPagesForPlace(place.areaSlug, place.slug);
                return (
                  <Link href={placePath(place)} className="card place-nearby-card" key={`${place.areaSlug}/${place.slug}`}>
                    <span>{place.typeLabel} · {areasBySlug[place.areaSlug]?.name ?? place.areaSlug}</span>
                    <strong>{place.name} <em>{Math.round(distanceKm)} km</em></strong>
                    <small>{placePages.length} {placePages.length === 1 ? "guia" : "guies"} · {placePages.map((page) => displaySearchName(page.searchName)).join(", ")}</small>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <DataSourceCredits
          label="Font territorial"
          sources={[
            { label: location.source.title, url: location.source.url },
            { label: "Base topogràfica: Institut Cartogràfic i Geològic de Catalunya", url: "https://www.icgc.cat/" },
          ]}
        />
      </div>
    </div>
  );
}
