import "@/app/styles/rain-map.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowUpRight,
  CalendarRange,
  CloudRain,
  Droplets,
  Map as MapIcon,
  TriangleAlert,
} from "lucide-react";
import { DataSourceCredits, EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import {
  PageHeader,
  PageShell,
  PageTitleAccent,
  SectionHeader,
} from "@/components/page-layout";
import { editorialArticleFields, environmentalSources } from "@/data/editorial";
import { overviewHubs } from "@/src/lib/current-overview";
import { RAIN_MAP_GRID_SIZE_M, RAIN_MAP_HEIGHT, RAIN_MAP_WIDTH, RAIN_MAP_WINDOW_DAYS } from "@/src/lib/rain-map";
import { loadRainfallSnapshot } from "@/src/lib/rain-map-server";
import {
  rainfallHeadline,
  rankTerritoryRainfall,
  TERRITORY_DRY_THRESHOLD_MM,
  TERRITORY_WET_THRESHOLD_MM,
  type RainfallTerritoryReading,
} from "@/src/lib/rain-overview";
import { formatDays, formatMillimetres, getRainfallBand, rainfallScale } from "@/src/lib/rainfall-scale";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, metaDescription, pageTitle, SITE_URL } from "@/src/lib/seo";

export const revalidate = 3600;

const title = "Pluja i bolets: on ha plogut a Catalunya";
const description = metaDescription(
  "Quanta pluja ha caigut a Catalunya els últims 7 dies, zona per zona, i què vol dir per als bolets que busques.",
);

