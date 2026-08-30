import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BookOpen, BookOpenText, Gauge, Layers3, Map as MapIcon, MapPinned, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { MediaImage } from "@/components/media-image";
import { TerritoryPortrait } from "@/components/territory-portrait";
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
import { getAreaPredictionSummaries } from "@/src/lib/predictions";
import { opportunityLabel } from "@/src/lib/scoring";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { territoryGuideForSpecies } from "@/src/lib/species-territory-guides";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";
import { territorialMapPath } from "@/src/lib/territorial-map";
import type { AreaPredictionSummary } from "@/src/lib/types";

export const revalidate = 300;

type Props = { params: Promise<{ place: string }> };

/** Live hub readings for every species with a local guide in the area. */
async function loadAreaConditions(areaSlug: string) {
  const area = areasBySlug[areaSlug];
  const month = monthInTimeZone();
  const speciesIds = [...new Set(locationPagesForArea(areaSlug).map((page) => page.speciesId))]
    .filter((speciesId) => {
      const species = getSpecies(speciesId);
      return species?.predictionMode === "current" &&
        species.ecologicalConfig.regions.includes(area.regionId) &&
        species.ecologicalConfig.seasonality[month] !== "inactive";
    });
  const bounds = areaBounds(area);
  try {
    const summaries = await getAreaPredictionSummaries(speciesIds, {
      slug: area.slug,
      regionId: area.regionId,
      bounds,
    });
    return speciesIds.flatMap((speciesId) => {
      const summary = summaries[speciesId];
      return summary && summary.result.score !== null &&
          summary.result.missingComponents.length === 0 && !summary.snapshot.stale
        ? [{ speciesId, summary }]
        : [];
    }).sort((left, right) =>
      (right.summary.bestCell.score - left.summary.bestCell.score) ||
      (right.summary.score20CellShare - left.summary.score20CellShare) ||
      (right.summary.positiveCellShare - left.summary.positiveCellShare)
    );
  } catch {
    return [] as Array<{ speciesId: string; summary: AreaPredictionSummary }>;
  }
}

