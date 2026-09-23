import "@/app/styles/guide-blocks.css";
import "@/app/styles/preservation-guide.css";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  CalendarClock,
  CookingPot,
  Droplets,
  Flame,
  FlaskConical,
  ListChecks,
  Package,
  Refrigerator,
  ScanSearch,
  Scissors,
  ShieldCheck,
  ShoppingBasket,
  Snowflake,
  Sun,
  Tag,
  TriangleAlert,
} from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { FaqSection } from "@/components/faq";
import { faqPageSchema } from "@/src/lib/faq-schema";
import { JsonLd } from "@/components/json-ld";
import { SpeciesIcon } from "@/components/species-icon";
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
const description = "Com conservar bolets: congelar-los escaldats o cuinats, assecar-los a làmines o fer-los en escabetx, amb les recomanacions de l’ACSA.";

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

function preservationMethodIcon(method: string) {
  const normalized = method.toLowerCase();
  if (normalized.includes("assec")) return Sun;
  if (normalized.includes("escabetx") || normalized.includes("vinagre")) return FlaskConical;
  if (normalized.includes("congel")) return Snowflake;
  return Package;
}

const faqs = [
  {
    question: "Quant duren els bolets a la nevera?",
    answer: "Pocs dies. L’ACSA recomana guardar els bolets frescos al frigorífic fins al moment de cuinar-los i fer-ho aviat, d’un a tres dies després de la collita. La nevera ha d’estar entre 1 i 4 °C, i els bolets s’hi han de guardar evitant la humitat. Si no els cuinaràs en aquest termini, congela’ls, asseca’ls o fes-los en escabetx.",
  },
  {
    question: "Com es netegen els bolets?",
    answer: "Retira la pinassa, la terra i les parts malmeses, i utilitza aigua només quan calgui, en poca quantitat i escorrent-los bé. Els ceps es raspallen sense amarar-los; als rovellons cal netejar bé les làmines, i els camagrocs s’obren de dalt a baix per treure’n sorra i agulles. Si després de menjar-ne apareixen símptomes, les restes de la neteja ajuden a identificar l’espècie a l’hospital.",
  },
  {
    question: "Es poden congelar els bolets crus?",
    answer: "L’ACSA recomana, com a mètode domèstic, congelar els bolets després d’escaldar-los breument. També es poden congelar després de cuinar-los, per exemple saltats o rostits. Preparar-los abans de congelar ajuda a conservar-los i evita haver de decidir el tractament quan ja estan descongelats.",
  },
  {
    question: "Com s’assequen els bolets a casa?",
    answer: "Neteja’ls en sec, retira els peus llenyosos, talla’ls a làmines i estén-los sense que es toquin en un lloc sec i ventilat o en un deshidratador, on necessiten unes 8–10 hores; no cal escaldar-los. Guarda’ls en pots hermètics quan estiguin completament secs. Per menjar-los, rehidrata’ls i cuina’ls: l’assecat no substitueix la cocció.",
  },
  {
    question: "Com es fan els bolets en escabetx?",
    answer: "L’ACSA indica escaldar els bolets mig minut, posar-los en pots de vidre i cobrir-los amb un escabetx bullit 2 minuts (2 gots de vinagre de vi blanc, mig got d’aigua, una culleradeta de sucre, una de sal i farigola), amb un rajolí d’oli a sobre. Després els pots s’esterilitzen al bany maria un mínim de 30 minuts. No redueixis el vinagre i llença qualsevol pot inflat, amb pèrdues o amb mala olor.",
  },
  {
    question: "Com es conserven els ceps?",
    answer: "Els ceps es poden assecar a làmines o congelar després d’una cocció breu. Raspalla’ls sense amarar-los i retira les parts toves, parasitades o alterades. Per congelar-los, cuina’ls, deixa’ls refredar, reparteix-los en porcions tancades i etiqueta-les amb el contingut i la data. Assecats, concentren l’aroma i també es poden moldre en pols.",
  },
  {
    question: "Com es conserven els rovellons?",
    answer: "Els rovellons es conserven millor congelats després de cuinar-los o en escabetx guardat a la nevera. Neteja bé les làmines sense deixar-los en remull i retira les parts parasitades o massa verdes i toves. Per a l’escabetx, segueix la recepta de l’ACSA: escaldats mig minut, coberts de vinagre i esterilitzats al bany maria.",
  },
  {
    question: "Es poden congelar els camagrocs?",
    answer: "Sí, després de saltar-los. També es poden assecar sencers, i un cop secs concentren molt l’aroma. Abans, obre’ls de dalt a baix per treure’n sorra i agulles, neteja’ls ràpidament i eixuga’ls bé; revisa cada exemplar, perquè en una collita es poden barrejar espècies diferents.",
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
          faqPageSchema(faqs, `${absoluteUrl("/conservar-bolets")}#preguntes`),
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
        description={<><strong>Congelats, secs o en escabetx.</strong> Tres maneres de guardar els bolets a casa sense convertir la conservació en una falsa garantia d’identificació.</>}
        layout="split"
      />

      <aside className="panel-dark guide-answer" aria-labelledby="preservation-answer-title">
        <Snowflake size={24} aria-hidden="true" />
        <div>
          <p className="eyebrow">Resposta curta</p>
          <h2 id="preservation-answer-title">Escalda o cuina els bolets abans de congelar-los, o asseca’ls a làmines.</h2>
          <ul className="guide-answer-points">
            <li><strong>Nevera</strong><span>Frescos, d’un a tres dies després de collir-los</span></li>
            <li><strong>Congelar</strong><span>Escaldats o cuinats, a −18 °C i un màxim de dos mesos</span></li>
            <li><strong>Assecar</strong><span>A làmines, ben secs i en pots hermètics</span></li>
            <li><strong>Escabetx</strong><span>Escaldats, amb vinagre i esterilitzats al bany maria</span></li>
          </ul>
          <p>Cap mètode no fa segur un bolet mal identificat: congelar, assecar o cuinar no n’elimina les toxines.</p>
        </div>
      </aside>

      <section className="guide-section" id="frescos" aria-labelledby="preservation-fresh-title">
        <SectionHeader
          meta="Bolets frescos"
          title="Del cistell a la nevera"
          titleId="preservation-fresh-title"
          description="Si els has de cuinar aviat, no cal conservar-los: n’hi ha prou de transportar-los bé i guardar-los al fred uns pocs dies."
        />
        <div className="guide-factor-grid">
          <article><ShoppingBasket size={22} /><span>Transport</span><h3>Cistell rígid i airejat</h3><p>Preferentment de vímet, perquè no s’aixafin ni es deteriorin durant la collita.</p></article>
          <article><Refrigerator size={22} /><span>Nevera</span><h3>Entre 1 i 4 °C</h3><p>Guarda’ls al frigorífic fins al moment de cuinar-los, evitant la humitat.</p></article>
          <article><CalendarClock size={22} /><span>Termini</span><h3>D’un a tres dies</h3><p>Cuina’ls aviat després de la collita. Si no hi arribes, congela’ls, asseca’ls o fes-los en escabetx.</p></article>
        </div>
      </section>

      <section className="guide-section" aria-labelledby="preservation-before-title">
        <SectionHeader
          meta="Preparació"
          title="Abans de conservar-los: identifica, tria i neteja"
          titleId="preservation-before-title"
          description="Identificació, tria i neteja són iguals tant si els congeles com si els asseques o els poses en escabetx."
        />
        <ol className="guide-step-flow">
          <li><span aria-hidden="true">1</span><ScanSearch size={20} /><h3>Identifica</h3><p>Conserva només exemplars identificats amb certesa. Congelar, assecar o cuinar no neutralitza les toxines d’un bolet verinós.</p></li>
          <li><span aria-hidden="true">2</span><ListChecks size={20} /><h3>Tria</h3><p>Descarta exemplars tous, parasitats, florits, alterats o amb una olor que no correspon al bolet fresc.</p></li>
          <li><span aria-hidden="true">3</span><Droplets size={20} /><h3>Neteja</h3><p>Retira pinassa, terra, parts malmeses i peus llenyosos. Utilitza poca aigua i només quan calgui, i escorre bé els bolets. Obre els camagrocs per treure’n sorra i agulles.</p></li>
        </ol>
      </section>

      <section className="guide-section" aria-labelledby="preservation-methods-title">
        <SectionHeader
          meta="Tria el mètode"
          title="Tres maneres de conservar bolets"
          titleId="preservation-methods-title"
          description="La textura, el gruix i l’ús culinari fan que cada espècie respongui millor a una preparació diferent."
        />
        <div className="guide-factor-grid">
          <article><Snowflake size={22} /><span>Congelador</span><h3>Congelats</h3><p>El mètode domèstic que recomana l’ACSA: escaldats o cuinats, refredats i en porcions tancades.</p></article>
          <article><Sun size={22} /><span>Rebost</span><h3>Secs</h3><p>L’assecament concentra el gust. Els bolets de carn prima, com els camagrocs o els ceps a làmines, hi responen bé.</p></article>
          <article><FlaskConical size={22} /><span>Pot de vidre</span><h3>En escabetx</h3><p>Escaldats i coberts de vinagre en pots esterilitzats. Demana seguir la recepta al peu de la lletra.</p></article>
        </div>
      </section>

      <section className="guide-section preservation-method" id="congelar" aria-labelledby="preservation-freeze-title">
        <SectionHeader
          meta="Mètode 1 · Congelador"
          title="Com congelar bolets"
          titleId="preservation-freeze-title"
          description="Escaldats o cuinats, i en porcions. L’ACSA ho considera la millor manera de conservar-los a casa, tant els bolets petits com els grans tallats a trossos."
        />
        <ol className="guide-step-flow">
          <li><span aria-hidden="true">1</span><CookingPot size={20} /><h3>Escalda o cuina</h3><p>Submergeix-los uns segons en aigua bullent, o cuina’ls saltats o rostits.</p></li>
          <li><span aria-hidden="true">2</span><Package size={20} /><h3>Refreda i porciona</h3><p>Escorre’ls, deixa’ls refredar i reparteix-los en porcions dins de recipients o embolcalls tancats.</p></li>
          <li><span aria-hidden="true">3</span><Tag size={20} /><h3>Etiqueta i congela</h3><p>Indica el bolet, la preparació, la data i les racions. Mantén el congelador a −18 °C.</p></li>
        </ol>
        <div className="panel-dark guide-summary-panel">
          <div><span>Temps</span><strong>L’ACSA recomana un màxim de dos mesos per als productes congelats a casa.</strong></div>
          <div><span>Descongelar</span><strong>A la nevera, en un recipient que reculli els líquids; al microones, cuina’ls immediatament.</strong></div>
          <p><ShieldCheck size={17} aria-hidden="true" /> Congelar és una pausa, no una desinfecció. No tornis a congelar un aliment descongelat si abans no l’has cuinat.</p>
        </div>
      </section>

      <section className="guide-section preservation-method" id="assecar" aria-labelledby="preservation-dry-title">
        <SectionHeader
          meta="Mètode 2 · Rebost"
          title="Com assecar bolets"
          titleId="preservation-dry-title"
          description="A làmines, fins que no els quedi aigua. L’assecament concentra el sabor i permet guardar-los en pots hermètics; també es poden moldre per obtenir pols de bolet."
        />
        <ol className="guide-step-flow">
          <li><span aria-hidden="true">1</span><Scissors size={20} /><h3>Talla a làmines</h3><p>Talla’ls a làmines d’un gruix regular. Els bolets petits o prims, com els camagrocs, es poden assecar sencers. No cal escaldar-los.</p></li>
          <li><span aria-hidden="true">2</span><Sun size={20} /><h3>Asseca</h3><p>Estén-los sense que es toquin en un lloc sec i ventilat o en un deshidratador, on necessiten unes 8–10 hores.</p></li>
          <li><span aria-hidden="true">3</span><Archive size={20} /><h3>Guarda en pots hermètics</h3><p>Tanca’ls només quan estiguin completament secs i etiqueta cada pot amb el bolet i la data.</p></li>
        </ol>
        <div className="panel-dark guide-summary-panel">
          <div><span>Rehidratar</span><strong>Deixa’ls en aigua fins que recuperin la textura abans de cuinar-los.</strong></div>
          <div><span>Pols</span><strong>Ben secs, es poden moldre per obtenir pols de bolet.</strong></div>
          <p><ShieldCheck size={17} aria-hidden="true" /> L’assecat no substitueix la cocció: un cop rehidratats, cuina’ls completament.</p>
        </div>
      </section>

      <section className="guide-section preservation-method" id="escabetx" aria-labelledby="preservation-pickle-title">
        <SectionHeader
          meta="Mètode 3 · Pot de vidre"
          title="Com fer bolets en escabetx"
          titleId="preservation-pickle-title"
          description="Vinagre, pots nets i bany maria, segons la recepta de l’ACSA. L’acidesa del vinagre i l’esterilització dels pots són el que evita el creixement del bacteri del botulisme."
        />
        <ol className="guide-step-flow">
          <li><span aria-hidden="true">1</span><CookingPot size={20} /><h3>Escalda</h3><p>Escalda els bolets nets en aigua bullent durant mig minut, escorre’ls i posa’ls en pots de vidre.</p></li>
          <li><span aria-hidden="true">2</span><FlaskConical size={20} /><h3>Cobreix d’escabetx</h3><p>Bull 2 minuts 2 gots de vinagre de vi blanc, ½ got d’aigua, 1 culleradeta de sucre, 1 de sal i una branca de farigola. Cobreix els bolets i afegeix un rajolí d’oli per sobre.</p></li>
          <li><span aria-hidden="true">3</span><Flame size={20} /><h3>Esterilitza</h3><p>Tapa els pots i bull-los a foc lent, ben coberts d’aigua, un mínim de 30 minuts. Deixa’ls refredar dins la mateixa aigua i guarda’ls en un lloc fresc.</p></li>
        </ol>
        <aside className="notice guide-caveat">
          <TriangleAlert size={21} aria-hidden="true" />
          <p><strong>No improvisis la proporció de vinagre.</strong> Llença qualsevol pot amb la tapa inflada, rovellada, amb pèrdues de líquid o que faci una olor estranya en obrir-lo. La toxina botulínica no es detecta a simple vista. Etiqueta cada pot amb el contingut i la data.</p>
        </aside>
      </section>

      <section className="guide-section" aria-labelledby="preservation-species-title">
        <SectionHeader
          meta="Quatre exemples"
          title="Com conservar ceps, rovellons, camagrocs i llenegues"
          titleId="preservation-species-title"
          description="Aquestes orientacions provenen de les fitxes culinàries del catàleg; consulta sempre el perfil complet abans de preparar una espècie."
        />
        <div className="guide-species-grid">
          {preservationSpecies.map((species) => (
            <article id={preservationDetails[species.speciesId]?.id} key={species.speciesId} className="preservation-species">
              <div className="guide-species-identity">
                <span className="guide-icon-tile"><SpeciesIcon speciesId={species.speciesId} size={56} /></span>
                <div><h3>{species.identity.commonName}</h3><em>{species.identity.scientificName}</em></div>
              </div>
              <p>{preservationDetails[species.speciesId]?.guidance}</p>
              {species.culinaryProfile.kind === "culinary" && (
                <ul className="preservation-method-badges" aria-label="Mètodes de conservació">
                  {species.culinaryProfile.preservation.map((method) => {
                    const MethodIcon = preservationMethodIcon(method);
                    return <li key={method}><MethodIcon size={15} aria-hidden="true" />{method}</li>;
                  })}
                </ul>
              )}
              <Link href={speciesPath(species)} className="text-link" aria-label={`Veure la fitxa de ${species.identity.commonName}`}>Veure la fitxa <ArrowUpRight size={15} /></Link>
            </article>
          ))}
        </div>
      </section>

      <FaqSection faqs={faqs} title="Dubtes sobre conservar bolets" titleId="preservation-faq-title" />

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
