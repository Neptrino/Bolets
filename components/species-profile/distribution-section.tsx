import Link from "next/link";
import { ArrowUpRight, MapPinned } from "lucide-react";
import { LazyHabitatMap } from "@/components/lazy-habitat-map";
import { regionLabels } from "@/data/regions";
import {
  getPlace,
  locationPagePath,
  locationPagesForSpecies,
} from "@/data/location-pages";
import { territoryGuideForSpecies } from "@/src/lib/species-territory-guides";
import type { RegionId, SpeciesProfile } from "@/src/lib/types";

export function SpeciesDistributionSection({
  autoGeolocate,
  region,
  species,
}: {
  autoGeolocate: boolean;
  region: RegionId;
  species: SpeciesProfile;
}) {
  const habitat = species.ecologicalConfig.habitat;
  const soil = species.ecologicalConfig.soil;
  const localGuides = locationPagesForSpecies(species.speciesId);
  const territoryGuide = territoryGuideForSpecies(species.speciesId);

  return (
<section
  id="distribució"
  className="content-section compact-section distribution-section"
>
  <div className="section-kicker">
    <MapPinned size={17} aria-hidden="true" />
    <span>04</span>
  </div>
  <div>
    <p className="eyebrow">Evidència territorial</p>
    <h2>On podria créixer a Catalunya</h2>
    <div className="habitat-map-explainer">
      <p>
        <strong>
          És un mapa de compatibilitat ecològica, no una predicció
          d’avui.
        </strong>{" "}
        El blau indica boscos on el terreny encaixa amb l’espècie; no
        confirma que hi hagi bolets.
      </p>
      <Link
        href={`/map?species=${species.speciesId}&region=${region}${species.predictionMode === "habitat_only" ? "&mode=compatibility" : ""}`}
        className="habitat-map-link"
      >
        <span>{regionLabels[region]}</span>
        <strong>Obrir el mapa interactiu</strong>
        <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </div>
    <LazyHabitatMap
      activeRegions={species.ecologicalConfig.regions}
      autoGeolocate={autoGeolocate}
      compactLegend
      selectedRegion={region}
      speciesId={species.speciesId}
    />
    <div className="region-pill-row habitat-evidence-row">
      <span>Coberta del sòl ICGC</span>
      <span>
        {habitat.altitude[0]}–{habitat.altitude[1]} m
      </span>
      <span>
        {soil.phRange
          ? `pH ${soil.phRange[0]}–${soil.phRange[1]}`
          : "Sòl compatible"}
      </span>
      <span>Dades de bosc, altitud i sòl</span>
      <span>Registres històrics generalitzats</span>
    </div>
    {(territoryGuide || localGuides.length > 0) && (
      <section
        className="species-local-guides"
        aria-labelledby="local-guides-title"
      >
        <header className="species-local-guides-heading">
          <p className="eyebrow">
            <MapPinned size={14} aria-hidden="true" /> Guies territorials
          </p>
          <h3 id="local-guides-title">
            Aquesta espècie, territori per territori.
          </h3>
        </header>
        <div className="species-local-guide-links">
          {territoryGuide && (
            <Link
              href={territoryGuide.path}
              className="species-territory-hub-link"
            >
              <span>Guia de Catalunya</span>
              <strong>{territoryGuide.profileLinkTitle}</strong>
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          )}
          {localGuides.map((guide) => (
            <Link
              href={locationPagePath(guide)}
              key={locationPagePath(guide)}
            >
              <span>
                {getPlace(guide.areaSlug, guide.placeSlug)?.typeLabel}
              </span>
              <strong>{guide.titlePhrase}</strong>
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    )}
  </div>
</section>
  );
}
