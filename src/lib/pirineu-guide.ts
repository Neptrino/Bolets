import { areasBySlug, locationPagesForArea, placesForArea } from "@/data/location-pages";
import { getSpecies, speciesProfiles } from "@/data/species";
import type { AreaProfile } from "@/data/location-pages";
import type { SpeciesProfile } from "@/src/lib/types";

/* The Pyrenees editorial hub groups the comarca hubs that sit on the axial
   Pyrenees and the Prepyrenees. It publishes no ecology of its own: species
   and altitude ranges come from the versioned profiles, places and guides
   from the curated location pages. */

export const PIRINEU_AREA_SLUGS = ["ripolles", "cerdanya", "bergueda", "solsones"] as const;

export type PirineuAreaSlug = (typeof PIRINEU_AREA_SLUGS)[number];

export interface PirineuArea {
  area: AreaProfile;
  placeCount: number;
  guideCount: number;
  species: SpeciesProfile[];
}

function requiredArea(slug: PirineuAreaSlug) {
  const area = areasBySlug[slug];
  if (!area) throw new Error(`Missing Pyrenean area profile: ${slug}`);
  return area;
}

/** Species with a local guide somewhere in the area, in guide order. */
function guideSpecies(areaSlug: string) {
  return [...new Set(locationPagesForArea(areaSlug).map((page) => page.speciesId))]
    .map((speciesId) => getSpecies(speciesId))
    .filter((species): species is SpeciesProfile => Boolean(species));
}

export const pirineuAreas: PirineuArea[] = PIRINEU_AREA_SLUGS.map((slug) => {
  const area = requiredArea(slug);
  return {
    area,
    placeCount: placesForArea(slug).length,
    guideCount: locationPagesForArea(slug).length,
    species: guideSpecies(slug),
  };
});

/** Every species with a local guide in a Pyrenean hub, highest forests first. */
export const pirineuGuideSpecies: SpeciesProfile[] = [...new Map(
  pirineuAreas.flatMap(({ species }) => species.map((entry) => [entry.speciesId, entry] as const)),
).values()].sort((left, right) => right.ecologicalConfig.habitat.altitude[1] - left.ecologicalConfig.habitat.altitude[1]);

/** Scored species whose ecology names the Pyrenees, whether or not they have a local guide yet. */
export const pirineuRegionSpecies: SpeciesProfile[] = speciesProfiles
  .filter((species) => species.ecologicalConfig.regions.includes("pirineus"))
  .sort((left, right) => right.ecologicalConfig.habitat.altitude[1] - left.ecologicalConfig.habitat.altitude[1]);

/** Which hubs carry a guide for a species. */
export function pirineuAreasForSpecies(speciesId: string) {
  return pirineuAreas.filter(({ species }) => species.some((entry) => entry.speciesId === speciesId));
}
