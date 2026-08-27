import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ScanLine } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { EditorialSafetyNotice } from "@/components/editorial-safety-notice";
import { JsonLd } from "@/components/json-ld";
import { SpeciesCard } from "@/components/species-card";
import { PageHeader, PageShell, PageTitleAccent, SectionHeader } from "@/components/page-layout";
import { editorialArticleFields, officialSafetySource } from "@/data/editorial";
import { falseChanterelleSources } from "@/data/field-guide-sources";
import { getSpecies } from "@/data/species";
import { getReferenceSpecies } from "@/data/reference-species";
import { toSpeciesCardProfile } from "@/src/lib/species-card-profile";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, metaDescription, pageTitle, SITE_URL } from "@/src/lib/seo";

const path = "/fals-rossinyol";
const title = pageTitle("Fals rossinyol: trets i confusions");
const description = metaDescription("Fals rossinyol: diferències amb el rossinyol i el bolet d’olivera, hàbitat, temporada i precaucions sobre la comestibilitat. Amb fonts citades.");
const relatedSpecies = ["hygrophoropsis-aurantiaca", "cantharellus-cibarius", "omphalotus-olearius"].map((id) => {
  const species = getSpecies(id) ?? getReferenceSpecies(id);
  if (!species) throw new Error(`Missing false-chanterelle related catalogue species: ${id}`);
  return toSpeciesCardProfile(species);
});

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: path },
  openGraph: { type: "article", url: path, title, description, images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title, description, images: [DEFAULT_SOCIAL_IMAGE] },
};

export default function FalseChanterelleGuidePage() {
  const url = absoluteUrl(path);
  return (
    <PageShell as="article">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Article", "@id": `${url}#article`, headline: "Fals rossinyol: trets i confusions", description, url, inLanguage: "ca", isPartOf: { "@id": `${SITE_URL}/#website` }, publisher: { "@id": `${SITE_URL}/#organization` }, ...editorialArticleFields("fals-rossinyol") },
          { "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Inici", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Bolets", item: absoluteUrl("/bolets") },
            { "@type": "ListItem", position: 3, name: "Fals rossinyol", item: url },
          ] },
        ],
      }} />
      <PageHeader
        eyebrow={<><ScanLine size={15} /> Noms i confusions</>}
        title={<>Fals rossinyol,<br /><PageTitleAccent>trets i confusions.</PageTitleAccent></>}
        description="El fals rossinyol (Hygrophoropsis aurantiaca) és un bolet taronja que es pot confondre amb el rossinyol o el bolet d’olivera. Conegueu-ne els trets, l’hàbitat i les precaucions sobre la comestibilitat."
        layout="split"
      />
      <EditorialSafetyNotice />
      <section className="seo-guide-section" aria-labelledby="false-chanterelle-names">
        <SectionHeader title="Fals rossinyol, rossinyol i bolet d’olivera: què els diferencia?" titleId="false-chanterelle-names" meta="Trets que cal observar" />
        <div className="seo-guide-grid">
          <section><h3>Fals rossinyol</h3><p><i>Hygrophoropsis aurantiaca</i>. Té tons taronja, el centre del barret enfonsat i làmines denses, sovint bifurcades, que baixen pel peu.</p></section>
          <section><h3>Rossinyol</h3><p><i>Cantharellus cibarius</i>. Sota el barret té plecs, en lloc de les làmines del fals rossinyol. Aquesta diferència és un tret de comparació, no una comprovació suficient per identificar-lo.</p></section>
          <section><h3>Bolet d’olivera</h3><p><i>Omphalotus olearius</i>, també anomenat gírgola d’olivera. És tòxic i també es pot assemblar al fals rossinyol, però són espècies diferents.</p></section>
          <section><h3>No n’hi ha prou amb el color</h3><p>Hi ha altres espècies semblants. Una fotografia o un únic tret no permeten descartar totes les confusions possibles.</p></section>
        </div>
        <p>Descripcions basades en la <a href={falseChanterelleSources[0].url}>fitxa del fals rossinyol de la ICHN</a>.</p>
      </section>
      <section className="seo-guide-section" aria-labelledby="false-chanterelle-species">
        <SectionHeader
          title="Fitxes per comparar"
          titleId="false-chanterelle-species"
          meta="Fotografies i descripcions"
          description="Consulteu la fitxa del fals rossinyol i les de les dues espècies amb què es pot confondre. Les fotografies són orientatives, no una prova d’identificació."
          actions={<Link className="text-link" href="/compare/rossinyol-vs-bolet-olivera">Rossinyol i bolet d’olivera <ArrowUpRight size={16} aria-hidden="true" /></Link>}
        />
        <div className="species-grid">
          {relatedSpecies.map((species, index) => (
            <SpeciesCard
              key={species.speciesId}
              species={species}
              index={index}
            />
          ))}
        </div>
      </section>
      <section className="seo-guide-section" aria-labelledby="false-chanterelle-edibility">
        <SectionHeader title="El fals rossinyol és comestible?" titleId="false-chanterelle-edibility" meta="Precaucions de consum" />
        <p><strong>No el considereu un bolet per al consum.</strong> La <a href={falseChanterelleSources[0].url}>ICHN</a> el descriu com a no comestible. <a href={falseChanterelleSources[1].url}>Aranzadi</a> el classifica com a sospitós i sense valor culinari. La diferència entre aquestes etiquetes no vol dir que sigui segur menjar-ne.</p>
      </section>
      <section className="seo-guide-section" aria-labelledby="false-chanterelle-habitat">
        <SectionHeader title="On i quan apareix?" titleId="false-chanterelle-habitat" meta="Hàbitat i temporada" />
        <p>És un bolet de tardor: la <a href={falseChanterelleSources[0].url}>ICHN</a> el situa en pinedes i rouredes, i <a href={falseChanterelleSources[1].url}>Aranzadi</a> en boscos de coníferes. El tipus de bosc i l’època de l’any aporten context, però no confirmen la identitat d’un exemplar.</p>
      </section>
      <section className="seo-guide-section" aria-labelledby="false-chanterelle-next">
        <SectionHeader title="Què fer si teniu dubtes?" titleId="false-chanterelle-next" meta="Identificació amb prudència" />
        <p>No el consumiu i consulteu una persona experta. Per explicar què heu trobat, reuniu fotografies del barret, la cara inferior, el peu sencer i el lloc on creix. Les imatges ajuden a descriure’l, però no substitueixen la identificació de l’exemplar.</p>
      </section>
      <EditorialAttribution contentId="fals-rossinyol" sources={[...falseChanterelleSources, officialSafetySource]} />
    </PageShell>
  );
}
