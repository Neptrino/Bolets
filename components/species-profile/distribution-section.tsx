import { ProfileSection } from "@/components/species-profile/profile-section";
import "@/app/styles/location-guides-components.css";
import Link from "next/link";
import { ArrowUpRight, MapPinned } from "lucide-react";
import { LazyHabitatMap } from "@/components/lazy-habitat-map";
import { UmamiEventLink } from "@/components/umami-event-link";
import { regionLabels } from "@/data/regions";
import {
  getPlace,
  locationPagePath,
  locationPagesForSpecies,
} from "@/data/location-pages";
import { speciesHeadings } from "@/src/lib/species-headings";
import { speciesMapHref } from "@/src/lib/species-map-pages";
import type { RegionId, SpeciesProfile } from "@/src/lib/types";
import { UMAMI_EVENTS } from "@/src/lib/umami-goals";

/* Potential habitat and territorial guides, separate from seasonal conditions.
   The map frames the whole of Catalonia and never asks for the visitor's
   location: it shows where the species could grow, not where the reader is.
   A region the visitor brought from the map (?region=) sends the map link back to it. */
export function SpeciesDistributionSection({
  region,
  species,
}: {
  region?: RegionId;
  species: SpeciesProfile;
}) {
  const habitat = species.ecologicalConfig.habitat;
  const soil = species.ecologicalConfig.soil;
  const localGuides = locationPagesForSpecies(species.speciesId);
  const headings = speciesHeadings(species.identity.commonName);

  return (
<ProfileSection species={species} id="distribució" className="distribution-section" eyebrow="Bosc i territori" title={headings.map}>
  <div className="profile-panel profile-map-panel">
  <div className="profile-panel-head">
    <p>
      <strong>
        És un mapa dels terrenys on l’espècie podria créixer, no una
        lectura de les condicions d’avui.
      </strong>{" "}
      El blau indica boscos on el terreny encaixa amb l’espècie; no
      confirma que hi hagi bolets.
    </p>
    <UmamiEventLink
      href={speciesMapHref(species.speciesId, {
        region,
        mode: species.predictionMode === "habitat_only" ? "compatibility" : undefined,
      })}
      className="habitat-map-link"
      analyticsEvent={UMAMI_EVENTS.speciesMapOpen}
    >
      {region && <span>{regionLabels[region]}</span>}
      <strong>{species.predictionMode === "habitat_only" ? headings.habitatMapLink : headings.mapLink}</strong>
      <ArrowUpRight size={16} aria-hidden="true" />
    </UmamiEventLink>
  </div>
  <div className="profile-panel-body">
  <LazyHabitatMap
    activeRegions={species.ecologicalConfig.regions}
    autoGeolocate={false}
    compactLegend
    geolocation={false}
    speciesId={species.speciesId}
  />
  <div className="region-pill-row habitat-evidence-row">
    <span>Tipus de bosc</span>
    <span>
      {habitat.altitude[0]}–{habitat.altitude[1]} m
    </span>
    <span>
      {soil.reaction}
    </span>
    <span>Dades de bosc, altitud i sòl</span>
    <span>Observacions històriques agrupades per zona</span>
  </div>
  {localGuides.length > 0 && (
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
  </div>
</ProfileSection>
  );
}
