import Link from "next/link";
import { ArrowUpRight, Info } from "lucide-react";
import { MapExplorer } from "@/components/map-explorer";
import { QuerySelect } from "@/components/ui/query-select";
import { isRegionId, regionSelectItems } from "@/data/regions";
import { getSpecies, speciesProfiles, speciesSelectItems } from "@/data/species";
import { getConditionSnapshot } from "@/src/lib/conditions";
import { calculateSuitability } from "@/src/lib/scoring";
import type { RegionId } from "@/src/lib/types";

export const metadata = { title: "Mapa · Bolets Atles" };

export default async function MapPage({ searchParams }: { searchParams: Promise<{ species?: string; region?: string }> }) {
  const query = await searchParams;
  const species = getSpecies(query.species ?? "") ?? getSpecies("boletus-edulis")!;
  const region: RegionId = isRegionId(query.region) ? query.region : species.ecologicalConfig.regions[0] ?? "prepirineus";
  const snapshot = await getConditionSnapshot(region);
  const result = calculateSuitability(species, snapshot);

  return <section className="map-page">
    <div className="page-width map-page-heading">
      <div>
        <p className="eyebrow">Lectura territorial</p>
        <h1>Mapa de compatibilitat</h1>
        <p>Base topogràfica de l’ICGC. Les cel·les de predicció no es publiquen fins que disposen de dades ambientals datades, amb procedència i incertesa.</p>
      </div>
      <div className="map-controls">
        <label>Espècie<QuerySelect value={species.speciesId} items={speciesSelectItems} aria-label="Espècie seleccionada" /></label>
        <div className="species-switch-links">{speciesProfiles.map((item) => <Link key={item.speciesId} href={`/map?species=${item.speciesId}&region=${region}`} scroll={false} className={item.speciesId === species.speciesId ? "active" : ""}>{item.identity.commonName}</Link>)}</div>
        <label>Regió<QuerySelect value={region} items={regionSelectItems} parameter="region" variant="region" aria-label="Àrea de Catalunya seleccionada" /></label>
      </div>
    </div>
    <MapExplorer
      species={species}
      region={region}
      regionalSnapshot={snapshot}
      regionalResult={result}
      info={
        <aside key="map-info" className="map-reading-guide">
          <div className="map-reading-heading">
            <Info size={22} aria-hidden="true" />
            <div>
              <p className="eyebrow">Guia de lectura</p>
              <h2>Com llegir aquest mapa</h2>
            </div>
          </div>
          <div className="map-reading-copy">
            <p>La cartografia mostra el relleu i els elements topogràfics. Una cel·la mai representa una observació de bolets ni una garantia de presència.</p>
            <p>Selecciona una cel·la per veure’n el sòl, la coberta, l’altitud i les condicions actuals. El temps conserva la resolució real del proveïdor i pot ser compartit entre cel·les veïnes.</p>
          </div>
          <Link href={`/species/${species.speciesId}?region=${region}`} className="text-link">Llegir la fitxa de {species.identity.commonName} <ArrowUpRight size={17} /></Link>
        </aside>
      }
    />
  </section>;
}
