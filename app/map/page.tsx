import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, Info, Trees } from "lucide-react";
import { DataSourceCredits } from "@/components/editorial-attribution";
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
import { UMAMI_EVENTS } from "@/src/lib/umami-goals";

export const metadata: Metadata = {
  title: "Mapa de condicions per als bolets a Catalunya",
  description: "Compara l’hàbitat i les condicions actuals de les espècies de bolets a cada zona de Catalunya.",
  alternates: { canonical: "/map" },
  openGraph: {
    url: "/map",
    title: "Mapa de bolets de Catalunya",
    description: "Compara les zones més favorables per a les espècies comestibles o centra el mapa en un bolet concret.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mapa de bolets de Catalunya",
    description: "Mapa d’hàbitat i condicions actuals per espècie.",
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
        <p className="eyebrow">Condicions per territori</p>
        <h1>{isGlobal ? "Mapa de condicions" : isCompatibility ? "On encaixa aquesta espècie" : "Condicions per a l’espècie"}</h1>
        <p><span className="visually-hidden">Mapa de bolets de Catalunya. </span>{isGlobal
          ? "El color mostra quina espècie comestible té les condicions més favorables a cada sector. Selecciona una zona o tria una espècie concreta."
          : species.predictionMode === "habitat_only"
          ? species.predictionCaveat
          : isCompatibility
          ? "Explora els boscos, altituds i tipus de sòl que encaixen amb l’espècie."
          : "Compara on l’hàbitat i el temps recent són més favorables per a aquesta espècie."}</p>
      </div>
      <div className="map-controls">
        <div className="map-species-picker">
          <span className="map-species-picker-label"><Trees size={17} aria-hidden="true" /> Espècie cartografiada</span>
          <QuerySelect
            value={species?.speciesId ?? GLOBAL_SPECIES_ID}
            items={mapSpeciesSelectItems}
            variant="map"
            analyticsEvent={UMAMI_EVENTS.mapChangeSpecies}
            aria-label="Espècie seleccionada"
          />
          <small>{isGlobal
            ? <span>Totes les espècies comestibles · tria’n una per veure-la en detall</span>
            : <><i>{species.identity.scientificName}</i><span> · tria una altra espècie per comparar</span></>}</small>
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
              <p>El blau mostra on el bosc, l’altitud i el sòl encaixen amb l’espècie. Com més intens és, més superfície adequada hi ha.</p>
              <p>El ratllat lila mostra zones amb registres històrics generals. No indica que hi hagi bolets ara.</p>
            </> : isGlobal ? <>
              <p>El color mostra l’espècie comestible amb la puntuació més alta a cada sector.</p>
              <p>Només es puntuen les espècies que són de temporada. Selecciona un sector per veure les opcions més favorables i la seva evolució recent.</p>
              <p>Aquest mapa compara condicions ambientals; no mostra troballes ni punts de recol·lecció.</p>
              <PredictionMapLegend />
            </> : <>
              <p>El color combina la qualitat de l’hàbitat amb la pluja, la humitat, la temperatura i la temporada.</p>
              <p>Selecciona un sector per veure què afavoreix o limita l’espècie. Els sectors veïns poden compartir dades meteorològiques.</p>
              <p>Aquest mapa compara condicions ambientals; no mostra troballes ni punts de recol·lecció.</p>
              <PredictionMapLegend />
            </>}
          </div>
          <nav className="map-reading-links" aria-label="Informació per interpretar el mapa">
            <Link href="/metode" className="text-link">Entendre el mètode <ArrowUpRight size={17} /></Link>
            {isGlobal
              ? <Link href="/bolets" className="text-link">Consultar les fitxes d’espècies <ArrowUpRight size={17} /></Link>
              : <Link href={`${speciesPath(species)}?region=${region}`} className="text-link">Llegir la fitxa de {species.identity.commonName} <ArrowUpRight size={17} /></Link>}
          </nav>
        </aside>
      }
    />
    <nav className="map-page-guide-links page-width" aria-label="Guies relacionades amb el mapa de bolets"><Link href="/bolets-avui">Resum de bolets avui <ArrowUpRight size={16} /></Link><Link href="/zones">Comparar zones de Catalunya <ArrowUpRight size={16} /></Link><Link href="/bolets">Consultar espècies <ArrowUpRight size={16} /></Link><Link href="/quan-surten-els-bolets-despres-de-ploure">Quan surten després de ploure <ArrowUpRight size={16} /></Link></nav>
    <section className="map-page-seo-copy page-width" aria-labelledby="map-search-guide-title">
      <p className="eyebrow">Mapa de bolets de Catalunya</p>
      <h2 id="map-search-guide-title">Com fer servir el mapa per preparar una sortida</h2>
      <p>Comença pel mapa general per detectar les zones més favorables. Després tria una espècie per veure on encaixa el seu hàbitat i com hi influeixen les condicions recents.</p>
      <p>Consulta també el resum de <Link href="/bolets-avui">bolets avui</Link>, la {species ? <Link href={speciesPath(species)}>fitxa de {species.identity.commonName}</Link> : <Link href="/bolets">fitxa de cada espècie</Link>} i les <Link href="/zones">guies de zones</Link>.</p>
      <DataSourceCredits sources={[...environmentalSources, ...coreEditorialSources]} label="Fonts de les dades del mapa" />
    </section>
  </section>;
}
