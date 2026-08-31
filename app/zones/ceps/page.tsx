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
import { regionLabels } from "@/data/regions";
import { getSpecies } from "@/data/species";
import {
  cepSpeciesIds,
  cepTerritoryReadings,
  type CepSpeciesId,
} from "@/src/lib/ceps-guide";
import {
  monthInTimeZone,
  monthWithPreposition,
  SEASONAL_ACTIVITY_LABELS,
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
const cepSpeciesIdSet = new Set<string>(cepSpeciesIds);
const publishedGuides = speciesLocationPages.filter((page) =>
  cepSpeciesIdSet.has(page.speciesId),
);
const publishedAreas = areaProfiles.filter((area) =>
  publishedGuides.some((guide) => guide.areaSlug === area.slug),
);

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
    question: "En quins boscos convé mirar l’hàbitat potencial?",
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

function peakMonths(species: SpeciesProfile) {
  return SEASON_MONTHS
    .filter(({ key }) => species.ecologicalConfig.seasonality[key] === "peak")
    .map(({ label }) => label)
    .join(" i ");
}

export default function CepsTerritoryPage() {
  const currentMonth = monthInTimeZone();
  const currentMonthLabel = SEASON_MONTHS.find(
    ({ key }) => key === currentMonth,
  )!.label;

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
                Ceps
                <br />
                <i>de Catalunya.</i>
              </h1>
              <p>
                Una sola paraula amaga quatre perfils ecològics: els arbres, la
                cota i el calendari canvien, però sempre cal que hi hagi un
                hàbitat compatible i humitat sostinguda.
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
                Hàbitat potencial; no confirma presència ni abundància.
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
              Quatre espècies del gènere Boletus al catàleg.
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
            <h2 id="ceps-types-title">Els quatre ceps de Catalunya representats al catàleg.</h2>
            <p>Aquesta comparació surt de les mateixes fitxes ecològiques i d’identificació que alimenten els perfils individuals i els mapes.</p>
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
                    <th scope="row"><Link href={speciesPath(species)}>{species.identity.commonName}</Link><i>{species.identity.scientificName}</i></th>
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

        <section
          className="rovellons-signals ceps-lookalikes guide-lookalikes"
          aria-labelledby="ceps-lookalikes-title"
        >
          <header>
            <p className="eyebrow"><ShieldAlert size={15} /> Confusions importants</p>
            <h2 id="ceps-lookalikes-title">Porus rosats o vermells obliguen a aturar la identificació.</h2>
          </header>
          <div>
            <article>
              <span>01</span><h3>Mataparent</h3>
              <p>Té porus que es tornen rosats i un reticle bru fosc. És incomestible pel gust amarg; no el tastis per confirmar-ne la identitat.</p>
              <Link href="/compare/cep-vs-mataparent" className="text-link">Comparar amb el cep <ArrowUpRight size={15} /></Link>
            </article>
            <article>
              <span>02</span><h3>Matagent</h3>
              <p>Presenta porus vermells, peu groc i vermell i carn que blaveja. És tòxic i no s’ha de consumir.</p>
              <Link href="/compare/cep-vs-matagent" className="text-link">Comparar amb el cep <ArrowUpRight size={15} /></Link>
            </article>
          </div>
        </section>

        <section className="rovellons-now" aria-labelledby="ceps-now-title">
          <div className="rovellons-now-heading">
            <div>
              <p className="eyebrow light">
                <CalendarDays size={15} /> Ceps avui
              </p>
              <h2 id="ceps-now-title">
                Lectura estacional {monthWithPreposition(currentMonth)}
              </h2>
            </div>
            <span>{currentMonthLabel}</span>
          </div>
          <div className="rovellons-now-grid ceps-now-grid">
            {ceps.map((species) => {
              const activity = species.ecologicalConfig.seasonality[currentMonth];
              return (
                <article key={species.speciesId}>
                  <span>
                    <Link href={speciesPath(species)}>
                      {species.identity.commonName}
                    </Link>
                  </span>
                  <strong>{SEASONAL_ACTIVITY_LABELS[activity]}</strong>
                  <p>
                    Pic habitual: {peakMonths(species)}. El calendari no confirma
                    fructificació avui.
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
                El mapa combina temporada, pluja acumulada, humitat del sòl,
                temperatura i cobertura compatible quan les dades són prou
                completes. No mostra troballes.
              </p>
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
              Una regió compatible no és un bosc homogeni.
            </h2>
            <p>
              Cada targeta associa la regió a un dels quatre perfils que la
              inclou explícitament. La descripció parla d’aquell cep, no de
              presència o abundància a tota la regió.
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
                    Veure la lectura al mapa <ArrowUpRight size={15} />
                  </strong>
                </Link>
              );
            })}
          </div>
        </section>

        <section
          className="rovellons-published ceps-published"
          aria-labelledby="ceps-published-title"
        >
          <div>
            <p className="eyebrow">Guies locals publicades</p>
            <h2 id="ceps-published-title">
              {publishedGuides.length} lectures locals, {publishedAreas.length} territoris.
            </h2>
            <p>
              Els territoris documentats són {publishedAreas.map((area, index) => (
                <span key={area.slug}>
                  {index > 0 && (index === publishedAreas.length - 1 ? " i " : ", ")}
                  <Link href={areaPath(area)}>{area.nameWithArticle}</Link>
                </span>
              ))}. Cada enllaç obre el hub territorial amb les condicions actuals; cap pàgina revela punts de recol·lecció.
            </p>
          </div>
          <div data-cep-local-guides>
            {publishedGuides.map((guide) => {
              const area = areaProfiles.find(
                (profile) => profile.slug === guide.areaSlug,
              );
              return (
                <Link href={locationPagePath(guide)} key={locationPagePath(guide)}>
                  <span>{area?.name ?? "Guia local"}</span>
                  <strong>{guide.titlePhrase}</strong>
                  <ArrowUpRight size={17} />
                </Link>
              );
            })}
          </div>
        </section>

        <section
          className="rovellons-signals"
          aria-labelledby="ceps-signals-title"
        >
          <header>
            <p className="eyebrow">
              <Sprout size={15} /> Com llegir el bosc
            </p>
            <h2 id="ceps-signals-title">
              Quatre filtres abans d’obrir el mapa.
            </h2>
          </header>
          <div>
            <article>
              <span>01</span>
              <h3>L’arbre correcte</h3>
              <p>
                Pins, faigs, avets, roures, alzines o sureres segons l’espècie:
                “cep” no implica una única associació forestal.
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>Sòl rehidratat</h3>
              <p>
                Una pluja curta no basta si el sòl continua sec. Cal humitat
                sostinguda i, alhora, un drenatge que eviti l’entollament.
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>Temperatura coherent</h3>
              <p>
                Els ceps de muntanya prefereixen més frescor; el cep negre i el
                d’estiu toleren ambients més càlids si el sòl conserva aigua.
              </p>
            </article>
            <article>
              <span>04</span>
              <h3>Sense retorn sec</h3>
              <p>
                El vent, la calor o una nova sequera poden tallar la finestra
                abans que la rehidratació del sòl es tradueixi en fructificació.
              </p>
            </article>
          </div>
        </section>

        <section
          className="rovellons-faq"
          aria-labelledby="ceps-faq-title"
        >
          <header>
            <p className="eyebrow">Preguntes freqüents</p>
            <h2 id="ceps-faq-title">Ceps, boscos i temporada.</h2>
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
