import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, CookingPot, Leaf, ShieldAlert, Snowflake, Sprout, Sun, Trees } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { SpeciesDirectory } from "@/components/species-directory";
import { JsonLd } from "@/components/json-ld";
import { coreEditorialSources } from "@/data/editorial";
import { speciesAlphabetical } from "@/data/species";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { seasonGuides, speciesForSeasonGuide, type SeasonGuideId } from "@/src/lib/season-guides";
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

function habitatDisplayName(habitat: string) {
  return habitat.charAt(0).toLocaleUpperCase("ca") + habitat.slice(1);
}

const seasonIcons = {
  primavera: Sprout,
  estiu: Sun,
  tardor: Leaf,
  hivern: Snowflake,
} satisfies Record<SeasonGuideId, typeof Sprout>;

export default function SpeciesIndexPage() {
  const habitatCounts = new Map<string, number>();
  for (const species of speciesAlphabetical) {
    for (const habitat of species.ecologicalConfig.habitat.forestTypes) {
      habitatCounts.set(habitat, (habitatCounts.get(habitat) ?? 0) + 1);
    }
  }
  const habitats = [...habitatCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6);
  const largestHabitatCount = habitats[0]?.[1] ?? 1;

  return (
    <section className="page-width species-index">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Tipus de bolets de Catalunya", url: `${SITE_URL}/bolets`, inLanguage: "ca", mainEntity: { "@type": "ItemList", numberOfItems: speciesAlphabetical.length, itemListElement: speciesAlphabetical.map((species, index) => ({ "@type": "ListItem", position: index + 1, name: `${species.identity.commonName} (${species.identity.scientificName})`, url: `${SITE_URL}${speciesPath(species)}` })) } }} />
      <div className="page-intro">
        <p className="eyebrow">Catàleg viu</p>
        <h1>Tipus de bolets<br />de Catalunya.</h1>
        <p>{speciesAlphabetical.length} fitxes per explorar noms comuns i científics, comestibilitat, hàbitat, temporada i espècies semblants. Les agrupacions es generen des de les mateixes dades ecològiques de cada fitxa.</p>
      </div>
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
      <section className="catalogue-habitats" aria-labelledby="catalogue-habitats-title">
        <header>
          <p className="eyebrow"><Trees size={15} /> Hàbitats</p>
          <h2 id="catalogue-habitats-title">On creixen els bolets del catàleg</h2>
          <p>Els ambients més representats a les fitxes. Una mateixa espècie pot aparèixer en més d’un hàbitat.</p>
        </header>
        <ol>
          {habitats.map(([habitat, count], index) => (
            <li
              key={habitat}
              style={{ "--habitat-strength": `${Math.round((count / largestHabitatCount) * 100)}%` } as CSSProperties}
            >
              <span className="catalogue-habitat-rank" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className="catalogue-habitat-name">
                <span>{habitatDisplayName(habitat)}</span>
                <i aria-hidden="true" />
              </span>
              <span className="catalogue-habitat-count"><strong>{count}</strong><small>espècies</small></span>
            </li>
          ))}
        </ol>
      </section>
      <SpeciesDirectory species={speciesAlphabetical} currentMonth={monthInTimeZone()} />
      <EditorialAttribution contentId="bolets" sources={coreEditorialSources} />
    </section>
  );
}
