import "@/app/styles/rain-guide.css";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarRange,
  Clock3,
  CloudRain,
  Droplets,
  Gauge,
  OctagonPause,
  ShieldCheck,
  ThermometerSun,
  Trees,
  Wind,
} from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { FaqSection } from "@/components/faq";
import { JsonLd } from "@/components/json-ld";
import { priorMoistureLevel, RainResponseCurve, RainTimeline, RainWindowTrack } from "@/components/rain-guide-graphics";
import { SpeciesIcon } from "@/components/species-icon";
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
import { getSpecies, speciesProfiles } from "@/data/species";
import { compareBySearchDemand } from "@/data/species-search-demand";
import {
  altitudeCalendarShift,
  groupSpeciesByRainWindow,
  rainWindowPhrase,
  rainWindowSentence,
  scoredRainWindowForModel,
} from "@/src/lib/rain-response-summary";
import { faqPageSchema } from "@/src/lib/faq-schema";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, SITE_URL, speciesPath } from "@/src/lib/seo";
import { rainfallLimitationCopy } from "@/src/lib/species-copy";


function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

const exampleSpecies = [
  "lactarius-sanguifluus",
  "lactarius-deliciosus",
  "boletus-edulis",
  "cantharellus-cibarius",
  "craterellus-lutescens",
  "tricholoma-terreum",
  "morchella-esculenta",
  "marasmius-oreades",
].map((id) => getSpecies(id)).filter(isDefined)
  .sort((left, right) => compareBySearchDemand(
    { speciesId: left.speciesId, name: left.identity.commonName },
    { speciesId: right.speciesId, name: right.identity.commonName },
  ));

// The rain guide prints the same windows the map scores, grouped by shared
// parameters, so the table follows every model refit.
const rainWindowGroups = groupSpeciesByRainWindow(
  speciesProfiles.map((species) => ({ commonName: species.identity.commonName, modelConfig: species.modelConfig })),
);
const speciesIdByCommonName = new Map(speciesProfiles.map((species) => [species.identity.commonName, species.speciesId]));
// Lead every species list with the names people search for most.
for (const group of rainWindowGroups) {
  group.speciesNames.sort((left, right) => compareBySearchDemand(
    { speciesId: speciesIdByCommonName.get(left) ?? left, name: left },
    { speciesId: speciesIdByCommonName.get(right) ?? right, name: right },
  ));
}
const cepSpecies = getSpecies("boletus-edulis");
const cepWindow = cepSpecies ? scoredRainWindowForModel(cepSpecies.modelConfig) : null;
const cepCalendarShift = cepSpecies && cepSpecies.modelConfig.status === "supported" && cepSpecies.modelConfig.model === "hydrothermal-v2"
  ? altitudeCalendarShift(cepSpecies.modelConfig.phenology.altitudeShift, cepSpecies.ecologicalConfig.habitat.altitude)
  : null;
// The short answer summarises the same groups, naming the most searched first.
const answerGroups = rainWindowGroups.map((group) => {
  const names = group.speciesNames.slice(0, 3);
  const others = group.speciesNames.length - names.length;
  return {
    key: `${group.window.startDaysAgo}-${group.window.endDaysAgo}`,
    days: group.window.excludesRecent
      ? `Dies ${group.window.startDaysAgo}–${group.window.endDaysAgo}`
      : `Dies 1–${group.window.endDaysAgo}`,
    examples: others > 0 ? `${names.join(", ")} i ${others} més` : names.join(", "),
    halfMm: group.window.typicalHalfResponseMm,
    nearFullMm: group.window.typicalNearFullMm,
  };
});
const answerRange = {
  firstDay: Math.min(...rainWindowGroups.map((group) => group.window.excludesRecent ? group.window.startDaysAgo : 1)),
  lastDay: Math.max(...rainWindowGroups.map((group) => group.window.endDaysAgo)),
};
const sharedThresholds = answerGroups.every((group) => group.halfMm === answerGroups[0]?.halfMm && group.nearFullMm === answerGroups[0]?.nearFullMm)
  ? answerGroups[0]
  : undefined;
