/**
 * Editorial species illustrations shown in the app (guide hero pins, territory
 * cards). Built from the creative archive by `npm run illustrations:species`
 * into public/media/illustrations/<speciesId>.webp; the sources live outside
 * git under social/asset-library. Entries with a credit derive from a Creative
 * Commons photograph and must be credited wherever the drawing appears.
 */
export type SpeciesIllustrationAsset = {
  /** Path under social/asset-library or social/illustration-catalogue. */
  source: string;
  /** Sources with a white page background are cut out at build time. */
  cutout?: boolean;
  /** Required attribution for photo-derived drawings. */
  credit?: { text: string; url: string; license: string };
};

export const speciesIllustrationAssets: Record<string, SpeciesIllustrationAsset> = {
  "amanita-caesarea": { source: "social/illustration-catalogue/previews/amanita-caesarea.webp", cutout: true },
  "boletus-aereus": { source: "social/illustration-catalogue/previews/boletus-aereus.webp", cutout: true },
  "boletus-edulis": { source: "social/illustration-catalogue/previews/boletus-edulis.webp", cutout: true },
  "boletus-pinophilus": { source: "social/illustration-catalogue/previews/boletus-pinophilus.webp", cutout: true },
  "boletus-reticulatus": { source: "social/illustration-catalogue/previews/boletus-reticulatus.webp", cutout: true },
  "cantharellus-cibarius": { source: "social/illustration-catalogue/previews/cantharellus-cibarius.webp", cutout: true },
  "craterellus-cornucopioides": { source: "social/illustration-catalogue/previews/craterellus-cornucopioides.webp", cutout: true },
  "craterellus-lutescens": { source: "social/illustration-catalogue/previews/craterellus-lutescens.webp", cutout: true },
  "hygrophorus-marzuolus": { source: "social/illustration-catalogue/previews/hygrophorus-marzuolus.webp", cutout: true },
  "hygrophorus-russula": { source: "social/illustration-catalogue/previews/hygrophorus-russula.webp", cutout: true },
  "lactarius-salmonicolor": { source: "social/illustration-catalogue/previews/lactarius-salmonicolor.webp", cutout: true },
  "lactarius-sanguifluus": { source: "social/illustration-catalogue/previews/lactarius-sanguifluus.webp", cutout: true },
  "russula-cyanoxantha": { source: "social/illustration-catalogue/previews/russula-cyanoxantha.webp", cutout: true },
  "suillus-luteus": { source: "social/illustration-catalogue/previews/suillus-luteus.webp", cutout: true },
  "lactarius-deliciosus": { source: "social/asset-library/illustrations/species-additions/2026-09-10/photo-derived/lactarius-deliciosus/illustration.png" },
  "macrolepiota-procera": { source: "social/asset-library/illustrations/species-additions/2026-09-10/macrolepiota-procera/illustration.png", cutout: true },
  "amanita-phalloides": { source: "social/asset-library/illustrations/species-additions/2026-09-10/amanita-phalloides/illustration.png" },
  "calocybe-gambosa": { source: "social/asset-library/illustrations/species-additions/2026-09-10/calocybe-gambosa/illustration.png" },
  "hydnum-repandum": { source: "social/asset-library/illustrations/species-additions/2026-09-10/photo-derived/hydnum-repandum/illustration.png", credit: { text: "Il·lustració adaptada d’una fotografia amb llicència Creative Commons", url: "https://creativecommons.org/licenses/by/4.0/", license: "CC BY 4.0" } },
  "marasmius-oreades": { source: "social/asset-library/illustrations/species-additions/2026-09-10/photo-derived/marasmius-oreades/illustration.png", credit: { text: "Il·lustració adaptada d’una fotografia d’Alan Rockefeller", url: "https://creativecommons.org/licenses/by/4.0/", license: "CC BY 4.0" } },
  "hygrophorus-latitabundus": { source: "social/asset-library/illustrations/species-additions/2026-09-10/photo-derived/hygrophorus-latitabundus/illustration.png", credit: { text: "Il·lustració adaptada d’una fotografia de Paffka", url: "https://creativecommons.org/licenses/by-sa/3.0/", license: "CC BY-SA 3.0" } },
  "tricholoma-terreum": { source: "social/asset-library/illustrations/species-additions/2026-09-10/photo-derived/tricholoma-terreum/illustration.png", credit: { text: "Il·lustració adaptada d’una fotografia de Strobilomyces", url: "https://creativecommons.org/licenses/by-sa/3.0/", license: "CC BY-SA 3.0" } },
};

export function speciesIllustrationPath(speciesId: string) {
  return speciesId in speciesIllustrationAssets ? `/media/illustrations/${speciesId}.webp` : undefined;
}
