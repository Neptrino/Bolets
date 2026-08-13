import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, Info, Trees } from "lucide-react";
import { MapExplorer } from "@/components/map-explorer";
import { QuerySelect } from "@/components/ui/query-select";
import { isRegionId } from "@/data/regions";
import { getSpecies, speciesSelectItems } from "@/data/species";
import { getConditionSnapshot } from "@/src/lib/conditions";
import { calculateSuitability } from "@/src/lib/scoring";
import { DEFAULT_SOCIAL_IMAGE, speciesPath } from "@/src/lib/seo";
import type { MapViewMode, RegionId } from "@/src/lib/types";

export const metadata: Metadata = {
  title: "Mapa de bolets de Catalunya",
  description: "Mapa de bolets de Catalunya amb compatibilitat d’hàbitat i condicions de fructificació actuals per espècie i regió.",
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
    <div className="page-width map-page-heading">
      <div className="map-page-title">
        <p className="eyebrow">Lectura territorial</p>
        <h1>{isCompatibility ? "Mapa de compatibilitat" : "Mapa de predicció"}</h1>
        <p><span className="visually-hidden">Mapa de bolets de Catalunya. </span>{species.predictionMode === "habitat_only"
          ? species.predictionCaveat
          : isCompatibility
          ? "Explora on la coberta del sòl, l’altitud i el pH encaixen amb l’espècie. No és una predicció de fructificació."
          : "Combina l’hàbitat compatible amb les condicions ambientals actuals i només mostra resultats quan les dades són prou completes."}</p>
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
              <p>La cartografia mostra el relleu i els elements topogràfics. Una cel·la mai representa una observació de bolets ni una garantia de presència.</p>
              <p>El color combina la puntuació actual amb la proporció exacta d’hàbitat compatible: una cobertura baixa acosta la cel·la al vermell encara que la puntuació sigui positiva. En graelles agregades, l’altitud es resumeix només dins d’aquest hàbitat, no amb la cota mitjana de tot el sector.</p>
              <p>Selecciona una cel·la per veure’n el sòl, la coberta, l’altitud i les condicions actuals. El temps conserva la resolució real del proveïdor i pot ser compartit entre cel·les veïnes.</p>
            </>}
          </div>
          <Link href={`${speciesPath(species)}?region=${region}`} className="text-link">Llegir la fitxa de {species.identity.commonName} <ArrowUpRight size={17} /></Link>
        </aside>
      }
    />
    <nav className="map-page-guide-links page-width" aria-label="Guies relacionades amb les condicions actuals"><Link href="/bolets-avui">Resum de bolets avui <ArrowUpRight size={16} /></Link><Link href="/quan-surten-els-bolets-despres-de-ploure">Quan surten després de ploure <ArrowUpRight size={16} /></Link></nav>
  </section>;
}
