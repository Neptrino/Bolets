import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BookOpen, Layers3, MapPinned, Mountain, ShieldCheck, Trees } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { getSpecies } from "@/data/species";
import { areasBySlug, getPlace, locationPagePath, locationPagesForPlace, placePath, placeProfiles } from "@/data/location-pages";
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
  const heroSpecies = guides[0]?.species;
  const heroImage = heroSpecies?.media.find((asset) => asset.identificationReference) ?? heroSpecies?.media[0];

  return (
    <div className="location-hub">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: `Bolets ${location.prepositionalName}`, url: absoluteUrl(placePath(location)), inLanguage: "ca", about: { "@type": "Place", name: location.name, containedInPlace: { "@type": "Place", name: area.name } }, mainEntity: { "@type": "ItemList", itemListElement: pages.map((page, index) => ({ "@type": "ListItem", position: index + 1, name: page.titlePhrase, url: absoluteUrl(locationPagePath(page)) })) } }} />
      <header className="location-hub-hero"><div className="page-width location-hub-hero-grid">
        <div className="location-hub-copy"><Link href={`/zones/${area.slug}`} className="back-link location-back"><ArrowLeft size={15} /> Bolets {area.prepositionalName}</Link><p className="eyebrow light"><MapPinned size={15} /> {location.typeLabel} · {area.name}</p><h1>Bolets<br /><i>{location.prepositionalName}.</i></h1><p>{location.description} {location.landscape}</p></div>
        <div className={`location-hub-portrait${heroImage ? " has-image" : ""}`}>{heroImage && <Image src={heroImage.localPath ?? heroImage.imageUrl ?? heroImage.sourceUrl} alt="" fill preload sizes="(max-width: 900px) calc(100vw - 48px), 42vw" />}<div className="location-hub-portrait-shade" /><div className="location-hub-portrait-label"><span>ATLES LOCAL · {location.name.toLocaleUpperCase("ca")}</span><strong>{guides.length.toString().padStart(2, "0")}</strong><small>{guides.length === 1 ? "guia ecològica publicada" : "guies ecològiques publicades"}</small></div></div>
      </div></header>
      <div className="page-width location-hub-body">
        <section className="location-hub-facts" aria-label="Resum de la col·lecció"><div><Layers3 size={19} /><span>Àmbit</span><strong>{area.name}</strong></div><div><BookOpen size={19} /><span>Contingut</span><strong>Hàbitat i temporada</strong></div><div><ShieldCheck size={19} /><span>Precisió pública</span><strong>Sense punts de recol·lecció</strong></div></section>
        <section className="location-guide-gallery" aria-labelledby="guides-title"><header><div><p className="eyebrow">Guies publicades</p><h2 id="guides-title">Espècies i territori</h2></div><p>Una lectura local de l’ecologia de cada bolet: quin bosc necessita, quan pot fructificar i quins límits té la predicció.</p></header><div className="location-guide-grid">
          {guides.map(({ page, species }) => { const image = species.media.find((asset) => asset.identificationReference) ?? species.media[0]; const habitat = species.ecologicalConfig.habitat; return <Link href={locationPagePath(page)} className="location-guide-card" key={page.speciesSlug}><div className={`location-guide-card-media${image ? " has-image" : ""}`}>{image && <Image src={image.localPath ?? image.imageUrl ?? image.sourceUrl} alt={image.alt} fill sizes="(max-width: 760px) calc(100vw - 48px), 50vw" />}<span>{species.identity.scientificName}</span></div><div className="location-guide-card-copy"><div className="location-guide-card-title"><h3>{page.titlePhrase}</h3><ArrowUpRight size={20} /></div><p>{page.introduction}</p><div className="location-guide-card-facts"><span><Trees size={15} /> {habitat.forestTypes[0]}</span><span><Mountain size={15} /> {habitat.altitude[0]}–{habitat.altitude[1]} m</span></div></div></Link>; })}
        </div></section>
        <aside className="location-hub-principle"><div><MapPinned size={24} /><p className="eyebrow light">Com llegir aquestes guies</p><h2>El territori filtra.<br />El temps decideix.</h2></div><p>Primer comprovem si la coberta forestal, el sòl i l’altitud poden encaixar amb l’espècie. Després, el mapa interpreta les condicions ambientals disponibles. Cap dels dos passos confirma presència ni revela una localització exacta.</p><Link href="/metode" className="text-link">Entendre el mètode <ArrowUpRight size={17} /></Link></aside>
        <p className="location-territorial-source">Font territorial: <Link href={location.source.url} target="_blank" rel="noreferrer">{location.source.title} <ArrowUpRight size={13} /></Link></p>
      </div>
    </div>
  );
}
