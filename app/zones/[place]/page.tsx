import "@/app/styles/local-guides.css";
import "@/app/styles/place-hub.css";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, BookOpenText, CalendarRange, CircleHelp, MapPinned, ShieldCheck, Trees } from "lucide-react";
import { DataSourceCredits } from "@/components/editorial-attribution";
import { HubFacts, HubSeasonMatrix, HubTodayPanel, hubAltitudeBand, hubSeasonWindow, hubSpeciesList, type HubReading } from "@/components/hub-sections";
import { HubMapPortrait } from "@/components/hub-map-portrait";
import { FaqEntries } from "@/components/faq";
import { JsonLd } from "@/components/json-ld";
import { MediaImage } from "@/components/media-image";
import { editorialArticleFields } from "@/data/editorial";
import { regionLabels } from "@/data/regions";
import { getSpecies } from "@/data/species";
import {
  areaBounds,
  areaPath,
  areaProfiles,
  areasBySlug,
  displaySearchName,
  locationPagesForArea,
  locationPagesForPlace,
  placePath,
  placesForArea,
} from "@/data/location-pages";
import { areaMapPath, areaMapSpec } from "@/src/lib/place-map";
import { getAreaPredictionSummaries } from "@/src/lib/predictions";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { territoryGuideForSpecies } from "@/src/lib/species-territory-guides";
import { faqPageSchema } from "@/src/lib/faq-schema";
import { zoneHubFaqs, zoneHubSummary } from "@/src/lib/zone-hub-copy";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, pageTitle, speciesPath } from "@/src/lib/seo";
import { territorialMapPath } from "@/src/lib/territorial-map";
import type { AreaProfile } from "@/data/location-pages";
import type { Month, SpeciesProfile } from "@/src/lib/types";

export const revalidate = 300;

type Props = { params: Promise<{ place: string }> };

function readsConditionsNow(species: SpeciesProfile, area: AreaProfile, month: Month) {
  return species.predictionMode === "current" &&
    species.ecologicalConfig.regions.includes(area.regionId) &&
    species.ecologicalConfig.seasonality[month] !== "inactive";
}

/** Every species with a local guide somewhere in the area, in guide order. */
function areaSpecies(areaSlug: string) {
  return [...new Set(locationPagesForArea(areaSlug).map((page) => page.speciesId))]
    .map((speciesId) => getSpecies(speciesId))
    .filter((species): species is SpeciesProfile => Boolean(species));
}

/** The species page, or the territory guide when the species has one. */
function speciesGuideHref(species: SpeciesProfile) {
  return territoryGuideForSpecies(species.speciesId)?.path ?? speciesPath(species);
}

function todayCopy(area: AreaProfile, species: SpeciesProfile[]) {
  return {
    title: `Bolets ${area.prepositionalName} avui: com estan els boscos`,
    intro: `Condicions actuals per anar a buscar ${hubSpeciesList(species)} ${area.prepositionalName}, calculades amb la pluja, la humitat i la temperatura dels boscos de tota la ${area.typeLabel === "massís" ? "zona" : "comarca"}. Comparen sectors: no confirmen que hi hagi bolets ni mostren punts exactes.`,
    liveMapLabel: `Mapa en viu ${area.prepositionalName}`,
  };
}

/** Live hub readings for every guide species in season, over the area window. */
async function AreaConditionsBoard({ area, species, liveMapHref }: { area: AreaProfile; species: SpeciesProfile[]; liveMapHref?: string }) {
  const month = monthInTimeZone();
  const active = species.filter((entry) => readsConditionsNow(entry, area, month));
  const resting = species.filter((entry) => !readsConditionsNow(entry, area, month));
  const note = resting.length > 0
    ? <p className="place-today-note">Fora de temporada ara: {resting.map((entry) => entry.identity.commonName).join(", ")}.</p>
    : undefined;
  const copy = todayCopy(area, active.length > 0 ? active : species);
  if (active.length === 0) {
    return <HubTodayPanel {...copy} liveMapHref={liveMapHref} readings={[]} state="off-season" note={note ?? <p className="place-today-note">Cap espècie amb guia és en temporada ara mateix.</p>} />;
  }
  const bounds = areaBounds(area);
  let summaries: Awaited<ReturnType<typeof getAreaPredictionSummaries>> = {};
  try {
    summaries = await getAreaPredictionSummaries(active.map((entry) => entry.speciesId), { slug: area.slug, regionId: area.regionId, bounds });
  } catch {
    summaries = {};
  }
  const readings = active.map((entry): HubReading & { observedAt?: string } => {
    const summary = summaries[entry.speciesId];
    const usable = summary && summary.result.score !== null && summary.result.missingComponents.length === 0 && !summary.snapshot.stale;
    return {
      species: entry,
      score: usable ? summary.bestCell.score : null,
      observedAt: usable ? summary.snapshot.observedAt : undefined,
      guideHref: speciesGuideHref(entry),
      mapHref: territorialMapPath(entry.speciesId, area.regionId, bounds),
    };
  }).sort((left, right) => (right.score ?? -1) - (left.score ?? -1));
  const observedAt = readings.map((reading) => reading.observedAt).filter((value): value is string => Boolean(value)).sort().at(-1);
  return <HubTodayPanel {...copy} liveMapHref={liveMapHref} readings={readings} observedAt={observedAt} note={note} state={readings.some((reading) => reading.score !== null) ? "available" : "unavailable"} />;
}

