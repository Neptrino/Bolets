import Link from "next/link";
import { ArrowUpRight, ChevronDown, Info, Trees } from "lucide-react";
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
import {
  MAP_PREDICTION_DESCRIPTION,
  MAP_PREDICTION_KEYWORDS,
  MAP_PREDICTION_TITLE,
} from "@/src/lib/map-seo";
import { calculateSuitability } from "@/src/lib/scoring";
import { absoluteUrl, SITE_URL, speciesPath } from "@/src/lib/seo";
import {
  speciesMapPages,
  speciesMapRoutes,
  type SpeciesMapPage,
} from "@/src/lib/species-map-pages";
import { territorialBoundsFromQuery } from "@/src/lib/territorial-map";
import type { MapViewMode, RegionId, SuitabilityResult } from "@/src/lib/types";
import { UMAMI_EVENTS } from "@/src/lib/umami-goals";

export type MapPageQuery = {
  species?: string;
  region?: string;
  mode?: string;
  west?: string;
  south?: string;
  east?: string;
  north?: string;
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

type MapPageContentProps = {
  query: MapPageQuery;
  mapPage?: SpeciesMapPage;
};

export async function MapPageContent({ query, mapPage }: MapPageContentProps) {
  const territorialBounds = territorialBoundsFromQuery(query);
  const requestedSpeciesId = mapPage?.speciesId ?? query.species ?? GLOBAL_SPECIES_ID;
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
  const canonicalPath = mapPage ? `/map/${mapPage.slug}` : "/map";
  const pageName = mapPage?.heading ?? (species
    ? `Mapa de ${species.identity.commonName.toLocaleLowerCase("ca")} a Catalunya`
    : "Mapa de bolets de Catalunya");
  const pageDescription = mapPage?.description
    ?? MAP_PREDICTION_DESCRIPTION;
  const habitatSummary = species
    ? species.ecologicalConfig.habitat.forestTypes.slice(0, 3).join(", ").toLocaleLowerCase("ca")
    : null;

  return <section className="map-page">
    <JsonLd data={{
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": absoluteUrl(canonicalPath),
          name: mapPage || species ? pageName : MAP_PREDICTION_TITLE,
          ...(!mapPage && !species ? {
            alternateName: pageName,
            keywords: MAP_PREDICTION_KEYWORDS,
          } : {}),
          description: pageDescription,
          url: absoluteUrl(canonicalPath),
          inLanguage: "ca",
          isPartOf: { "@id": `${SITE_URL}/#website` },
          about: species
            ? { "@type": "Thing", name: `${species.identity.commonName} (${species.identity.scientificName})` }
            : { "@type": "Thing", name: "Hàbitat i condicions de fructificació dels bolets a Catalunya" },
          ...editorialArticleFields("map"),
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Inici", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Mapa de bolets", item: absoluteUrl("/map") },
            ...(mapPage ? [{ "@type": "ListItem", position: 3, name: mapPage.heading, item: absoluteUrl(canonicalPath) }] : []),
          ],
        },
      ],
    }} />
    <details className="map-page-heading">
      <summary className="map-page-panel-summary">
        <div className="map-page-title">
          <p className="eyebrow">Condicions per territori</p>
          <h1>{pageName}</h1>
          <p>{isGlobal
            ? "El color mostra quina espècie comestible té les condicions més favorables a cada sector. Selecciona una zona o tria una espècie concreta."
            : species.predictionMode === "habitat_only"
            ? species.predictionCaveat
            : isCompatibility
            ? `Explora els boscos, altituds i tipus de sòl que encaixen amb ${species.identity.commonName.toLocaleLowerCase("ca")}.`
            : mapPage?.lead
            ? mapPage.lead
            : mapPage
            ? `Compara on l’hàbitat i el temps recent són més favorables ${mapPage.dativeName}.`
            : "Compara on l’hàbitat i el temps recent són més favorables per a aquesta espècie."}</p>
        </div>
        <span className="map-page-panel-toggle" aria-hidden="true">
          <ChevronDown className="map-page-panel-toggle-desktop" size={20} />
          <ChevronDown className="map-page-panel-toggle-mobile" size={20} />
        </span>
      </summary>
      <div className="map-controls">
        <div className="map-species-picker">
          <span className="map-species-picker-label"><Trees size={17} aria-hidden="true" /> Espècie</span>
          <QuerySelect
            value={species?.speciesId ?? GLOBAL_SPECIES_ID}
            items={mapSpeciesSelectItems}
            variant="map"
            routeByValue={speciesMapRoutes}
            fallbackPath="/map"
            analyticsEvent={UMAMI_EVENTS.mapChangeSpecies}
            aria-label="Espècie seleccionada"
          />
          <small>{isGlobal
            ? <span>Totes les espècies comestibles · tria’n una per veure-la en detall</span>
            : <><i>{species.identity.scientificName}</i><span> · tria una altra espècie per comparar</span></>}</small>
        </div>
        <nav className="map-species-quick-links" aria-label="Mapes ràpids per espècie">
          <span>Mapes ràpids</span>
          <div>
            {speciesMapPages.map((quickMap) => (
              <Link
                key={quickMap.speciesId}
                href={`/map/${quickMap.slug}`}
                aria-current={mapPage?.speciesId === quickMap.speciesId ? "page" : undefined}
              >
                {quickMap.quickLabel}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </details>
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
        <>
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
                <p>Com més verd és el sector, millors són les condicions.</p>
                <p>Selecciona un sector per veure quin bolet destaca.</p>
                <PredictionMapLegend />
              </> : <>
                <p>Com més verd és el sector, millors són les condicions per a aquesta espècie.</p>
                <p>Selecciona’l per veure què l’afavoreix o el limita. No mostra llocs on s’hagin trobat bolets.</p>
                <PredictionMapLegend />
              </>}
            </div>
            <nav className="map-reading-links" aria-label="Informació per interpretar el mapa">
              <Link href="/metode" className="text-link">Com es calcula <ArrowUpRight size={17} /></Link>
              {isGlobal
                ? <Link href="/bolets" className="text-link">Veure les espècies <ArrowUpRight size={17} /></Link>
                : <Link href={`${speciesPath(species)}?region=${region}`} className="text-link">Veure {species.identity.commonName} <ArrowUpRight size={17} /></Link>}
            </nav>
          </aside>
          <nav className="map-page-guide-links" aria-label="Guies relacionades amb el mapa de bolets"><Link href="/bolets-avui">Resum de bolets avui <ArrowUpRight size={16} /></Link><Link href="/zones">Comparar zones de Catalunya <ArrowUpRight size={16} /></Link><Link href="/bolets">Consultar espècies <ArrowUpRight size={16} /></Link><Link href="/quan-surten-els-bolets-despres-de-ploure">Quan surten després de ploure <ArrowUpRight size={16} /></Link></nav>
          <section className="map-page-seo-copy" aria-labelledby="map-search-guide-title">
            <p className="eyebrow">{pageName}</p>
            <h2 id="map-search-guide-title">{mapPage ? `Com interpretar el mapa ${mapPage.mapNoun}` : species ? "Com interpretar el mapa d’aquesta espècie" : "Com fer servir el mapa per preparar una sortida"}</h2>
            {species ? <>
              <p>Aquest mapa combina l’hàbitat compatible de <i>{species.identity.scientificName}</i> amb les condicions recents. Té en compte entorns com {habitatSummary}, però no mostra troballes ni garanteix que hi hagi bolets.</p>
              <p>Compara diversos sectors i consulta també la <Link href={speciesPath(species)}>fitxa de {species.identity.commonName}</Link>, el resum de <Link href="/bolets-avui">bolets avui</Link> i les <Link href="/zones">guies de zones</Link>.</p>
            </> : <>
              <p>Comença pel mapa general per detectar les zones més favorables. Després tria una espècie per veure on encaixa el seu hàbitat i com hi influeixen les condicions recents.</p>
              <p>Consulta també el resum de <Link href="/bolets-avui">bolets avui</Link>, la <Link href="/bolets">fitxa de cada espècie</Link> i les <Link href="/zones">guies de zones</Link>.</p>
            </>}
            <DataSourceCredits sources={[...environmentalSources, ...coreEditorialSources]} label="Fonts de les dades del mapa" />
          </section>
        </>
      }
    />
  </section>;
}
