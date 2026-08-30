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
import { JsonLd } from "@/components/json-ld";
import { SpeciesCard } from "@/components/species-card";
import { editorialArticleFields, officialSafetySource } from "@/data/editorial";
import {
  areaPath,
  areaProfiles,
  locationPagePath,
  speciesLocationPages,
} from "@/data/location-pages";
import { getSpecies } from "@/data/species";
import {
  monthInTimeZone,
  monthWithPreposition,
  SEASONAL_ACTIVITY_LABELS,
  SEASON_MONTHS,
} from "@/src/lib/seasonality";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, speciesPath } from "@/src/lib/seo";
import type { RegionId, SpeciesProfile } from "@/src/lib/types";

export const metadata: Metadata = {
  title: "Rovellons: tipus, hàbitat, temporada i on trobar-ne",
  description: "Guia dels rovellons a Catalunya: tipus, diferències entre rovelló i pinetell, identificació prudent, hàbitat, temporada, zones i mapes.",
  alternates: { canonical: "/zones/rovellons" },
  openGraph: {
    url: "/zones/rovellons",
    title: "Rovellons a Catalunya: tipus, hàbitat i temporada",
    description: "Tipus de rovellons, diferències, hàbitat, temporada, zones i condicions actuals a Catalunya.",
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
    description: "Pinedes dels estatges baixos i montans on el rovelló pot encaixar si la cota, el substrat neutre o calcari i la humitat de tardor són compatibles.",
  },
  {
    name: "Prepirineu i Berguedà",
    region: "prepirineus",
    speciesId: "lactarius-deliciosus",
    description: "Pinedes de muntanya i mitjana altitud on el pinetell pot trobar pinassa fresca, sempre que la humitat es mantingui després de ploure.",
  },
  {
    name: "Catalunya Central",
    region: "catalunya-central",
    speciesId: "lactarius-deliciosus",
    description: "Pinedes interiors amb una resposta molt dependent de la pluja efectiva, el drenatge i els episodis de vent sec.",
  },
  {
    name: "Empordà",
    region: "emporda",
    speciesId: "lactarius-sanguifluus",
    description: "Boscos mediterranis de pins on el rovelló vinós pot encaixar millor en sòls neutres o calcaris i sectors poc dessecats.",
  },
  {
    name: "Serralades prelitorals",
    region: "serralades-prelitorals",
    speciesId: "lactarius-sanguifluus",
    description: "Pinedes mediterrànies amb fortes diferències entre solell, obaga i fondalada; el nom de la serra no substitueix la lectura de l’hàbitat.",
  },
  {
    name: "Els Ports",
    region: "ports",
    speciesId: "lactarius-sanguifluus",
    description: "Pinedes i relleus meridionals on la humitat acumulada, la temperatura suau i l’exposició decideixen una temporada irregular.",
  },
];

