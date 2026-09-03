import { catalogueSpecies } from "@/data/catalogue";

export const speciesNameSources = {
  optimot: {
    label: "Optimot i TERMCAT",
    url: "https://aplicacions.llengua.gencat.cat/llc/AppJava/index.html?action=Principal",
  },
  agentsRurals: {
    label: "Agents Rurals — Consells per gaudir dels bolets",
    url: "https://interior.gencat.cat/web/.content/home/030_arees_dactuacio/agents_rurals/06-medi-natural/gestio-forestal/consells_gaudir_bolets.pdf",
  },
  aranzadi: {
    label: "Sociedad de Ciencias Aranzadi — guia micològica en castellà",
    url: "https://www.aranzadi.eus/assets/files/urola-kosta-bailarako-perretxikoak-espanol.pdf",
  },
  vmf: {
    label: "E. Parés — Vocabulari multilingüe de fongs (VMF 2022)",
    url: "https://plantipodes-am.cat/AM/2022b_VMFongsEP-v21.pdf",
  },
  cestaYSetas: {
    label: "Cesta y Setas — bolets dels rebollars",
    url: "https://www.cestaysetas.com/que-setas-podemos-encontrar-en-los-melojares/",
  },
} as const;

export type SpeciesNameSourceId = keyof typeof speciesNameSources;

export interface SpanishSpeciesNames {
  primary: string;
  alternatives?: readonly string[];
  sourceIds: readonly SpeciesNameSourceId[];
}

