import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BookOpen, Layers3, MapPinned, Mountain, ShieldCheck, Trees } from "lucide-react";
import { DataSourceCredits } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { MediaImage } from "@/components/media-image";
import { TerritoryPortrait } from "@/components/territory-portrait";
import { getSpecies } from "@/data/species";
import { areasBySlug, getPlace, locationPagePath, locationPagesForPlace, placePath, placeProfiles } from "@/data/location-pages";
import { SEASON_MONTHS } from "@/src/lib/seasonality";
import { regionLabels } from "@/data/regions";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";

type Props = { params: Promise<{ place: string; species: string }> };

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
  const guides = pages.map((page) => ({ page, species: getSpecies(page.speciesId)! }));

  return (
    <div className="location-hub">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: `Bolets ${location.prepositionalName}`, url: absoluteUrl(placePath(location)), inLanguage: "ca", about: { "@type": "Place", name: location.name, containedInPlace: { "@type": "Place", name: area.name } }, mainEntity: { "@type": "ItemList", itemListElement: pages.map((page, index) => ({ "@type": "ListItem", position: index + 1, name: page.titlePhrase, url: absoluteUrl(locationPagePath(page)) })) } }} />
      <header className="location-hub-hero"><div className="page-width location-hub-hero-grid">
        <div className="location-hub-copy"><Link href={`/zones/${area.slug}`} className="back-link location-back"><ArrowLeft size={15} /> Bolets {area.prepositionalName}</Link><p className="eyebrow light"><MapPinned size={15} /> {location.typeLabel} · {area.name}</p><h1>Bolets<br /><i>{location.prepositionalName}.</i></h1><p>{location.description} {location.landscape}</p></div>
        <TerritoryPortrait
          atlasLabel="Guies de l’indret"
          name={location.name}
          regionLabel={`${location.typeLabel} · ${regionLabels[area.regionId]}`}
          count={guides.length}
          countLabel={guides.length === 1 ? "guia ecològica publicada" : "guies ecològiques publicades"}
        />
      </div></header>
      <div className="page-width location-hub-body">
        <section className="location-hub-facts" aria-label="Resum de la col·lecció"><div><Layers3 size={19} /><span>Àmbit</span><strong>{area.name}</strong></div><div><BookOpen size={19} /><span>Contingut</span><strong>Hàbitat i temporada</strong></div><div><ShieldCheck size={19} /><span>Precisió pública</span><strong>Sense punts de recol·lecció</strong></div></section>
        <nav className="guide-reading-actions" aria-label="Prepara la sortida">
          <a href="#local-species-comparison">Compara boscos i temporada <ArrowUpRight size={16} aria-hidden="true" /></a>
          <Link href="/bolets-avui">Consulta les condicions d’avui a Catalunya <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </nav>
        <section className="place-species-comparison" id="local-species-comparison" aria-labelledby="local-species-comparison-title">
          <h2 id="local-species-comparison-title">Quins bolets encaixen en cada bosc?</h2>
          <p>Compara les espècies amb guia publicada {location.prepositionalName}. Obre cada lectura per veure l’hàbitat de l’entorn i les condicions disponibles; el calendari no confirma fructificació avui.</p>
          <div className="guide-types-table-scroll" role="region" aria-label="Espècies, boscos i temporada" tabIndex={0}>
            <table className="guide-types-table">
              <caption className="sr-only">Hàbitat i temporada de les espècies amb guia local</caption>
              <thead><tr><th scope="col">Espècie i lectura local</th><th scope="col">Hàbitat de referència</th><th scope="col">Pic habitual</th></tr></thead>
              <tbody>{guides.map(({ page, species }) => <tr key={page.speciesSlug}>
                <th scope="row"><Link href={locationPagePath(page)}>{species.identity.commonName} {location.prepositionalName}</Link></th>
                <td>{species.ecologicalConfig.habitat.forestTypes.join(", ")}</td>
                <td>{SEASON_MONTHS.filter(({ key }) => species.ecologicalConfig.seasonality[key] === "peak").map(({ label }) => label).join(" i ") || "Sense pic definit"}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
        <section className="location-guide-gallery" aria-labelledby="guides-title"><header><div><p className="eyebrow">Guies publicades</p><h2 id="guides-title">Espècies i territori</h2></div><p>Quin bosc necessita cada bolet, quan és temporada i què el pot frenar.</p></header><div className="location-guide-grid">
          {guides.map(({ page, species }, index) => { const image = species.media.find((asset) => asset.identificationReference) ?? species.media[0]; const habitat = species.ecologicalConfig.habitat; return <Link href={locationPagePath(page)} className="location-guide-card" key={page.speciesSlug}><div className={`location-guide-card-media${image ? " has-image" : ""}`}>{image && <MediaImage asset={image} alt={image.alt} fill preload={index === 0} sizes="(max-width: 760px) calc(100vw - 48px), 50vw" />}<span>{species.identity.scientificName}</span></div><div className="location-guide-card-copy"><div className="location-guide-card-title"><h3>{page.titlePhrase}</h3><ArrowUpRight size={20} /></div><p>{page.habitatNote}</p><div className="location-guide-card-facts"><span><Trees size={15} /> {habitat.forestTypes[0]}</span><span><Mountain size={15} /> {habitat.altitude[0]}–{habitat.altitude[1]} m</span></div></div></Link>; })}
        </div></section>
        <aside className="location-hub-principle"><div><MapPinned size={24} /><p className="eyebrow light">Com llegir aquestes guies</p><h2>El lloc i el moment<br />han de coincidir.</h2></div><p>La guia explica on encaixa l’espècie i el mapa compara les condicions actuals. Cap dels dos confirma presència ni revela una localització exacta.</p><Link href="/metode" className="text-link">Entendre el mètode <ArrowUpRight size={17} /></Link></aside>
        <DataSourceCredits
          label="Font territorial"
          sources={[{ label: location.source.title, url: location.source.url }]}
        />
      </div>
    </div>
  );
}