const faqs = [
  {
    question: "On es poden trobar rovellons a Catalunya?",
    answer: "En termes ecològics, cal buscar pinedes compatibles amb l’espècie, pinassa que conservi humitat i sòls amb bon drenatge. Els Pirineus, el Prepirineu, Catalunya Central, l’Empordà, les serralades prelitorals i els Ports contenen paisatges potencialment compatibles, però això no confirma presència en cap punt concret.",
  },
  {
    question: "Quan comença la temporada de rovellons?",
    answer: "La finestra general comença al setembre i es concentra sobretot a l’octubre i el novembre. La cota, la temperatura, el vent i la humitat acumulada poden avançar, retardar o interrompre la fructificació.",
  },
  {
    question: "Quants dies després de ploure surten els rovellons?",
    answer: "No hi ha un nombre fix aplicable a tots els boscos. La pluja ha de rehidratar la pinassa i el sòl durant prou temps; la calor, el vent sec o una humitat prèvia insuficient poden impedir la resposta encara que hagi plogut.",
  },
  {
    question: "Rovelló i pinetell són el mateix?",
    answer: "No exactament. En aquesta guia, rovelló designa Lactarius sanguifluus, de làtex vermell vinós, i pinetell designa Lactarius deliciosus, de làtex taronja. Popularment, però, el nom rovelló sovint s’utilitza per a tots dos.",
  },
  {
    question: "Es poden trobar rovellons al Montseny?",
    answer: "El massís conté pinedes i forts gradients d’humitat, però no s’ha de considerar tot el Montseny una zona homogènia. Cal consultar el mapa d’hàbitat i les dades actuals per espècie; aquesta guia no publica punts de recol·lecció.",
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

export default function RovellonsTerritoryPage() {
  const rovello = getSpecies("lactarius-sanguifluus")!;
  const pinetell = getSpecies("lactarius-deliciosus")!;
  const currentMonth = monthInTimeZone();
  const currentMonthLabel = SEASON_MONTHS.find(({ key }) => key === currentMonth)!.label;
  return (
    <div className="rovellons-hub">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Article",
            "@id": `${absoluteUrl("/zones/rovellons")}#article`,
            headline: "Rovellons a Catalunya: tipus, hàbitat i temporada",
            url: absoluteUrl("/zones/rovellons"),
            inLanguage: "ca",
            description: "Guia dels tipus de rovellons, les diferències d’identificació, l’hàbitat, la temporada i les zones compatibles a Catalunya.",
            mainEntityOfPage: absoluteUrl("/zones/rovellons"),
            about: [
              { "@type": "Taxon", name: rovello.identity.scientificName },
              { "@type": "Taxon", name: pinetell.identity.scientificName },
            ],
            ...editorialArticleFields("zones-rovellons"),
          },
          {
            "@type": "FAQPage",
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
              <p className="eyebrow light"><MapPinned size={15} /> Tipus, hàbitat i temporada</p>
              <h1>Rovellons<br /><i>a Catalunya.</i></h1>
              <p>Què anomenem rovelló, com distingim el rovelló vinós del pinetell i en quines pinedes i moments de l’any pot encaixar cada espècie.</p>
            </div>
            <aside>
              <Trees size={22} aria-hidden="true" />
              <span>On trobar-ne</span>
              <strong>Pinedes compatibles amb pinassa humida, sòl ben drenat i una tardor sense calor ni vent sec persistents.</strong>
              <small>Hàbitat potencial; no confirma presència ni abundància.</small>
            </aside>
          </div>
        </div>
      </header>

      <div className="page-width rovellons-content">
        <section className="rovellons-definition" aria-labelledby="rovellons-definition-title">
          <div>
            <p className="eyebrow">Què són els rovellons?</p>
            <h2 id="rovellons-definition-title">Un nom popular que no sempre designa la mateixa espècie.</h2>
          </div>
          <div>
            <p>A Catalunya, <em>rovellons</em> pot funcionar com un nom de grup. Aquesta guia compara els dos perfils del catàleg amb predicció pròpia: el rovelló vinós i el pinetell. Tots dos són lactaris associats als pins, però canvien el làtex, el color, el sòl preferit i part de la distribució ecològica.</p>
            <Link href="/compare/rovello-vs-pinetell" className="text-link">Veure rovelló vs. pinetell <ArrowUpRight size={16} /></Link>
          </div>
        </section>

        <section className="guide-types" aria-labelledby="rovellons-types-title">
          <header>
            <p className="eyebrow">Tipus de rovellons</p>
            <h2 id="rovellons-types-title">Rovelló i pinetell, comparats d’un cop d’ull.</h2>
            <p>La taula resumeix dades de les fitxes documentades; no és una llista exhaustiva de tots els lactaris que poden rebre noms populars semblants.</p>
          </header>
          <p className="guide-types-scroll-hint">Fes lliscar la taula per veure totes les columnes.</p>
          <div className="guide-types-table-scroll">
            <table className="guide-types-table" data-rovellons-types-table>
              <caption className="sr-only">Comparació dels dos tipus de rovellons representats al catàleg</caption>
              <thead>
                <tr><th scope="col">Tipus</th><th scope="col">Làtex i carn</th><th scope="col">Barret</th><th scope="col">Bosc i temporada</th></tr>
              </thead>
              <tbody>
                {[rovello, pinetell].map((species) => (
                  <tr key={species.speciesId}>
                    <th scope="row"><Link href={speciesPath(species)}>{species.identity.commonName}</Link><i>{species.identity.scientificName}</i></th>
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

        <section className="rovellons-signals guide-lookalikes" aria-labelledby="rovellons-identification-title">
          <header><p className="eyebrow"><ShieldAlert size={15} /> Identificació prudent</p><h2 id="rovellons-identification-title">El làtex orienta, però no identifica tot sol.</h2></header>
          <div>
            <article><span>01</span><h3>Compara l’exemplar complet</h3><p>Revisa el làtex acabat de sortir, el barret, les làmines, el peu, l’arbre associat i la temporada. La <Link href="/compare/rovello-vs-pinetell">comparació entre rovelló i pinetell</Link> ordena aquests trets.</p></article>
            <article><span>02</span><h3>Descarta els lactaris de làtex blanc</h3><p>Cap dels dos perfils d’aquesta guia té làtex blanc. Alguns lactaris semblants, com els de barret rosat i pelut, poden causar trastorns digestius.</p></article>
          </div>
        </section>

        <section className="rovellons-now" aria-labelledby="rovellons-now-title">
          <div className="rovellons-now-heading">
            <div>
              <p className="eyebrow light"><CalendarDays size={15} /> Rovellons avui</p>
              <h2 id="rovellons-now-title">Lectura actual {monthWithPreposition(currentMonth)}</h2>
            </div>
            <span>{currentMonthLabel}</span>
          </div>
          <div className="rovellons-now-grid">
            {[rovello, pinetell].map((species) => {
              const activity = species.ecologicalConfig.seasonality[currentMonth];
              return (
                <article key={species.speciesId}>
                  <span>{species.identity.commonName}</span>
                  <strong>{SEASONAL_ACTIVITY_LABELS[activity]}</strong>
                  <p>Pic habitual: {peakMonths(species)}. El calendari no confirma fructificació avui.</p>
                  <Link href={`/map?species=${species.speciesId}&region=${species.ecologicalConfig.regions[0]}`} className="text-link">Obrir el mapa actual <Map size={15} /></Link>
                </article>
              );
            })}
            <aside>
              <CloudRain size={20} aria-hidden="true" />
              <strong>Per saber si hi ha condicions ara</strong>
              <p>El mapa combina temporada, pluja acumulada, humitat del sòl, temperatura i cobertura compatible quan les dades són prou completes.</p>
            </aside>
          </div>
        </section>

        <section className="rovellons-territories" aria-labelledby="rovellons-territories-title">
          <header>
            <p className="eyebrow"><MapPinned size={15} /> Zones generals</p>
            <h2 id="rovellons-territories-title">On mirar l’hàbitat, no on buscar una coordenada.</h2>
            <p>Aquestes lectures regionals provenen dels àmbits compatibles configurats per a cada espècie. Dins de cada regió hi ha grans diferències de bosc, sòl i exposició.</p>
          </header>
          <div className="rovellons-territory-grid">
            {territoryReadings.map((territory) => (
              <Link href={`/map?species=${territory.speciesId}&region=${territory.region}`} key={`${territory.region}-${territory.speciesId}`}>
                <span><MapPinned size={15} /> Lectura regional</span>
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
            <h2 id="rovellons-published-title">Del Pirineu als Ports, amb més detall.</h2>
            <p>
              {publishedAreas.map((area, index) => (
                <span key={area.slug}>
                  {index > 0 && (index === publishedAreas.length - 1 ? " i " : ", ")}
                  <Link href={areaPath(area)}>{area.nameWithArticle}</Link>
                </span>
              ))} tenen lectures pròpies per al rovelló, el pinetell o tots dos, sempre sense publicar punts de recol·lecció. Cada enllaç obre el hub territorial, amb les condicions actuals de la zona.
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
          <header><p className="eyebrow"><Sprout size={15} /> Com llegir el bosc</p><h2 id="rovellons-signals-title">Quatre senyals abans d’obrir el mapa.</h2></header>
          <div>
            <article><span>01</span><h3>Pins compatibles</h3><p>Rovellons i pinetells són micorrízics: la presència de pins és necessària, però per si sola no és suficient.</p></article>
            <article><span>02</span><h3>Pinassa humida</h3><p>La capa superficial ha de conservar humitat durant dies. Un xàfec curt sobre un sòl encara sec pot no activar res.</p></article>
            <article><span>03</span><h3>Bon drenatge</h3><p>Els sòls frescos funcionen millor quan retenen aigua sense quedar entollats ni compactats.</p></article>
            <article><span>04</span><h3>Poc vent sec</h3><p>Vent, calor o una nova sequera poden tallar la finestra encara que la pluja recent sembli favorable.</p></article>
          </div>
        </section>

        <section className="rovellons-faq" aria-labelledby="rovellons-faq-title">
          <header><p className="eyebrow">Preguntes freqüents</p><h2 id="rovellons-faq-title">Rovellons, zones i temporada.</h2></header>
          <div>{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div>
        </section>

        <aside className="rovellons-safety">
          <ShieldAlert size={23} aria-hidden="true" />
          <div><strong>Aquesta comparació no és suficient per decidir el consum.</strong><p>No consumeixis cap bolet basant-te en el mapa, aquesta pàgina o una fotografia. L’ACSA recomana menjar només els bolets que es puguin identificar sense cap dubte; consulta la seva <a href={officialSafetySource.url} target="_blank" rel="noreferrer">guia oficial</a> i confirma l’espècie amb una persona experta.</p></div>
        </aside>

        <EditorialAttribution
          contentId="zones-rovellons"
          sources={[
            officialSafetySource,
            ...[rovello, pinetell].flatMap((species) => species.references),
          ]}
          variant="compact"
        />
      </div>
    </div>
  );
}
