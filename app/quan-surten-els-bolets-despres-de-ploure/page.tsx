import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CloudRain, Droplets, ThermometerSun, Wind } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { coreEditorialSources, editorialArticleFields } from "@/data/editorial";
import { getSpecies } from "@/data/species";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, SITE_URL, speciesPath } from "@/src/lib/seo";

export const metadata: Metadata = {
  title: "Quan surten els bolets després de ploure? Factors i espècies",
  description: "No hi ha un nombre universal de dies. Compara la resposta a la pluja de rovelló, pinetell, cep, camagroc, múrgola i cama-sec.",
  alternates: { canonical: "/quan-surten-els-bolets-despres-de-ploure" },
  openGraph: {
    url: "/quan-surten-els-bolets-despres-de-ploure",
    title: "Quan surten els bolets després de ploure?",
    description: "Humitat prèvia, pluja de 3, 7 i 30 dies, ET₀, sequera, temperatura i vent expliquen per què no hi ha una xifra única.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

const exampleSpecies = [
  "lactarius-sanguifluus",
  "lactarius-deliciosus",
  "boletus-edulis",
  "craterellus-lutescens",
  "morchella-esculenta",
  "marasmius-oreades",
].map((id) => getSpecies(id)).filter((species) => Boolean(species));

export default function MushroomsAfterRainPage() {
  return (
    <PageShell as="article">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Quan surten els bolets després de ploure?",
        url: absoluteUrl("/quan-surten-els-bolets-despres-de-ploure"),
        inLanguage: "ca",
        publisher: { "@id": `${SITE_URL}/#organization` },
        ...editorialArticleFields("quan-surten-els-bolets-despres-de-ploure"),
      }} />
      <PageHeader
        eyebrow={<><CloudRain size={15} /> Pluja i fructificació</>}
        title={<>Quan surten els bolets<br /><PageTitleAccent>després de ploure?</PageTitleAccent></>}
        description={<><strong>No hi ha un nombre universal de dies.</strong> Un xàfec pot no ser suficient i dues espècies del mateix bosc poden respondre en moments diferents. El que importa és la història d’aigua i energia del sòl, no només la pluja d’ahir.</>}
        layout="split"
      />

      <section className="rain-factor-grid" aria-label="Factors que modulen la resposta a la pluja">
        <article><Droplets size={22} /><h2>Humitat i acumulació</h2><p>La lectura combina pluja de 3, 7 i 30 dies, inclosos els dies 8–30, amb la memòria d’humitat superficial del sòl durant 7 dies.</p></article>
        <article><ThermometerSun size={22} /><h2>Demanda atmosfèrica</h2><p>L’ET₀ de 3, 7 i 30 dies ajuda a estimar quanta aigua pot haver tornat a l’atmosfera. La temperatura després de ploure pot accelerar o frenar el procés.</p></article>
        <article><Wind size={22} /><h2>Sequera i vent</h2><p>La durada del període sec i el vent poden dessecar fullaraca, pinassa i carpòfors. Per això dos episodis amb els mateixos mil·límetres poden acabar diferent.</p></article>
      </section>

      <section className="rain-species-examples" aria-labelledby="rain-species-title">
        <div><p className="eyebrow">Exemples derivats de les fitxes</p><h2 id="rain-species-title">Sis respostes, cap rellotge únic</h2></div>
        {exampleSpecies.map((species) => {
          const rainfall = species!.ecologicalConfig.rainfall;
          return <article key={species!.speciesId}><div><span>{species!.identity.commonName}</span><em>{species!.identity.scientificName}</em></div><dl><div><dt>Retard orientatiu</dt><dd>{rainfall.fruitingDelay}</dd></div><div><dt>Aigua necessària</dt><dd>{rainfall.preferredAccumulation}</dd></div><div><dt>Humitat prèvia</dt><dd>{rainfall.priorMoisture}</dd></div><div><dt>Pot interrompre’s per</dt><dd>{rainfall.interruption}</dd></div></dl><p>{rainfall.uncertainty}</p><Link href={speciesPath(species!)} className="text-link">Veure la fitxa <ArrowUpRight size={15} /></Link></article>;
        })}
      </section>

      <EditorialAttribution contentId="quan-surten-els-bolets-despres-de-ploure" sources={[...coreEditorialSources, ...exampleSpecies.flatMap((species) => species!.references)]} />
    </PageShell>
  );
}
