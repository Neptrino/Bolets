import Link from "next/link";
import { ArrowUpRight, Trees } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { EditorialSafetyNotice } from "@/components/editorial-safety-notice";
import { JsonLd } from "@/components/json-ld";
import { SpeciesCard } from "@/components/species-card";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { editorialArticleFields, officialSafetySource } from "@/data/editorial";
import { woodFungiSource } from "@/data/field-guide-sources";
import { getSpecies } from "@/data/species";
import { woodFungiSpeciesIds } from "@/data/wood-fungi";
import { toSpeciesCardProfile } from "@/src/lib/species-card-profile";
import { absoluteUrl, articleMetadata, metaDescription, pageTitle, SITE_URL } from "@/src/lib/seo";

const path = "/bolets-de-soca";
const title = pageTitle("Bolets de soca: espècies que creixen a la fusta");
const description = metaDescription("Bolets de soca: fotos i fitxes de gírgola, pollancró, bolet d’olivera i galerina metzinosa. Créixer sobre fusta no implica ser comestible.");
const woodSpecies = woodFungiSpeciesIds.map((id) => {
  const species = getSpecies(id);
  if (!species) throw new Error(`Missing wood-fungi catalogue species: ${id}`);
  return species;
});

export const metadata = articleMetadata(path, title, description);

export default function WoodFungiGuidePage() {
  const url = absoluteUrl(path);
  return (
    <PageShell as="article">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Article", "@id": `${url}#article`, headline: "Bolets de soca: espècies que creixen a la fusta", description, url, inLanguage: "ca", isPartOf: { "@id": `${SITE_URL}/#website` }, publisher: { "@id": `${SITE_URL}/#organization` }, ...editorialArticleFields("bolets-de-soca") },
          { "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Inici", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Bolets", item: absoluteUrl("/bolets") },
            { "@type": "ListItem", position: 3, name: "Bolets de soca", item: url },
          ] },
        ],
      }} />
      <PageHeader
        eyebrow={<><Trees size={15} /> Noms i substrats</>}
        title={<>Bolets de soca,<br /><PageTitleAccent>moltes espècies.</PageTitleAccent></>}
        description="Trobar un bolet sobre un tronc explica on creix, no quin bolet és. El nom popular no correspon a una única espècie ni permet decidir si és comestible."
        layout="split"
      />
      <EditorialSafetyNotice />
      <section className="seo-guide-section" aria-labelledby="soca-species">
        <SectionHeader title={`${woodSpecies.length} espècies de la fusta al nostre catàleg`} titleId="soca-species" meta="Fitxes amb fotografies" description="Una selecció de bolets que creixen sobre fusta, soques o arrels llenyoses. Inclou espècies comestibles i tòxiques: no és una llista completa ni una guia per decidir què collir." />
        <div className="species-grid">
          {woodSpecies.map((species, index) => <SpeciesCard key={species.speciesId} species={toSpeciesCardProfile(species)} index={index} />)}
        </div>
      </section>
      <section className="seo-guide-section" aria-labelledby="soca-name">
        <SectionHeader title="Què són els bolets de soca?" titleId="soca-name" meta="Un nom ampli" />
        <p>El Museu de les Terres de l’Ebre presenta sota aquest nom diversos fongs que creixen sobre fusta, com <i>Fomes fomentarius</i>, <i>Phellinus torulosus</i> i <i>Ganoderma lucidum</i>. Aquests altres exemples encara no tenen fitxa al nostre catàleg. Per tant, buscar «bolet de soca» no equival a buscar una sola fitxa científica.</p>
        <p>Alguns d’aquests fongs descomponen fusta morta; d’altres també poden viure sobre arbres vius. El substrat és una part del context ecològic, no una prova de comestibilitat. <a href={woodFungiSource.url}>Vegeu els exemples documentats pel museu.</a></p>
      </section>
      <section className="seo-guide-section" aria-labelledby="soca-observation">
        <SectionHeader title="Què convé documentar?" titleId="soca-observation" meta="Abans de posar-hi un nom" />
        <div className="seo-guide-grid">
          <section><h3>La fusta i l’entorn</h3><p>Fotografieu el suport sencer: tronc, soca, branca o fusta caiguda. Anoteu l’arbre només si el coneixeu; si no, deixeu-lo com a desconegut. No publiqueu coordenades de punts sensibles.</p></section>
          <section><h3>La forma i la unió al suport</h3><p>Descriviu si hi ha peu visible, si el bolet s’uneix lateralment a la fusta i si apareix sol o agrupat. Els exemples del museu inclouen formes adherides al tronc i formes amb peu.</p></section>
          <section><h3>La cara inferior</h3><p>Una vista superior sola deixa informació fora. Si és possible sense malmetre l’exemplar, afegiu una fotografia de sota i descriviu-ne la superfície. La guia de parts explica el vocabulari, no resol la identificació.</p></section>
          <section><h3>Allò que no sabem</h3><p>No completeu una descripció amb trets que no heu observat. Una fotografia, un nom popular o una semblança amb un exemplar del catàleg no substitueixen l’examen d’una persona experta.</p></section>
        </div>
      </section>
      <section className="seo-guide-section" aria-labelledby="soca-safety">
        <SectionHeader title="Créixer sobre fusta no és una garantia" titleId="soca-safety" meta="Cap regla de consum" />
        <p>No agrupem aquests bolets en una llista de «comestibles» pel substrat. Per a qualsevol dubte d’identificació o consum, seguiu els <a href={officialSafetySource.url}>consells de seguretat de l’ACSA</a> i consulteu una persona experta. No tasteu exemplars per intentar posar-los nom.</p>
        <nav className="rain-guide-actions" aria-label="Lectures relacionades amb els bolets de soca">
          <Link href="/parts-dun-bolet">Parts d’un bolet <ArrowUpRight size={16} aria-hidden="true" /></Link>
          <Link href="/bolets-verinosos">Confusions i bolets verinosos <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </nav>
      </section>
      <EditorialAttribution contentId="bolets-de-soca" sources={[woodFungiSource, officialSafetySource]} />
    </PageShell>
  );
}
