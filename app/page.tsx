import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight, BookOpenText, CloudRain, Gauge, Leaf, Snowflake, Sparkles, Sun, Trees } from "lucide-react";
import { SpeciesCard } from "@/components/species-card";
import { HomeFindingsFeature } from "@/components/home-findings-feature";
import { HomeShowcaseVideo } from "@/components/home-showcase-video";
import { StaticMediaImage } from "@/components/static-media-image";
import { UmamiEventLink } from "@/components/umami-event-link";
import { getFeaturedSeasonalSpecies } from "@/data/species";
import { catalogueSpecies } from "@/data/catalogue";
import { seasonGuideForMonth, type SeasonGuideId } from "@/src/lib/season-guides";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { UMAMI_EVENTS } from "@/src/lib/umami-goals";

const seasonGuideIcons = {
  primavera: Leaf,
  estiu: Sun,
  tardor: Trees,
  hivern: Snowflake,
} satisfies Record<SeasonGuideId, typeof Leaf>;

export const revalidate = 86400;
export const metadata: Metadata = {
  title: "Bolets de Catalunya: mapa, espècies i temporada",
  description: `Consulta el mapa de bolets de Catalunya, les condicions d’avui, la temporada i ${catalogueSpecies.length} fitxes d’espècies amb fotos, hàbitat i confusions.`,
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
        <div className="hero-copy"><p className="eyebrow light"><Sparkles size={14} /> Bolets · boscos · temporada</p><h1>Bolets de Catalunya.<br /><i>Mapa, espècies i temporada.</i></h1><p className="hero-lede">Descobreix quines espècies encaixen amb cada bosc i on les condicions són més favorables avui.</p><div className="hero-actions"><UmamiEventLink href="/map" className="button light-button" analyticsEvent={UMAMI_EVENTS.homepageMapCtaClick}>Mapa de bolets <ArrowUpRight size={17} /></UmamiEventLink><Link href="/bolets" className="button hero-guide-button">Guia d’espècies <Trees size={17} /></Link></div></div>
        <div className="hero-scroll"><ArrowDown size={16} /> baixa per llegir el territori</div>
      </section>
      <Link href="/bolets-avui" className="home-today-feature page-width">
        <p className="home-today-kicker"><Gauge size={17} /> Condicions actuals</p>
        <div className="home-today-copy"><h2>On trobar bolets avui i aquesta setmana?</h2><p>Compara espècies i territoris de Catalunya amb les lectures més recents.</p></div>
        <dl className="home-today-facts"><div><dt>Àmbit</dt><dd>Catalunya</dd></div><div><dt>Actualització</dt><dd>Diària</dd></div></dl>
        <span className="home-today-action">Bolets avui <ArrowUpRight size={17} /></span>
      </Link>
      <HomeShowcaseVideo />
      <section className="home-intro page-width"><div><p className="eyebrow">Com funciona</p><h2>Coneix l’espècie.<br />Després, mira el territori.</h2></div><p>Les fitxes expliquen on i quan creix cada bolet. El mapa compara aquestes necessitats amb les condicions actuals.</p></section>
      <nav className="home-search-guides page-width" aria-label="Guies destacades">
        <Link href="/guies"><BookOpenText size={19} /><span><strong>Guies locals</strong><small>Comarques, massissos i indrets documentats</small></span><ArrowUpRight size={16} /></Link>
        <Link href={currentSeasonGuide.path}><CurrentSeasonIcon size={19} /><span><strong>{currentSeasonGuide.cardTitle}</strong><small>Espècies actives {currentSeasonGuide.rangeSentence}</small></span><ArrowUpRight size={16} /></Link>
        <Link href="/quan-surten-els-bolets-despres-de-ploure"><CloudRain size={19} /><span><strong>Després de ploure</strong><small>Com interpretar la resposta de cada espècie</small></span><ArrowUpRight size={16} /></Link>
      </nav>
      <section className="home-cards page-width"><div className="section-topline"><div><p className="eyebrow">Comença aquí</p><h2>Espècies de temporada</h2></div><Link href="/bolets" className="text-link">Veure les {catalogueSpecies.length} fitxes <ArrowUpRight size={16} /></Link></div><div className="species-grid featured-grid">{featuredSpecies.map((species, index) => <SpeciesCard key={species.speciesId} species={species} index={index} />)}</div></section>
      <HomeFindingsFeature />
      <section className="home-map-callout"><div className="page-width"><div className="home-map-callout-copy"><p className="eyebrow light">Condicions del territori</p><h2>Compara boscos,<br />no coordenades.</h2><p>El mapa indica on l’hàbitat i el temps recent encaixen millor amb cada espècie. No mostra troballes ni punts de recol·lecció.</p></div><div className="home-map-callout-action"><UmamiEventLink href="/map" className="button light-button" analyticsEvent={UMAMI_EVENTS.homepageMapCtaClick}>Mapa de bolets <ArrowUpRight size={17} /></UmamiEventLink></div><div className="home-map-callout-art" aria-hidden="true"><StaticMediaImage src="/media/generated/home-map-callout-forest-floor.webp" alt="" fill sizes="(max-width: 900px) 0px, 59vw" /></div></div></section>
    </>
  );
}
