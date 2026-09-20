/**
 * Species illustrations shown in the app (guide hero pins, territory cards,
 * findings without a photograph). Two families:
 *
 * - `drawing`: our own flat icon family, one per catalogue species, generated
 *   on Magnific in September 2026 from the prompts kept next to the sources
 *   (assets/illustrations/generated/species-icons). These are the main
 *   drawings and the ones `speciesDrawing()` returns.
 * - `stock`: the earlier editorial drawings (illustration catalogue sheets and
 *   photo-derived variants). Kept as stock artwork for social and print use;
 *   entries with a credit derive from a Creative Commons photograph and must be
 *   credited wherever they appear.
 *
 * `npm run illustrations:species` builds them into
 * public/media/illustrations/<speciesId>.webp (drawings) and
 * public/media/illustrations/stock/<speciesId>.webp (stock); the sources live
 * outside git under assets.
 */
export type SpeciesIllustrationKind = "drawing" | "stock";

export type SpeciesIllustrationAsset = {
  kind: SpeciesIllustrationKind;
  /** Path under assets or social/illustration-catalogue. */
  source: string;
  /** Sources with a white page background are cut out at build time. */
  cutout?: boolean;
  /** Required attribution for photo-derived drawings. */
  credit?: { text: string; url: string; license: string };
};