// One answer sentence, reused by the panel, the FAQ, and the meta and social
// descriptions, so search snippets quote the same model-derived figures.
const rainAnswerSentence = `Els bolets surten entre ${answerRange.firstDay} i ${answerRange.lastDay} dies després de ploure, segons l’espècie.`;
const rainAnswerDescription = sharedThresholds
  ? `Els bolets surten entre ${answerRange.firstDay} i ${answerRange.lastDay} dies després de ploure, segons l’espècie, i comencen amb uns ${sharedThresholds.halfMm} mm. Mira quina pluja compta per a cada bolet.`
  : `${rainAnswerSentence} Mira quina pluja compta per a cada bolet i quanta en cal.`;

export const metadata: Metadata = {
  title: "Quants dies després de ploure surten els bolets?",
  description: rainAnswerDescription,
  alternates: { canonical: "/quan-surten-els-bolets-despres-de-ploure" },
  openGraph: {
    url: "/quan-surten-els-bolets-despres-de-ploure",
    title: "Quants dies després de ploure surten els bolets?",
    description: rainAnswerDescription,
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

const catalanList = new Intl.ListFormat("ca-ES", { style: "long", type: "conjunction" });
const MAX_LISTED_SPECIES = 6;

function speciesListLabel(names: string[]) {
  if (names.length <= MAX_LISTED_SPECIES) return catalanList.format(names);
  const shown = names.slice(0, MAX_LISTED_SPECIES);
  return `${shown.join(", ")} i ${names.length - MAX_LISTED_SPECIES} espècies més`;
}

const rainFaqs = [
  {
    question: "Quants dies després de ploure surten els bolets?",
    answer: `${rainAnswerSentence} Cada espècie respon a la pluja d’una finestra de dies concreta${cepWindow ? `; el cep, per exemple: ${rainWindowSentence(cepWindow).charAt(0).toLocaleLowerCase("ca-ES")}${rainWindowSentence(cepWindow).slice(1)}` : "."} La humitat prèvia del sòl, la temperatura, el vent i la temporada poden avançar, retardar o impedir la fructificació.`,
  },
  {
    question: "Un sol xàfec és suficient perquè surtin bolets?",
    answer: "Sovint no. Un sòl molt sec pot necessitar diversos episodis o pluja sostinguda, mentre que la calor i el vent poden fer perdre ràpidament la humitat guanyada.",
  },
  {
    question: "On es poden consultar les condicions actuals?",
    answer: "El mapa i el resum de bolets avui comparen condicions ambientals per espècie i territori. No indiquen presència, abundància ni una data garantida de fructificació.",
  },
] as const;

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
        "@graph": [
          {
            "@type": "Article",
            headline: "Quan surten els bolets després de ploure?",
            description: metadata.description,
            url: absoluteUrl("/quan-surten-els-bolets-despres-de-ploure"),
            inLanguage: "ca",
            publisher: { "@id": `${SITE_URL}/#organization` },
            citation: hydrothermalScientificSources.map((source) => source.url),
            ...editorialArticleFields("quan-surten-els-bolets-despres-de-ploure"),
          },
          faqPageSchema(rainFaqs, `${absoluteUrl("/quan-surten-els-bolets-despres-de-ploure")}#preguntes`),
        ],
      }} />
      <PageHeader
        eyebrow={<><CloudRain size={15} /> Pluja i fructificació</>}
        title={<>Quan surten els bolets<br /><PageTitleAccent>després de ploure?</PageTitleAccent></>}
        description={<><strong>La pluja no activa un compte enrere.</strong> També importen la humitat que ja tenia el sòl, la temperatura, el vent, la temporada i el tipus de bosc.</>}
        layout="split"
      />

      <aside className="rain-direct-answer" aria-labelledby="rain-direct-answer-title">
        <Clock3 size={24} aria-hidden="true" />
        <div>
          <p className="eyebrow">Resposta curta</p>
          <h2 id="rain-direct-answer-title">{rainAnswerSentence}</h2>
          <ul className="rain-answer-groups">
            {answerGroups.map((group) => (
              <li key={group.key}>
                <strong>{group.days}</strong>
                <span>{group.examples}</span>
                {!sharedThresholds && <small>≈ {group.halfMm} mm per començar · ≈ {group.nearFullMm} mm amb força</small>}
              </li>
            ))}
          </ul>
          {sharedThresholds && <p className="rain-answer-amount"><CloudRain size={18} aria-hidden="true" /><span>Amb uns <strong>{sharedThresholds.halfMm} mm</strong> de pluja en aquests dies comencen a sortir; amb uns <strong>{sharedThresholds.nearFullMm} mm</strong>, surten amb força.</span></p>}
          <p>No és una data garantida: un sòl molt sec, la calor, el vent, les gelades o estar fora de temporada poden retardar-ho o impedir-ho.</p>
        </div>
      </aside>

      <section className="rain-window-section" aria-labelledby="rain-window-title">
        <SectionHeader
          meta="Què compta el mapa"
          title="Quina pluja mira cada espècie"
          titleId="rain-window-title"
          description="Cada espècie suma la pluja d’una finestra de dies fixa. Les espècies lentes no compten la darrera setmana o quinzena: els bolets d’avui van créixer abans, i el miceli triga."
        />
        <RainTimeline groups={rainWindowGroups} speciesIdByName={speciesIdByCommonName} />
        <div className="rain-window-table-wrap">
          <table className="rain-window-table">
            <thead>
              <tr>
                <th scope="col">Pluja que compta</th>
                {!sharedThresholds && <><th scope="col">Comença a sortir</th><th scope="col">Surt amb força</th></>}
                <th scope="col">Espècies</th>
              </tr>
            </thead>
            <tbody>
              {rainWindowGroups.map((group) => (
                <tr key={`${group.window.startDaysAgo}-${group.window.endDaysAgo}-${group.window.typicalHalfResponseMm}`}>
                  <th scope="row">{group.window.excludesRecent ? `Caiguda ${rainWindowPhrase(group.window)}` : `Els últims ${group.window.endDaysAgo} dies`}</th>
                  {!sharedThresholds && <><td className="rain-window-mm">≈ {group.window.typicalHalfResponseMm} mm</td><td className="rain-window-mm">≈ {group.window.typicalNearFullMm} mm</td></>}
                  <td>
                    <span className="rain-window-icons" aria-hidden="true">
                      {group.speciesNames.slice(0, MAX_LISTED_SPECIES).map((name) => {
                        const speciesId = speciesIdByCommonName.get(name);
                        return speciesId ? <SpeciesIcon key={speciesId} speciesId={speciesId} size={32} /> : null;
                      })}
                    </span>
                    {speciesListLabel(group.speciesNames)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="rain-window-note">
          {sharedThresholds && <><strong>Totes les espècies necessiten una quantitat semblant:</strong> uns {sharedThresholds.halfMm} mm per començar a sortir i uns {sharedThresholds.nearFullMm} mm per sortir amb força. El que canvia és quins dies compten. </>}
          Pluja de pluviòmetre per a una tardor típica, un cop descomptada l’evaporació; a l’estiu en cal més. Són xifres orientatives ajustades amb troballes datades, no una promesa de bolets.
          {cepCalendarShift && ` L’altitud també hi compta: la temporada es desplaça uns ${cepCalendarShift.daysPer100m} dies per cada 100 m, avançada a muntanya i endarrerida a baixa altitud.`}
        </p>
      </section>

      {cepWindow && <section className="rain-curve-section" aria-labelledby="rain-curve-title">
        <div className="rain-curve-copy">
          <SectionHeader
            meta="Quanta pluja cal"
            title="Més pluja no sempre vol dir més bolets"
            titleId="rain-curve-title"
          />
          <p>Els primers mil·límetres de cada episodi es queden a les fulles o s’evaporen. A partir d’aquí l’efecte creix de pressa, però s’atura: passat el punt en què el bolet surt amb força, un altre aiguat hi suma molt poc.</p>
          <p>Aleshores ja manen la temperatura, la temporada i el bosc. Per això dues setmanes amb la mateixa pluja poden donar resultats molt diferents.</p>
        </div>
        <RainResponseCurve window={cepWindow} appliesToAll={Boolean(sharedThresholds)} />
      </section>}

      <section className="rain-species-examples" aria-labelledby="rain-species-title">
        <SectionHeader
          meta={`${exampleSpecies.length} exemples del catàleg`}
          title="Cada espècie respon al seu ritme"
          titleId="rain-species-title"
          description="Quina pluja compta i què la condiciona, espècie per espècie. Descriuen patrons habituals, no una data garantida després de ploure."
        />
        <div className="rain-species-grid">
          {exampleSpecies.map((species) => {
            const rainfall = species.ecologicalConfig.rainfall;
            const window = scoredRainWindowForModel(species.modelConfig);
            const moistureLevel = priorMoistureLevel(rainfall.priorMoisture);
            return <article key={species.speciesId}>
              <div className="rain-species-identity">
                <span className="rain-species-icon-tile"><SpeciesIcon speciesId={species.speciesId} size={56} /></span>
                <div><h3>{species.identity.commonName}</h3><em>{species.identity.scientificName}</em></div>
              </div>
              {window ? <div className="rain-species-rain">
                <p className="rain-species-rain-label">Pluja que compta</p>
                <RainWindowTrack window={window} compact />
                <div className="rain-species-rain-axis" aria-hidden="true"><span>Plou</span><span>30 dies</span></div>
                {!sharedThresholds && <dl className="rain-species-thresholds">
                  <div><dt>Comença a sortir</dt><dd>≈ {window.typicalHalfResponseMm} mm</dd></div>
                  <div><dt>Surt amb força</dt><dd>≈ {window.typicalNearFullMm} mm</dd></div>
                </dl>}
              </div> : <p className="rain-species-lead">{rainfall.fruitingDelay}</p>}
              <dl className="rain-species-facts">
                {!window && <div><dt>Aigua que necessita</dt><dd>{rainfall.preferredAccumulation}</dd></div>}
                <div>
                  <dt>Humitat prèvia</dt>
                  <dd>
                    {moistureLevel && <span className="rain-moisture-meter" aria-hidden="true">
                      {[1, 2, 3].map((level) => <Droplets key={level} size={17} className={level <= moistureLevel ? "is-on" : undefined} />)}
                    </span>}
                    {rainfall.priorMoisture}
                  </dd>
                </div>
                <div><dt>Què la pot frenar</dt><dd><OctagonPause size={17} aria-hidden="true" className="rain-species-brake" />{rainfall.interruption}</dd></div>
              </dl>
              <p className="rain-species-note">{rainfallLimitationCopy(species.speciesId, rainfall.uncertainty)}</p>
              <Link href={speciesPath(species)} className="text-link" aria-label={`Veure la fitxa de ${species.identity.commonName}`}>Veure la fitxa <ArrowUpRight size={15} /></Link>
            </article>;
          })}
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

      <FaqSection faqs={rainFaqs} title="Pluja, espera i condicions actuals" titleId="rain-faq-title" />

      <nav className="rain-guide-actions" aria-label="Continuar explorant les condicions dels bolets">
        <Link href="/mapa-pluja">Quanta pluja ha caigut aquests dies <ArrowUpRight size={16} /></Link>
        <Link href="/map">Mapa de bolets de Catalunya <ArrowUpRight size={16} /></Link>
        <Link href="/bolets-avui">On buscar bolets avui segons les condicions actuals <ArrowUpRight size={16} /></Link>
        <Link href="/metode#prediccio">Llegir el mètode complet <ArrowUpRight size={16} /></Link>
      </nav>

      <EditorialAttribution contentId="quan-surten-els-bolets-despres-de-ploure" sources={[...environmentalSources, ...hydrothermalScientificSources, ...exampleSpecies.flatMap((species) => species.references)]} variant="compact" />
    </PageShell>
  );
}