export const metadata: Metadata = {
  title: pageTitle(title),
  description,
  alternates: { canonical: "/mapa-pluja" },
  openGraph: {
    url: "/mapa-pluja",
    title,
    description,
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

const dateTime = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

const catalanList = new Intl.ListFormat("ca-ES", { style: "long", type: "conjunction" });

const faqs = [
  {
    question: "On ha plogut més a Catalunya aquesta setmana?",
    answer: "El mapa d’aquesta pàgina mostra la pluja dels últims set dies a tot el territori, i la taula de sota la dona zona per zona. S’actualitza un cop al dia, de matinada, amb la pluja recollida fins aleshores.",
  },
  {
    question: "Quanta pluja necessiten els bolets?",
    answer: "No hi ha una xifra única. Per orientar-te: amb menys de 5 mm en una setmana la terra del bosc amb prou feines s’humiteja, i a partir de 15 o 20 mm l’aigua sol arribar prou avall. I no tots els bolets compten els mateixos dies: uns responen a la pluja de fa una setmana i altres a la de fa tres.",
  },
  {
    question: "Aquest mapa és un radar de pluja?",
    answer: "No. Un radar mostra on plou en aquest moment. Aquest mapa mostra quanta aigua ha caigut durant tota una setmana, que és el que fa moure els bolets sota terra. Si vols saber si plou ara, consulta el radar del Servei Meteorològic de Catalunya.",
  },
];

function territoryTone(reading: RainfallTerritoryReading) {
  const value = reading.meanRainfall7dMm ?? 0;
  if (value >= TERRITORY_WET_THRESHOLD_MM) return "wet";
  if (value < TERRITORY_DRY_THRESHOLD_MM) return "dry";
  return "middling";
}

/**
 * The reading every streamed region shares. `loadRainfallSnapshot` is cached
 * across requests and deduplicated within a render, so the three boundaries
 * below cost one read between them and the page shell never waits for it.
 */
async function loadRainfall() {
  try {
    const snapshot = await loadRainfallSnapshot();
    const territories = overviewHubs().map((hub) => ({
      slug: hub.slug,
      name: hub.name,
      typeLabel: hub.typeLabel,
      prepositionalName: hub.prepositionalName,
      path: hub.path,
      bounds: hub.bounds,
    }));
    const readings = rankTerritoryRainfall(territories, snapshot.readings);
    return { snapshot, readings, headline: rainfallHeadline(readings, snapshot.readings) };
  } catch (error) {
    console.error("Rain overview unavailable", error);
    return null;
  }
}

function RainAnswerPlaceholder() {
  return (
    <aside className="rain-map-answer" aria-busy="true" aria-live="polite">
      <Droplets size={24} aria-hidden="true" />
      <div>
        <p className="eyebrow">Resposta curta</p>
        <h2>Mirant on ha plogut aquests set dies…</h2>
        <p>Estem llegint els pluviòmetres i el model per a tot Catalunya.</p>
      </div>
    </aside>
  );
}

async function RainAnswer() {
  const data = await loadRainfall();
  if (!data) {
    return (
      <aside className="rain-map-answer rain-map-answer--unavailable">
        <TriangleAlert size={24} aria-hidden="true" />
        <div>
          <p className="eyebrow">Dades no disponibles</p>
          <h2>Ara mateix no tenim les dades de pluja.</h2>
          <p>Les actualitzem cada dia. Mentrestant pots mirar <Link href="/bolets-avui">les condicions d’avui</Link> o el <Link href="/map">mapa de bolets</Link>.</p>
        </div>
      </aside>
    );
  }

  const wettest = data.headline.wettest.slice(0, 3);
  return (
    <aside className="rain-map-answer">
      <Droplets size={24} aria-hidden="true" />
      <div>
        <p className="eyebrow">Resposta curta</p>
        {wettest.length > 0 ? (
          <h2>Aquesta setmana ha plogut sobretot {catalanList.format(wettest.map((reading) => reading.prepositionalName))}.</h2>
        ) : (
          <h2>Aquesta setmana no ha plogut prou enlloc de Catalunya.</h2>
        )}
        <p>
          De mitjana hi han caigut {formatMillimetres(data.headline.countryMean7dMm)} en set dies, i el punt més plujós n’ha rebut {formatMillimetres(data.headline.countryMax7dMm)}.
          {data.headline.driestCount > 0 && ` ${data.headline.driestCount} de les ${data.readings.length} zones de bolets no arriben als ${TERRITORY_DRY_THRESHOLD_MM} mm.`}
          {" "}Que hi hagi plogut no vol dir que ja hi hagi bolets.
        </p>
        <p className="rain-map-answer-actions">
          <Link href="/bolets-avui" className="button light-button">Bolets avui <ArrowUpRight size={16} aria-hidden="true" /></Link>
          <Link href="/map" className="button rain-map-answer-secondary">Mapa de bolets <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </p>
      </div>
    </aside>
  );
}

async function RainReadingDate() {
  const data = await loadRainfall();
  const observedAt = data?.snapshot.observedAt ? new Date(data.snapshot.observedAt) : null;
  if (!observedAt) return null;
  return <> Dades fins al <time dateTime={observedAt.toISOString()}>{dateTime.format(observedAt)}</time>.</>;
}

function RainTablePlaceholder() {
  return (
    <p className="rain-map-note" aria-busy="true" aria-live="polite">
      <Droplets size={16} aria-hidden="true" />
      <span>Calculant la pluja de cada zona…</span>
    </p>
  );
}

async function RainTable() {
  const data = await loadRainfall();
  if (!data || data.readings.length === 0) {
    return (
      <p className="rain-map-note">
        <TriangleAlert size={16} aria-hidden="true" />
        <span>Ara mateix no podem mostrar la pluja per zones.</span>
      </p>
    );
  }

  return (
    <>
      <div className="rain-map-table-wrap">
        <table className="rain-map-table">
          <caption className="visually-hidden">
            Pluja per zona de bolets: mitjana de set dies, punt més plujós de la zona, total de catorze dies, dies de pluja dins la setmana i dies seguits sense ploure.
          </caption>
          <thead>
            <tr>
              <th scope="col">Zona</th>
              <th scope="col">Pluja 7 dies</th>
              <th scope="col">Punt més plujós</th>
              <th scope="col">Pluja 14 dies</th>
              <th scope="col">Dies de pluja</th>
              <th scope="col">Dies seguits sense ploure</th>
            </tr>
          </thead>
          <tbody>
            {data.readings.map((reading) => (
              <tr key={reading.slug} data-tone={territoryTone(reading)}>
                <th scope="row">
                  <Link href={reading.path}>{reading.name}</Link>
                  <span>{reading.typeLabel}</span>
                </th>
                <td>
                  <span
                    className="rain-map-cell-swatch"
                    style={{ backgroundColor: getRainfallBand(reading.meanRainfall7dMm ?? 0).colour }}
                    aria-hidden="true"
                  />
                  {formatMillimetres(reading.meanRainfall7dMm)}
                </td>
                <td>{formatMillimetres(reading.maxRainfall7dMm)}</td>
                <td>{formatMillimetres(reading.meanRainfall14dMm)}</td>
                <td>{formatDays(reading.meanRainfallDays7d)}</td>
                <td>{formatDays(reading.meanDrySpellDays)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="rain-map-note">
        <Droplets size={16} aria-hidden="true" />
        <span>El punt més plujós és el quadrat que més aigua ha rebut dins la zona: una tempesta local pot deixar-hi una xifra alta encara que a la resta no hi hagi plogut gairebé gens. Les dues columnes de dies compten coses diferents. «Dies de pluja» són quants dels últims set dies van deixar 1 mm o més. «Dies seguits sense ploure» són els dies que fa que no cau aquest mil·límetre, comptant enrere fins a un màxim de 30: per això una zona pot tenir 0 dies de pluja i 16 dies seguits sense ploure.</span>
      </p>
    </>
  );
}

export default function RainAndMushroomsPage() {
  return (
    <PageShell as="article">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Article",
            headline: title,
            description,
            url: absoluteUrl("/mapa-pluja"),
            inLanguage: "ca",
            publisher: { "@id": `${SITE_URL}/#organization` },
            ...editorialArticleFields("mapa-pluja"),
          },
          {
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          },
        ],
      }} />

      <PageHeader
        eyebrow={<><CloudRain size={15} /> Pluja dels últims dies</>}
        title={<>Pluja i bolets:<br /><PageTitleAccent>on ha plogut?</PageTitleAccent></>}
        description={<><strong>Quanta pluja ha caigut aquests set dies, a tot Catalunya.</strong> Els bolets no surten per la pluja d’ahir: surten per l’aigua que s’ha anat acumulant durant setmanes. Aquí pots veure on n’ha caigut i quanta.</>}
        layout="split"
      />

      <Suspense fallback={<RainAnswerPlaceholder />}>
        <RainAnswer />
      </Suspense>

      <section className="rain-map-section" aria-labelledby="rain-map-title">
        <SectionHeader
          meta="Mapa"
          title={`La pluja dels últims ${RAIN_MAP_WINDOW_DAYS} dies`}
          titleId="rain-map-title"
          description="Cada quadrat de 5 km mostra la pluja que han mesurat els pluviòmetres de la XEMA, si n’hi ha a prop. On no n’hi ha, mostra la que calcula el model del temps."
        />
        <figure className="rain-map-figure">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated map, not a catalogue asset */}
          <img
            src="/mapa-pluja/imatge"
            width={RAIN_MAP_WIDTH}
            height={RAIN_MAP_HEIGHT}
            decoding="async"
            alt={`Mapa de Catalunya amb la pluja dels últims ${RAIN_MAP_WINDOW_DAYS} dies. Com més fosc, més aigua hi ha caigut.`}
          />
          <figcaption>
            Pluja caiguda els últims {RAIN_MAP_WINDOW_DAYS} dies, en quadrats de {RAIN_MAP_GRID_SIZE_M / 1000} km.
            <Suspense fallback={null}><RainReadingDate /></Suspense>
            {" "}Font: Servei Meteorològic de Catalunya (XEMA) i Météo-France.
          </figcaption>
        </figure>

        <ul className="rain-map-legend" aria-label="Escala de pluja acumulada">
          {rainfallScale.map((band) => (
            <li key={band.id}>
              <span className="rain-map-swatch" style={{ backgroundColor: band.colour }} aria-hidden="true" />
              {band.label}
            </li>
          ))}
        </ul>

        <p className="rain-map-note">
          <TriangleAlert size={16} aria-hidden="true" />
          <span>
            Això no és un radar. Un radar mostra on plou ara mateix; aquí veus quanta aigua ha caigut en tota una setmana, que és el que fa moure els bolets sota terra. Si vols saber si plou ara, mira el <a href="https://www.meteo.cat/observacions/radar" target="_blank" rel="noreferrer">radar del Meteocat</a>.
          </span>
        </p>
      </section>

      <section className="rain-map-table-section" aria-labelledby="rain-table-title">
        <SectionHeader
          meta="Per zones"
          title="Quanta pluja ha rebut cada zona de bolets"
          titleId="rain-table-title"
          description={<>Les comarques i els massissos on tenim <Link href="/guies">guia de bolets publicada</Link>, de més a menys pluja. Cada xifra és la mitjana dels quadrats del voltant dels indrets de la guia, no de la comarca sencera.</>}
        />
        <Suspense fallback={<RainTablePlaceholder />}>
          <RainTable />
        </Suspense>
      </section>

      <section className="rain-map-meaning" aria-labelledby="rain-meaning-title">
        <SectionHeader
          meta="Com llegir-ho"
          title="Què vol dir aquesta pluja per als bolets"
          titleId="rain-meaning-title"
          description="La pluja fa falta, però ella sola no vol dir que hi hagi bolets."
        />
        <div className="rain-map-meaning-grid">
          <article>
            <CalendarRange size={20} aria-hidden="true" />
            <h3>Compta la pluja de fa dies, no la d’ahir</h3>
            <p>Cada bolet té el seu propi retard. La pluja d’ahir encara no compta per al cep; la de fa dues setmanes, sí.</p>
            <Link href="/quan-surten-els-bolets-despres-de-ploure" className="text-link">Quan surten els bolets després de ploure <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </article>
          <article>
            <Droplets size={20} aria-hidden="true" />
            <h3>Sobre terra seca, la pluja no arriba avall</h3>
            <p>Quan fa setmanes que no plou, una pluja fluixa s’evapora abans d’arribar on són els bolets. Per això la columna de dies seguits sense ploure diu tant com la dels mil·límetres.</p>
            <Link href="/metode#prediccio" className="text-link">Com comptem l’aigua que hi ha a terra <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </article>
          <article>
            <MapIcon size={20} aria-hidden="true" />
            <h3>També hi ha d’haver el bosc</h3>
            <p>En una comarca on ha plogut molt no hi sortiran bolets si no hi ha l’alçada, la terra i els arbres que necessita cada espècie. El mapa d’avui ja ho té tot en compte.</p>
            <Link href="/bolets-avui" className="text-link">On trobar bolets avui <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </article>
        </div>
      </section>

      <section className="rain-map-faq" aria-labelledby="rain-map-faq-title">
        <SectionHeader meta="Preguntes freqüents" title="Pluja, radar i bolets" titleId="rain-map-faq-title" />
        <div className="rain-map-faq-list">
          {faqs.map((faq) => (
            <article key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <DataSourceCredits
        variant="panel"
        label="Dades i metodologia"
        description={`Pluja dels últims ${RAIN_MAP_WINDOW_DAYS} dies, en quadrats de ${RAIN_MAP_GRID_SIZE_M / 1000} km, llegida dels pluviòmetres de la XEMA i del model de precipitació.`}
        sources={environmentalSources}
      />
      <EditorialAttribution contentId="mapa-pluja" sources={environmentalSources} variant="compact" />
    </PageShell>
  );
}
