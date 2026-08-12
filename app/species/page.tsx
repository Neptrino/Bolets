import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, CookingPot, ShieldAlert } from "lucide-react";
import { SpeciesDirectory } from "@/components/species-directory";
import { JsonLd } from "@/components/json-ld";
import { speciesAlphabetical } from "@/data/species";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { DEFAULT_SOCIAL_IMAGE, SITE_URL } from "@/src/lib/seo";

export const metadata: Metadata = {
  title: "Espècies de bolets de Catalunya",
  description: `Consulta ${speciesAlphabetical.length} fitxes de bolets de Catalunya amb identificació, comestibilitat, hàbitat, temporada i espècies semblants.`,
  alternates: { canonical: "/species" },
  openGraph: {
    url: "/species",
    title: "Espècies de bolets de Catalunya",
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

export default function SpeciesIndexPage() {
  return <section className="page-width species-index"><JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Espècies de bolets de Catalunya", url: `${SITE_URL}/species`, inLanguage: "ca", mainEntity: { "@type": "ItemList", numberOfItems: speciesAlphabetical.length, itemListElement: speciesAlphabetical.map((species, index) => ({ "@type": "ListItem", position: index + 1, name: `${species.identity.commonName} (${species.identity.scientificName})`, url: `${SITE_URL}/species/${species.speciesId}` })) } }} /><div className="page-intro"><p className="eyebrow">Fitxer viu</p><h1>Espècies, hàbitats<br />i senyals de bosc.</h1><p>{speciesAlphabetical.length} fitxes de bolets de Catalunya per identificar noms comuns i científics, entendre l’hàbitat, consultar la temporada i distingir espècies comestibles de bolets tòxics semblants.</p></div><nav className="species-topic-links" aria-label="Guies de bolets"><Link href="/bolets-comestibles"><CookingPot size={18} /><span><strong>Bolets comestibles</strong><small>Espècies, confusions i condicions</small></span><ArrowUpRight size={16} /></Link><Link href="/bolets-verinosos"><ShieldAlert size={18} /><span><strong>Bolets verinosos</strong><small>Identificació i riscos</small></span><ArrowUpRight size={16} /></Link><Link href="/temporada"><CalendarDays size={18} /><span><strong>Temporada de bolets</strong><small>Calendari mensual per espècie</small></span><ArrowUpRight size={16} /></Link></nav><SpeciesDirectory species={speciesAlphabetical} currentMonth={monthInTimeZone()} /></section>;
}