// Spanish common names are editorial terminology only. Scientific identity,
// Catalan names, ecology and prediction support remain in the catalogue.
export const spanishSpeciesNames = {
  "agaricus-campestris": { primary: "champiñón silvestre", sourceIds: ["aranzadi"] },
  "amanita-caesarea": { primary: "oronja", alternatives: ["amanita de los césares"], sourceIds: ["aranzadi"] },
  "amanita-muscaria": { primary: "matamoscas", alternatives: ["falsa oronja"], sourceIds: ["agentsRurals", "aranzadi"] },
  "amanita-pantherina": { primary: "amanita pantera", sourceIds: ["aranzadi"] },
  "amanita-phalloides": { primary: "oronja verde", sourceIds: ["aranzadi"] },
  "amanita-verna": { primary: "oronja blanca", sourceIds: ["aranzadi"] },
  "amanita-virosa": { primary: "amanita maloliente", alternatives: ["cicuta fétida", "oronja cheposa", "oronja fétida"], sourceIds: ["vmf"] },
  "boletus-aereus": { primary: "boleto negro", sourceIds: ["aranzadi"] },
  "boletus-edulis": { primary: "boleto", alternatives: ["hongo blanco"], sourceIds: ["aranzadi"] },
  "boletus-pinophilus": { primary: "boleto de pino", sourceIds: ["aranzadi"] },
  "boletus-reticulatus": { primary: "boleto reticulado", alternatives: ["boleto de verano"], sourceIds: ["aranzadi"] },
  "calocybe-gambosa": { primary: "seta de San Jorge", alternatives: ["perrechico"], sourceIds: ["optimot", "aranzadi"] },
  "calvatia-gigantea": { primary: "pedo de lobo gigante", sourceIds: ["aranzadi"] },
  "cantharellus-cibarius": { primary: "rebozuelo", sourceIds: ["optimot", "aranzadi"] },
  "chroogomphus-rutilus": { primary: "pata de perdiz", sourceIds: ["aranzadi"] },
  "clitocybe-rivulosa": { primary: "clitocibe de las cunetas", sourceIds: ["aranzadi"] },
  "coprinus-comatus": { primary: "barbuda", alternatives: ["coprino barbudo"], sourceIds: ["aranzadi"] },
  "craterellus-cornucopioides": { primary: "trompeta de los muertos", sourceIds: ["aranzadi"] },
  "craterellus-lutescens": { primary: "rebozuelo anaranjado", sourceIds: ["optimot", "agentsRurals"] },
  "craterellus-tubaeformis": { primary: "rebozuelo atrompetado", sourceIds: ["aranzadi"] },
  "cortinarius-orellanus": { primary: "cortinario de montaña", alternatives: ["cortinario mortal"], sourceIds: ["vmf", "aranzadi"] },
  "cortinarius-rubellus": { primary: "cortinario rojizo", sourceIds: ["vmf"] },
  "cyclocybe-cylindracea": { primary: "seta de chopo", sourceIds: ["aranzadi"] },
  "entoloma-sinuatum": { primary: "entoloma lívido", sourceIds: ["aranzadi"] },
  "galerina-marginata": { primary: "galerina marginada", sourceIds: ["aranzadi"] },
  "gyromitra-esculenta": { primary: "falsa colmenilla", sourceIds: ["aranzadi"] },
  "hydnum-repandum": { primary: "lengua de vaca", sourceIds: ["aranzadi"] },
  "hygrophoropsis-aurantiaca": { primary: "falso rebozuelo", sourceIds: ["aranzadi"] },
  "hygrophorus-eburneus": { primary: "higróforo marfileño", alternatives: ["babosa blanca", "llanega marfil"], sourceIds: ["vmf"] },
  "hygrophorus-latitabundus": { primary: "llanega negra", alternatives: ["babosa negra", "higróforo gris"], sourceIds: ["vmf"] },
  "hygrophorus-marzuolus": { primary: "seta de marzo", sourceIds: ["aranzadi"] },
  "hygrophorus-russula": { primary: "higróforo escarlata", sourceIds: ["vmf", "aranzadi"] },
  "inocybe-erubescens": { primary: "inocibe de Patouillard", alternatives: ["bruja", "inocibe lobulado"], sourceIds: ["vmf"] },
  "lactarius-chrysorrheus": { primary: "falso níscalo", sourceIds: ["aranzadi"] },
  "lactarius-deliciosus": { primary: "níscalo", alternatives: ["robellón"], sourceIds: ["aranzadi"] },
  "lactarius-sanguifluus": { primary: "níscalo sanguíneo", sourceIds: ["aranzadi"] },
  "lactarius-torminosus": { primary: "níscalo lanudo", sourceIds: ["aranzadi"] },
  "lactifluus-rugatus": { primary: "níscalo arrugado", sourceIds: ["cestaYSetas"] },
  "leccinellum-lepidum": { primary: "boleto agradable", sourceIds: ["aranzadi"] },
  "lepiota-brunneoincarnata": { primary: "lepiota marrón rojiza", alternatives: ["parasol pardorrojizo"], sourceIds: ["vmf"] },
  "lepista-nuda": { primary: "pie azul", sourceIds: ["aranzadi"] },
  "lycoperdon-perlatum": { primary: "pedo de lobo perlado", alternatives: ["bejín perlado", "cuesco de lobo perlado"], sourceIds: ["vmf", "aranzadi"] },
  "lycoperdon-utriforme": { primary: "bejín areolado", alternatives: ["bejín rugoso"], sourceIds: ["vmf"] },
  "macrolepiota-procera": { primary: "parasol", alternatives: ["galamperna"], sourceIds: ["aranzadi"] },
  "marasmius-oreades": { primary: "senderuela", sourceIds: ["optimot", "aranzadi"] },
  "morchella-esculenta": { primary: "colmenilla", sourceIds: ["aranzadi"] },
  "omphalotus-olearius": { primary: "seta de olivo", sourceIds: ["aranzadi"] },
  "paxillus-involutus": { primary: "paxilo enrollado", sourceIds: ["aranzadi"] },
  "pleurotus-eryngii": { primary: "seta de cardo", sourceIds: ["aranzadi"] },
  "pleurotus-ostreatus": { primary: "seta de ostra", sourceIds: ["aranzadi"] },
  "ramaria-aurea": { primary: "coral dorado", sourceIds: ["aranzadi"] },
  "ramaria-formosa": { primary: "ramaria elegante", sourceIds: ["aranzadi"] },
  "rubroboletus-satanas": { primary: "boleto de Satanás", sourceIds: ["aranzadi"] },
  "russula-cyanoxantha": { primary: "carbonera", sourceIds: ["aranzadi"] },
  "russula-virescens": { primary: "rúsula verdosa", sourceIds: ["aranzadi"] },
  "suillus-luteus": { primary: "boleto anillado", sourceIds: ["aranzadi"] },
  "suillus-granulatus": { primary: "boleto granulado", sourceIds: ["aranzadi"] },
  "tricholoma-pardinum": { primary: "tricoloma atigrado", sourceIds: ["aranzadi"] },
  "tricholoma-portentosum": { primary: "capuchina", sourceIds: ["aranzadi"] },
  "tricholoma-terreum": { primary: "negrilla", sourceIds: ["aranzadi"] },
  "tuber-melanosporum": { primary: "trufa negra", sourceIds: ["aranzadi"] },
  "tylopilus-felleus": { primary: "boleto amargo", sourceIds: ["aranzadi"] },
} as const satisfies Partial<Record<string, SpanishSpeciesNames>>;

export function getSpanishSpeciesNames(speciesId: string): SpanishSpeciesNames | undefined {
  return spanishSpeciesNames[speciesId as keyof typeof spanishSpeciesNames];
}

export const speciesNameGlossaryRows = catalogueSpecies.map((species) => ({
  speciesId: species.speciesId,
  catalanName: species.identity.commonName,
  catalanAlternatives: species.identity.alternateNames,
  scientificName: species.identity.scientificName,
  spanish: getSpanishSpeciesNames(species.speciesId),
}));
