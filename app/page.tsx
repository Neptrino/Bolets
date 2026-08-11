import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Map, Sparkles } from "lucide-react";
import { SpeciesCard } from "@/components/species-card";
import { speciesProfiles } from "@/data/species";
import homeHero from "@/public/media/generated/home-hero-boletus-v2.jpg";

export default function HomePage() {
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
        <div className="hero-rings" aria-hidden="true" />
        <div className="hero-copy"><p className="eyebrow light"><Sparkles size={14} /> Atles ecològic de Catalunya</p><h1>El bosc <i>parla</i><br />abans que<br />neixi el bolet.</h1><p className="hero-lede">Una lectura lenta de sòls, pluja, arbres i estacions. Explora quan i on cada espècie troba el seu moment.</p><div className="hero-actions"><Link href="/species" className="button light-button">Explora les espècies <ArrowUpRight size={17} /></Link><Link href="/map" className="text-link">Veure condicions d’avui <Map size={16} /></Link></div></div>
        <div className="hero-scroll"><ArrowDown size={16} /> baixa per llegir el territori</div>
      </section>
      <section className="home-intro page-width"><div><p className="eyebrow">El sistema</p><h2>Una mateixa ecologia,<br />dues maneres de llegir-la.</h2></div><p>Les fitxes expliquen el món que necessita cada espècie. El perfil de predicció fa servir aquesta mateixa configuració per comparar-la amb les condicions territorials.</p></section>
      <section className="home-cards page-width"><div className="section-topline"><div><p className="eyebrow">Comença aquí</p><h2>Espècies de temporada</h2></div><Link href="/species" className="text-link">Veure les {speciesProfiles.length} fitxes <ArrowUpRight size={16} /></Link></div><div className="species-grid featured-grid">{speciesProfiles.slice(0, 3).map((species, index) => <SpeciesCard key={species.speciesId} species={species} index={index} />)}</div></section>
      <section className="home-map-callout"><div className="page-width"><div><p className="eyebrow light">Lectura territorial</p><h2>La predicció no és<br />una promesa.</h2><p>És un indicador transparent de compatibilitat ambiental, basat en pesos i rangs visibles. Les observacions exactes no formen part del mapa públic.</p><Link href="/map" className="button light-button">Obre el mapa <ArrowUpRight size={17} /></Link></div><div className="callout-stats"><article><span>{speciesProfiles.length}</span><p>espècies<br />inicials</p></article><article><span>10</span><p>regions<br />ecològiques</p></article><article><span>1</span><p>font única<br />d’ecologia</p></article></div></div></section>
    </>
  );
}
