/**
 * Stable public Catalan slugs for species profile URLs.
 *
 * Scientific `speciesId` values remain the internal identifiers used by the
 * catalogue, prediction model and stored data. Changing a display name must
 * not silently move a public URL, so every canonical slug is explicit here.
 */
export const speciesSlugs = {
  "rubroboletus-satanas": "matagent",
  "tylopilus-felleus": "mataparent",
  "amanita-muscaria": "reig-bord",
  "cortinarius-rubellus": "cortinari-mortal",
  "omphalotus-olearius": "bolet-d-olivera",
  "hygrophorus-marzuolus": "marcot",
  "tricholoma-portentosum": "fredolic-gros",
  "russula-virescens": "llora-verda",
  "cyclocybe-cylindracea": "pollancro",
  "coprinus-comatus": "bolet-de-tinta",
  "suillus-granulatus": "molleric-granellut",
  "pleurotus-eryngii": "girgola-de-panical",
  "boletus-edulis": "cep",
  "boletus-pinophilus": "cep-rogenc",
  "boletus-aereus": "cep-negre",
  "boletus-reticulatus": "cep-d-estiu",
  "lactarius-deliciosus": "pinetell",
  "lactarius-sanguifluus": "rovello",
  "cantharellus-cibarius": "rossinyol",
  "craterellus-lutescens": "camagroc",
  "craterellus-cornucopioides": "trompeta-de-la-mort",
  "hydnum-repandum": "llengua-de-bou",
  "macrolepiota-procera": "apagallums",
  "tricholoma-terreum": "fredolic",
  "hygrophorus-latitabundus": "llenega",
  "amanita-caesarea": "ou-de-reig",
  "marasmius-oreades": "camasec",
  "calocybe-gambosa": "moixero",
  "hygrophorus-russula": "carlet",
  "morchella-esculenta": "murgola",
  "lepista-nuda": "pimpinella-morada",
  "suillus-luteus": "molleric-de-calceta",
  "chroogomphus-rutilus": "cama-de-perdiu",
  "ramaria-aurea": "peu-de-rata-daurat",
  "agaricus-campestris": "camperol",
  "pleurotus-ostreatus": "girgola",
  "hygrophorus-eburneus": "llenega-blanca",
  "craterellus-tubaeformis": "fals-camagroc",
  "tuber-melanosporum": "tofona-negra",
  "amanita-phalloides": "farinera-borda",
  "lepiota-brunneoincarnata": "palometa-metzinosa",
  "galerina-marginata": "galerina-metzinosa",
  "cortinarius-orellanus": "cortinari-metzinos",
  "gyromitra-esculenta": "bolet-de-greix",
  "amanita-pantherina": "pixaca",
  "amanita-virosa": "farinera-pudent",
  "amanita-verna": "cogomassa",
  "tricholoma-pardinum": "fredolic-metzinos",
  "entoloma-sinuatum": "carner-bord",
  "inocybe-erubescens": "inocibe-de-patouillard",
  "clitocybe-rivulosa": "candeleta-de-vorada",
  "paxillus-involutus": "paxille-toxic",
  "hygrophoropsis-aurantiaca": "fals-rossinyol",
  "lycoperdon-perlatum": "pet-de-llop-perlat",
  "calvatia-gigantea": "pet-de-llop-gegant",
  "russula-cyanoxantha": "llora-aspra",
  "lactarius-chrysorrheus": "pinetell-bord",
  "lactarius-torminosus": "rovello-de-cabra",
  "ramaria-formosa": "peu-de-rata-bord",
  "lactifluus-rugatus": "lleterola-roja",
  "leccinellum-lepidum": "cigro-alzinenc",
} as const;

const speciesIdsBySlug = new Map<string, string>(
  Object.entries(speciesSlugs).map(([speciesId, slug]) => [slug, speciesId]),
);

if (speciesIdsBySlug.size !== Object.keys(speciesSlugs).length) {
  throw new Error("Canonical species slugs must be unique");
}

export function speciesSlugForId(speciesId: string) {
  const slug = speciesSlugs[speciesId as keyof typeof speciesSlugs];
  if (!slug) throw new Error(`Missing canonical species slug for ${speciesId}`);
  return slug;
}

export function speciesIdForSlug(slug: string) {
  return speciesIdsBySlug.get(slug);
}
