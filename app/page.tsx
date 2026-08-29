import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight, BookOpenText, CloudRain, Gauge, Leaf, Snowflake, Sparkles, Sun, Trees } from "lucide-react";
import { SpeciesCard } from "@/components/species-card";
import { HomeFindingsFeature } from "@/components/home-findings-feature";
import { StaticMediaImage } from "@/components/static-media-image";
import { getFeaturedSeasonalSpecies } from "@/data/species";
import { catalogueSpecies } from "@/data/catalogue";
import { DEFAULT_DESCRIPTION } from "@/src/lib/seo";
import { seasonGuideForMonth, type SeasonGuideId } from "@/src/lib/season-guides";
import { monthInTimeZone } from "@/src/lib/seasonality";

const seasonGuideIcons = {
  primavera: Leaf,
  estiu: Sun,
  tardor: Trees,
  hivern: Snowflake,
} satisfies Record<SeasonGuideId, typeof Leaf>;

export const revalidate = 86400;
export const metadata: Metadata = {
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const featuredSpecies = getFeaturedSeasonalSpecies();
  const currentSeasonGuide = seasonGuideForMonth(monthInTimeZone());
  const CurrentSeasonIcon = seasonGuideIcons[currentSeasonGuide.id];
  return (
    <>
      <section className="hero">
        <div className="hero-media" aria-hidden="true">
          <StaticMediaImage
            src="/media/generated/home-hero-boletus-v2.webp"
            alt=""
            fill
            fetchPriority="high"
            loading="eager"
            sizes="100vw"
          />
        </div>
        <div className="hero-copy"><p className="eyebrow light"><Sparkles size={14} /> Bolets · hàbitats · temporada</p><h1>On viuen els bolets<br /><i>abans de trobar-los.</i></h1><p className="hero-lede">Exploreu la relació entre cada espècie, el sòl, la pluja, els arbres i les estacions.</p><div className="hero-actions"><Link href="/map" className="button light-button">Mapa de predicció <ArrowUpRight size={17} /></Link><Link href="/bolets" className="text-link">Exploreu el catàleg <Trees size={16} /></Link></div></div>
        <div className="hero-scroll"><ArrowDown size={16} /> baixa per llegir el territori</div>
      </section>
      <Link href="/bolets-avui" className="home-today-feature page-width">
        <p className="home-today-kicker"><Gauge size={17} /> Condicions actuals</p>
        <div className="home-today-copy"><h2>On hi ha les millors condicions avui?</h2><p>Compareu les combinacions actives d’espècie i zona a Catalunya, ordenades amb dades ambientals vigents i sense revelar punts sensibles.</p></div>
        <dl className="home-today-facts"><div><dt>Cobertura</dt><dd>9 zones</dd></div><div><dt>Resultat</dt><dd>Top 10</dd></div></dl>
        <span className="home-today-action">Veure la lectura d’avui <ArrowUpRight size={17} /></span>
      </Link>
      <section className="home-intro page-width"><div><p className="eyebrow">El sistema</p><h2>Una mateixa ecologia,<br />dues maneres de llegir-la.</h2></div><p>Les fitxes expliquen el món que necessita cada espècie. El perfil de predicció fa servir aquesta mateixa configuració per comparar-la amb les condicions territorials.</p></section>
      <nav className="home-search-guides page-width" aria-label="Guies destacades">
        <Link href="/guies"><BookOpenText size={19} /><span><strong>Guies locals</strong><small>Comarques, massissos i indrets documentats</small></span><ArrowUpRight size={16} /></Link>
        <Link href={currentSeasonGuide.path}><CurrentSeasonIcon size={19} /><span><strong>{currentSeasonGuide.cardTitle}</strong><small>Espècies actives {currentSeasonGuide.rangeSentence}</small></span><ArrowUpRight size={16} /></Link>
        <Link href="/quan-surten-els-bolets-despres-de-ploure"><CloudRain size={19} /><span><strong>Després de ploure</strong><small>Com interpretar la resposta de cada espècie</small></span><ArrowUpRight size={16} /></Link>
      </nav>
      <section className="home-cards page-width"><div className="section-topline"><div><p className="eyebrow">Comenceu aquí</p><h2>Espècies de temporada</h2></div><Link href="/bolets" className="text-link">Veure les {catalogueSpecies.length} fitxes <ArrowUpRight size={16} /></Link></div><div className="species-grid featured-grid">{featuredSpecies.map((species, index) => <SpeciesCard key={species.speciesId} species={species} index={index} />)}</div></section>
      <HomeFindingsFeature />
      <section className="home-map-callout"><div className="page-width"><div className="home-map-callout-copy"><p className="eyebrow light">Lectura del territori</p><h2>Una predicció,<br />no una promesa.</h2><p>És una lectura de la compatibilitat entre cada espècie i les condicions ambientals actuals. No indica on hi ha bolets ni garanteix trobar-ne.</p></div><div className="home-map-callout-action"><Link href="/map" className="button light-button">Veure el mapa <ArrowUpRight size={17} /></Link></div><div className="home-map-callout-art" aria-hidden="true"><StaticMediaImage src="/media/generated/home-map-callout-forest-floor.webp" alt="" fill sizes="(max-width: 900px) 0px, 59vw" /></div></div></section>
    </>
  );
}
