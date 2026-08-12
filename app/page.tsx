import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight, Map, Sparkles } from "lucide-react";
import { SpeciesCard } from "@/components/species-card";
import { getFeaturedSeasonalSpecies, speciesProfiles } from "@/data/species";
import homeHero from "@/public/media/generated/home-hero-boletus-v2.webp";
import { DEFAULT_DESCRIPTION } from "@/src/lib/seo";

export const revalidate = 86400;
export const metadata: Metadata = {
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const featuredSpecies = getFeaturedSeasonalSpecies();
  return (
    <>
      <section className="hero">
        <div className="hero-media" aria-hidden="true">
          <Image
            src={homeHero}
            alt=""
            fill
            preload
            sizes="100vw"
            quality={85}
          />
        </div>
        <div className="hero-copy"><p className="eyebrow light"><Sparkles size={14} /> Bolets · hàbitats · temporada</p><h1>On viuen els bolets<br /><i>abans de trobar-los.</i></h1><p className="hero-lede">Explora la relació entre cada espècie, el sòl, la pluja, els arbres i les estacions.</p><div className="hero-actions"><Link href="/species" className="button light-button">Explora les espècies <ArrowUpRight size={17} /></Link><Link href="/map" className="text-link">Veure el mapa de condicions <Map size={16} /></Link></div></div>
        <div className="hero-scroll"><ArrowDown size={16} /> baixa per llegir el territori</div>
      </section>
      <section className="home-intro page-width"><div><p className="eyebrow">El sistema</p><h2>Una mateixa ecologia,<br />dues maneres de llegir-la.</h2></div><p>Les fitxes expliquen el món que necessita cada espècie. El perfil de predicció fa servir aquesta mateixa configuració per comparar-la amb les condicions territorials.</p></section>
      <section className="home-cards page-width"><div className="section-topline"><div><p className="eyebrow">Comença aquí</p><h2>Espècies de temporada</h2></div><Link href="/species" className="text-link">Veure les {speciesProfiles.length} fitxes <ArrowUpRight size={16} /></Link></div><div className="species-grid featured-grid">{featuredSpecies.map((species, index) => <SpeciesCard key={species.speciesId} species={species} index={index} />)}</div></section>
      <section className="home-map-callout"><div className="page-width"><div className="home-map-callout-copy"><p className="eyebrow light">Lectura del territori</p><h2>Una predicció,<br />no una promesa.</h2><p>És una lectura de la compatibilitat entre cada espècie i les condicions ambientals actuals. No indica on hi ha bolets ni garanteix trobar-ne.</p></div><div className="home-map-callout-action"><Link href="/map" className="button light-button">Veure el mapa <ArrowUpRight size={17} /></Link></div><div className="home-map-callout-art" aria-hidden="true"><Image src="/media/generated/home-map-callout-forest-floor.webp" alt="" fill sizes="(max-width: 900px) 0px, 59vw" quality={78} /></div></div></section>
    </>
  );
}
