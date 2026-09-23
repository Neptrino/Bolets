/**
 * Scored species ordered by Google search demand, most searched first, for
 * lists that should lead with the names people look for. Ranked by the summed
 * keyword-database volume of each common name and its plurals in
 * docs/keyword-clusters-2026-09-17.csv (noise such as the town of Carlet
 * excluded), with Search Console impressions breaking ties. Reviewed by hand;
 * refresh deliberately with the keyword clusters. Species not listed sort
 * after these, alphabetically.
 */
export const SPECIES_SEARCH_DEMAND_UPDATED_AT = "2026-09-17";

export const speciesBySearchDemand = [
  "boletus-edulis",
  "craterellus-lutescens",
  "cantharellus-cibarius",
  "lactarius-sanguifluus",
  "tricholoma-terreum",
  "calocybe-gambosa",
  "hygrophorus-russula",
  "macrolepiota-procera",
  "amanita-caesarea",
  "hygrophorus-latitabundus",
  "tylopilus-felleus",
  "chroogomphus-rutilus",
  "amanita-phalloides",
  "coprinus-comatus",
  "amanita-muscaria",
  "hygrophorus-eburneus",
  "hydnum-repandum",
  "lactarius-deliciosus",
  "lepista-nuda",
  "gyromitra-esculenta",
  "pleurotus-ostreatus",
  "tricholoma-portentosum",
  "pleurotus-eryngii",
  "morchella-esculenta",
  "craterellus-cornucopioides",
  "cyclocybe-cylindracea",
  "suillus-luteus",
  "boletus-aereus",
  "suillus-granulatus",
  "craterellus-tubaeformis",
  "rubroboletus-satanas",
  "marasmius-oreades",
  "russula-virescens",
  "cortinarius-orellanus",
  "amanita-virosa",
  "hygrophorus-marzuolus",
  "entoloma-sinuatum",
  "amanita-pantherina",
  "agaricus-campestris",
  "amanita-verna",
  "boletus-pinophilus",
  "tricholoma-pardinum",
] as const;

const searchRank = new Map<string, number>(speciesBySearchDemand.map((id, index) => [id, index]));

/** Most searched first; unlisted species after, by their display name. */
export function compareBySearchDemand(
  left: { speciesId: string; name: string },
  right: { speciesId: string; name: string },
) {
  const leftRank = searchRank.get(left.speciesId) ?? Number.POSITIVE_INFINITY;
  const rightRank = searchRank.get(right.speciesId) ?? Number.POSITIVE_INFINITY;
  if (leftRank !== rightRank) return leftRank < rightRank ? -1 : 1;
  return left.name.localeCompare(right.name, "ca");
}
