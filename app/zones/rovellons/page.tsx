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
import { JsonLd } from "@/components/json-ld";
import { SpeciesCard } from "@/components/species-card";
import {
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
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE } from "@/src/lib/seo";
import type { RegionId, SpeciesProfile } from "@/src/lib/types";

export const metadata: Metadata = {
  title: "On trobar rovellons a Catalunya: zones i temporada",
  description: "Guia per trobar rovellons a Catalunya: hàbitat, temporada, zones generals, mapa i diferències entre rovelló i pinetell.",
  keywords: [
    "on trobar rovellons",
    "on trobar rovellons a Catalunya",
    "rovellons avui",
    "rovellons ara",
    "mapa de rovellons Catalunya",
    "temporada de rovellons",
    "zones de rovellons",
    "millors llocs per trobar rovellons",
  ],
  alternates: { canonical: "/zones/rovellons" },
  openGraph: {
    url: "/zones/rovellons",
    title: "On trobar rovellons a Catalunya",
    description: "Zones, hàbitat, temporada i lectura de les condicions actuals per al rovelló i el pinetell.",
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

const lactariusSpeciesIds = new Set([
  "lactarius-deliciosus",
  "lactarius-sanguifluus",
]);
const publishedGuides = speciesLocationPages.filter((page) =>
  lactariusSpeciesIds.has(page.speciesId),
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
            "@type": "WebPage",
            "@id": `${absoluteUrl("/zones/rovellons")}#page`,
            name: "On trobar rovellons a Catalunya",
            url: absoluteUrl("/zones/rovellons"),
            inLanguage: "ca",
            description: "Guia ecològica de zones, hàbitat i temporada de rovellons a Catalunya.",
            about: [
              { "@type": "Taxon", name: rovello.identity.scientificName },
              { "@type": "Taxon", name: pinetell.identity.scientificName },
            ],
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
              <p className="eyebrow light"><MapPinned size={15} /> Guia territorial</p>
              <h1>On trobar rovellons<br /><i>a Catalunya.</i></h1>
              <p>La resposta útil no és una coordenada: és la coincidència entre pins, sòl, humitat, temperatura i moment de temporada.</p>
            </div>
            <aside>
              <Trees size={22} aria-hidden="true" />
              <span>Resposta curta</span>
              <strong>Pinedes amb pinassa humida, sòl ben drenat i una tardor sense calor ni vent sec persistents.</strong>
              <small>Hàbitat potencial; no confirma presència ni abundància.</small>
            </aside>
          </div>
        </div>
      </header>

      <div className="page-width rovellons-content">
        <section className="rovellons-definition" aria-labelledby="rovellons-definition-title">
          <div>
            <p className="eyebrow">Abans de mirar el mapa</p>
            <h2 id="rovellons-definition-title">“Rovelló” pot voler dir dos bolets.</h2>
          </div>
          <div>
            <p>A Catalunya, la cerca <em>rovellons</em> sovint barreja el rovelló vinós i el pinetell. Tots dos viuen associats als pins, però no tenen exactament el mateix làtex, sòl preferit ni distribució ecològica.</p>
            <Link href="/compare/rovello-vs-pinetell" className="text-link">Veure rovelló vs. pinetell <ArrowUpRight size={16} /></Link>
          </div>
        </section>

        <div className="species-grid rovellons-species-grid">
          <SpeciesCard species={rovello} currentMonth={currentMonth} />
          <SpeciesCard species={pinetell} index={1} currentMonth={currentMonth} />
        </div>

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
            <p>Ripollès, Cerdanya, Berguedà i els Ports tenen lectures pròpies per al rovelló, el pinetell o tots dos, sempre sense publicar punts de recol·lecció.</p>
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
          <div><strong>No és una guia de recol·lecció ni d’identificació.</strong><p>No consumiu cap bolet basant-vos en el mapa, aquesta pàgina o una fotografia. Confirmeu sempre l’espècie amb una persona experta.</p></div>
        </aside>
      </div>
    </div>
  );
}
