import "@/app/styles/territorial-guides.css";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CloudRain,
  Map,
  MapPinned,
  ShieldAlert,
  Sprout,
  Trees,
} from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { FaqSection } from "@/components/faq";
import { JsonLd } from "@/components/json-ld";
import { SpeciesCard } from "@/components/species-card";
import { SpeciesIcon } from "@/components/species-icon";
import { SpeciesHandlingBlock } from "@/components/species-handling-block";
import { SpeciesNamesTable } from "@/components/species-names-table";
import { getCatalogueSpecies } from "@/data/catalogue";
import { editorialArticleFields, officialSafetySource } from "@/data/editorial";
import {
  areaPath,
  areaProfiles,
  locationPagePath,
  speciesLocationPages,
} from "@/data/location-pages";
import { getSpecies } from "@/data/species";
import { speciesSameAs } from "@/data/species-identifiers";
import { getEdibilityPresentation } from "@/src/lib/edibility-presentation";
import { toSpeciesCardProfile } from "@/src/lib/species-card-profile";
import {
  monthInTimeZone,
  monthWithFromPreposition,
  monthWithPreposition,
  monthlyActivityLabel,
  SEASON_MONTHS,
} from "@/src/lib/seasonality";
import { faqPageSchema } from "@/src/lib/faq-schema";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, pageTitle, speciesPath } from "@/src/lib/seo";
import { speciesMapHref } from "@/src/lib/species-map-pages";
import type { ReferenceSpeciesProfile, RegionId, SpeciesProfile } from "@/src/lib/types";

