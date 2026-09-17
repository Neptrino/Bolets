import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, CircleAlert, CookingPot, Images, Snowflake, Trees } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { SpeciesCard } from "@/components/species-card";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { editorialArticleFields, officialSafetySource } from "@/data/editorial";
import { edibleSpecies } from "@/src/lib/species-collections";
import { edibleFaqs, edibleGroups } from "@/src/lib/catalogue-list";
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
  const groups = edibleGroups(edibleSpecies);
  const faqs = edibleFaqs(edibleSpecies);

  return (
    <PageShell>
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
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", "@id": `${absoluteUrl("/bolets-comestibles")}#preguntes`, mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) }} />
      <PageHeader
        eyebrow={<><CookingPot size={15} /> Guia de comestibilitat</>}
        title={<>Bolets comestibles<br /><PageTitleAccent>de Catalunya.</PageTitleAccent></>}
        description="Una guia visual de ceps, rovellons, rossinyols i altres espècies del país. Cada fitxa separa valor culinari, identificació, hàbitat i temporada."
        layout="split"
        tone="forest"
      />

      <aside className="intent-safety-note">
        <CircleAlert size={22} aria-hidden="true" />
        <div><strong>Comestible no vol dir identificat.</strong><p>Una fotografia, un nom popular o aquesta web no són suficients per decidir si un bolet es pot consumir. Confirma sempre l’espècie amb una persona experta.</p></div>
      </aside>

      <section className="intent-reading-section" aria-labelledby="edible-reading-title">
        <SectionHeader
          meta="Comença per aquí"
          title="Com triar entre els tipus de bolets comestibles"
          titleId="edible-reading-title"
        />
        <div className="intent-reading-grid">
          <div>
            <p>Els bolets comestibles de Catalunya no formen un grup uniforme. Algunes espècies tenen un valor culinari alt; d’altres només es consideren comestibles amb condicions concretes de cocció, preparació o quantitat. Cada fitxa explica aquesta diferència i assenyala les confusions rellevants.</p>
            <p>Tria primer una espècie que encaixi amb el bosc i la temporada. Després consulta els <Link href="/bolets-avui">bolets avui a Catalunya</Link> i el <Link href="/map">mapa de bolets de Catalunya</Link>. Cap d’aquests passos substitueix una identificació experta de l’exemplar complet.</p>
          </div>
          <ol>
            <li>Revisa el nivell de comestibilitat i totes les condicions de consum.</li>
            <li>Compara barret, himeni, peu, base, hàbitat i temporada.</li>
            <li>Descarta els semblants tòxics abans de collir o cuinar.</li>
          </ol>
        </div>
        <nav className="species-topic-links seasonal-guide-topic-links" aria-label="Guies relacionades amb els bolets comestibles">
          <Link href="/zones/ceps"><CookingPot size={18} aria-hidden="true" /><span><strong>Ceps de Catalunya</strong><small>Tipus, diferències, hàbitat i temporada</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
          <Link href="/zones/rovellons"><Trees size={18} aria-hidden="true" /><span><strong>Rovellons a Catalunya</strong><small>Tipus, diferències, hàbitat i temporada</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
          <Link href="/temporada"><CalendarDays size={18} aria-hidden="true" /><span><strong>Bolets per temporada</strong><small>Calendari mensual de totes les espècies</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
          <Link href="/conservar-bolets"><Snowflake size={18} aria-hidden="true" /><span><strong>Com conservar els bolets</strong><small>Congelació, porcions i descongelació segura</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
          <Link href="/bolets/infografia"><Images size={18} aria-hidden="true" /><span><strong>Infografia de bolets</strong><small>Totes les espècies en un pòster, per comestibilitat</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
        </nav>
      </section>

      <section className="catalogue-list" aria-labelledby="edible-list-title">
        <SectionHeader
          meta={`${edibleSpecies.length} espècies en ${groups.length} grups`}
          title="Llista de bolets comestibles per valor culinari"
          titleId="edible-list-title"
          description="Nom català, nom en castellà, estació i bosc habitual de cada comestible, agrupats pel valor culinari orientatiu de la fitxa. Cada fila obre la fitxa completa."
          size="compact"
        />
        {groups.map((group) => (
          <div className="catalogue-list-group" key={group.id}>
            <h3>{group.title} <small>{group.rows.length}</small></h3>
            <p>{group.description}</p>
            <div className="catalogue-list-scroll" role="region" aria-label={group.title} tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Bolet</th>
                    <th scope="col">En castellà</th>
                    <th scope="col">Estació</th>
                    <th scope="col">Bosc habitual</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={row.speciesId}>
                      <th scope="row"><Link href={row.href}>{row.name}</Link><small>{row.scientificName}</small></th>
                      <td lang="es">{row.spanish || "—"}</td>
                      <td>{row.season}</td>
                      <td>{row.habitat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      <SectionHeader
        meta={`${edibleSpecies.length} espècies`}
        title="Fitxes de bolets comestibles"
        actions={<Link href="/bolets-verinosos" className="text-link">Veure bolets verinosos <ArrowUpRight size={16} /></Link>}
      />
      <div className="species-grid intent-species-grid">
        {edibleSpecies.map((species, index) => <SpeciesCard key={species.speciesId} species={species} index={index} currentMonth={currentMonth} />)}
      </div>
      <section className="catalogue-faq" aria-labelledby="edible-faq-title">
        <SectionHeader meta="Preguntes habituals" title="Preguntes sobre els bolets comestibles" titleId="edible-faq-title" size="compact" />
        <div className="catalogue-faq-list">
          {faqs.map((faq) => (
            <article key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></article>
          ))}
        </div>
      </section>
      <EditorialAttribution contentId="bolets-comestibles" sources={[officialSafetySource, ...edibleSpecies.flatMap((species) => species.references)]} />
    </PageShell>
  );
}
