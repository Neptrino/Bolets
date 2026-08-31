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
import { rainfallLimitationCopy } from "@/src/lib/species-copy";

export const metadata: Metadata = {
  title: "Bolets després de ploure: quan surten?",
  description: "La pluja no activa un compte enrere. Mira què més influeix i per què cada espècie respon en un moment diferent.",
  alternates: { canonical: "/quan-surten-els-bolets-despres-de-ploure" },
  openGraph: {
    url: "/quan-surten-els-bolets-despres-de-ploure",
    title: "Quan surten els bolets després de ploure?",
    description: "No hi ha una xifra única: també importen la humitat del sòl, la temperatura, la temporada i el tipus de bosc.",
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
        description={<><strong>La pluja no activa un compte enrere.</strong> També importen la humitat que ja tenia el sòl, la temperatura, el vent, la temporada i el tipus de bosc.</>}
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
          meta="Com llegir-ho"
          title="Pluja, bosc i temporada han de coincidir"
          titleId="rain-model-title"
          description="La pluja només modifica una part de les condicions. El mapa combina el lloc i el moment abans de donar una valoració."
        />
        <div className="rain-index-flow">
          <article><span aria-hidden="true">1</span><Trees size={20} /><h3>Bosc adequat</h3><p>Comprova si el bosc, el sòl i l’altitud encaixen amb l’espècie.</p></article>
          <article><span aria-hidden="true">2</span><Gauge size={20} /><h3>Moment favorable</h3><p>Combina la temporada, l’aigua disponible i la temperatura recent.</p></article>
          <article><span aria-hidden="true">3</span><CloudRain size={20} /><h3>Resultat conjunt</h3><p>Un bon moment no compensa un bosc inadequat, ni al revés.</p></article>
        </div>
        <div className="rain-formula-panel">
          <div><span>Primer</span><strong>Valorem com són les condicions per fructificar dins de l’hàbitat adequat.</strong></div>
          <div><span>Després</span><strong>La valoració baixa si hi ha poc terreny adequat o si una condició clau és desfavorable.</strong></div>
          <p><ShieldCheck size={17} aria-hidden="true" /> Les valoracions serveixen per comparar zones de 0 a 100. No indiquen probabilitat de presència, abundància ni data de sortida. El càlcul complet es pot consultar a la pàgina del mètode.</p>
        </div>
      </section>

      <section className="rain-signals-section" aria-labelledby="rain-signals-title">
        <SectionHeader
          meta="Factors clau"
          title="Què canvia realment després de ploure?"
          titleId="rain-signals-title"
          description="Cap factor funciona sol, i un mateix episodi de pluja pot tenir efectes molt diferents."
        />
        <div className="rain-factor-grid" aria-label="Factors que influeixen en les condicions després de ploure">
          <article><CalendarRange size={22} /><span>Temporada</span><h3>El moment de l’any</h3><p>Fora de la temporada habitual, una pluja difícilment serà suficient.</p></article>
          <article><Droplets size={22} /><span>Sòl</span><h3>La humitat que ja hi havia</h3><p>Un sòl molt sec pot necessitar més d’un xàfec per recuperar aigua.</p></article>
          <article><CloudRain size={22} /><span>Pluja</span><h3>Quantitat i repartiment</h3><p>Uns quants dies de pluja sostinguda no tenen el mateix efecte que un aiguat breu.</p></article>
          <article><ThermometerSun size={22} /><span>Temperatura</span><h3>Fred, calor i extrems</h3><p>La temperatura recent ha d’encaixar amb l’espècie; les gelades i la calor forta poden frenar-la.</p></article>
          <article><Wind size={22} /><span>Assecat</span><h3>Vent i dies secs</h3><p>El vent i una ratxa seca poden fer perdre ràpidament la humitat guanyada.</p></article>
        </div>
      </section>

      <section className="rain-species-examples" aria-labelledby="rain-species-title">
        <SectionHeader
          meta="Sis exemples del catàleg"
          title="Cada espècie respon al seu ritme"
          titleId="rain-species-title"
          description="Aquestes orientacions descriuen patrons habituals, no una data garantida després de ploure."
        />
        {exampleSpecies.map((species) => {
          const rainfall = species.ecologicalConfig.rainfall;
          return <article key={species.speciesId}>
            <div className="rain-species-identity"><span>{species.identity.commonName}</span><em>{species.identity.scientificName}</em></div>
            <dl>
              <div><dt>Resposta habitual</dt><dd>{rainfall.fruitingDelay}</dd></div>
              <div><dt>Aigua que necessita</dt><dd>{rainfall.preferredAccumulation}</dd></div>
              <div><dt>Humitat prèvia</dt><dd>{rainfall.priorMoisture}</dd></div>
              <div><dt>Què la pot frenar</dt><dd>{rainfall.interruption}</dd></div>
            </dl>
            <p>{rainfallLimitationCopy(species.speciesId, rainfall.uncertainty)}</p>
            <Link href={speciesPath(species)} className="text-link" aria-label={`Veure la fitxa de ${species.identity.commonName}`}>Veure la fitxa <ArrowUpRight size={15} /></Link>
          </article>;
        })}
      </section>

      <section className="rain-evidence" aria-labelledby="rain-evidence-title">
        <SectionHeader
          meta="Base científica i límits"
          title="Què sabem i què continua sent incert"
          titleId="rain-evidence-title"
          description="Els estudis confirmen que cal mirar més que la pluja, però els terminis varien entre espècies i territoris."
        />
        <div className="rain-evidence-grid">
          {hydrothermalScientificSources.map((source) => <article key={source.id}>
            <span>{source.confidence === "limited" ? "Preprint · evidència preliminar" : "Article revisat per parells"}</span>
            <h3>{source.title}</h3>
            <p>{evidenceNote(source.id)}</p>
            <a href={source.url} target="_blank" rel="noreferrer" aria-label={`Consultar l’estudi: ${source.title}`}>Consultar l’estudi <ArrowUpRight size={14} /></a>
          </article>)}
        </div>
        <aside className="rain-model-caveat"><ShieldCheck size={21} aria-hidden="true" /><p><strong>Límit important.</strong> Les valoracions permeten comparar condicions, però encara no les hem contrastat amb prou observacions de camp a Catalunya. No són una probabilitat de trobar bolets.</p></aside>
      </section>

      <nav className="rain-guide-actions" aria-label="Continuar explorant les condicions dels bolets">
        <Link href="/map">Veure el mapa de condicions <ArrowUpRight size={16} /></Link>
        <Link href="/bolets-avui">Consultar el resum d’avui <ArrowUpRight size={16} /></Link>
        <Link href="/metode#prediccio">Llegir el mètode complet <ArrowUpRight size={16} /></Link>
      </nav>

      <EditorialAttribution contentId="quan-surten-els-bolets-despres-de-ploure" sources={[...environmentalSources, ...hydrothermalScientificSources, ...exampleSpecies.flatMap((species) => species.references)]} variant="compact" />
    </PageShell>
  );
}
