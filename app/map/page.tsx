import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, Info, Trees } from "lucide-react";
import { EditorialAttribution } from "@/components/editorial-attribution";
import { JsonLd } from "@/components/json-ld";
import { MapExplorer } from "@/components/map-explorer";
import { QuerySelect } from "@/components/ui/query-select";
import { coreEditorialSources, editorialArticleFields, environmentalSources } from "@/data/editorial";
import { isRegionId } from "@/data/regions";
import { getSpecies, speciesSelectItems } from "@/data/species";
import { getConditionSnapshot } from "@/src/lib/conditions";
import { calculateSuitability } from "@/src/lib/scoring";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE, SITE_URL, speciesPath } from "@/src/lib/seo";
import type { MapViewMode, RegionId } from "@/src/lib/types";

export const metadata: Metadata = {
  title: "Mapa de bolets de Catalunya",
  description: "Mapa de bolets de Catalunya amb hàbitat adequat, condicions actuals i una puntuació comparativa per espècie i cel·la.",
  alternates: { canonical: "/map" },
  openGraph: {
    url: "/map",
    title: "Mapa de bolets de Catalunya",
    description: "Mapa ecològic per explorar hàbitat compatible i condicions de fructificació per espècie.",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mapa de bolets de Catalunya",
    description: "Mapa ecològic d’hàbitat compatible i condicions de fructificació per espècie.",
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};

export default async function MapPage({ searchParams }: { searchParams: Promise<{ species?: string; region?: string; mode?: string }> }) {
  const query = await searchParams;
  const species = getSpecies(query.species ?? "") ?? getSpecies("boletus-edulis")!;
  const region: RegionId = isRegionId(query.region) ? query.region : species.ecologicalConfig.regions[0] ?? "prepirineus";
  const requestedMode: MapViewMode = query.mode === "compatibility" ? "compatibility" : "prediction";
  const mode: MapViewMode = species.predictionMode === "habitat_only"
    ? "compatibility"
    : requestedMode;
  const isCompatibility = mode === "compatibility";
  const snapshot = await getConditionSnapshot(region);
  const result = calculateSuitability(species, snapshot);

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
        <h1>{isCompatibility ? "Mapa de compatibilitat" : "Mapa de condicions"}</h1>
        <p><span className="visually-hidden">Mapa de bolets de Catalunya. </span>{species.predictionMode === "habitat_only"
          ? species.predictionCaveat
          : isCompatibility
          ? "Explora on la coberta del sòl, l’altitud i el pH encaixen amb l’espècie. No és una predicció de fructificació."
          : "Mostra com de favorable és cada cel·la combinant l’hàbitat adequat amb les condicions per fructificar-hi. La puntuació serveix per comparar; no és una probabilitat de presència."}</p>
      </div>
      <div className="map-controls">
        <div className="map-species-picker">
          <span className="map-species-picker-label"><Trees size={17} aria-hidden="true" /> Espècie cartografiada</span>
          <QuerySelect
            value={species.speciesId}
            items={speciesSelectItems}
            variant="map"
            aria-label="Espècie seleccionada"
          />
          <small><i>{species.identity.scientificName}</i><span> · canvia l’espècie per actualitzar tota la lectura</span></small>
        </div>
      </div>
    </div>
    <MapExplorer
      species={species}
      region={region}
      autoGeolocate={!isRegionId(query.region)}
      mode={mode}
      regionalSnapshot={snapshot}
      regionalResult={result}
      speciesItems={speciesSelectItems}
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
            </> : <>
              <p>La cartografia mostra el relleu i els elements topogràfics. Una cel·la mai representa una observació de bolets, una probabilitat de presència ni una garantia de trobar-ne.</p>
              <p>El color mostra la puntuació de cada cel·la. Combina quina part té un hàbitat adequat —segons coberta, sòl i altitud— amb les condicions ambientals dins d’aquest hàbitat.</p>
              <p>Els colors permeten comparar cel·les entre si, però no formen una puntuació única per a tota la regió. La proporció d’hàbitat ja forma part del resultat i no es torna a aplicar mitjançant l’opacitat.</p>
              <p>Selecciona una cel·la per veure la puntuació, l’hàbitat adequat i les condicions per fructificar-hi, amb el detall de l’aigua, la temperatura, la temporada i els extrems. El temps pot ser compartit entre cel·les veïnes perquè conserva la resolució real del proveïdor.</p>
            </>}
          </div>
          <Link href={`${speciesPath(species)}?region=${region}`} className="text-link">Llegir la fitxa de {species.identity.commonName} <ArrowUpRight size={17} /></Link>
        </aside>
      }
    />
    <nav className="map-page-guide-links page-width" aria-label="Guies relacionades amb el mapa de bolets"><Link href="/bolets-avui">Resum de bolets avui <ArrowUpRight size={16} /></Link><Link href="/zones">Comparar zones de Catalunya <ArrowUpRight size={16} /></Link><Link href="/bolets">Consultar espècies <ArrowUpRight size={16} /></Link><Link href="/quan-surten-els-bolets-despres-de-ploure">Quan surten després de ploure <ArrowUpRight size={16} /></Link></nav>
    <section className="map-page-seo-copy page-width" aria-labelledby="map-search-guide-title">
      <p className="eyebrow">Mapa de bolets de Catalunya</p>
      <h2 id="map-search-guide-title">Com fer servir el mapa per preparar una sortida</h2>
      <p>Seleccioneu una espècie i una zona per diferenciar el seu hàbitat compatible de les condicions actuals per fructificar. El mapa és una lectura ecològica agregada: serveix per comparar cel·les i entendre els factors que limiten una espècie, però no mostra observacions ni localitzacions exactes.</p>
      <p>Per decidir què consultar primer, vegeu el resum de <Link href="/bolets-avui">bolets avui</Link>; per entendre una puntuació concreta, contrasteu-la amb la <Link href={speciesPath(species)}>fitxa de {species.identity.commonName}</Link> i amb les <Link href="/zones">zones generals de predicció</Link>.</p>
      <EditorialAttribution contentId="map" sources={[...environmentalSources, ...coreEditorialSources]} />
    </section>
  </section>;
}