/** Main drawings: the flat species icon family. */
export const speciesDrawingAssets: Record<string, SpeciesIllustrationAsset> = {
  "agaricus-campestris": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/agaricus-campestris.webp", cutout: true },
  "amanita-caesarea": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/amanita-caesarea.webp", cutout: true },
  "amanita-muscaria": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/amanita-muscaria.webp", cutout: true },
  "amanita-pantherina": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/amanita-pantherina.webp", cutout: true },
  "amanita-phalloides": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/amanita-phalloides.webp", cutout: true },
  "amanita-verna": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/amanita-verna.webp", cutout: true },
  "amanita-virosa": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/amanita-virosa.webp", cutout: true },
  "boletus-aereus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/boletus-aereus.webp", cutout: true },
  "boletus-edulis": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/boletus-edulis.webp", cutout: true },
  "boletus-pinophilus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/boletus-pinophilus.webp", cutout: true },
  "boletus-reticulatus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/boletus-reticulatus.webp", cutout: true },
  "calocybe-gambosa": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/calocybe-gambosa.webp", cutout: true },
  "calvatia-gigantea": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/calvatia-gigantea.webp", cutout: true },
  "cantharellus-cibarius": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/cantharellus-cibarius.webp", cutout: true },
  "chroogomphus-rutilus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/chroogomphus-rutilus.webp", cutout: true },
  "clitocybe-rivulosa": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/clitocybe-rivulosa.webp", cutout: true },
  "coprinus-comatus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/coprinus-comatus.webp", cutout: true },
  "cortinarius-orellanus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/cortinarius-orellanus.webp", cutout: true },
  "cortinarius-rubellus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/cortinarius-rubellus.webp", cutout: true },
  "craterellus-cornucopioides": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/craterellus-cornucopioides.webp", cutout: true },
  "craterellus-lutescens": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/craterellus-lutescens.webp", cutout: true },
  "craterellus-tubaeformis": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/craterellus-tubaeformis.webp", cutout: true },
  "cyclocybe-cylindracea": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/cyclocybe-cylindracea.webp", cutout: true },
  "entoloma-sinuatum": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/entoloma-sinuatum.webp", cutout: true },
  "galerina-marginata": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/galerina-marginata.webp", cutout: true },
  "gyromitra-esculenta": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/gyromitra-esculenta.webp", cutout: true },
  "hydnum-repandum": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/hydnum-repandum.webp", cutout: true },
  "hygrophoropsis-aurantiaca": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/hygrophoropsis-aurantiaca.webp", cutout: true },
  "hygrophorus-eburneus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/hygrophorus-eburneus.webp", cutout: true },
  "hygrophorus-latitabundus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/hygrophorus-latitabundus.webp", cutout: true },
  "hygrophorus-marzuolus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/hygrophorus-marzuolus.webp", cutout: true },
  "hygrophorus-russula": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/hygrophorus-russula.webp", cutout: true },
  "inocybe-erubescens": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/inocybe-erubescens.webp", cutout: true },
  "lactarius-chrysorrheus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/lactarius-chrysorrheus.webp", cutout: true },
  "lactarius-deliciosus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/lactarius-deliciosus.webp", cutout: true },
  "lactarius-sanguifluus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/lactarius-sanguifluus.webp", cutout: true },
  "lactarius-torminosus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/lactarius-torminosus.webp", cutout: true },
  "lactifluus-rugatus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/lactifluus-rugatus.webp", cutout: true },
  "leccinellum-lepidum": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/leccinellum-lepidum.webp", cutout: true },
  "lepiota-brunneoincarnata": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/lepiota-brunneoincarnata.webp", cutout: true },
  "lepista-nuda": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/lepista-nuda.webp", cutout: true },
  "lycoperdon-perlatum": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/lycoperdon-perlatum.webp", cutout: true },
  "lycoperdon-utriforme": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/lycoperdon-utriforme.webp", cutout: true },
  "macrolepiota-procera": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/macrolepiota-procera.webp", cutout: true },
  "marasmius-oreades": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/marasmius-oreades.webp", cutout: true },
  "morchella-esculenta": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/morchella-esculenta.webp", cutout: true },
  "omphalotus-olearius": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/omphalotus-olearius.webp", cutout: true },
  "paxillus-involutus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/paxillus-involutus.webp", cutout: true },
  "pleurotus-eryngii": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/pleurotus-eryngii.webp", cutout: true },
  "pleurotus-ostreatus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/pleurotus-ostreatus.webp", cutout: true },
  "ramaria-aurea": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/ramaria-aurea.webp", cutout: true },
  "ramaria-formosa": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/ramaria-formosa.webp", cutout: true },
  "rubroboletus-satanas": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/rubroboletus-satanas.webp", cutout: true },
  "russula-cyanoxantha": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/russula-cyanoxantha.webp", cutout: true },
  "russula-virescens": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/russula-virescens.webp", cutout: true },
  "suillus-granulatus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/suillus-granulatus.webp", cutout: true },
  "suillus-luteus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/suillus-luteus.webp", cutout: true },
  "tricholoma-pardinum": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/tricholoma-pardinum.webp", cutout: true },
  "tricholoma-portentosum": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/tricholoma-portentosum.webp", cutout: true },
  "tricholoma-terreum": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/tricholoma-terreum.webp", cutout: true },
  "tuber-melanosporum": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/tuber-melanosporum.webp", cutout: true },
  "tylopilus-felleus": { kind: "drawing", source: "assets/illustrations/generated/species-icons/webp/tylopilus-felleus.webp", cutout: true },
};

