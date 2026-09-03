import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  ChefHat,
  Clock3,
  CookingPot,
  Refrigerator,
  ShieldCheck,
  Snowflake,
  Tag,
} from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import {
  PageHeader,
  PageShell,
  PageTitleAccent,
  SectionHeader,
} from "@/components/page-layout";
import {
  editorialArticleFields,
  mushroomPreservationSources,
  officialSafetySource,
} from "@/data/editorial";
import { getSpecies } from "@/data/species";
import {
  absoluteUrl,
  DEFAULT_SOCIAL_IMAGE,
  SITE_URL,
  speciesPath,
} from "@/src/lib/seo";

const title = "Com conservar i congelar bolets amb seguretat";
const description = "Aprèn com conservar i congelar bolets: escaldat, cocció, porcions, etiquetatge i descongelació segura segons les recomanacions de l’ACSA.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/conservar-bolets" },
  openGraph: {
    type: "article",
    url: "/conservar-bolets",
    title,
    description,
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

const preservationSpecies = [
  "boletus-edulis",
  "lactarius-sanguifluus",
  "craterellus-lutescens",
  "hygrophorus-latitabundus",
].map((speciesId) => {
  const species = getSpecies(speciesId);
  if (!species || species.culinaryProfile.kind !== "culinary") {
    throw new Error(`Missing culinary preservation profile: ${speciesId}`);
  }
  return species;
});

const preservationDetails: Record<string, { id: string; guidance: string }> = {
  "boletus-edulis": {
    id: "conservar-ceps",
    guidance: "Talla els ceps sans a làmines per assecar-los o cuina’ls breument abans de congelar-los. Descarta les parts toves o parasitades i etiqueta cada porció.",
  },
  "lactarius-sanguifluus": {
    id: "conservar-rovellons",
    guidance: "Neteja els rovellons sense deixar-los en remull, cuina’ls abans de congelar i separa les porcions. La conserva no corregeix una identificació dubtosa.",
  },
  "craterellus-lutescens": {
    id: "congelar-camagrocs",
    guidance: "Els camagrocs es poden assecar ben estesos o congelar després d’una cocció breu. Revisa els plecs, el peu buit i qualsevol exemplar barrejat abans de conservar-los.",
  },
  "hygrophorus-latitabundus": {
    id: "conservar-llenegues",
    guidance: "Neteja amb cura la superfície viscosa, cuina les llenegues abans de congelar-les i evita guardar exemplars passats o identificats només pel tacte del barret.",
  },
};

const faqs = [
  {
    question: "Es poden congelar els bolets crus?",
    answer: "L’ACSA recomana, com a mètode domèstic, congelar els bolets després d’escaldar-los breument. També es poden congelar després de cuinar-los, per exemple saltats o rostits. Preparar-los abans de congelar ajuda a conservar-los i evita haver de decidir el tractament quan ja estan descongelats.",
  },
  {
    question: "Com es poden congelar els ceps?",
    answer: "La fitxa del cep recomana assecar-los a làmines o congelar-los després d’una cocció breu. Neteja’ls, retira les parts toves o alterades, cuina’ls, deixa’ls refredar, reparteix-los en porcions tancades i etiqueta-les amb el contingut i la data.",
  },
  {
    question: "Quant de temps es poden guardar al congelador?",
    answer: "L’ACSA recomana conservar un màxim de dos mesos els productes congelats a casa. Mantén el congelador a −18 °C, protegeix els aliments en recipients tancats i etiqueta cada porció amb la data per poder controlar aquest termini.",
  },
  {
    question: "Es poden tornar a congelar els bolets descongelats?",
    answer: "No s’ha de tornar a congelar un aliment descongelat, tret que s’hagi cuinat abans de congelar-lo de nou. Descongela els bolets a la nevera; si utilitzes el microones, cuina’ls immediatament. No els deixis descongelar a temperatura ambient.",
  },
] as const;

export default function PreserveMushroomsPage() {
  return (
    <PageShell as="article" className="preservation-guide">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Article",
            "@id": `${absoluteUrl("/conservar-bolets")}#article`,
            headline: title,
            description,
            url: absoluteUrl("/conservar-bolets"),
            inLanguage: "ca",
            isPartOf: { "@id": `${SITE_URL}/#website` },
            publisher: { "@id": `${SITE_URL}/#organization` },
            citation: mushroomPreservationSources.map((source) => source.url),
            ...editorialArticleFields("conservar-bolets"),
          },
          {
            "@type": "FAQPage",
            "@id": `${absoluteUrl("/conservar-bolets")}#preguntes`,
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Inici", item: absoluteUrl() },
              { "@type": "ListItem", position: 2, name: "Guies", item: absoluteUrl("/guies") },
              { "@type": "ListItem", position: 3, name: "Conservar bolets", item: absoluteUrl("/conservar-bolets") },
            ],
          },
        ],
      }} />

      <PageHeader
        eyebrow={<><Snowflake size={15} /> Conservació i seguretat alimentària</>}
        title={<>Com conservar i congelar<br /><PageTitleAccent>bolets amb seguretat.</PageTitleAccent></>}
        description="Una guia pràctica per preparar, porcionar, congelar i descongelar bolets a casa sense convertir la conservació en una falsa garantia d’identificació."
        layout="split"
        tone="forest"
      />

      <aside className="preservation-direct-answer">
        <Snowflake size={24} aria-hidden="true" />
        <div>
          <p className="eyebrow">Resposta curta</p>
          <h2>Escalda o cuina els bolets abans de congelar-los.</h2>
          <p>L’ACSA recomana escaldar-los breument, escórrer-los, deixar-los refredar i congelar-los per porcions. També es poden congelar ja saltats o rostits. La congelació atura el creixement dels microorganismes, però no elimina els que ja hi havia ni fa segur un bolet mal identificat.</p>
        </div>
      </aside>

      <section className="preservation-steps" aria-labelledby="preservation-steps-title">
        <SectionHeader
          meta="Abans del congelador"
          title="Sis passos que eviten els errors més habituals"
          titleId="preservation-steps-title"
          description="Identificació, higiene, temperatura i etiquetatge formen part del mateix procés."
        />
        <ol className="preservation-step-grid">
          <li><span>1</span><div><h3>Identifica</h3><p>Conserva només exemplars identificats amb certesa. Congelar o cuinar no neutralitza les toxines d’un bolet verinós.</p></div></li>
          <li><span>2</span><div><h3>Tria</h3><p>Descarta exemplars tous, parasitats, florits, alterats o amb una olor que no correspon al bolet fresc.</p></div></li>
          <li><span>3</span><div><h3>Neteja</h3><p>Retira pinassa, terra i parts malmeses. Utilitza aigua només quan calgui i escorre bé els bolets.</p></div></li>
          <li><span>4</span><div><h3>Escalda o cuina</h3><p>Submergeix-los uns segons en aigua bullent o cuina’ls, per exemple saltats o rostits.</p></div></li>
          <li><span>5</span><div><h3>Refreda i porciona</h3><p>Escorre’ls, deixa’ls refredar i reparteix-los en porcions dins de recipients o embolcalls tancats.</p></div></li>
          <li><span>6</span><div><h3>Etiqueta</h3><p>Indica el bolet, la preparació, la data i les racions. Mantén el congelador a −18 °C.</p></div></li>
        </ol>
      </section>

      <section className="preservation-methods" aria-labelledby="preservation-methods-title">
        <SectionHeader
          meta="Mètodes"
          title="No tots els bolets es conserven igual"
          titleId="preservation-methods-title"
          description="La textura, el gruix i l’ús culinari fan que cada espècie respongui millor a una preparació diferent."
        />
        <div className="preservation-method-grid">
          <article><Snowflake size={22} /><h3>Escaldats i congelats</h3><p>És el mètode domèstic general que descriu l’ACSA: una preparació breu, refredament i porcions tancades.</p></article>
          <article><ChefHat size={22} /><h3>Cuinats i congelats</h3><p>Saltats, rostits o integrats en una preparació. Deixa’ls refredar abans de tancar i congelar.</p></article>
          <article><Refrigerator size={22} /><h3>Descongelats a la nevera</h3><p>Utilitza un recipient que reculli els líquids. Si fas servir el microones, cuina’ls immediatament.</p></article>
        </div>
      </section>

      <section className="preservation-species" aria-labelledby="preservation-species-title">
        <SectionHeader
          meta="Quatre exemples"
          title="Ceps, rovellons, camagrocs i llenegues"
          titleId="preservation-species-title"
          description="Aquestes orientacions provenen de les fitxes culinàries del catàleg; consulta sempre el perfil complet abans de preparar una espècie."
        />
        <div className="preservation-species-list">
          {preservationSpecies.map((species) => (
            <article id={preservationDetails[species.speciesId]?.id} key={species.speciesId}>
              <div><strong>{species.identity.commonName}</strong><em>{species.identity.scientificName}</em></div>
              <div className="preservation-species-copy">
                <p>{preservationDetails[species.speciesId]?.guidance}</p>
                <small>{species.culinaryProfile.kind === "culinary" ? species.culinaryProfile.preservation.join(" · ") : ""}</small>
              </div>
              <Link href={speciesPath(species)} className="text-link">Veure la fitxa <ArrowUpRight size={15} /></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="preservation-cold-chain" aria-labelledby="preservation-cold-title">
        <div><p className="eyebrow light">Cadena de fred</p><h2 id="preservation-cold-title">Congelar és una pausa, no una desinfecció.</h2></div>
        <div>
          <p><Clock3 size={18} /> L’ACSA recomana un màxim de dos mesos per als productes congelats a casa.</p>
          <p><Tag size={18} /> L’etiqueta permet controlar el contingut, la data i la mida de cada ració.</p>
          <p><ShieldCheck size={18} /> No tornis a congelar un aliment descongelat si abans no l’has cuinat.</p>
        </div>
      </section>

      <section className="preservation-faq" aria-labelledby="preservation-faq-title">
        <SectionHeader meta="Preguntes freqüents" title="Dubtes sobre congelar bolets" titleId="preservation-faq-title" />
        <div>
          {faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
        </div>
      </section>

      <nav className="rain-guide-actions" aria-label="Continuar explorant les guies de bolets">
        <Link href="/bolets-comestibles">Veure els bolets comestibles <CookingPot size={16} /></Link>
        <Link href="/bolets">Consultar les fitxes <ArrowUpRight size={16} /></Link>
        <Link href="/preguntes-frequents-bolets">Preguntes de seguretat <ArrowUpRight size={16} /></Link>
      </nav>

      <EditorialAttribution
        contentId="conservar-bolets"
        sources={[
          officialSafetySource,
          ...mushroomPreservationSources,
          ...preservationSpecies.flatMap((species) => species.references),
        ]}
        variant="compact"
      />
    </PageShell>
  );
}
