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
  title: "Bolets després de ploure: quan surten?",
  description: "No hi ha un nombre universal de dies. Compareu la resposta a la pluja de rovelló, pinetell, cep, camagroc, múrgola i cama-sec.",
  alternates: { canonical: "/quan-surten-els-bolets-despres-de-ploure" },
  openGraph: {
    url: "/quan-surten-els-bolets-despres-de-ploure",
    title: "Quan surten els bolets després de ploure?",
    description: "Humitat del sòl, pluja efectiva de 14, 21 o 26 dies, ET₀, sequera i temperatura expliquen per què no hi ha una xifra única.",
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
        <article><Droplets size={22} /><h2>Aigua efectiva i sòl</h2><p>La lectura integra la humitat superficial del sòl durant 7 dies amb pluja efectiva i nombre de dies humits. La finestra és de 14 o 21 dies segons el gremi, i de 26 dies per al cep.</p></article>
        <article><ThermometerSun size={22} /><h2>Temperatura acumulada</h2><p>La resposta tèrmica usa una mitjana de 14 o 20 dies, no només la temperatura d’avui. Les hores de gelada i de calor intensa redueixen la resposta encara que el sòl sigui humit.</p></article>
        <article><Wind size={22} /><h2>Assecat atmosfèric</h2><p>L’ET₀ redueix la pluja efectiva; la humitat i la temperatura estimen el dèficit de vapor, i una ratxa seca persistent penalitza la retenció. Tot això entra una sola vegada en l’estat hídric.</p></article>
      </section>

      <section className="rain-species-examples" aria-labelledby="rain-species-title">
        <div><p className="eyebrow">Exemples derivats de les fitxes</p><h2 id="rain-species-title">Sis respostes, cap rellotge únic</h2><p>Els retards descriuen patrons ecològics orientatius. El mapa no activa un compte enrere després de cada xàfec: avalua conjuntament la memòria d’aigua, la temperatura, els extrems i la temporada.</p></div>
        {exampleSpecies.map((species) => {
          const rainfall = species!.ecologicalConfig.rainfall;
          return <article key={species!.speciesId}><div><span>{species!.identity.commonName}</span><em>{species!.identity.scientificName}</em></div><dl><div><dt>Resposta temporal descrita</dt><dd>{rainfall.fruitingDelay}</dd></div><div><dt>Aigua necessària</dt><dd>{rainfall.preferredAccumulation}</dd></div><div><dt>Humitat prèvia</dt><dd>{rainfall.priorMoisture}</dd></div><div><dt>Pot interrompre’s per</dt><dd>{rainfall.interruption}</dd></div></dl><p>{rainfall.uncertainty}</p><Link href={speciesPath(species!)} className="text-link">Veure la fitxa <ArrowUpRight size={15} /></Link></article>;
        })}
      </section>

      <EditorialAttribution contentId="quan-surten-els-bolets-despres-de-ploure" sources={[...coreEditorialSources, ...exampleSpecies.flatMap((species) => species!.references)]} />
    </PageShell>
  );
}
