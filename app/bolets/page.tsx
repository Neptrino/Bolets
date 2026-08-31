import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, CookingPot, Images, Leaf, Map, ShieldAlert, Snowflake, Sprout, Sun } from "lucide-react";
import { PageHeader, PageShell, SectionHeader } from "@/components/page-layout";
import { SpeciesDirectory } from "@/components/species-directory";
import { JsonLd } from "@/components/json-ld";
import { catalogueSpecies as speciesAlphabetical } from "@/data/catalogue";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { seasonGuides, type SeasonGuideId } from "@/src/lib/season-guides";
import { toSpeciesCardProfile } from "@/src/lib/species-card-profile";
import { DEFAULT_SOCIAL_IMAGE, SITE_URL, speciesPath } from "@/src/lib/seo";

export const metadata: Metadata = {
  title: "Tipus de bolets de Catalunya: guia d’espècies",
  description: `Descobreix ${speciesAlphabetical.length} tipus de bolets de Catalunya per comestibilitat, temporada i hàbitat, amb fitxes d’identificació i confusions.`,
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

const seasonShortcutLabels = {
  primavera: "Primavera",
  estiu: "Estiu",
  tardor: "Tardor",
  hivern: "Hivern",
} satisfies Record<SeasonGuideId, string>;

export default function SpeciesIndexPage() {
  return (
    <PageShell as="section">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Tipus de bolets de Catalunya", url: `${SITE_URL}/bolets`, inLanguage: "ca", mainEntity: { "@type": "ItemList", numberOfItems: speciesAlphabetical.length, itemListElement: speciesAlphabetical.map((species, index) => ({ "@type": "ListItem", position: index + 1, name: `${species.identity.commonName} (${species.identity.scientificName})`, url: `${SITE_URL}${speciesPath(species)}` })) } }} />
      <PageHeader
        eyebrow="Guia d’espècies"
        title={<>Tipus de bolets<br />de Catalunya.</>}
        actions={
          <Link href="/bolets/infografia" className="button catalogue-title-infographic-link">
            <Images size={18} aria-hidden="true" /> Veure la infografia <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        }
        description={<>{speciesAlphabetical.length} fitxes amb fotografies, noms, comestibilitat, hàbitat, temporada i espècies semblants.</>}
      />
      <SpeciesDirectory
        species={speciesAlphabetical.map(toSpeciesCardProfile)}
        currentMonth={monthInTimeZone()}
        seasonShortcuts={seasonGuides.map((guide) => ({
          id: guide.id,
          href: guide.path,
          label: seasonShortcutLabels[guide.id],
        }))}
      />
      <div className="species-catalogue-support">
        <section aria-labelledby="popular-species-title">
          <SectionHeader
            meta="Guies destacades"
            title="Espècies i grups que es consulten sovint"
            titleId="popular-species-title"
            description="Guies per distingir espècies semblants, entendre l’hàbitat i consultar la temporada sense publicar punts de recol·lecció."
          />
          <nav className="species-topic-links" aria-label="Guies destacades d’espècies de bolets">
            <Link href="/zones/ceps"><CookingPot size={18} /><span><strong>Ceps de Catalunya</strong><small>Tipus, diferències, hàbitat i temporada</small></span><ArrowUpRight size={16} /></Link>
            <Link href="/zones/rovellons"><Leaf size={18} /><span><strong>Rovellons a Catalunya</strong><small>Tipus, diferències, hàbitat i temporada</small></span><ArrowUpRight size={16} /></Link>
            <Link href="/bolets/camagroc"><Leaf size={18} /><span><strong>Camagroc</strong><small>Identificació, bosc i confusions</small></span><ArrowUpRight size={16} /></Link>
            <Link href="/bolets/fredolic"><CalendarDays size={18} /><span><strong>Fredolic</strong><small>Pinedes, tardor i identificació prudent</small></span><ArrowUpRight size={16} /></Link>
            <Link href="/bolets/llenega"><Sprout size={18} /><span><strong>Llenega</strong><small>Pinedes calcàries i temporada</small></span><ArrowUpRight size={16} /></Link>
            <Link href="/bolets-de-soca"><Leaf size={18} /><span><strong>Bolets de soca</strong><small>Espècies de la fusta i fitxes del catàleg</small></span><ArrowUpRight size={16} /></Link>
            <Link href="/fals-rossinyol"><ShieldAlert size={18} /><span><strong>Fals rossinyol</strong><small>Noms, fonts i confusions</small></span><ArrowUpRight size={16} /></Link>
          </nav>
        </section>
        <section className="species-tools-navigation" aria-labelledby="species-tools-title">
          <SectionHeader
            meta="Eines pràctiques"
            title="Planifica la sortida i conserva la collita"
            titleId="species-tools-title"
            description="Consulta les condicions abans de sortir i conserva els bolets amb prudència quan tornis a casa."
          />
          <nav className="species-topic-links" aria-label="Eines pràctiques del catàleg">
            <Link href="/map"><Map size={18} /><span><strong>Mapa de bolets de Catalunya</strong><small>Hàbitat i condicions actuals</small></span><ArrowUpRight size={16} /></Link>
            <Link href="/bolets-avui"><Sun size={18} /><span><strong>On trobar bolets avui</strong><small>Comparació actualitzada de territoris</small></span><ArrowUpRight size={16} /></Link>
            <Link href="/conservar-bolets"><Snowflake size={18} /><span><strong>Conservar i congelar bolets</strong><small>Preparació i cadena de fred</small></span><ArrowUpRight size={16} /></Link>
          </nav>
        </section>
      </div>
    </PageShell>
  );
}