/** Stock illustrations: earlier editorial drawings kept for reuse. */
export const speciesStockIllustrationAssets: Record<string, SpeciesIllustrationAsset> = {
  "amanita-caesarea": { kind: "stock", source: "social/illustration-catalogue/previews/amanita-caesarea.webp", cutout: true },
  "boletus-aereus": { kind: "stock", source: "social/illustration-catalogue/previews/boletus-aereus.webp", cutout: true },
  "boletus-edulis": { kind: "stock", source: "social/illustration-catalogue/previews/boletus-edulis.webp", cutout: true },
  "boletus-pinophilus": { kind: "stock", source: "social/illustration-catalogue/previews/boletus-pinophilus.webp", cutout: true },
  "boletus-reticulatus": { kind: "stock", source: "social/illustration-catalogue/previews/boletus-reticulatus.webp", cutout: true },
  "cantharellus-cibarius": { kind: "stock", source: "social/illustration-catalogue/previews/cantharellus-cibarius.webp", cutout: true },
  "craterellus-cornucopioides": { kind: "stock", source: "social/illustration-catalogue/previews/craterellus-cornucopioides.webp", cutout: true },
  "craterellus-lutescens": { kind: "stock", source: "social/illustration-catalogue/previews/craterellus-lutescens.webp", cutout: true },
  "hygrophorus-marzuolus": { kind: "stock", source: "social/illustration-catalogue/previews/hygrophorus-marzuolus.webp", cutout: true },
  "hygrophorus-russula": { kind: "stock", source: "social/illustration-catalogue/previews/hygrophorus-russula.webp", cutout: true },
  "lactarius-salmonicolor": { kind: "stock", source: "social/illustration-catalogue/previews/lactarius-salmonicolor.webp", cutout: true },
  "lactarius-sanguifluus": { kind: "stock", source: "social/illustration-catalogue/previews/lactarius-sanguifluus.webp", cutout: true },
  "russula-cyanoxantha": { kind: "stock", source: "social/illustration-catalogue/previews/russula-cyanoxantha.webp", cutout: true },
  "suillus-luteus": { kind: "stock", source: "social/illustration-catalogue/previews/suillus-luteus.webp", cutout: true },
  "lactarius-deliciosus": { kind: "stock", source: "assets/illustrations/species-additions/2026-09-10/photo-derived/lactarius-deliciosus/illustration.png" },
  "macrolepiota-procera": { kind: "stock", source: "assets/illustrations/species-additions/2026-09-10/macrolepiota-procera/illustration.png", cutout: true },
  "amanita-phalloides": { kind: "stock", source: "assets/illustrations/species-additions/2026-09-10/amanita-phalloides/illustration.png" },
  "calocybe-gambosa": { kind: "stock", source: "assets/illustrations/species-additions/2026-09-10/calocybe-gambosa/illustration.png" },
  "hydnum-repandum": { kind: "stock", source: "assets/illustrations/species-additions/2026-09-10/photo-derived/hydnum-repandum/illustration.png", credit: { text: "Il·lustració adaptada d’una fotografia amb llicència Creative Commons", url: "https://creativecommons.org/licenses/by/4.0/", license: "CC BY 4.0" } },
  "marasmius-oreades": { kind: "stock", source: "assets/illustrations/species-additions/2026-09-10/photo-derived/marasmius-oreades/illustration.png", credit: { text: "Il·lustració adaptada d’una fotografia d’Alan Rockefeller", url: "https://creativecommons.org/licenses/by/4.0/", license: "CC BY 4.0" } },
  "hygrophorus-latitabundus": { kind: "stock", source: "assets/illustrations/species-additions/2026-09-10/photo-derived/hygrophorus-latitabundus/illustration.png", credit: { text: "Il·lustració adaptada d’una fotografia de Paffka", url: "https://creativecommons.org/licenses/by-sa/3.0/", license: "CC BY-SA 3.0" } },
  "tricholoma-terreum": { kind: "stock", source: "assets/illustrations/species-additions/2026-09-10/photo-derived/tricholoma-terreum/illustration.png", credit: { text: "Il·lustració adaptada d’una fotografia de Strobilomyces", url: "https://creativecommons.org/licenses/by-sa/3.0/", license: "CC BY-SA 3.0" } },
};

/** Every illustration source, keyed by species id, for the build script. */
export const speciesIllustrationAssets: Record<SpeciesIllustrationKind, Record<string, SpeciesIllustrationAsset>> = {
  drawing: speciesDrawingAssets,
  stock: speciesStockIllustrationAssets,
};

export function speciesIllustrationOutputPath(kind: SpeciesIllustrationKind, speciesId: string) {
  return kind === "drawing" ? `/media/illustrations/${speciesId}.webp` : `/media/illustrations/stock/${speciesId}.webp`;
}

/** Public path of the main drawing for a species, when it has one. */
export function speciesIllustrationPath(speciesId: string) {
  return speciesId in speciesDrawingAssets ? speciesIllustrationOutputPath("drawing", speciesId) : undefined;
}

/** Public path of the stock illustration for a species, when it has one. */
export function speciesStockIllustrationPath(speciesId: string) {
  return speciesId in speciesStockIllustrationAssets ? speciesIllustrationOutputPath("stock", speciesId) : undefined;
}
