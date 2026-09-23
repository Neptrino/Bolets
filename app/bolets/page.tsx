import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, CookingPot, Images, Languages, Leaf, Map, ShieldAlert, Snowflake, Sprout, Sun } from "lucide-react";
import { PageHeader, PageShell, SectionHeader } from "@/components/page-layout";
import { SpeciesDirectory } from "@/components/species-directory";
import { CatalogueSpeciesCell } from "@/components/catalogue-species-cell";
import { FaqSection } from "@/components/faq";
import { JsonLd } from "@/components/json-ld";
import { catalogueSpecies as speciesAlphabetical } from "@/data/catalogue";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { seasonGuides, type SeasonGuideId } from "@/src/lib/season-guides";
import { DEFAULT_SOCIAL_IMAGE, SITE_URL, speciesPath } from "@/src/lib/seo";
import { catalogueSearchQuery } from "@/src/lib/catalogue-search";
import { parseCatalogueFilters } from "@/src/lib/catalogue-filters";
import { faqPageSchema } from "@/src/lib/faq-schema";
import { catalogueCounts, catalogueFaqs, catalogueListRows, toCatalogueDirectoryEntry } from "@/src/lib/catalogue-list";

export const metadata: Metadata = {
  title: "Tipus de bolets de Catalunya: guia d’espècies",
  description: `Guia de ${speciesAlphabetical.length} tipus de bolets de Catalunya: comestibles, tòxics i no comestibles, amb fotos, noms, temporada, hàbitat i confusions.`,
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

const seasonGuideIcons = {
  primavera: Sprout,
  estiu: Sun,
  tardor: Leaf,
  hivern: Snowflake,
} satisfies Record<SeasonGuideId, typeof Sprout>;

export default async function SpeciesIndexPage({ searchParams }: {
  searchParams: Promise<{ q?: string | string[]; tipus?: string | string[]; estacio?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialQuery = catalogueSearchQuery(params.q);
  const initialFilters = parseCatalogueFilters(params);
  const rows = catalogueListRows(speciesAlphabetical);
  const counts = catalogueCounts(rows);
  const faqs = catalogueFaqs(counts);
  return (
    <PageShell as="section">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Tipus de bolets de Catalunya", url: `${SITE_URL}/bolets`, inLanguage: "ca", mainEntity: { "@type": "ItemList", numberOfItems: speciesAlphabetical.length, itemListElement: speciesAlphabetical.map((species, index) => ({ "@type": "ListItem", position: index + 1, name: `${species.identity.commonName} (${species.identity.scientificName})`, url: `${SITE_URL}${speciesPath(species)}` })) } }} />
      <JsonLd data={{ "@context": "https://schema.org", ...faqPageSchema(faqs, `${SITE_URL}/bolets#preguntes`) }} />
      <PageHeader
        eyebrow="Guia d’espècies"
        title={<>Tipus de bolets<br />de Catalunya.</>}
        actions={
          <Link href="/bolets/infografia" className="button catalogue-title-infographic-link">
            <Images size={18} aria-hidden="true" /> Veure la infografia <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        }
        description={<>{counts.total} fitxes: {counts.edible} bolets comestibles, {counts.toxic} tòxics o mortals i {counts.other} no comestibles o no recomanats, amb fotografies, noms en català, castellà i científic, hàbitat, temporada i espècies semblants.</>}
      />
      <SpeciesDirectory
        key={`${initialQuery}|${initialFilters.group}|${initialFilters.season}`}
        initialQuery={initialQuery}
        initialFilters={initialFilters}
        species={speciesAlphabetical.map(toCatalogueDirectoryEntry)}
        currentMonth={monthInTimeZone()}
        seasonGuides={seasonGuides.map((guide) => ({ id: guide.id, href: guide.path, label: `Guia de ${guide.cardTitle.toLocaleLowerCase("ca-ES")}` }))}
      />
      <section className="catalogue-list" aria-labelledby="catalogue-list-title">
        <SectionHeader
          meta={`${counts.total} espècies`}
          title="Llista de bolets de Catalunya: noms, comestibilitat i temporada"
          titleId="catalogue-list-title"
          description="Tots els tipus de bolets del catàleg en una taula: nom català, nom científic, nom en castellà, comestibilitat, estació i bosc habitual. Cada fila obre la fitxa completa."
          actions={<Link href="/noms-de-bolets-catala-castella" className="text-link">Glossari de noms <ArrowUpRight size={16} aria-hidden="true" /></Link>}
          size="compact"
        />
        <div className="catalogue-list-scroll" role="region" aria-label="Llista de bolets de Catalunya" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Bolet</th>
                <th scope="col">En castellà</th>
                <th scope="col">Comestibilitat</th>
                <th scope="col">Estació</th>
                <th scope="col">Bosc habitual</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.speciesId} data-group={row.group}>
                  <CatalogueSpeciesCell speciesId={row.speciesId} href={row.href} name={row.name} scientificName={row.scientificName} />
                  <td lang="es">{row.spanish || "—"}</td>
                  <td><span className={`catalogue-list-edibility ${row.group}`}>{row.edibilityLabel}</span></td>
                  <td>{row.season}</td>
                  <td>{row.habitat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <FaqSection faqs={faqs} title="Preguntes sobre els bolets de Catalunya" titleId="catalogue-faq-title" size="compact" />
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
            <Link href="/noms-de-bolets-catala-castella"><Languages size={18} /><span><strong>Noms en català i castellà</strong><small>Glossari amb noms científics i variants</small></span><ArrowUpRight size={16} /></Link>
          </nav>
        </section>
        <section className="species-guides-navigation" aria-labelledby="species-guides-title">
          <SectionHeader
            meta="Per tipus i temporada"
            title="Guies de comestibles, verinosos i estacions"
            titleId="species-guides-title"
            description="Cada guia explica un grup d’espècies amb més context que el filtre del catàleg: confusions, riscos, mesos i condicions del bosc."
          />
          <nav className="species-topic-links" aria-label="Guies per tipus i temporada">
            <Link href="/bolets-comestibles"><CookingPot size={18} /><span><strong>Bolets comestibles</strong><small>Espècies, confusions i condicions</small></span><ArrowUpRight size={16} /></Link>
            <Link href="/bolets-verinosos"><ShieldAlert size={18} /><span><strong>Bolets verinosos</strong><small>Identificació i riscos</small></span><ArrowUpRight size={16} /></Link>
            <Link href="/temporada"><CalendarDays size={18} /><span><strong>Bolets per mesos</strong><small>Calendari mensual per espècie</small></span><ArrowUpRight size={16} /></Link>
            {seasonGuides.map((guide) => {
              const SeasonIcon = seasonGuideIcons[guide.id];
              return <Link href={guide.path} key={guide.id}><SeasonIcon size={18} /><span><strong>{guide.cardTitle}</strong><small>Espècies habituals {guide.rangeSentence}</small></span><ArrowUpRight size={16} /></Link>;
            })}
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
