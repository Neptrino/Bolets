import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, Info, Trees } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { MapExplorer } from "@/components/map-explorer";
import { PredictionMapLegend } from "@/components/prediction-map-legend";
import { QuerySelect } from "@/components/ui/query-select";
import { coreEditorialSources, editorialArticleFields, environmentalSources } from "@/data/editorial";
import { isRegionId } from "@/data/regions";
import { getSpecies, speciesSelectItems } from "@/data/species";
import { getConditionSnapshot } from "@/src/lib/conditions";
import {
  GLOBAL_SPECIES_ID,
  bestRegionalSuitability,
  globalCandidateSpecies,
} from "@/src/lib/global-predictions";
import { calculateSuitability } from "@/src/lib/scoring";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, SITE_URL, speciesPath } from "@/src/lib/seo";
import { territorialBoundsFromQuery } from "@/src/lib/territorial-map";
import type { MapViewMode, RegionId, SuitabilityResult } from "@/src/lib/types";

export const metadata: Metadata = {
  title: "Mapa de bolets de Catalunya",
  description: "Mapa de bolets de Catalunya: la millor puntuació entre les espècies comestibles a cada cel·la, o la lectura d’hàbitat i condicions per a una espècie concreta.",
  alternates: { canonical: "/map" },
  openGraph: {
    url: "/map",
    title: "Mapa de bolets de Catalunya",
    description: "Mapa combinat de totes les espècies comestibles i lectura ecològica per espècie: hàbitat compatible i condicions de fructificació.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mapa de bolets de Catalunya",
    description: "Mapa combinat de bolets comestibles i lectura d’hàbitat i condicions per espècie.",
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};

const mapSpeciesSelectItems = [
  { value: GLOBAL_SPECIES_ID, label: "Tots els bolets" },
  ...speciesSelectItems,
];

const withheldRegionalResult: SuitabilityResult = {
  score: null,
  fruitingConditionsScore: null,
  opportunityIndex: null,
  rawHabitatCoverage: null,
  effectiveHabitatCoverage: null,
  label: "sense dades",
  components: [],
  modelVersion: "",
  dataCompleteness: 0,
  missingComponents: [],
};

export default async function MapPage({ searchParams }: { searchParams: Promise<{
  species?: string;
  region?: string;
  mode?: string;
  west?: string;
  south?: string;
  east?: string;
  north?: string;
}> }) {
  const query = await searchParams;
  const territorialBounds = territorialBoundsFromQuery(query);
  const requestedSpeciesId = query.species ?? GLOBAL_SPECIES_ID;
  // Unknown species ids fall back to the combined map, the page's default view.
  const species = requestedSpeciesId === GLOBAL_SPECIES_ID
    ? null
    : getSpecies(requestedSpeciesId) ?? null;
  const isGlobal = species === null;
  const region: RegionId = isRegionId(query.region)
    ? query.region
    : species?.ecologicalConfig.regions[0] ?? "prepirineus";
  const requestedMode: MapViewMode = query.mode === "compatibility" ? "compatibility" : "prediction";
  // Compatibility is a per-species reading; the combined map always predicts.
  const mode: MapViewMode = isGlobal
    ? "prediction"
    : species.predictionMode === "habitat_only"
      ? "compatibility"
      : requestedMode;
  const isCompatibility = mode === "compatibility";
  const snapshot = await getConditionSnapshot(region);
  const bestRegional = isGlobal ? bestRegionalSuitability(snapshot) : null;
  const result = isGlobal
    ? bestRegional?.result ?? withheldRegionalResult
    : calculateSuitability(species, snapshot);
  const speciesNames = isGlobal
    ? Object.fromEntries(globalCandidateSpecies.map((candidate) => [
        candidate.speciesId,
        candidate.identity.commonName,
      ]))
    : undefined;

  return <section className="map-page">
    <JsonLd data={{
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": absoluteUrl("/map"),
          name: "Mapa de bolets de Catalunya",
          description: metadata.description,
          url: absoluteUrl("/map"),
          inLanguage: "ca",
          isPartOf: { "@id": `${SITE_URL}/#website` },
          about: { "@type": "Thing", name: "Hàbitat i condicions de fructificació dels bolets a Catalunya" },
          ...editorialArticleFields("map"),
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Inici", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Mapa de bolets", item: absoluteUrl("/map") },
          ],
        },
      ],
    }} />
    <div className="page-width map-page-heading">
      <div className="map-page-title">
        <p className="eyebrow">Lectura territorial</p>
        <h1>{isGlobal ? "Mapa de bolets" : isCompatibility ? "Mapa de compatibilitat" : "Mapa de condicions"}</h1>
        <p><span className="visually-hidden">Mapa de bolets de Catalunya. </span>{isGlobal
          ? "El color de cada cel·la mostra la millor puntuació entre les espècies comestibles cartografiades. Selecciona una cel·la per veure quines espècies la lideren, o tria una espècie per centrar-hi tota la lectura."
          : species.predictionMode === "habitat_only"
          ? species.predictionCaveat
          : isCompatibility
          ? "Explora on la coberta del sòl, l’altitud i el pH encaixen amb l’espècie. No és una predicció de fructificació."
          : "Mostra com de favorable és cada cel·la combinant l’hàbitat adequat amb les condicions per fructificar-hi. La puntuació serveix per comparar; no és una probabilitat de presència."}</p>
      </div>
      <div className="map-controls">
        <div className="map-species-picker">
          <span className="map-species-picker-label"><Trees size={17} aria-hidden="true" /> Espècie cartografiada</span>
          <QuerySelect
            value={species?.speciesId ?? GLOBAL_SPECIES_ID}
            items={mapSpeciesSelectItems}
            variant="map"
            aria-label="Espècie seleccionada"
          />
          <small>{isGlobal
            ? <span>Totes les espècies comestibles · tria’n una per centrar la lectura</span>
            : <><i>{species.identity.scientificName}</i><span> · canvia l’espècie per actualitzar tota la lectura</span></>}</small>
        </div>
      </div>
    </div>
    <MapExplorer
      species={species}
      region={region}
      autoGeolocate={!isRegionId(query.region) && !territorialBounds}
      territorialBounds={territorialBounds ?? undefined}
      mode={mode}
      regionalSnapshot={snapshot}
      regionalResult={result}
      regionalTopSpeciesName={bestRegional?.species.identity.commonName}
      speciesItems={mapSpeciesSelectItems}
      speciesNames={speciesNames}
      info={
        <aside
          key="map-info"
          className={isCompatibility ? "map-reading-guide" : "map-reading-guide map-reading-guide-prediction"}
        >
          <div className="map-reading-heading">
            <Info size={22} aria-hidden="true" />
            <div>
              <p className="eyebrow">Guia de lectura</p>
              <h2>Com llegir aquest mapa</h2>
            </div>
          </div>
          <div className="map-reading-copy">
            {isCompatibility ? <>
              <p>El blau identifica els sectors on coincideixen la coberta del sòl, l’altitud i el pH requerits. Més intensitat indica més cobertura compatible dins del sector.</p>
              <p>El ratllat lila aporta context històric generalitzat a 10 km; no amplia les zones compatibles ni demostra presència actual.</p>
            </> : isGlobal ? <>
              <p>La cartografia mostra el relleu i els elements topogràfics. Una cel·la mai representa una observació de bolets, una probabilitat de presència ni una garantia de trobar-ne.</p>
              <p>El color mostra la millor puntuació entre les espècies comestibles cartografiades: per a cada espècie es combina l’hàbitat adequat de la cel·la amb les condicions per fructificar-hi, i es pinta la puntuació més alta.</p>
              <p>Les espècies fora de temporada es descarten soles: la seva fenologia multiplica la puntuació i les deixa a zero sense aplicar cap filtre addicional.</p>
              <p>Selecciona una cel·la per veure quines espècies la lideren i l’evolució recent de la millor. La graella combinada es mostra a partir d’1 km; per a la lectura fina de 250 m tria una espècie concreta.</p>
              <PredictionMapLegend />
            </> : <>
              <p>La cartografia mostra el relleu i els elements topogràfics. Una cel·la mai representa una observació de bolets, una probabilitat de presència ni una garantia de trobar-ne.</p>
              <p>El color mostra la puntuació de cada cel·la. Combina quina part té un hàbitat adequat —segons coberta, sòl i altitud— amb les condicions ambientals dins d’aquest hàbitat.</p>
              <p>Els colors permeten comparar cel·les entre si, però no formen una puntuació única per a tota la regió. La proporció d’hàbitat ja forma part del resultat i no es torna a aplicar mitjançant l’opacitat.</p>
              <p>Selecciona una cel·la per veure la puntuació, l’hàbitat adequat i les condicions per fructificar-hi, amb el detall de l’aigua, la temperatura, la temporada i els extrems. El temps pot ser compartit entre cel·les veïnes perquè conserva la resolució real del proveïdor.</p>
              <PredictionMapLegend />
            </>}
          </div>
          {isGlobal
            ? <Link href="/bolets" className="text-link">Consultar les fitxes d’espècies <ArrowUpRight size={17} /></Link>
            : <Link href={`${speciesPath(species)}?region=${region}`} className="text-link">Llegir la fitxa de {species.identity.commonName} <ArrowUpRight size={17} /></Link>}
        </aside>
      }
    />
    <nav className="map-page-guide-links page-width" aria-label="Guies relacionades amb el mapa de bolets"><Link href="/bolets-avui">Resum de bolets avui <ArrowUpRight size={16} /></Link><Link href="/zones">Comparar zones de Catalunya <ArrowUpRight size={16} /></Link><Link href="/bolets">Consultar espècies <ArrowUpRight size={16} /></Link><Link href="/quan-surten-els-bolets-despres-de-ploure">Quan surten després de ploure <ArrowUpRight size={16} /></Link></nav>
    <section className="map-page-seo-copy page-width" aria-labelledby="map-search-guide-title">
      <p className="eyebrow">Mapa de bolets de Catalunya</p>
      <h2 id="map-search-guide-title">Com fer servir el mapa per preparar una sortida</h2>
      <p>El mapa combinat mostra, per a cada cel·la, la millor puntuació entre totes les espècies comestibles cartografiades. Seleccioneu una espècie concreta per diferenciar el seu hàbitat compatible de les condicions actuals per fructificar. El mapa és una lectura ecològica agregada: serveix per comparar cel·les i entendre els factors que limiten cada espècie, però no mostra observacions ni localitzacions exactes.</p>
      <p>Per decidir què consultar primer, vegeu el resum de <Link href="/bolets-avui">bolets avui</Link>; per entendre una puntuació concreta, contrasteu-la amb la {species ? <Link href={speciesPath(species)}>fitxa de {species.identity.commonName}</Link> : <Link href="/bolets">fitxa de cada espècie</Link>} i amb les <Link href="/zones">zones generals de predicció</Link>.</p>
      <EditorialAttribution contentId="map" sources={[...environmentalSources, ...coreEditorialSources]} />
    </section>
  </section>;
}
