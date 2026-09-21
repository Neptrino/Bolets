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
import { CepsLocalGuides } from "@/components/ceps-local-guides";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { SpeciesCard } from "@/components/species-card";
import { SpeciesIcon } from "@/components/species-icon";
import { SpeciesHandlingBlock } from "@/components/species-handling-block";
import { SpeciesNamesTable } from "@/components/species-names-table";
import { editorialArticleFields, officialSafetySource } from "@/data/editorial";
import { regionLabels } from "@/data/regions";
import { getSpecies } from "@/data/species";
import { speciesSameAs } from "@/data/species-identifiers";
import {
  cepSpeciesIds,
  cepTerritoryReadings,
  type CepSpeciesId,
} from "@/src/lib/ceps-guide";
import {
  monthInTimeZone,
  monthWithPreposition,
  monthlyActivityLabel,
  SEASON_MONTHS,
} from "@/src/lib/seasonality";
import {
  absoluteUrl,
  DEFAULT_SOCIAL_IMAGE,
  pageTitle,
  speciesPath,
} from "@/src/lib/seo";
import type { SpeciesProfile } from "@/src/lib/types";
import { speciesMapHref } from "@/src/lib/species-map-pages";

export const metadata: Metadata = {
  title: pageTitle("Ceps de Catalunya: tipus, temporada i zones"),
  description:
    "Guia dels ceps de Catalunya: quatre tipus, diferències, identificació prudent, hàbitat, temporada, zones, mapes i confusions importants.",
  alternates: { canonical: "/zones/ceps" },
  openGraph: {
    url: "/zones/ceps",
    title: "Ceps de Catalunya: tipus, diferències i temporada",
    description:
      "Quatre tipus de ceps, diferències, hàbitats, temporada, zones, mapes i confusions importants.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

export const revalidate = 3600;

function requiredSpecies(speciesId: CepSpeciesId) {
  const species = getSpecies(speciesId);
  if (!species) throw new Error(`Missing canonical cep profile: ${speciesId}`);
  return species;
}

const ceps = cepSpeciesIds.map(requiredSpecies);
/* The two bolets people bring home thinking they are ceps. Both are full
   profiles with photographs, so they render as cards like the ceps do. */
const cepLookalikes = ["tylopilus-felleus", "rubroboletus-satanas"]
  .map((speciesId) => getSpecies(speciesId))
  .filter((species): species is NonNullable<typeof species> => Boolean(species));
const comparisonLinks = [
  { href: "/compare/cep-vs-cep-estiu", label: "Cep vs. cep d’estiu" },
  { href: "/compare/cep-vs-cep-negre", label: "Cep vs. cep negre" },
  { href: "/compare/cep-vs-cep-rogenc", label: "Cep vs. cep rogenc" },
] as const;

const faqs = [
  {
    question: "Quins bolets agrupem com a ceps en aquesta guia?",
    answer:
      "Aquesta guia agrupa quatre perfils del catàleg: cep (Boletus edulis), cep rogenc (Boletus pinophilus), cep negre (Boletus aereus) i cep d’estiu (Boletus reticulatus). Comparteixen alguns trets, però difereixen pel que fa als arbres associats, la cota i el calendari.",
  },
  {
    question: "Quan comença la temporada de ceps?",
    answer:
      "El calendari combinat dels quatre perfils va de maig a novembre. El cep d’estiu té el pic configurat al juliol, el cep rogenc al setembre, i el cep comú i el cep negre a l’octubre. L’altitud i les condicions de l’any poden desplaçar o interrompre aquestes finestres.",
  },
  {
    question: "Quants dies després de ploure surten els ceps?",
    answer:
      "No hi ha un nombre fix aplicable a tots els boscos. Els perfils indiquen una resposta de dies a setmanes, condicionada per la humitat prèvia del sòl, la temperatura posterior, el vent i el retorn de la calor o la sequera.",
  },
  {
    question: "Com es conserven els ceps?",
    answer: "Nets, sense remull i descartant les parts toves o parasitades. A partir d’aquí hi ha dues vies: assecar els exemplars sans tallats a làmines, que és la manera clàssica de tenir-ne tot l’any, o fer-los una cocció breu i congelar-los en porcions etiquetades. A la nevera en fresc aguanten pocs dies.",
  },
  {
    question: "Com es diuen els ceps en castellà?",
    answer: "El cep (Boletus edulis) és el «boleto» o «hongo blanco»; el cep negre (Boletus aereus) és el «boleto negro». En castellà, però, molta gent en diu simplement «boletus», fent servir el nom del gènere. En català el cep també s’anomena surenc, sureny o siureny segons la comarca.",
  },
  {
    question: "En quins boscos surten els ceps?",
    answer:
      "El cep comú i el rogenc tenen perfils de boscos frescos de muntanya, especialment fagedes, avetoses, rouredes o pinedes segons l’espècie. El cep negre s’associa a alzinars, suredes i rouredes mediterrànies, i el cep d’estiu a rouredes, fagedes, castanyedes i altres boscos de planifolis.",
  },
  {
    question: "Com es diferencia un cep del matagent?",
    answer:
      "El perfil del matagent descriu porus vermells, un peu groc i vermell i carn que blaveja. Els quatre ceps d’aquesta guia tenen porus que passen de clars a grocs o olivacis i carn blanca immutable. Cap tret aïllat substitueix una identificació experta.",
  },
  {
    question: "Com es diferencia un cep del mataparent?",
    answer:
      "El mataparent desenvolupa porus rosats i un reticle bru fosc; és incomestible pel gust molt amarg. No tastis mai un exemplar dubtós per identificar-lo: compara tots els trets i consulta una persona experta.",
  },
  {
    question: "El mapa confirma que hi ha ceps en un lloc?",
    answer:
      "No. El mapa mostra on el terreny pot ser adequat i, quan hi ha prou lectures, les condicions actuals. No demostra que hi hagi ceps en cap punt concret.",
  },
] as const;

/** The months the catalogue marks as active, e.g. "setembre–desembre". */
function seasonRange(species: SpeciesProfile) {
  const activeMonths = SEASON_MONTHS.filter(
    ({ key }) => species.ecologicalConfig.seasonality[key] !== "inactive",
  );
  const first = activeMonths[0]?.label;
  const last = activeMonths.at(-1)?.label;
  return first && last ? `${first}–${last}` : "Calendari no disponible";
}

function peakMonths(species: SpeciesProfile) {
  return SEASON_MONTHS
    .filter(({ key }) => species.ecologicalConfig.seasonality[key] === "peak")
    .map(({ label }) => label)
    .join(" i ");
}

export default function CepsTerritoryPage() {
  const currentMonth = monthInTimeZone();

  return (
    <div className="rovellons-hub ceps-hub">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              "@id": `${absoluteUrl("/zones/ceps")}#article`,
              headline: "Ceps de Catalunya: tipus, diferències, hàbitat i temporada",
              url: absoluteUrl("/zones/ceps"),
              inLanguage: "ca",
              description:
                "Guia dels tipus de ceps, les zones on el terreny pot ser adequat, la temporada i les condicions actuals a Catalunya.",
              mainEntityOfPage: absoluteUrl("/zones/ceps"),
              about: ceps.map((species) => ({
                "@type": "Taxon",
                name: species.identity.scientificName,
                alternateName: species.identity.commonName,
                taxonRank: "species",
                sameAs: speciesSameAs(species.speciesId),
              })),
              ...editorialArticleFields("zones-ceps"),
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
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Inici",
                  item: absoluteUrl(),
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Guies",
                  item: absoluteUrl("/guies"),
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: "Ceps",
                  item: absoluteUrl("/zones/ceps"),
                },
              ],
            },
          ],
        }}
      />

      <header className="rovellons-hero">
        <div className="page-width rovellons-hero-inner">
          <Link href="/guies" className="back-link">
            ← Totes les guies
          </Link>
          <div className="rovellons-hero-grid">
            <div>
              <p className="eyebrow light"><MapPinned size={15} /> Tipus, diferències i temporada</p>
              <h1>
                Ceps{" "}
                <br />
                <i>de Catalunya.</i>
              </h1>
              <p>
                Sota el nom de cep hi ha quatre bolets diferents: el cep, el cep
                rogenc, el cep negre i el cep d’estiu. Cadascun vol el seu bosc i
                té el seu moment. Aquí tens en què es diferencien, en quines
                zones mirar i com està el bosc avui.
              </p>
            </div>
            <aside>
              <Trees size={22} aria-hidden="true" />
              <span>On trobar-ne</span>
              <strong>
                Boscos frescos de muntanya per al cep comú i el rogenc; boscos
                mediterranis o planifolis temperats per al negre i el d’estiu.
              </strong>
              <small>
                És el bosc on en poden sortir. No vol dir que avui n’hi hagi.
              </small>
            </aside>
          </div>
        </div>
      </header>

      <div className="page-width rovellons-content">
        <section
          className="rovellons-definition"
          aria-labelledby="ceps-definition-title"
        >
          <div>
            <p className="eyebrow">Què són els ceps?</p>
            <h2 id="ceps-definition-title">
              Què són els ceps i quins tipus hi ha
            </h2>
          </div>
          <div>
            <p>
              En aquesta guia, <em>ceps</em> agrupa el cep, el cep de pi o
              rogenc, el cep negre i el cep d’estiu. Comparteixen porus en lloc
              de làmines i carn blanca immutable, però canvien el barret, el
              reticle, els arbres associats, la cota i el calendari. Cap tret
              per separat n’assegura la identificació.
            </p>
            <div className="ceps-comparison-links" aria-label="Comparacions entre ceps">
              {comparisonLinks.map((comparison) => (
                <Link href={comparison.href} className="text-link" key={comparison.href}>
                  {comparison.label} <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="guide-types" aria-labelledby="ceps-types-title">
          <header>
            <p className="eyebrow">Tipus de ceps</p>
            <h2 id="ceps-types-title">Tipus de ceps a Catalunya</h2>
            <p>La taula surt de les mateixes fitxes que alimenten els perfils de cada espècie i el mapa.</p>
          </header>
          <p className="guide-types-scroll-hint">Fes lliscar la taula per veure totes les columnes.</p>
          <div className="guide-types-table-scroll">
            <table className="guide-types-table" data-ceps-types-table>
              <caption className="sr-only">Comparació dels quatre tipus de ceps representats al catàleg</caption>
              <thead>
                <tr><th scope="col">Tipus</th><th scope="col">Barret</th><th scope="col">Peu i reticle</th><th scope="col">Bosc i pic habitual</th></tr>
              </thead>
              <tbody>
                {ceps.map((species) => (
                  <tr key={species.speciesId}>
                    <th scope="row"><span className="guide-types-species"><SpeciesIcon speciesId={species.speciesId} /><Link href={speciesPath(species)}>{species.identity.commonName}</Link></span><i>{species.identity.scientificName}</i></th>
                    <td>{species.morphology.cap}</td>
                    <td>{species.morphology.stem}</td>
                    <td><span>{species.ecologicalConfig.habitat.forestTypes.join("; ")}</span><small>Pic habitual: {peakMonths(species)}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="species-grid rovellons-species-grid" data-cep-species-list>
          {ceps.map((species, index) => (
            <SpeciesCard
              species={species}
              index={index}
              currentMonth={currentMonth}
              key={species.speciesId}
            />
          ))}
        </div>

        <section className="rovellons-lookalike-species" aria-labelledby="ceps-lookalikes-species-title">
          <header>
            <p className="eyebrow"><ShieldAlert size={15} /> Noms que enganyen</p>
            <h2 id="ceps-lookalikes-species-title">Ceps que no es mengen</h2>
            <p>Dos bolets de porus que es troben als mateixos boscos i que la gent recull per error. Cap dels dos es menja: el mataparent perquè amarga fins a fer impossible el plat, el matagent perquè és tòxic.</p>
          </header>
          <div className="species-grid rovellons-species-grid">
            {cepLookalikes.map((species, index) => (
              <SpeciesCard
                key={species.speciesId}
                species={species}
                index={index + 4}
                currentMonth={currentMonth}
              />
            ))}
          </div>
        </section>

        <SpeciesNamesTable
          titleId="ceps-names-title"
          title="Els ceps en castellà: boletus i hongos"
          intro="Si has arribat buscant «boletus», «setas» o «hongo blanco», són aquests mateixos bolets. En català el cep també rep noms propis segons la comarca —surenc, sureny, siureny— i el nom llatí és el que veuràs a les guies i als mercats."
          species={ceps}
        />

        <section
          className="rovellons-signals ceps-lookalikes guide-lookalikes"
          aria-labelledby="ceps-lookalikes-title"
        >
          <header>
            <p className="eyebrow"><ShieldAlert size={15} /> Confusions importants</p>
            <h2 id="ceps-lookalikes-title">Com distingir un cep dels seus semblants</h2>
          </header>
          <div>
            <article>
              <span>01</span><h3>Mira els porus, no el barret</h3>
              <p>El barret enganya: el color varia molt amb l’edat i la pluja. Els porus no. Blancs o olivacis, és un cep; rosats, és un mataparent; vermells, és un matagent.</p>
              <Link href="/compare/cep-vs-mataparent" className="text-link">Comparar amb el cep <ArrowUpRight size={15} /></Link>
            </article>
            <article>
              <span>02</span><h3>Si la carn blaveja al tall, atura’t</h3>
              <p>La carn del cep no canvia de color quan la talles. Si blaveja, no tens un cep a la mà, i no és una diferència que es pugui discutir.</p>
              <Link href="/compare/cep-vs-matagent" className="text-link">Comparar amb el cep <ArrowUpRight size={15} /></Link>
            </article>
          </div>
        </section>

        <section className="rovellons-now" aria-labelledby="ceps-now-title">
          <div className="rovellons-now-heading">
            <div>
              <p className="eyebrow light">
                <CalendarDays size={15} /> Calendari dels ceps
              </p>
              <h2 id="ceps-now-title">
                Quan surten els ceps
              </h2>
            </div>
          </div>
          <p className="rovellons-now-lead">
            Cada cep té els seus mesos. Aquests són els habituals de cada
            espècie, i com està cadascuna ara mateix,{" "}
            {monthWithPreposition(currentMonth)}. Els mesos diuen quan és
            normal que en surtin; si avui n’hi ha depèn de la pluja dels
            últims dies.
          </p>
          <div className="rovellons-now-grid ceps-now-grid">
            {ceps.map((species) => {
              const activity = species.ecologicalConfig.seasonality[currentMonth];
              return (
                <article key={species.speciesId}>
                  <span>
                    <SpeciesIcon speciesId={species.speciesId} size={28} className="species-icon on-dark" />
                    <Link href={speciesPath(species)}>
                      {species.identity.commonName}
                    </Link>
                  </span>
                  <strong>{seasonRange(species)}</strong>
                  <p>
                    Millor moment: {peakMonths(species)}. Ara:{" "}
                    {monthlyActivityLabel(activity)}.
                  </p>
                  <Link
                    href={speciesMapHref(species.speciesId, { region: species.ecologicalConfig.regions[0] })}
                    className="text-link"
                  >
                    Veure al mapa <Map size={15} />
                  </Link>
                </article>
              );
            })}
            <aside>
              <CloudRain size={20} aria-hidden="true" />
              <strong>Per saber si hi ha condicions ara</strong>
              <p>
                El mapa creua l’època, la pluja dels últims dies, la humitat del
                sòl, la temperatura i el tipus de bosc, sempre que hi hagi prou
                dades. No mostra on ha trobat bolets ningú.
              </p>
              <Link href="/bolets-avui" className="text-link">
                On trobar bolets avui i aquesta setmana <ArrowUpRight size={15} />
              </Link>
            </aside>
          </div>
        </section>

        <section
          className="rovellons-territories"
          aria-labelledby="ceps-territories-title"
        >
          <header>
            <p className="eyebrow">
              <MapPinned size={15} /> Nou zones generals
            </p>
            <h2 id="ceps-territories-title">
              Millors zones on trobar ceps a Catalunya
            </h2>
            <p>
              Cada targeta et porta al cep que millor encaixa en aquella zona.
              Parla d’aquell cep en concret, no de tota la regió: dins d’una
              mateixa comarca hi ha boscos que van bé i boscos que no.
            </p>
          </header>
          <div
            className="rovellons-territory-grid ceps-territory-grid"
            data-cep-region-list
          >
            {cepTerritoryReadings.map((territory) => {
              const species = requiredSpecies(territory.speciesId);
              return (
                <Link
                  href={speciesMapHref(territory.speciesId, { region: territory.region })}
                  key={territory.region}
                  data-region={territory.region}
                >
                  <span>
                    <MapPinned size={15} /> {species.identity.commonName}
                  </span>
                  <h3>{regionLabels[territory.region]}</h3>
                  <p>{territory.description}</p>
                  <strong>
                    Veure-ho al mapa <ArrowUpRight size={15} />
                  </strong>
                </Link>
              );
            })}
          </div>
        </section>

        <CepsLocalGuides />

        <section
          className="rovellons-signals"
          aria-labelledby="ceps-signals-title"
        >
          <header>
            <p className="eyebrow">
              <Sprout size={15} /> Com llegir el bosc
            </p>
            <h2 id="ceps-signals-title">
              Com saber si hi ha ceps després de ploure
            </h2>
          </header>
          <div>
            <article>
              <span>01</span>
              <h3>Que hi hagi l’arbre adequat</h3>
              <p>
                Pins, faigs, avets, roures, alzines o sureres, segons quin cep
                busquis. Dir “cep” no vol dir un sol tipus de bosc: cadascun viu
                enganxat a les arrels d’uns arbres concrets.
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>Que el terra s’hagi tornat a mullar</h3>
              <p>
                Un ruixat curt no serveix si a sota el terra segueix sec. Ha de
                mantenir-se humit uns quants dies, però sense que s’hi facin
                bassals.
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>Que la temperatura acompanyi</h3>
              <p>
                Els ceps de muntanya volen fresca. El cep negre i el d’estiu
                aguanten més calor, sempre que el terra mantingui l’aigua.
              </p>
            </article>
            <article>
              <span>04</span>
              <h3>Que no torni a assecar-se</h3>
              <p>
                El vent, una revifada de calor o una nova sequera poden aturar-ho
                tot, encara que hagi plogut fa pocs dies. La pluja obre la porta;
                el que ve després decideix.
              </p>
            </article>
          </div>
        </section>

        <SpeciesHandlingBlock
          titleId="ceps-handling-title"
          title="Com netejar, assecar i congelar els ceps"
          intro="Un cop els tens a casa. La conserva no arregla mai una identificació dubtosa: si no estàs segur de l’espècie, no la posis a la cistella de consum."
          moreHref="/conservar-bolets#conservar-ceps"
          steps={[
            { title: "Netejar-los", body: "Raspalla la terra i passa’ls un drap humit, sense remull. Descarta les parts toves o parasitades abans de guardar res: un tros picat espatlla la resta." },
            { title: "Guardar-los uns dies", body: "A la nevera aguanten poc. Val més tenir-los en un recipient obert o en un cistell que en una bossa tancada, que els fa suar." },
            { title: "Assecar-los", body: "Talla els exemplars sans a làmines i asseca’ls ben estesos. És la manera clàssica de guardar ceps tot l’any." },
            { title: "Congelar-los", body: "Fes-los una cocció breu abans de congelar-los, separa les porcions i etiqueta-les amb la data." },
          ]}
        />

        <section
          className="rovellons-faq"
          aria-labelledby="ceps-faq-title"
        >
          <header>
            <p className="eyebrow">Preguntes freqüents</p>
            <h2 id="ceps-faq-title">Preguntes freqüents sobre els ceps</h2>
          </header>
          <div>
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <nav className="rain-guide-actions" aria-label="Guies relacionades amb els ceps">
          <Link href="/bolets-avui">On trobar bolets avui <ArrowUpRight size={16} /></Link>
          <Link href="/conservar-bolets">Com conservar els ceps <ArrowUpRight size={16} /></Link>
        </nav>

        <aside className="rovellons-safety">
          <ShieldAlert size={23} aria-hidden="true" />
          <div>
            <strong>No és una guia d’identificació per al consum.</strong>
            <p>
              No consumeixis cap bolet basant-te en el mapa, aquesta pàgina o
              una fotografia. L’ACSA recomana menjar només els bolets que es
              puguin identificar sense cap dubte; consulta la seva{" "}
              <a
                href={officialSafetySource.url}
                target="_blank"
                rel="noreferrer"
              >
                guia oficial
              </a>{" "}
              i recorre a una persona experta.
            </p>
          </div>
        </aside>

        <EditorialAttribution
          contentId="zones-ceps"
          sources={[
            officialSafetySource,
            ...ceps.flatMap((species) => species.references),
          ]}
          variant="compact"
        />
      </div>
    </div>
  );
}
