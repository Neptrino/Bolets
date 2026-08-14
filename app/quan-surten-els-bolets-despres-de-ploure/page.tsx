import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarRange,
  Clock3,
  CloudRain,
  Droplets,
  Gauge,
  ShieldCheck,
  ThermometerSun,
  Trees,
  Wind,
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
  environmentalSources,
  hydrothermalScientificSources,
} from "@/data/editorial";
import { getSpecies } from "@/data/species";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, SITE_URL, speciesPath } from "@/src/lib/seo";

export const metadata: Metadata = {
  title: "Bolets després de ploure: quan surten?",
  description: "La pluja no activa un compte enrere. Enteneu com el model combina sòl, pluja efectiva, temperatura, temporada i hàbitat.",
  alternates: { canonical: "/quan-surten-els-bolets-despres-de-ploure" },
  openGraph: {
    url: "/quan-surten-els-bolets-despres-de-ploure",
    title: "Quan surten els bolets després de ploure?",
    description: "No hi ha una xifra única: el model llegeix la memòria hidrotermal, la temporada i l’hàbitat, no només la pluja d’ahir.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

const exampleSpecies = [
  "lactarius-sanguifluus",
  "lactarius-deliciosus",
  "boletus-edulis",
  "craterellus-lutescens",
  "morchella-esculenta",
  "marasmius-oreades",
].map((id) => getSpecies(id)).filter(isDefined);

function evidenceNote(sourceId: string) {
  switch (sourceId) {
    case "agreda-2016-climate-sporocarps":
      return "Mostra que les respostes climàtiques i les finestres temporals varien molt entre espècies; no les explica només el gremi.";
    case "karavani-2018-soil-moisture":
      return "Sosté que la pluja, la humitat del sòl, la temperatura i el balanç hídric s’han de llegir conjuntament en boscos mediterranis.";
    case "brejon-hoffman-2026-porcini":
      return "Sustenta provisionalment la memòria de 20 dies de temperatura i 26 dies de pluja del cep; és un preprint en una fageda alemanya.";
    default:
      throw new Error(`Missing rain-guide evidence note for ${sourceId}`);
  }
}

function modelMemory(species: (typeof exampleSpecies)[number]) {
  const model = species.modelConfig;
  if (model.status !== "supported") return null;

  return {
    waterDays: model.water.rainfallWindowDays,
    temperatureDays: model.temperature.windowDays,
    evidence: model.evidence.status === "species-literature"
      ? "Ajust parcial de literatura"
      : "Prior de gremi + perfil tèrmic d’espècie",
  };
}

export default function MushroomsAfterRainPage() {
  return (
    <PageShell as="article">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Quan surten els bolets després de ploure?",
        description: metadata.description,
        url: absoluteUrl("/quan-surten-els-bolets-despres-de-ploure"),
        inLanguage: "ca",
        publisher: { "@id": `${SITE_URL}/#organization` },
        citation: hydrothermalScientificSources.map((source) => source.url),
        ...editorialArticleFields("quan-surten-els-bolets-despres-de-ploure"),
      }} />
      <PageHeader
        eyebrow={<><CloudRain size={15} /> Pluja i fructificació</>}
        title={<>Quan surten els bolets<br /><PageTitleAccent>després de ploure?</PageTitleAccent></>}
        description={<><strong>La pluja no activa un compte enrere.</strong> Un xàfec pot no rehidratar el sòl i dues espècies del mateix bosc poden respondre en moments diferents. El model llegeix la memòria hídrica, tèrmica i atmosfèrica recent, la temporada i l’hàbitat.</>}
        layout="split"
      />

      <aside className="rain-direct-answer">
        <Clock3 size={24} aria-hidden="true" />
        <div>
          <p className="eyebrow">Resposta curta</p>
          <h2>No es pot convertir un xàfec en una data fiable.</h2>
          <p>Moltes fitxes descriuen respostes de dies a setmanes, però això és context ecològic, no un termini calculat. La intensitat i el repartiment de la pluja, la humitat que ja tenia el sòl, l’evaporació, la temperatura, els extrems i el moment de la temporada poden avançar, retardar o impedir la fructificació visible.</p>
        </div>
      </aside>

      <section className="rain-model-section" aria-labelledby="rain-model-title">
        <SectionHeader
          meta="Lectura del nou model"
          title="Pluja, hàbitat i fructificació són coses diferents"
          titleId="rain-model-title"
          description="La pluja només modifica una part de les condicions actuals. Per llegir el mapa, primer distingim on l’espècie podria créixer, després si pot fructificar-hi i finalment la puntuació de tota la cel·la."
        />
        <div className="rain-index-flow">
          <article><span aria-hidden="true">1</span><Trees size={20} /><h3>Hàbitat adequat</h3><p>Comprova quina part de la cel·la té una coberta, un sòl i una altitud adequats per a l’espècie. No utilitza el temps d’avui.</p></article>
          <article><span aria-hidden="true">2</span><Gauge size={20} /><h3>Condicions per fructificar</h3><p>Combina la temporada, l’aigua disponible, la temperatura i els extrems recents només dins de l’hàbitat adequat.</p></article>
          <article><span aria-hidden="true">3</span><CloudRain size={20} /><h3>Puntuació de la cel·la</h3><p>Combina els dos resultats. Un temps favorable no crea hàbitat on no n’hi ha.</p></article>
        </div>
        <div className="rain-formula-panel">
          <div><span>Primer</span><strong>Valorem com són les condicions per fructificar dins de l’hàbitat adequat.</strong></div>
          <div><span>Després</span><strong>La puntuació baixa si hi ha poc hàbitat adequat o si una condició clau és desfavorable.</strong></div>
          <p><ShieldCheck size={17} aria-hidden="true" /> Les puntuacions són escales comparatives de 0 a 100. No indiquen probabilitat de presència, abundància ni data de sortida. Les fórmules completes es poden consultar a la pàgina del mètode.</p>
        </div>
      </section>

      <section className="rain-signals-section" aria-labelledby="rain-signals-title">
        <SectionHeader
          meta="Memòria hidrotermal"
          title="Què canvia realment després de ploure?"
          titleId="rain-signals-title"
          description="Les finestres indiquen quanta història meteorològica consulta el model. No indiquen quants dies trigarà a sortir un bolet."
        />
        <div className="rain-factor-grid" aria-label="Components dinàmics del model després de ploure">
          <article><CalendarRange size={22} /><span>Temporada</span><h3>Calendari suau</h3><p>El calendari propi de cada espècie limita la resposta i s’interpola entre mesos. Fora de temporada, una pluja no activa la lectura.</p></article>
          <article><Droplets size={22} /><span>Estat hídric</span><h3>Sòl i pluja efectiva</h3><p>Combina la mitjana —75%— i el mínim —25%— de la humitat estimada a 3–9 cm durant 7 dies, normalitzada per la textura. Massa poca aigua i la saturació excessiva poden reduir la resposta.</p></article>
          <article><CloudRain size={22} /><span>Pluja efectiva</span><h3>14, 21 o 26 dies</h3><p>La quantitat de pluja i els dies amb almenys 1 mm es corregeixen per la intercepció i la meitat de l’ET₀. S’usen 14 o 21 dies segons el prior versionat; 26 només per a <em>Boletus edulis</em>.</p></article>
          <article><ThermometerSun size={22} /><span>Temperatura i extrems</span><h3>Memòria tèrmica i extrems</h3><p>La temperatura mitjana de l’aire usa 14 o 20 dies. Les hores a ≤ 0 °C i ≥ 27 °C redueixen gradualment la lectura dins la mateixa finestra.</p></article>
          <article><Wind size={22} /><span>Assecat atmosfèric</span><h3>Atmosfera i ratxa seca</h3><p>La temperatura i la humitat mitjanes de 7 dies formen el dèficit de vapor; els dies consecutius amb menys d’1 mm també penalitzen. El vent no es puntua directament: només pot quedar reflectit indirectament en l’ET₀.</p></article>
        </div>
      </section>

      <section className="rain-species-examples" aria-labelledby="rain-species-title">
        <SectionHeader
          meta="Sis exemples del catàleg"
          title="La finestra del model no és el retard"
          titleId="rain-species-title"
          description="Les finestres hídrica i tèrmica provenen de la mateixa configuració que consumeix el mapa. El patró temporal, les interrupcions i la necessitat d’aigua són context editorial de la fitxa i no es converteixen en coeficients."
        />
        {exampleSpecies.map((species) => {
          const rainfall = species.ecologicalConfig.rainfall;
          const memory = modelMemory(species);
          return <article key={species.speciesId}>
            <div className="rain-species-identity"><span>{species.identity.commonName}</span><em>{species.identity.scientificName}</em>{memory ? <small>{memory.evidence}</small> : null}</div>
            <dl>
              <div><dt>Finestra hídrica</dt><dd>{memory ? `${memory.waterDays} dies` : "No calculada"}</dd></div>
              <div><dt>Finestra tèrmica</dt><dd>{memory ? `${memory.temperatureDays} dies` : "No calculada"}</dd></div>
              <div><dt>Patró temporal descrit</dt><dd>{rainfall.fruitingDelay}</dd></div>
              <div><dt>Necessitat ecològica d’aigua</dt><dd>{rainfall.preferredAccumulation}</dd></div>
              <div><dt>Humitat prèvia</dt><dd>{rainfall.priorMoisture}</dd></div>
              <div><dt>Pot interrompre’s per</dt><dd>{rainfall.interruption}</dd></div>
            </dl>
            <p>{rainfall.uncertainty}</p>
            <Link href={speciesPath(species)} className="text-link" aria-label={`Veure la fitxa de ${species.identity.commonName}`}>Veure la fitxa <ArrowUpRight size={15} /></Link>
          </article>;
        })}
      </section>

      <section className="rain-evidence" aria-labelledby="rain-evidence-title">
        <SectionHeader
          meta="Base científica i límits"
          title="Què sosté la literatura i què continua sent una prior"
          titleId="rain-evidence-title"
          description="Els estudis donen suport a l’estructura hidrotermal i a les respostes específiques, però no validen automàticament els coeficients actuals a Catalunya."
        />
        <div className="rain-evidence-grid">
          {hydrothermalScientificSources.map((source) => <article key={source.id}>
            <span>{source.confidence === "limited" ? "Preprint · evidència preliminar" : "Article revisat per parells"}</span>
            <h3>{source.title}</h3>
            <p>{evidenceNote(source.id)}</p>
            <a href={source.url} target="_blank" rel="noreferrer" aria-label={`Consultar l’estudi: ${source.title}`}>Consultar l’estudi <ArrowUpRight size={14} /></a>
          </article>)}
        </div>
        <aside className="rain-model-caveat"><ShieldCheck size={21} aria-hidden="true" /><p><strong>Estat actual del model.</strong> <em>Boletus edulis</em> té un ajust parcial de literatura per a les finestres de pluja i temperatura; la resta de termes i les altres espècies parteixen de priors experts versionats de confiança baixa. Encara no s’han calibrat amb observacions de camp estructurades a Catalunya; per això els resultats només permeten comparar condicions relatives, no expressen una probabilitat.</p></aside>
      </section>

      <nav className="rain-guide-actions" aria-label="Continuar explorant les condicions dels bolets">
        <Link href="/map">Veure el mapa de condicions <ArrowUpRight size={16} /></Link>
        <Link href="/bolets-avui">Consultar el resum d’avui <ArrowUpRight size={16} /></Link>
        <Link href="/metode#prediccio">Llegir el mètode complet <ArrowUpRight size={16} /></Link>
      </nav>

      <EditorialAttribution contentId="quan-surten-els-bolets-despres-de-ploure" sources={[...environmentalSources, ...hydrothermalScientificSources, ...exampleSpecies.flatMap((species) => species.references)]} />
    </PageShell>
  );
}
