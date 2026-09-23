import "@/app/styles/territorial-guides.css";
import "@/app/styles/local-guides.css";
import "@/app/styles/place-hub.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BookOpenText, CalendarRange, CircleHelp, CloudRain, MapPinned, Mountain, ShieldCheck, Trees } from "lucide-react";
import { DataSourceCredits } from "@/components/editorial-attribution";
import { hubSeasonWindow, hubSpeciesList } from "@/components/hub-sections";
import { FaqEntries } from "@/components/faq";
import { JsonLd } from "@/components/json-ld";
import { PageShell, SectionHeader } from "@/components/page-layout";
import { editorialArticleFields } from "@/data/editorial";
import { areaPath } from "@/data/location-pages";
import { regionBounds, regionLabels } from "@/data/regions";
import { speciesSeasonLabel } from "@/src/lib/catalogue-list";
import { pirineuAreas, pirineuAreasForSpecies, pirineuGuideSpecies } from "@/src/lib/pirineu-guide";
import { areaMapPath } from "@/src/lib/place-map";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { faqPageSchema } from "@/src/lib/faq-schema";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, pageTitle, speciesPath } from "@/src/lib/seo";
import { territorialMapPath } from "@/src/lib/territorial-map";
import { seasonWindowPhrase } from "@/src/lib/zone-hub-copy";

export const revalidate = 3600;

const PATH = "/zones/pirineu";
const catalanList = new Intl.ListFormat("ca-ES", { style: "long", type: "conjunction" });
const catalanNumber = new Intl.NumberFormat("ca-ES");