export const metadata: Metadata = {
  title: pageTitle("Rovellons: quan surten i on trobar-ne a Catalunya"),
  description: "Quan surten els rovellons a Catalunya i on trobar-ne: tipus de rovellons, diferències entre rovelló i pinetell, temporada, zones i condicions actuals al mapa.",
  alternates: { canonical: "/zones/rovellons" },
  openGraph: {
    url: "/zones/rovellons",
    title: "Rovellons: quan surten i on trobar-ne a Catalunya",
    description: "Temporada dels rovellons, tipus, diferències amb el pinetell, zones i condicions actuals a Catalunya.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

export const revalidate = 3600;

const territoryReadings: Array<{
  name: string;
  region: RegionId;
  speciesId: "lactarius-deliciosus" | "lactarius-sanguifluus";
  description: string;
}> = [
  {
    name: "Pirineus: Ripollès i Cerdanya",
    region: "pirineus",
    speciesId: "lactarius-sanguifluus",
    description: "Pinedes de muntanya baixa i mitjana. El rovelló hi va bé quan l’altitud acompanya i la tardor ha deixat humitat al terra.",
  },
  {
    name: "Prepirineu i Berguedà",
    region: "prepirineus",
    speciesId: "lactarius-deliciosus",
    description: "Pinedes de muntanya on el pinetell troba pinassa fresca, sempre que després de ploure la humitat aguanti uns dies.",
  },
  {
    name: "Catalunya Central",
    region: "catalunya-central",
    speciesId: "lactarius-deliciosus",
    description: "Pinedes d’interior, molt sensibles: aquí decideix si ha plogut prou, si l’aigua marxa bé i si ha bufat vent sec.",
  },
  {
    name: "Empordà",
    region: "emporda",
    speciesId: "lactarius-sanguifluus",
    description: "Pinedes mediterrànies. El rovelló vinós hi va millor en terres calcàries i als racons que no s’assequen del tot.",
  },
  {
    name: "Serralades prelitorals",
    region: "serralades-prelitorals",
    speciesId: "lactarius-sanguifluus",
    description: "Pinedes mediterrànies on el solell, l’obaga i el fons de la vall no s’assemblen gens. Que la serra tingui fama no vol dir que tot el bosc vagi bé.",
  },
  {
    name: "Els Ports",
    region: "ports",
    speciesId: "lactarius-sanguifluus",
    description: "Pinedes del sud, de temporada irregular: depèn de l’aigua que s’hagi acumulat, del fred que faci i de cap on miri el vessant.",
  },
];

function peakMonths(species: SpeciesProfile) {
  return SEASON_MONTHS
    .filter(({ key }) => species.ecologicalConfig.seasonality[key] === "peak")
    .map(({ label }) => label)
    .join(" i ");
}

function seasonRange(species: SpeciesProfile) {
  const activeMonths = SEASON_MONTHS.filter(
    ({ key }) => species.ecologicalConfig.seasonality[key] !== "inactive",
  );
  const first = activeMonths[0]?.label;
  const last = activeMonths.at(-1)?.label;
  return first && last ? `${first}–${last}` : "Calendari no disponible";
}

/* The season window the page answers "quan surten els rovellons" with: the
   union of the two mapped lactaris, so the sentence never claims a month the
   catalogue does not carry for at least one of them. */
function combinedSeason(list: SpeciesProfile[]) {
  const active = SEASON_MONTHS.filter(({ key }) =>
    list.some((species) => species.ecologicalConfig.seasonality[key] !== "inactive"),
  );
  const peak = SEASON_MONTHS.filter(({ key }) =>
    list.some((species) => species.ecologicalConfig.seasonality[key] === "peak"),
  );
  const first = active[0]?.key;
  const last = active.at(-1)?.key;
  return {
    window: first && last
      ? `${monthWithFromPreposition(first)} ${monthWithPreposition(last)}`
      : "a la tardor",
    peak: peak.length
      ? peak.map(({ key }) => monthWithPreposition(key)).join(" i ")
      : "a la tardor",
  };
}

const lactariusSpeciesIds = new Set([
  "lactarius-deliciosus",
  "lactarius-sanguifluus",
]);
const publishedGuides = speciesLocationPages.filter((page) =>
  lactariusSpeciesIds.has(page.speciesId),
);
const publishedAreas = areaProfiles.filter((area) =>
  publishedGuides.some((guide) => guide.areaSlug === area.slug),
);

/* Two lactaris the popular name "rovelló" also reaches, neither of them
   edible. They are reference-only profiles: sourced habitat and season prose,
   no ecological config, so they stay out of the season table and the map
   cards and get their own section instead. */
const nameSharingLookalikes = ["lactarius-torminosus", "lactarius-chrysorrheus"]
  .map((speciesId) => getCatalogueSpecies(speciesId))
  .filter((species): species is ReferenceSpeciesProfile =>
    Boolean(species && "ecology" in species));

const faqs = [
  {
    question: "Quan surten els rovellons?",
    answer: "A Catalunya en surten del setembre al desembre, i el gruix de la temporada és a l’octubre i el novembre. Ara bé, el calendari només diu quan toca: després ha d’haver plogut prou, la pinassa s’ha de mantenir humida uns dies i no pot venir una revifada de calor ni vent sec. Dins d’una mateixa comarca, l’altitud i si el vessant mira al nord o al sud poden avançar o endarrerir-ho tot.",
  },
  {
    question: "On trobar rovellons a Catalunya?",
    answer: "Sota pins, en terra que es mantingui humida i on l’aigua no es quedi estancada. Els Pirineus, el Prepirineu, Catalunya Central, l’Empordà, les serralades prelitorals i els Ports tenen boscos on això es compleix. Dit això, que el paisatge encaixi no vol dir que hi hagi rovellons en un punt concret: aquesta guia no diu on anar a collir.",
  },
  {
    question: "Quants dies després de ploure surten els rovellons?",
    answer: "No hi ha un número que valgui per a tots els boscos. La pluja ha de tornar a mullar la pinassa i el terra, i mantenir-los així uns quants dies. Si després fa calor, bufa vent sec, o el bosc venia de molt sec, pot no sortir res encara que hagi plogut.",
  },
  {
    question: "Quins tipus de rovellons hi ha?",
    answer: "Dos que es mengen: el rovelló vinós (Lactarius sanguifluus), que fa un làtex vermell fosc, i el pinetell (Lactarius deliciosus), que el fa taronja. I dos que no: el rovelló de cabra i el pinetell bord, que porten el nom però fan làtex blanc. El color del làtex és el que els separa.",
  },
  {
    question: "Com es diuen els rovellons en castellà?",
    answer: "El pinetell (Lactarius deliciosus) és el «níscalo» o «robellón», i el rovelló vinós (Lactarius sanguifluus) és el «níscalo sanguíneo». A la pràctica, en castellà «níscalo» s’utilitza per als dos. Els dos que no es mengen són el «níscalo lanudo» (rovelló de cabra) i el «falso níscalo» (pinetell bord).",
  },
  {
    question: "Rovelló i pinetell són el mateix?",
    answer: "No exactament. En aquesta guia, rovelló designa Lactarius sanguifluus, de làtex vermell vinós, i pinetell designa Lactarius deliciosus, de làtex taronja. Popularment, però, el nom rovelló sovint s’utilitza per a tots dos.",
  },
  {
    question: "Com es netegen els rovellons?",
    answer: "Amb un raspall per treure la terra i un drap humit per acabar. No els deixis en remull: la carn del rovelló xucla l’aigua de seguida i després es desfà a la paella. Si en vols congelar, cuina’ls abans i separa’ls en porcions; congelats en cru queden aigualits.",
  },
  {
    question: "El rovelló de cabra es pot menjar?",
    answer: "No. El rovelló de cabra (Lactarius torminosus) porta el nom però no és comestible: té el marge del barret densament pelut, el làtex blanc i s’associa als bedolls. Pot provocar trastorns gastrointestinals. Un lactari de làtex blanc no s’ha de posar mai a la cistella de consum.",
  },
  {
    question: "Es poden trobar rovellons al Montseny?",
    answer: "Al Montseny hi ha pinedes, sí, però el massís no és igual a tot arreu: canvia moltíssim entre la part humida i la seca, i entre les cotes altes i baixes. Val més mirar el mapa i les dades del dia per a cada espècie. Aquesta guia no diu on anar a collir.",
  },
];

export default function RovellonsTerritoryPage() {
  const rovello = getSpecies("lactarius-sanguifluus")!;
  const pinetell = getSpecies("lactarius-deliciosus")!;
  const season = combinedSeason([rovello, pinetell]);
  const currentMonth = monthInTimeZone();
  return (
    <div className="rovellons-hub">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Article",
            "@id": `${absoluteUrl("/zones/rovellons")}#article`,
            headline: "Rovellons: quan surten i on trobar-ne a Catalunya",
            url: absoluteUrl("/zones/rovellons"),
            inLanguage: "ca",
            description: "Quan surten els rovellons, on trobar-ne, quins tipus hi ha, com distingir el rovelló del pinetell i en quines zones el terreny pot ser adequat a Catalunya.",
            mainEntityOfPage: absoluteUrl("/zones/rovellons"),
            about: [
              { "@type": "Taxon", name: rovello.identity.scientificName, alternateName: rovello.identity.commonName, taxonRank: "species", sameAs: speciesSameAs(rovello.speciesId) },
              { "@type": "Taxon", name: pinetell.identity.scientificName, alternateName: pinetell.identity.commonName, taxonRank: "species", sameAs: speciesSameAs(pinetell.speciesId) },
              ...nameSharingLookalikes.map((species) => ({
                "@type": "Taxon",
                name: species.identity.scientificName,
                alternateName: species.identity.commonName,
                taxonRank: "species",
                sameAs: speciesSameAs(species.speciesId),
              })),
            ],
            ...editorialArticleFields("zones-rovellons"),
          },
          faqPageSchema(faqs, `${absoluteUrl("/zones/rovellons")}#preguntes`),
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Inici", item: absoluteUrl() },
              { "@type": "ListItem", position: 2, name: "Guies", item: absoluteUrl("/guies") },
              { "@type": "ListItem", position: 3, name: "Rovellons", item: absoluteUrl("/zones/rovellons") },
            ],
          },
        ],
      }} />

      <header className="rovellons-hero">
        <div className="page-width rovellons-hero-inner">
          <Link href="/guies" className="back-link">← Totes les guies</Link>
          <div className="rovellons-hero-grid">
            <div>
              <p className="eyebrow light"><MapPinned size={15} /> Quan surten i on trobar-ne</p>
              <h1>Rovellons{" "}<br /><i>a Catalunya.</i></h1>
              <p>Els rovellons surten sobretot {season.window}, amb el pic {season.peak}. Això és el calendari; la resta la decideix el temps. Ha de ploure prou, la pinassa s’ha de mantenir humida uns dies i no pot venir vent sec al darrere. Aquí tens quins tipus hi ha, en quines zones mirar i com està el bosc avui.</p>
            </div>
            <aside>
              <Trees size={22} aria-hidden="true" />
              <span>On trobar-ne</span>
              <strong>Pinedes amb pinassa humida, sòl ben drenat i una tardor sense calor ni vent sec persistents.</strong>
              <small>És el bosc on en poden sortir. No vol dir que avui n’hi hagi.</small>
            </aside>
          </div>
        </div>
      </header>

      <div className="page-width rovellons-content">
        <section className="rovellons-definition" aria-labelledby="rovellons-definition-title">
          <div>
            <p className="eyebrow">Què són els rovellons?</p>
            <h2 id="rovellons-definition-title">Què són els rovellons i quins tipus hi ha</h2>
          </div>
          <div>
            <p>A Catalunya, <em>rovellons</em> funciona com un nom de grup. Aquesta guia documenta els dos lactaris comestibles del catàleg amb informació pròpia al mapa —el rovelló vinós i el pinetell— i els dos que comparteixen el nom sense ser comestibles. Tots són lactaris associats als arbres, però canvien el làtex, el color, el sòl preferit i part de la distribució ecològica.</p>
            <Link href="/compare/rovello-vs-pinetell" className="text-link">Veure rovelló vs. pinetell <ArrowUpRight size={16} /></Link>
          </div>
        </section>

        <section className="guide-types" aria-labelledby="rovellons-types-title">
          <header>
            <p className="eyebrow">Tipus de rovellons</p>
            <h2 id="rovellons-types-title">Tipus de rovellons a Catalunya</h2>
            <p>La taula resumeix dades de les fitxes documentades; no és una llista exhaustiva de tots els lactaris que poden rebre noms populars semblants.</p>
          </header>
          <p className="guide-types-scroll-hint">Fes lliscar la taula per veure totes les columnes.</p>
          <div className="guide-types-table-scroll">
            <table className="guide-types-table" data-rovellons-types-table>
              <caption className="sr-only">Comparació dels dos tipus de rovellons comestibles representats al catàleg</caption>
              <thead>
                <tr><th scope="col">Tipus</th><th scope="col">Comestibilitat</th><th scope="col">Làtex i carn</th><th scope="col">Barret</th><th scope="col">Bosc i temporada</th></tr>
              </thead>
              <tbody>
                {[rovello, pinetell].map((species) => (
                  <tr key={species.speciesId}>
                    <th scope="row"><span className="guide-types-species"><SpeciesIcon speciesId={species.speciesId} /><Link href={speciesPath(species)}>{species.identity.commonName}</Link></span><i>{species.identity.scientificName}</i></th>
                    <td>{getEdibilityPresentation(species.identity.edibility).label}</td>
                    <td>{species.morphology.flesh}</td>
                    <td>{species.morphology.cap}</td>
                    <td><span>{species.ecologicalConfig.habitat.forestTypes.join("; ")}</span><small>{seasonRange(species)}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="species-grid rovellons-species-grid" data-rovellons-species-list>
          <SpeciesCard species={rovello} currentMonth={currentMonth} />
          <SpeciesCard species={pinetell} index={1} currentMonth={currentMonth} />
        </div>

        {nameSharingLookalikes.length > 0 && (
          <section className="rovellons-lookalike-species" aria-labelledby="rovellons-lookalikes-title">
            <header>
              <p className="eyebrow"><ShieldAlert size={15} /> Noms que enganyen</p>
              <h2 id="rovellons-lookalikes-title">Rovellons que no es mengen</h2>
              <p>El nom popular també arriba a aquests dos, i cap dels dos es menja. Tots dos fan làtex blanc, i això ja els separa d’un rovelló. No surten al mapa: en recollim el bosc i l’època tal com els descriuen les fonts, sense calendari mes a mes.</p>
            </header>
            <div className="species-grid rovellons-species-grid">
              {nameSharingLookalikes.map((species, index) => (
                <SpeciesCard
                  key={species.speciesId}
                  species={toSpeciesCardProfile(species)}
                  index={index + 2}
                />
              ))}
            </div>
          </section>
        )}

        <SpeciesNamesTable
          titleId="rovellons-names-title"
          title="Els rovellons en castellà: níscalos i robellones"
          intro="Si has arribat buscant «níscalos» o «robellones», són aquests mateixos bolets. El nom canvia de comarca en comarca i de llengua en llengua, i un mateix nom popular pot acabar designant espècies diferents."
          species={[rovello, pinetell, ...nameSharingLookalikes]}
        />

        <section className="rovellons-signals guide-lookalikes" aria-labelledby="rovellons-identification-title">
          <header><p className="eyebrow"><ShieldAlert size={15} /> Identificació prudent</p><h2 id="rovellons-identification-title">Com distingir el rovelló del pinetell</h2></header>
          <div>
            <article><span>01</span><h3>Compara l’exemplar complet</h3><p>Revisa el làtex acabat de sortir, el barret, les làmines, el peu, l’arbre associat i la temporada. La <Link href="/compare/rovello-vs-pinetell">comparació entre rovelló i pinetell</Link> ordena aquests trets.</p></article>
            <article><span>02</span><h3>Descarta els lactaris de làtex blanc</h3><p>Cap dels dos rovellons comestibles té làtex blanc. Un làtex blanc apunta al rovelló de cabra o al pinetell bord, que no es mengen.</p></article>
          </div>
        </section>

        <section className="rovellons-now" aria-labelledby="rovellons-now-title">
          <div className="rovellons-now-heading">
            <div>
              <p className="eyebrow light"><CalendarDays size={15} /> Temporada de rovellons</p>
              <h2 id="rovellons-now-title">Quan surten els rovellons</h2>
            </div>
          </div>
          <p className="rovellons-now-lead">Cada espècie té els seus mesos. Aquests són els habituals de cada una, i com està cadascuna ara mateix, {monthWithPreposition(currentMonth)}. Els mesos diuen quan és normal que en surtin; si avui n’hi ha depèn de la pluja dels últims dies.</p>
          <div className="rovellons-now-grid">
            {[rovello, pinetell].map((species) => {
              const activity = species.ecologicalConfig.seasonality[currentMonth];
              return (
                <article key={species.speciesId}>
                  <span><SpeciesIcon speciesId={species.speciesId} size={28} className="species-icon on-dark" />{species.identity.commonName}</span>
                  <strong>{seasonRange(species)}</strong>
                  <p>Millor moment: {peakMonths(species)}. Ara: {monthlyActivityLabel(activity)}.</p>
                  <Link href={speciesMapHref(species.speciesId, { region: species.ecologicalConfig.regions[0] })} className="text-link">Obrir el mapa actual <Map size={15} /></Link>
                </article>
              );
            })}
            <aside>
              <CloudRain size={20} aria-hidden="true" />
              <strong>Per saber si hi ha condicions ara</strong>
              <p>El mapa creua l’època, la pluja dels últims dies, la humitat del sòl, la temperatura i el tipus de bosc, sempre que hi hagi prou dades.</p>
              <Link href="/bolets-avui" className="text-link">On trobar bolets avui i aquesta setmana <ArrowUpRight size={15} /></Link>
            </aside>
          </div>
        </section>

        <section className="rovellons-territories" aria-labelledby="rovellons-territories-title">
          <header>
            <p className="eyebrow"><MapPinned size={15} /> Zones generals</p>
            <h2 id="rovellons-territories-title">Millors zones on trobar rovellons a Catalunya</h2>
            <p>Cada resum explica quin terreny va bé per a cada espècie. Dins d’una mateixa zona hi ha molta diferència entre un bosc i un altre, i entre un vessant assolellat i un d’ombrívol. Cap d’aquestes pàgines assenyala un lloc concret per anar a collir.</p>
          </header>
          <div className="rovellons-territory-grid">
            {territoryReadings.map((territory) => (
              <Link href={speciesMapHref(territory.speciesId, { region: territory.region })} key={`${territory.region}-${territory.speciesId}`}>
                <span><MapPinned size={15} /> Zona</span>
                <h3>{territory.name}</h3>
                <p>{territory.description}</p>
                <strong>Consultar el mapa <ArrowUpRight size={15} /></strong>
              </Link>
            ))}
          </div>
        </section>

        <section className="rovellons-published" aria-labelledby="rovellons-published-title">
          <div>
            <p className="eyebrow">Guies locals publicades</p>
            <h2 id="rovellons-published-title">Guies locals de rovellons, del Pirineu als Ports</h2>
            <p>
              {publishedAreas.map((area, index) => (
                <span key={area.slug}>
                  {index > 0 && (index === publishedAreas.length - 1 ? " i " : ", ")}
                  <Link href={areaPath(area)}>{area.nameWithArticle}</Link>
                </span>
              ))} tenen pàgina pròpia per al rovelló, el pinetell o tots dos, sempre sense dir on anar a collir. Cada enllaç porta a la guia de la zona, amb les condicions d’ara.
            </p>
          </div>
          <div data-rovello-local-guides>
            {publishedGuides.map((guide) => {
              const area = areaProfiles.find((profile) => profile.slug === guide.areaSlug);
              const path = locationPagePath(guide);
              return <Link href={path} key={path}><span>{area?.name ?? "Guia local"}</span><strong>{guide.titlePhrase}</strong><ArrowUpRight size={17} /></Link>;
            })}
          </div>
        </section>

        <section className="rovellons-signals" aria-labelledby="rovellons-signals-title">
          <header><p className="eyebrow"><Sprout size={15} /> Com llegir el bosc</p><h2 id="rovellons-signals-title">Com saber si hi ha rovellons després de ploure</h2></header>
          <div>
            <article><span>01</span><h3>Que hi hagi pins</h3><p>El rovelló i el pinetell només surten sota pins, perquè hi viuen enganxats a les arrels. Ara bé, un bosc ple de pins no vol dir res per si sol: és el primer filtre, no una garantia.</p></article>
            <article><span>02</span><h3>Que el terra es mantingui humit</h3><p>La capa de pinassa ha d’estar humida uns quants dies seguits, no una tarda. Un ruixat curt sobre un terra que ve de setmanes seques sovint no serveix de res.</p></article>
            <article><span>03</span><h3>Que l’aigua no s’hi quedi</h3><p>El millor terra reté la humitat però deixa passar l’aigua. Si es fan bassals, o si està tan trepitjat que s’ha endurit, costa molt més que hi surti res.</p></article>
            <article><span>04</span><h3>Que no torni a assecar-se</h3><p>Uns dies de vent, una revifada de calor o una nova sequera poden aturar-ho tot, encara que hagi plogut fa poc. La pluja obre la porta; el que ve després decideix.</p></article>
          </div>
        </section>

        <SpeciesHandlingBlock
          titleId="rovellons-handling-title"
          title="Com netejar, guardar i congelar els rovellons"
          intro="Un cop els tens a casa. La conserva no arregla mai una identificació dubtosa: si no estàs segur de l’espècie, no la posis a la cistella de consum."
          moreHref="/conservar-bolets#conservar-rovellons"
          steps={[
            { title: "Netejar-los", body: "Raspalla la terra i passa’ls un drap humit. No els deixis en remull: la carn xucla l’aigua de seguida i després es desfà a la paella." },
            { title: "Guardar-los uns dies", body: "A la nevera aguanten poc. Val més tenir-los en un recipient obert o en un cistell que en una bossa tancada, que els fa suar." },
            { title: "Congelar-los", body: "Cuina’ls abans de congelar-los i separa’ls en porcions. Congelats en cru perden textura i es tornen aigualits." },
            { title: "En escabetx", body: "L’escabetx s’ha de guardar a la nevera. És una conserva refrigerada, no una conserva d’armari." },
          ]}
        />

        <FaqSection faqs={faqs} title="Preguntes freqüents sobre els rovellons" titleId="rovellons-faq-title" />

        <nav className="rain-guide-actions" aria-label="Guies relacionades amb els rovellons">
          <Link href="/bolets-avui">On trobar bolets avui <ArrowUpRight size={16} /></Link>
          <Link href="/conservar-bolets">Com conservar rovellons <ArrowUpRight size={16} /></Link>
        </nav>

        <aside className="rovellons-safety">
          <ShieldAlert size={23} aria-hidden="true" />
          <div><strong>Aquesta comparació no és suficient per decidir el consum.</strong><p>No consumeixis cap bolet basant-te en el mapa, aquesta pàgina o una fotografia. L’ACSA recomana menjar només els bolets que es puguin identificar sense cap dubte; consulta la seva <a href={officialSafetySource.url} target="_blank" rel="noreferrer">guia oficial</a> i confirma l’espècie amb una persona experta.</p></div>
        </aside>

        <EditorialAttribution
          contentId="zones-rovellons"
          sources={[
            officialSafetySource,
            ...[rovello, pinetell].flatMap((species) => species.references),
            ...nameSharingLookalikes.flatMap((species) => species.references),
          ]}
          variant="compact"
        />
      </div>
    </div>
  );
}
