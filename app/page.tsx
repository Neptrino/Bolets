import { IntentLink as Link } from "@/components/intent-link";
import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight, BookOpenText, CalendarDays, Map, Sparkles } from "lucide-react";
import { SpeciesCard } from "@/components/species-card";
import { JsonLd } from "@/components/json-ld";
import { HomeFindingsFeature } from "@/components/home-findings-feature";
import { HomeMapFeature } from "@/components/home-map-feature";
import { HomeEditorialNote, HomeReferenceFeature } from "@/components/home-reference-feature";
import { HomeShopFeature } from "@/components/home-shop-feature";
import { StaticMediaImage } from "@/components/static-media-image";
import { UmamiEventLink } from "@/components/umami-event-link";
import { getFeaturedSeasonalSpecies } from "@/data/species";
import { catalogueSpecies } from "@/data/catalogue";
import { homeAppJsonLd } from "@/src/lib/home-app-schema";
import { seasonGuideForMonth } from "@/src/lib/season-guides";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { UMAMI_EVENTS } from "@/src/lib/umami-goals";

// Refresh cached HTML hourly so the daily editorial rotation can roll over.
export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Bolets de Catalunya: mapa, espècies i temporada",
  description: `Consulta la predicció de bolets a Catalunya i explora el mapa de condicions. Descobreix ${catalogueSpecies.length} fitxes d’espècies, guies de temporada i consells de recol·lecció.`,
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const featuredSpecies = getFeaturedSeasonalSpecies();
  const currentSeasonGuide = seasonGuideForMonth(monthInTimeZone());
  return (
    <>
      <JsonLd data={homeAppJsonLd()} />
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
        <div className="hero-copy">
          <p className="eyebrow light"><Sparkles size={14} aria-hidden="true" /> Predicció · espècies · territori</p>
          <h1>Bolets de Catalunya.<br /><i>Mapa, espècies i temporada.</i></h1>
          <p className="hero-lede">Consulta la predicció i descobreix on les condicions són més favorables. Coneix les espècies, els boscos i les temporades.</p>
          <div className="hero-actions">
            <UmamiEventLink href="/map" className="button light-button" analyticsEvent={UMAMI_EVENTS.homepageMapCtaClick}>Mapa de bolets <Map size={17} aria-hidden="true" /></UmamiEventLink>
            <Link href="/bolets" className="button hero-guide-button">Explora les espècies <BookOpenText size={17} aria-hidden="true" /></Link>
          </div>
          <Link href={currentSeasonGuide.path} className="hero-season-link"><CalendarDays size={16} aria-hidden="true" /> {currentSeasonGuide.cardTitle} <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
        <div className="hero-scroll"><ArrowDown size={16} aria-hidden="true" /> continua descobrint</div>
      </section>
      <HomeMapFeature />
      <HomeReferenceFeature speciesCount={catalogueSpecies.length} seasonGuide={currentSeasonGuide}>
        <div className="species-grid featured-grid">{featuredSpecies.map((species, index) => <SpeciesCard key={species.speciesId} species={species} index={index} />)}</div>
      </HomeReferenceFeature>
      <HomeFindingsFeature />
      <HomeShopFeature />
      <HomeEditorialNote />
    </>
  );
}