function areaExtent(summary: AreaPredictionSummary) {
  if (summary.score20CellCount > 0) {
    return `Condicions favorables en el ${Math.round(summary.score20CellShare * 100)}% de la zona`;
  }
  if (summary.positiveCellCount > 0) {
    return `Alguna resposta favorable en el ${Math.round(summary.positiveCellShare * 100)}% de la zona`;
  }
  return "Cap sector favorable ara mateix";
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
    title: `Bolets ${area.prepositionalName}: indrets i temporada`,
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
  const guideCount = cards.reduce((total, card) => total + card.pages.length, 0);
  const conditions = await loadAreaConditions(areaSlug);
  const territoryGuides = [...new Map(
    locationPagesForArea(areaSlug)
      .flatMap((page) => {
        const guide = territoryGuideForSpecies(page.speciesId);
        return guide ? [[guide.path, guide] as const] : [];
      }),
  ).values()];

  return (
    <div className="location-hub">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: `Bolets ${area.prepositionalName}`, url: absoluteUrl(areaPath(area)), inLanguage: "ca", about: { "@type": "Place", name: area.name }, mainEntity: { "@type": "ItemList", itemListElement: places.map((place, index) => ({ "@type": "ListItem", position: index + 1, name: place.name, url: absoluteUrl(placePath(place)) })) } }} />
      <header className="location-hub-hero">
        <div className="page-width location-hub-hero-grid">
          <div className="location-hub-copy">
            <Link href="/guies" className="back-link location-back"><ArrowLeft size={15} /> Totes les guies</Link>
            <p className="eyebrow light"><MapPinned size={15} /> {area.typeLabel} · lectura territorial</p>
            <h1>Bolets<br /><i>{area.prepositionalName}.</i></h1>
            <p>{area.description} {area.landscape}</p>
          </div>
          <TerritoryPortrait
            atlasLabel="Guies del territori"
            name={area.name}
            regionLabel={regionLabels[area.regionId]}
            count={places.length}
            countLabel={places.length === 1 ? "indret documentat" : "indrets documentats"}
          />
        </div>
      </header>

      <div className="page-width location-hub-body">
        <section className="location-hub-facts" aria-label="Resum de la col·lecció">
          <div><Layers3 size={19} /><span>Zona del mapa</span><strong>{regionLabels[area.regionId]}</strong></div>
          <div><BookOpen size={19} /><span>Guies</span><strong>{guideCount} {guideCount === 1 ? "espècie" : "espècies"}</strong></div>
          <div><ShieldCheck size={19} /><span>Privadesa</span><strong>Sense punts de recol·lecció</strong></div>
        </section>

        {conditions.length > 0 ? (
          <section className="current-board" aria-labelledby="area-conditions-title">
            <header className="current-board-heading">
              <div>
                <p className="eyebrow"><Gauge size={15} /> Condicions ara</p>
                <h2 id="area-conditions-title">Lectura actual {area.prepositionalName}</h2>
              </div>
            </header>
            <ol className="current-overview-grid" aria-label={`Lectures actuals per espècie ${area.prepositionalName}`}>
              {conditions.map(({ speciesId, summary }, index) => {
                const species = getSpecies(speciesId)!;
                const score = summary.bestCell.score;
                return (
                  <li className="current-overview-card is-available" key={speciesId}>
                    <span className="current-row-rank">{String(index + 1).padStart(2, "0")}</span>
                    <div className="current-overview-card-heading">
                      <h3>{species.identity.commonName}</h3>
                      <p className="current-row-species"><span>Condicions {area.typeLabel === "massís" ? "del massís" : "de la comarca"}</span></p>
                    </div>
                    {score !== null && score !== undefined ? (
                      <div className="current-score" aria-label={`Millor sector ${score} sobre 100, ${opportunityLabel(score)}`}>
                        <div><strong>{score}</strong><span>/100 · {opportunityLabel(score)}</span></div>
                        <span className="current-score-track" aria-hidden="true"><span style={{ width: `${score}%` }} /></span>
                      </div>
                    ) : null}
                    <dl className="current-row-signals">
                      <div><dt>Abast dins la zona</dt><dd>{areaExtent(summary)}</dd></div>
                    </dl>
                    <Link href={territorialMapPath(speciesId, area.regionId, areaBounds(area))} className="current-row-map" aria-label={`Veure al mapa: ${species.identity.commonName} ${area.prepositionalName}`}>
                      <MapIcon size={15} /><span>Veure mapa</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
            <p className="prediction-zone-note">Espècies ordenades per la millor lectura de la zona. La puntuació compara condicions; no confirma presència ni garanteix trobar bolets.</p>
          </section>
        ) : null}

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

        <section className="location-guide-gallery" aria-labelledby="places-title">
          <header><div><p className="eyebrow">Indrets documentats</p><h2 id="places-title">Boscos, valls i municipis</h2></div><p>Cada indret agrupa només les espècies amb una relació ecològica defensable i contingut territorial propi.</p></header>
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

        <aside className="location-hub-principle">
          <div><MapPinned size={24} /><p className="eyebrow light">Com llegir aquestes guies</p><h2>El territori filtra.<br />El temps decideix.</h2></div>
          <p>La guia explica on encaixa l’espècie i el mapa compara les condicions actuals. Cap dels dos confirma presència ni revela una localització exacta.</p>
          <Link href="/metode" className="text-link">Entendre el mètode <ArrowUpRight size={17} /></Link>
        </aside>

        <p className="location-territorial-source">Font territorial: <Link href={area.source.url} target="_blank" rel="noreferrer">{area.source.title} <ArrowUpRight size={13} /></Link></p>
      </div>
    </div>
  );
}
