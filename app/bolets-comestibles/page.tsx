import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CircleAlert, CookingPot } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { SpeciesCard } from "@/components/species-card";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { editorialArticleFields, officialSafetySource } from "@/data/editorial";
import { edibleSpecies } from "@/src/lib/species-collections";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, SITE_URL, speciesPath } from "@/src/lib/seo";

export const metadata: Metadata = {
  title: "Bolets comestibles de Catalunya: guia d’espècies",
  description: `Guia de ${edibleSpecies.length} bolets comestibles de Catalunya amb fotografies, noms, temporada, hàbitat, possibles confusions i condicions de consum.`,
  alternates: { canonical: "/bolets-comestibles" },
  openGraph: {
    url: "/bolets-comestibles",
    title: "Bolets comestibles de Catalunya",
    description: "Guia visual d’espècies comestibles amb temporada, hàbitat i confusions importants.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

export const revalidate = 3600;

export default function EdibleMushroomsPage() {
  const currentMonth = monthInTimeZone();

  return (
    <div className="intent-page page-width">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Bolets comestibles de Catalunya",
        url: absoluteUrl("/bolets-comestibles"),
        inLanguage: "ca",
        publisher: { "@id": `${SITE_URL}/#organization` },
        ...editorialArticleFields("bolets-comestibles"),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: edibleSpecies.length,
          itemListElement: edibleSpecies.map((species, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: species.identity.commonName,
            url: absoluteUrl(speciesPath(species)),
          })),
        },
      }} />
      <header className="intent-hero intent-hero-edible">
        <div>
          <p className="eyebrow"><CookingPot size={15} /> Guia de comestibilitat</p>
          <h1>Bolets comestibles<br /><i>de Catalunya.</i></h1>
        </div>
        <p>Una guia visual de ceps, rovellons, rossinyols i altres espècies del país. Cada fitxa separa valor culinari, identificació, hàbitat i temporada.</p>
      </header>

      <aside className="intent-safety-note">
        <CircleAlert size={22} aria-hidden="true" />
        <div><strong>Comestible no vol dir identificat.</strong><p>Una fotografia, un nom popular o aquesta web no són suficients per decidir si un bolet es pot consumir. Confirma sempre l’espècie amb una persona experta.</p></div>
      </aside>

      <div className="intent-section-heading">
        <div><span>{edibleSpecies.length} espècies</span><h2>Fitxes de bolets comestibles</h2></div>
        <Link href="/bolets-verinosos" className="text-link">Veure bolets verinosos <ArrowUpRight size={16} /></Link>
      </div>
      <div className="species-grid intent-species-grid">
        {edibleSpecies.map((species, index) => <SpeciesCard key={species.speciesId} species={species} index={index} currentMonth={currentMonth} />)}
      </div>
      <EditorialAttribution contentId="bolets-comestibles" sources={[officialSafetySource, ...edibleSpecies.flatMap((species) => species.references)]} />
    </div>
  );
}
