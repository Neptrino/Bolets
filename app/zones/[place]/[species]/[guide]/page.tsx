import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, MapPinned, Mountain, ShieldAlert, Sprout, Trees } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { LazyHabitatMap } from "@/components/lazy-habitat-map";
import { SeasonCalendar } from "@/components/season-calendar";
import { getSpecies } from "@/data/species";
import { areasBySlug, displaySearchName, getLocationPage, getPlace, locationPagePath, placePath, speciesLocationPages } from "@/data/location-pages";
import { absoluteUrl, SITE_URL, speciesDescription, speciesImage, speciesPath } from "@/src/lib/seo";
import { SEASON_MONTHS } from "@/src/lib/seasonality";

type Props = { params: Promise<{ place: string; species: string; guide: string }> };

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
  const description = `${page.titlePhrase}: hàbitat compatible, temporada i condicions ecològiques de ${species.identity.commonName} (${species.identity.scientificName}).`;
  const image = speciesImage(species);
  return {
    title: `${page.titlePhrase}: hàbitat i temporada`, description, alternates: { canonical: path },
    keywords: [page.titlePhrase, `${page.searchName} ${location.name}`, `temporada ${page.searchName} ${location.name}`, species.identity.scientificName],
    openGraph: { type: "article", url: path, title: page.titlePhrase, description, images: image ? [{ url: image, alt: species.media[0]?.alt ?? page.titlePhrase }] : undefined },
    twitter: { card: "summary_large_image", title: page.titlePhrase, description, images: image ? [image] : undefined },
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

  return (
    <article className="local-species-page">
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [{ "@type": "Article", "@id": `${url}#article`, headline: page.titlePhrase, description: page.introduction, url, inLanguage: "ca", image, isPartOf: { "@id": `${SITE_URL}/#website` }, publisher: { "@id": `${SITE_URL}/#organization` }, about: [{ "@type": "Taxon", name: species.identity.scientificName, alternateName: [species.identity.commonName, ...species.identity.alternateNames], taxonRank: "species" }, { "@type": "Place", name: location.name, containedInPlace: { "@type": "Place", name: area.name } }] }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Inici", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Guies", item: absoluteUrl("/guies") }, { "@type": "ListItem", position: 3, name: area.name, item: absoluteUrl(`/zones/${area.slug}`) }, { "@type": "ListItem", position: 4, name: location.name, item: absoluteUrl(placePath(location)) }, { "@type": "ListItem", position: 5, name: displaySearchName(page.searchName), item: url }] }] }} />
      <header className="local-species-hero">
        <div className="page-width local-species-hero-grid">
          <div>
            <Link href={placePath(location)} className="back-link local-species-back"><ArrowLeft size={15} /> Bolets {location.prepositionalName}</Link>
            <p className="eyebrow light"><MapPinned size={15} /> {area.name} · guia ecològica local</p>
            <h1>{page.titlePhrase}</h1><em>{species.identity.scientificName}</em><p>{page.introduction}</p>
          </div>
          {referenceImage && <div className="local-species-image"><Image src={referenceImage.localPath ?? referenceImage.imageUrl ?? referenceImage.sourceUrl} alt={referenceImage.alt} fill preload sizes="(max-width: 760px) calc(100vw - 48px), 42vw" /></div>}
        </div>
      </header>
      <div className="page-width local-species-content">
        <section className="local-species-summary" aria-label="Resum ecològic">
          <div><Trees size={19} /><span>Bosc compatible</span><strong>{habitat.forestTypes.slice(0, 2).join(" i ")}</strong></div>
          <div><Mountain size={19} /><span>Rang ecològic</span><strong>{habitat.altitude[0]}–{habitat.altitude[1]} m</strong></div>
          <div><CalendarDays size={19} /><span>Pic general</span><strong>{peakMonths.join(" i ") || "Variable"}</strong></div>
        </section>
        <div className="local-species-columns">
          <div className="local-species-main">
            <section><p className="eyebrow">Lectura del paisatge</p><h2>Per què hi pot encaixar</h2><p>{location.landscape}</p><p>{page.habitatNote}</p></section>
            <section><p className="eyebrow">Hàbitat compatible</p><h2>Quins factors compten</h2><div className="local-factor-grid">
              <article><Trees size={20} /><h3>Bosc i arbres</h3><p>{habitat.forestTypes.join(", ")}. Associacions principals: {habitat.treeAssociations.join(", ")}.</p></article>
              <article><Sprout size={20} /><h3>Sòl</h3><p>{habitat.soilPreference}. {soil.texture}, amb pH {soil.phRange ? `${soil.phRange[0]}–${soil.phRange[1]}` : "variable"} i drenatge {soil.drainage.toLocaleLowerCase("ca")}.</p></article>
              <article><Mountain size={20} /><h3>Relleu</h3><p>{habitat.altitude[0]}–{habitat.altitude[1]} m, {habitat.aspect.toLocaleLowerCase("ca")}; {habitat.landscapePosition.toLocaleLowerCase("ca")}.</p></article>
            </div></section>
            <section>
              <p className="eyebrow">Mapa de l’espècie</p>
              <h2>On podria créixer {location.prepositionalName}</h2>
              <p>El mapa de compatibilitat ecològica de {species.identity.commonName} mostra on coincideixen la coberta del sòl, l’altitud i el pH adequats per a l’espècie. No és una predicció de fructificació ni confirma que hi hagi bolets.</p>
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
            <section><p className="eyebrow">Calendari ecològic</p><h2>Quan és temporada</h2><p>{page.seasonNote}</p><SeasonCalendar species={species} /></section>
            <p className="location-territorial-source">Font territorial: <Link href={location.source.url} target="_blank" rel="noreferrer">{location.source.title} <ArrowUpRight size={13} /></Link></p>
          </div>
          <aside className="local-species-aside">
            <div className="local-safety-card"><ShieldAlert size={20} /><div><strong>No és una guia de recol·lecció</strong><p>No publiquem coordenades ni presències exactes. No consumiu cap bolet sense una identificació experta.</p></div></div>
            <Link href={speciesPath(species)} className="local-profile-link"><span>Fitxa completa</span><strong>{species.identity.commonName}</strong><small>{speciesDescription(species)}</small><ArrowUpRight size={18} /></Link>
          </aside>
        </div>
      </div>
    </article>
  );
}
