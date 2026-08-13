import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BookOpen, Layers3, MapPinned, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { getSpecies } from "@/data/species";
import {
  areaPath,
  areaProfiles,
  areasBySlug,
  displaySearchName,
  locationPagesForPlace,
  placePath,
  placesForArea,
} from "@/data/location-pages";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";

type Props = { params: Promise<{ place: string }> };

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
  const heroSpecies = cards.find((card) => card.species)?.species;
  const heroImage = heroSpecies?.media.find((asset) => asset.identificationReference) ?? heroSpecies?.media[0];
  const guideCount = cards.reduce((total, card) => total + card.pages.length, 0);

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
          <div className={`location-hub-portrait${heroImage ? " has-image" : ""}`}>
            {heroImage && <Image src={heroImage.localPath ?? heroImage.imageUrl ?? heroImage.sourceUrl} alt="" fill preload sizes="(max-width: 900px) calc(100vw - 48px), 42vw" />}
            <div className="location-hub-portrait-shade" />
            <div className="location-hub-portrait-label"><span>ATLES TERRITORIAL · {area.name.toLocaleUpperCase("ca")}</span><strong>{places.length.toString().padStart(2, "0")}</strong><small>{places.length === 1 ? "indret documentat" : "indrets documentats"}</small></div>
          </div>
        </div>
      </header>

      <div className="page-width location-hub-body">
        <section className="location-hub-facts" aria-label="Resum de la col·lecció">
          <div><Layers3 size={19} /><span>Àmbit ambiental</span><strong>{area.regionId === "montseny" ? "Massís del Montseny" : area.regionId === "prepirineus" ? "Prepirineus" : "Pirineus"}</strong></div>
          <div><BookOpen size={19} /><span>Col·lecció</span><strong>{guideCount} {guideCount === 1 ? "guia ecològica" : "guies ecològiques"}</strong></div>
          <div><ShieldCheck size={19} /><span>Precisió pública</span><strong>Sense punts de recol·lecció</strong></div>
        </section>

        <section className="location-guide-gallery" aria-labelledby="places-title">
          <header><div><p className="eyebrow">Indrets documentats</p><h2 id="places-title">Boscos, valls i municipis</h2></div><p>Cada indret agrupa només les espècies amb una relació ecològica defensable i contingut territorial propi.</p></header>
          <div className="location-guide-grid location-area-grid">
            {cards.map(({ place, pages, species }) => {
              const image = species?.media.find((asset) => asset.identificationReference) ?? species?.media[0];
              return (
                <Link href={placePath(place)} className="location-guide-card" key={place.slug}>
                  <div className={`location-guide-card-media${image ? " has-image" : ""}`}>{image && <Image src={image.localPath ?? image.imageUrl ?? image.sourceUrl} alt="" fill sizes="(max-width: 760px) calc(100vw - 48px), 50vw" />}<span>{place.typeLabel} · {pages.length} {pages.length === 1 ? "guia" : "guies"}</span></div>
                  <div className="location-guide-card-copy"><div className="location-guide-card-title"><h3>{place.name}</h3><ArrowUpRight size={20} /></div><p>{place.description} {place.landscape}</p><div className="location-guide-card-facts"><span><MapPinned size={15} /> {area.name}</span><span><BookOpen size={15} /> {pages.map((page) => displaySearchName(page.searchName)).join(", ")}</span></div></div>
                </Link>
              );
            })}
          </div>
        </section>

        <aside className="location-hub-principle">
          <div><MapPinned size={24} /><p className="eyebrow light">Com llegir aquestes guies</p><h2>El territori filtra.<br />El temps decideix.</h2></div>
          <p>Primer comprovem si la coberta forestal, el sòl i l’altitud poden encaixar amb l’espècie. Després, el mapa interpreta les condicions ambientals disponibles. Cap dels dos passos confirma presència ni revela una localització exacta.</p>
          <Link href="/metode" className="text-link">Entendre el mètode <ArrowUpRight size={17} /></Link>
        </aside>

        <p className="location-territorial-source">Font territorial: <Link href={area.source.url} target="_blank" rel="noreferrer">{area.source.title} <ArrowUpRight size={13} /></Link></p>
      </div>
    </div>
  );
}