export const metadata: Metadata = {
  title: pageTitle("Bolets al Pirineu: zones, espècies i temporada"),
  description:
    "Guia dels bolets al Pirineu català: comarques amb guia, espècies de muntanya per cotes, quan comença la temporada, condicions actuals i normes dels parcs.",
  alternates: { canonical: PATH },
  openGraph: {
    url: PATH,
    title: "Bolets al Pirineu",
    description: "Comarques amb guia, espècies de muntanya per cotes, temporada, condicions actuals i normes dels parcs pirinencs.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
};

const seasonWindow = hubSeasonWindow(pirineuGuideSpecies);
const speciesList = hubSpeciesList(pirineuGuideSpecies);
const summary = `Guia de bolets al Pirineu i el Prepirineu: ${pirineuAreas.length} comarques amb guia (${catalanList.format(pirineuAreas.map(({ area }) => area.name))}), ${pirineuGuideSpecies.length} espècies documentades (${speciesList}) i temporada habitual ${seasonWindowPhrase(seasonWindow)}.`;

const faqs = [
  {
    question: "Quan hi ha bolets al Pirineu?",
    answer: `La finestra combinada de les espècies amb guia va ${seasonWindowPhrase(seasonWindow)}. La temporada s’avança respecte de la plana: a les cotes altes els primers ceps de pi poden aparèixer a finals d’agost després de les tempestes d’estiu, el gruix es concentra al setembre i l’octubre, i les primeres gelades i nevades tanquen el bosc de dalt a baix.`,
  },
  {
    question: "Quines comarques del Pirineu tenen guia?",
    answer: `${catalanList.format(pirineuAreas.map(({ area, placeCount, guideCount }) => `${area.name} (${placeCount} ${placeCount === 1 ? "indret" : "indrets"}, ${guideCount} guies)`))}. El Ripollès i la Cerdanya són al Pirineu axial; el Berguedà i el Solsonès, al Prepirineu.`,
  },
  {
    question: "Quins bolets es troben al Pirineu?",
    answer: `Les guies pirinenques cobreixen ${speciesList}. Els ceps de pi i els ceps s’associen a les pinedes de muntanya; els rossinyols i les trompetes de la mort, a les fagedes i rouredes humides; els rovellons, pinetells, llenegues i fredolics, a les pinedes de pi roig i pi negre.`,
  },
  {
    question: "Cal permís per collir bolets al Pirineu?",
    answer: "Diversos espais tenen regulació pròpia: el Parc Nacional d’Aigüestortes i Estany de Sant Maurici, el bosc de Virós, la vall d’Esterri de Cardós i el Parc Natural del Cadí-Moixeró. La guia de normativa recull què demana cadascun i què cal comprovar abans de sortir a qualsevol finca.",
  },
];

export default function PirineuGuidePage() {
  const month = monthInTimeZone();
  const liveSpecies = pirineuGuideSpecies.find((species) => species.ecologicalConfig.seasonality[month] !== "inactive") ?? pirineuGuideSpecies[0];
  const url = absoluteUrl(PATH);

  return (
    <div className="pirineu-hub">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            "@id": `${url}#page`,
            name: "Bolets al Pirineu",
            description: summary,
            url,
            inLanguage: "ca",
            ...editorialArticleFields("zones-pirineu"),
            about: { "@type": "Place", name: "Pirineu català" },
            mainEntity: {
              "@type": "ItemList",
              itemListElement: pirineuAreas.map(({ area }, index) => ({ "@type": "ListItem", position: index + 1, name: area.name, url: absoluteUrl(areaPath(area)) })),
            },
          },
          faqPageSchema(faqs, `${url}#preguntes`),
        ],
      }} />
      <header className="rovellons-hero">
        <div className="page-width rovellons-hero-inner">
          <Link href="/guies" className="back-link"><ArrowLeft size={15} /> Totes les guies</Link>
          <div className="rovellons-hero-grid">
            <div>
              <p className="eyebrow light"><MapPinned size={15} /> Guia territorial · Pirineu i Prepirineu</p>
              <h1>Bolets<br /><i>al Pirineu.</i></h1>
              <p>{summary}</p>
            </div>
            <aside>
              <Mountain size={22} aria-hidden="true" />
              <span>Temporada habitual</span>
              <strong>De {seasonWindow.toLocaleLowerCase("ca-ES").replace(" – ", " a ")}: les cotes altes comencen abans, amb les tempestes de finals d’estiu, i les primeres gelades i nevades tanquen la temporada de dalt a baix.</strong>
              <small>Finestra combinada de les {pirineuGuideSpecies.length} espècies amb guia; cada comarca i cada fitxa en concreten el pic.</small>
            </aside>
          </div>
        </div>
      </header>

      <PageShell className="pirineu-guide">
      <div className="location-hub-panels">
        <section id="boscos" className="guide-panel" aria-labelledby="pirineu-forests-title">
          <header className="guide-panel-head"><div><p className="eyebrow"><Trees size={15} aria-hidden="true" /> Boscos</p><h2 id="pirineu-forests-title">Els boscos del Pirineu, per cotes</h2></div></header>
          <div className="guide-panel-body">
          <p className="guide-panel-text">Al Pirineu català els boscos s’ordenen per altitud: rouredes i fagedes aproximadament entre 600 i 1.400 metres, pinedes de pi roig entre 900 i 1.700, i pinedes de pi negre i avetoses fins al límit del bosc, cap als 2.300 metres. Les fitxes d’aquesta guia situen els ceps de pi i els ceps als boscos de coníferes de muntanya, els rossinyols i les trompetes de la mort a les fagedes i rouredes humides, i els rovellons, pinetells, llenegues i fredolics a les pinedes.</p>
          <p className="guide-panel-text">La cota importa més que la comarca: una pineda de pi roig a 1.000 metres i una de pi negre a 1.900 responen a la mateixa pluja amb setmanes de diferència. Per això les guies del Ripollès, la Cerdanya, el Berguedà i el Solsonès descriuen l’hàbitat per indret i cota, no per comarca sencera.</p>
          </div>
        </section>
        <section id="temporada" className="guide-panel" aria-labelledby="pirineu-season-title">
          <header className="guide-panel-head"><div><p className="eyebrow"><CalendarRange size={15} aria-hidden="true" /> Temporada</p><h2 id="pirineu-season-title">Quan comença la temporada al Pirineu</h2></div></header>
          <div className="guide-panel-body">
          <p className="guide-panel-text">La temporada s’avança respecte de la plana. A les cotes altes els primers ceps de pi poden aparèixer a finals d’agost, després de les tempestes d’estiu, i el gruix de la temporada es concentra al setembre i l’octubre. Les primeres gelades i les nevades de la tardor avançada tanquen el bosc de dalt a baix: quan el pi negre ja ha acabat, les rouredes i les pinedes baixes del Prepirineu encara poden respondre fins al novembre.</p>
          <p className="guide-panel-text">Finestra combinada de les espècies amb guia: {seasonWindow}. El calendari mensual de cada comarca i de cada fitxa concreta el pic de cada espècie.</p>
          <p className="guide-panel-note"><ShieldCheck size={15} aria-hidden="true" /><span>Aigüestortes, el bosc de Virós, la vall d’Esterri de Cardós i el Cadí-Moixeró tenen normes pròpies de recol·lecció. <Link href="/normativa-bolets">Guia de normativa</Link>.</span></p>
          </div>
        </section>
      </div>

      <section className="guides-territories" aria-labelledby="pirineu-areas-title">
        <SectionHeader
          meta={`${pirineuAreas.length} comarques · ${pirineuAreas.reduce((total, { placeCount }) => total + placeCount, 0)} indrets · ${pirineuAreas.reduce((total, { guideCount }) => total + guideCount, 0)} guies locals`}
          title="Comarques amb guia"
          titleId="pirineu-areas-title"
          description="Cada comarca agrupa els seus indrets documentats, el tauler de condicions actuals i les guies d’espècie que hi encaixen."
          size="compact"
        />
        <ul className="guides-territory-list" data-guides-territory-list>
          {pirineuAreas.map(({ area, placeCount, guideCount, species }) => (
            <li key={area.slug}>
              <Link href={areaPath(area)}>
                <span className="guides-territory-map">
                  <Image src={areaMapPath(area)} alt="" width={650} height={812} unoptimized sizes="400px" />
                </span>
                <span className="guides-territory-copy">
                  <span className="guides-territory-type">{area.typeLabel} · {regionLabels[area.regionId]}</span>
                  <strong>{area.name}</strong>
                  <small>{guideCount} {guideCount === 1 ? "guia" : "guies"} · {placeCount} {placeCount === 1 ? "indret" : "indrets"} · {hubSpeciesList(species)}</small>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="catalogue-list" aria-labelledby="pirineu-species-title">
        <SectionHeader
          meta={`${pirineuGuideSpecies.length} espècies`}
          title="Espècies de muntanya amb guia"
          titleId="pirineu-species-title"
          description="Ordenades pel límit superior dels boscos on les situa la seva fitxa. L’altitud és la del perfil ecològic, no una promesa per a cap indret."
          size="compact"
        />
        <div className="catalogue-list-scroll" role="region" aria-label="Espècies amb guia al Pirineu" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Espècie</th>
                <th scope="col">Altitud dels boscos</th>
                <th scope="col">Boscos</th>
                <th scope="col">Estació</th>
                <th scope="col">Comarques amb guia</th>
              </tr>
            </thead>
            <tbody>
              {pirineuGuideSpecies.map((species) => {
                const [low, high] = species.ecologicalConfig.habitat.altitude;
                return (
                  <tr key={species.speciesId}>
                    <th scope="row"><Link href={speciesPath(species)}>{species.identity.commonName}</Link><small>{species.identity.scientificName}</small></th>
                    <td>{low <= 0 ? `fins a ${catalanNumber.format(high)} m` : `${catalanNumber.format(low)}–${catalanNumber.format(high)} m`}</td>
                    <td>{species.ecologicalConfig.habitat.forestTypes.slice(0, 3).join(", ")}</td>
                    <td>{speciesSeasonLabel(species)}</td>
                    <td>{pirineuAreasForSpecies(species.speciesId).map(({ area }) => area.name).join(", ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="location-hub-panels">
        <section id="avui" className="guide-panel" aria-labelledby="pirineu-today-title">
          <header className="guide-panel-head">
            <div><p className="eyebrow"><CloudRain size={15} aria-hidden="true" /> Avui</p><h2 id="pirineu-today-title">Condicions actuals al Pirineu</h2></div>
            {liveSpecies ? <Link href={territorialMapPath(liveSpecies.speciesId, "pirineus", regionBounds.pirineus)} className="button">Mapa en viu del Pirineu <ArrowUpRight size={16} aria-hidden="true" /></Link> : null}
          </header>
          <div className="guide-panel-body">
            <p className="guide-panel-text">El mapa en viu compara els sectors del Pirineu i del Prepirineu amb la pluja, la humitat i la temperatura recents de cada espècie en temporada. Les lectures s’actualitzen cada dia, no confirmen que hi hagi bolets ni assenyalen punts exactes.</p>
            <p className="guide-panel-note"><MapPinned size={15} aria-hidden="true" /><span>{liveSpecies ? <><Link href={territorialMapPath(liveSpecies.speciesId, "prepirineus", regionBounds.prepirineus)}>Mapa del Prepirineu</Link> · </> : null}<Link href="/bolets-avui">Totes les zones, avui</Link>.</span></p>
          </div>
        </section>
        <section id="guies" className="guide-panel" aria-labelledby="pirineu-guides-title">
          <header className="guide-panel-head"><div><p className="eyebrow"><Mountain size={15} aria-hidden="true" /> Guies</p><h2 id="pirineu-guides-title">Guies d’espècie i territori</h2></div></header>
          <div className="guide-panel-body">
            <p className="guide-panel-text">Els ceps i els rovellons tenen guies pròpies amb tipus, diferències i zones; les quatre comarques del Pirineu hi apareixen amb les seves condicions.</p>
            <p className="guide-panel-note"><BookOpenText size={15} aria-hidden="true" /><span><Link href="/zones/ceps">Ceps de Catalunya</Link> · <Link href="/zones/rovellons">Rovellons a Catalunya</Link> · <Link href="/guies">Totes les guies per territori</Link>.</span></p>
          </div>
        </section>
      </div>

      <section id="preguntes" className="guide-panel location-hub-faq" aria-labelledby="pirineu-faq-title">
        <header className="guide-panel-head">
          <div>
            <p className="eyebrow"><CircleHelp size={15} aria-hidden="true" /> Preguntes freqüents</p>
            <h2 id="pirineu-faq-title">Preguntes sobre els bolets al Pirineu</h2>
            <p className="guide-panel-lede">Respostes breus amb les dades d’aquesta guia; els detalls són a cada comarca i a cada fitxa.</p>
          </div>
        </header>
        <div className="guide-panel-body location-hub-faq-list">
          <FaqEntries faqs={faqs} />
        </div>
      </section>

      <DataSourceCredits
        label="Fonts territorials"
        sources={[
          ...pirineuAreas.map(({ area }) => ({ label: area.source.title, url: area.source.url })),
          { label: "Base topogràfica: Institut Cartogràfic i Geològic de Catalunya", url: "https://www.icgc.cat/" },
        ]}
      />
      </PageShell>
    </div>
  );
}
