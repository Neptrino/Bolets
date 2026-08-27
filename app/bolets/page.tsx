import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, CookingPot, Images, Leaf, ShieldAlert, Snowflake, Sprout, Sun } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { PageHeader, PageShell, SectionHeader } from "@/components/page-layout";
import { SpeciesDirectory } from "@/components/species-directory";
import { JsonLd } from "@/components/json-ld";
import { coreEditorialSources } from "@/data/editorial";
import { catalogueSpecies as speciesAlphabetical } from "@/data/catalogue";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { seasonGuides, speciesForSeasonGuide, type SeasonGuideId } from "@/src/lib/season-guides";
import { toSpeciesCardProfile } from "@/src/lib/species-card-profile";
import { DEFAULT_SOCIAL_IMAGE, SITE_URL, speciesPath } from "@/src/lib/seo";

export const metadata: Metadata = {
  title: "Tipus de bolets de Catalunya: guia d’espècies",
  description: `Descobriu ${speciesAlphabetical.length} tipus de bolets de Catalunya per comestibilitat, temporada i hàbitat, amb fitxes d’identificació i confusions.`,
  alternates: { canonical: "/bolets" },
  openGraph: {
    url: "/bolets",
    title: "Tipus de bolets de Catalunya",
    description: `Fitxes de ${speciesAlphabetical.length} espècies amb identificació, hàbitat i temporada.`,
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Espècies de bolets de Catalunya",
    description: `Fitxes de ${speciesAlphabetical.length} espècies amb identificació, hàbitat i temporada.`,
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};
export const revalidate = 3600;

const seasonIcons = {
  primavera: Sprout,
  estiu: Sun,
  tardor: Leaf,
  hivern: Snowflake,
} satisfies Record<SeasonGuideId, typeof Sprout>;

export default function SpeciesIndexPage() {
  return (
    <PageShell as="section">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Tipus de bolets de Catalunya", url: `${SITE_URL}/bolets`, inLanguage: "ca", mainEntity: { "@type": "ItemList", numberOfItems: speciesAlphabetical.length, itemListElement: speciesAlphabetical.map((species, index) => ({ "@type": "ListItem", position: index + 1, name: `${species.identity.commonName} (${species.identity.scientificName})`, url: `${SITE_URL}${speciesPath(species)}` })) } }} />
      <PageHeader
        eyebrow="Catàleg viu"
        title={<>Tipus de bolets<br />de Catalunya.</>}
        actions={
          <Link href="/bolets/infografia" className="button catalogue-title-infographic-link">
            <Images size={18} aria-hidden="true" /> Veure la infografia <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        }
        description={<>{speciesAlphabetical.length} fitxes per explorar noms comuns i científics, comestibilitat, hàbitat, temporada i espècies semblants. Les agrupacions es generen des de les mateixes dades ecològiques de cada fitxa.</>}
      />
      <nav className="species-topic-links species-topic-links-primary" aria-label="Tipus i calendari de bolets">
        <Link href="/bolets-comestibles"><CookingPot size={18} /><span><strong>Bolets comestibles</strong><small>Espècies, confusions i condicions</small></span><ArrowUpRight size={16} /></Link>
        <Link href="/bolets-verinosos"><ShieldAlert size={18} /><span><strong>Bolets verinosos</strong><small>Identificació i riscos</small></span><ArrowUpRight size={16} /></Link>
        <Link href="/temporada"><CalendarDays size={18} /><span><strong>Per mesos</strong><small>Calendari mensual per espècie</small></span><ArrowUpRight size={16} /></Link>
      </nav>
      <section className="species-season-navigation" aria-labelledby="species-seasons-title">
        <header><div><p className="eyebrow">Per estacions</p><h2 id="species-seasons-title">Què pot sortir en cada moment de l’any</h2></div><p>Guies derivades del mateix calendari ecològic de les fitxes.</p></header>
        <nav className="species-topic-links species-topic-links-seasons" aria-label="Bolets per estació de l’any">
          {seasonGuides.map((guide) => {
            const SeasonIcon = seasonIcons[guide.id];
            const count = speciesForSeasonGuide(guide).length;
            return <Link href={guide.path} key={guide.id}><SeasonIcon size={18} /><span><strong>{guide.cardTitle}</strong><small>{count} espècies actives {guide.rangeSentence}</small></span><ArrowUpRight size={16} /></Link>;
          })}
        </nav>
      </section>
      <section aria-labelledby="popular-species-title">
        <SectionHeader
          meta="Guies destacades"
          title="Espècies i grups que es consulten sovint"
          titleId="popular-species-title"
          description="Guies per distingir espècies semblants, entendre l’hàbitat i consultar la temporada sense publicar punts de recol·lecció."
        />
        <nav className="species-topic-links" aria-label="Guies destacades d’espècies de bolets">
          <Link href="/zones/ceps"><CookingPot size={18} /><span><strong>Ceps de Catalunya</strong><small>Tipus, diferències, hàbitat i temporada</small></span><ArrowUpRight size={16} /></Link>
          <Link href="/zones/rovellons"><Leaf size={18} /><span><strong>Rovellons i pinetells</strong><small>Com distingir-los i on encaixen</small></span><ArrowUpRight size={16} /></Link>
          <Link href="/bolets/craterellus-lutescens"><Leaf size={18} /><span><strong>Camagroc</strong><small>Identificació, bosc i confusions</small></span><ArrowUpRight size={16} /></Link>
          <Link href="/bolets/tricholoma-terreum"><CalendarDays size={18} /><span><strong>Fredolic</strong><small>Pinedes, tardor i identificació prudent</small></span><ArrowUpRight size={16} /></Link>
          <Link href="/bolets/hygrophorus-latitabundus"><Sprout size={18} /><span><strong>Llenega</strong><small>Pinedes calcàries i temporada</small></span><ArrowUpRight size={16} /></Link>
          <Link href="/bolets-de-soca"><Leaf size={18} /><span><strong>Bolets de soca</strong><small>Espècies de la fusta i fitxes del catàleg</small></span><ArrowUpRight size={16} /></Link>
          <Link href="/fals-rossinyol"><ShieldAlert size={18} /><span><strong>Fals rossinyol</strong><small>Noms, fonts i confusions</small></span><ArrowUpRight size={16} /></Link>
        </nav>
      </section>
      <SpeciesDirectory species={speciesAlphabetical.map(toSpeciesCardProfile)} currentMonth={monthInTimeZone()} />
      <EditorialAttribution contentId="bolets" sources={coreEditorialSources} />
    </PageShell>
  );
}