export function generateStaticParams() {
  return areaProfiles.map((area) => ({ place: area.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { place: areaSlug } = await params;
  const area = areasBySlug[areaSlug];
  if (!area) notFound();
  const path = areaPath(area);
  return {
    title: pageTitle(`Bolets ${area.prepositionalName}: zones i temporada`),
    description: `Guies de bolets ${area.prepositionalName} per indret i espècie, amb hàbitat, temporada i condicions ecològiques.`,
    alternates: { canonical: path },
    openGraph: { url: path, title: `Bolets ${area.prepositionalName}`, description: area.description, images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }] },
  };
}

export default async function AreaPage({ params }: Props) {
  const { place: areaSlug } = await params;
  const area = areasBySlug[areaSlug];
  if (!area) notFound();
  const places = placesForArea(areaSlug);
  const cards = places.map((place) => {
    const pages = locationPagesForPlace(areaSlug, place.slug);
    const species = pages[0] ? getSpecies(pages[0].speciesId) : undefined;
    return { place, pages, species };
  });
  const species = areaSpecies(areaSlug);
  const month = monthInTimeZone();
  const bounds = areaBounds(area);
  const liveMapSpecies = species.find((entry) => readsConditionsNow(entry, area, month)) ?? species[0];
  const liveMapHref = liveMapSpecies ? territorialMapPath(liveMapSpecies.speciesId, area.regionId, bounds) : undefined;
  const territoryGuides = [...new Map(
    species.flatMap((entry) => {
      const guide = territoryGuideForSpecies(entry.speciesId);
      return guide ? [[guide.path, guide] as const] : [];
    }),
  ).values()];
  const seasonWindow = hubSeasonWindow(species);
  const speciesList = hubSpeciesList(species);
  const summary = zoneHubSummary({ area, places, speciesList, speciesCount: species.length, seasonWindow, altitudeBand: hubAltitudeBand(species) });
  const faqs = zoneHubFaqs({ area, places, speciesList, seasonWindow });
  const pyrenean = area.regionId === "pirineus" || area.regionId === "prepirineus";

  return (
    <div className="location-hub">
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [
        { "@type": "CollectionPage", "@id": `${absoluteUrl(areaPath(area))}#page`, name: `Bolets ${area.prepositionalName}`, description: summary, url: absoluteUrl(areaPath(area)), inLanguage: "ca", ...editorialArticleFields(`zone:${area.slug}`), about: { "@type": "Place", name: area.name }, mainEntity: { "@type": "ItemList", itemListElement: places.map((place, index) => ({ "@type": "ListItem", position: index + 1, name: place.name, url: absoluteUrl(placePath(place)) })) } },
        faqPageSchema(faqs, `${absoluteUrl(areaPath(area))}#preguntes`),
      ] }} />
      <header className="location-hub-hero">
        <div className="page-width location-hub-hero-grid">
          <div className="location-hub-copy">
            <Link href="/guies" className="back-link location-back"><ArrowLeft size={15} /> Totes les guies</Link>
            <p className="eyebrow light"><MapPinned size={15} /> {area.typeLabel} · {regionLabels[area.regionId]}</p>
            <h1>Bolets<br /><i>{area.prepositionalName}.</i></h1>
            <p className="location-hub-summary">{summary}</p>
            <p>{area.description} {area.landscape}</p>
          </div>
          <HubMapPortrait
            src={areaMapPath(area)}
            spec={areaMapSpec(bounds)}
            name={area.name}
            regionLabel={`${area.typeLabel} · ${regionLabels[area.regionId]}`}
            atlasLabel="Guies del territori"
            count={places.length}
            countLabel={places.length === 1 ? "indret documentat" : "indrets documentats"}
            liveMapHref={liveMapHref}
            marker={false}
          />
        </div>
      </header>

      <div className="page-width location-hub-body">
        <HubFacts species={species} />

        <div className="location-hub-panels">
          <section id="boscos" className="guide-panel" aria-labelledby="boscos-title">
            <header className="guide-panel-head">
              <div>
                <p className="eyebrow"><Trees size={15} aria-hidden="true" /> Boscos</p>
                <h2 id="boscos-title">Els boscos {area.prepositionalName}</h2>
              </div>
            </header>
            <div className="guide-panel-body">
              <p className="guide-panel-text">{area.forests}</p>
              {pyrenean ? <p className="guide-panel-note"><MapPinned size={15} aria-hidden="true" /><span>Aquesta comarca forma part de la <Link href="/zones/pirineu">guia dels bolets al Pirineu</Link>.</span></p> : null}
            </div>
          </section>
          <section id="temporada" className="guide-panel" aria-labelledby="temporada-title">
            <header className="guide-panel-head">
              <div>
                <p className="eyebrow"><CalendarRange size={15} aria-hidden="true" /> Temporada</p>
                <h2 id="temporada-title">Quan comença la temporada {area.prepositionalName}</h2>
              </div>
            </header>
            <div className="guide-panel-body">
              <p className="guide-panel-text">{area.seasonNotes}</p>
              {area.regulationNote ? <p className="guide-panel-note"><ShieldCheck size={15} aria-hidden="true" /><span>{area.regulationNote} <Link href="/normativa-bolets">Guia de normativa</Link>.</span></p> : null}
            </div>
          </section>
        </div>

        <Suspense fallback={<HubTodayPanel {...todayCopy(area, species)} liveMapHref={liveMapHref} readings={[]} state="loading" />}>
          <AreaConditionsBoard area={area} species={species} liveMapHref={liveMapHref} />
        </Suspense>

        <HubSeasonMatrix title={`Quan és temporada ${area.prepositionalName}`} rows={species.map((entry) => ({ species: entry, href: speciesGuideHref(entry) }))} month={month} />

        <section className="location-guide-gallery" aria-labelledby="places-title">
          <header><div><p className="eyebrow">Guies per indret</p><h2 id="places-title">Indrets {area.prepositionalName}</h2></div><p>Cada indret té les seves guies: només les espècies que encaixen amb els seus boscos.</p></header>
          <div className="location-guide-grid location-area-grid">
            {cards.map(({ place, pages, species }, index) => {
              const image = species?.media.find((asset) => asset.identificationReference) ?? species?.media[0];
              return (
                <Link href={placePath(place)} className="location-guide-card" key={place.slug}>
                  <div className={`location-guide-card-media${image ? " has-image" : ""}`}>{image && <MediaImage asset={image} alt={image.alt} fill preload={index === 0} sizes="(max-width: 760px) calc(100vw - 48px), 50vw" />}<span>{place.typeLabel} · {pages.length} {pages.length === 1 ? "guia" : "guies"}</span></div>
                  <div className="location-guide-card-copy"><div className="location-guide-card-title"><h3>{place.name}</h3><ArrowUpRight size={20} /></div><p>{place.description} {place.landscape}</p><div className="location-guide-card-facts"><span><MapPinned size={15} /> {area.name}</span><span><BookOpen size={15} /> {pages.map((page) => displaySearchName(page.searchName)).join(", ")}</span></div></div>
                </Link>
              );
            })}
          </div>
        </section>

        <section id="preguntes" className="guide-panel location-hub-faq" aria-labelledby="preguntes-title">
          <header className="guide-panel-head">
            <div>
              <p className="eyebrow"><CircleHelp size={15} aria-hidden="true" /> Preguntes freqüents</p>
              <h2 id="preguntes-title">Preguntes sobre els bolets {area.prepositionalName}</h2>
              <p className="guide-panel-lede">Respostes breus amb les dades d’aquesta guia; els detalls són a cada secció i a cada indret.</p>
            </div>
          </header>
          <div className="guide-panel-body location-hub-faq-list">
            <FaqEntries faqs={faqs} />
          </div>
        </section>

        {territoryGuides.length > 0 ? (
          <section
            className="guides-species-module"
            aria-labelledby="area-species-guides-title"
            data-species-guide-list
          >
            <p className="guides-species-module-label" id="area-species-guides-title">
              <BookOpenText size={18} aria-hidden="true" /> Guies d’espècie i territori
            </p>
            <div className="guides-species-module-list">
              {territoryGuides.map((guide) => (
                <Link href={guide.path} className="guides-species-row" key={guide.path}>
                  <div><h2>{guide.profileLinkTitle}</h2><p>{guide.description}</p></div>
                  <strong>Obrir la guia <ArrowUpRight size={17} aria-hidden="true" /></strong>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <DataSourceCredits
          label="Font territorial"
          sources={[
            { label: area.source.title, url: area.source.url },
            { label: "Base topogràfica: Institut Cartogràfic i Geològic de Catalunya", url: "https://www.icgc.cat/" },
          ]}
        />
      </div>
    </div>
  );
}
