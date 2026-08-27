import Link from "next/link";
import { ArrowUpRight, BookOpen, CircleDot, MoveVertical, Rows3, ScanLine, ShieldAlert, Trees } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { EditorialSafetyNotice } from "@/components/editorial-safety-notice";
import { EdibilityBadge } from "@/components/edibility-badge";
import { JsonLd } from "@/components/json-ld";
import { SectionHeader } from "@/components/page-layout";
import { SpeciesHero } from "@/components/species-hero";
import { SpeciesFieldCardSection } from "@/components/species-profile/field-card-section";
import { editorialArticleFields } from "@/data/editorial";
import { getSpeciesByScientificName } from "@/data/species";
import { absoluteUrl, SITE_URL, speciesDescription, speciesImage, speciesPath } from "@/src/lib/seo";
import type { ReferenceSpeciesProfile } from "@/src/lib/types";

const sections = [
  ["identificacio", "Identificació"],
  ["comestibilitat", "Comestibilitat"],
  ["habitat", "Hàbitat i temporada"],
  ["confusions", "Espècies semblants"],
  ["targeta-de-camp", "Targeta de camp"],
] as const;

export function ReferenceSpeciesPage({ species }: { species: ReferenceSpeciesProfile }) {
  const url = absoluteUrl(speciesPath(species));
  return (
    <section className="species-page compact-species-page" data-species-scope="reference-only">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Article", "@id": `${url}#article`, url,
            headline: `${species.identity.commonName} (${species.identity.scientificName})`,
            description: speciesDescription(species), image: speciesImage(species), inLanguage: "ca",
            isPartOf: { "@id": `${SITE_URL}/#website` }, publisher: { "@id": `${SITE_URL}/#organization` },
            ...editorialArticleFields(`species:${species.speciesId}`),
            about: { "@type": "Taxon", name: species.identity.scientificName, alternateName: [species.identity.commonName, ...species.identity.alternateNames] },
          },
          {
            "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: [
              { "@type": "ListItem", position: 1, name: "Inici", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Bolets", item: absoluteUrl("/bolets") },
              { "@type": "ListItem", position: 3, name: species.identity.commonName, item: url },
            ],
          },
        ],
      }} />
      <SpeciesHero species={species} habitatLabel={species.ecology.habitats[0]} seasonLabel={species.ecology.season} />
      <div className="page-width species-content">
        <aside className="species-aside" aria-label="Contingut de la fitxa">
          <p>CONTINGUT</p>
          {sections.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}
        </aside>
        <div className="species-main">
          <EditorialSafetyNotice />
          <section id="identificacio" className="content-section" aria-labelledby="reference-identification-title">
            <div className="section-kicker"><BookOpen size={17} /><span>01</span></div>
            <div>
              <SectionHeader title="Com és el fals rossinyol?" titleId="reference-identification-title" meta="Trets que cal observar" />
              <div className="morphology-grid">
                <article><h3><CircleDot size={16} aria-hidden="true" />Barret</h3><p>{species.morphology.cap}</p></article>
                <article><h3><Rows3 size={16} aria-hidden="true" />Làmines</h3><p>{species.morphology.hymenium}</p></article>
                <article><h3><MoveVertical size={16} aria-hidden="true" />Peu</h3><p>{species.morphology.stem}</p></article>
                <article><h3><ScanLine size={16} aria-hidden="true" />Carn i tacte</h3><p>{species.morphology.flesh} {species.morphology.texture}</p></article>
              </div>
              <p>{species.morphology.variation}</p>
              <p>Descripció basada en la <a href={species.references[1].url}>fitxa d’Aranzadi</a>. Cap d’aquests trets, tot sol, confirma l’espècie.</p>
            </div>
          </section>
          <section id="comestibilitat" className="content-section" aria-labelledby="reference-edibility-title">
            <div className="section-kicker"><ShieldAlert size={17} /><span>02</span></div>
            <div>
              <SectionHeader title="No es recomana consumir-lo" titleId="reference-edibility-title" meta="Comestibilitat" />
              <p>{species.culinaryProfile.summary}</p>
              <p>La <a href={species.references[0].url}>ICHN</a> el considera no comestible; <a href={species.references[1].url}>Aranzadi</a> el classifica com a sospitós i sense valor culinari.</p>
              <p>{species.safetyNotice}</p>
            </div>
          </section>
          <section id="habitat" className="content-section" aria-labelledby="reference-habitat-title">
            <div className="section-kicker"><Trees size={17} /><span>03</span></div>
            <div>
              <SectionHeader title="On i quan apareix?" titleId="reference-habitat-title" meta="Hàbitat i temporada" />
              <p>{species.ecology.description}</p>
              <p>{species.ecology.limitations}</p>
            </div>
          </section>
          <section id="confusions" className="content-section" aria-labelledby="reference-lookalikes-title">
            <div className="section-kicker"><ScanLine size={17} /><span>04</span></div>
            <div>
              <SectionHeader title="Amb quins bolets es pot confondre?" titleId="reference-lookalikes-title" meta="Espècies semblants" />
              <div className="similar-list">
                {species.similarSpecies.map(item => {
                  const related = getSpeciesByScientificName(item.scientificName);
                  return <article key={item.scientificName}>
                    <div><em>{item.scientificName}</em><h3>{related
                      ? <Link className="similar-profile-link" href={speciesPath(related)}>{item.commonName}<ArrowUpRight size={17} aria-hidden="true" /></Link>
                      : item.commonName}</h3></div>
                    <p>{item.mainDifferences}</p>
                    <div className="similar-card-footer"><EdibilityBadge status={item.edibility} compact /></div>
                  </article>;
                })}
              </div>
              <p>Hi ha altres espècies semblants; aquesta comparació no les cobreix totes.</p>
              <Link href="/fals-rossinyol" className="text-link">Guia de confusions del fals rossinyol <ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
          </section>
          <SpeciesFieldCardSection species={species} />
          <EditorialAttribution contentId={`species:${species.speciesId}`} sources={species.references} />
        </div>
      </div>
    </section>
  );
}
