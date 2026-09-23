import { catalogueSpecies } from "@/data/catalogue";
import { getSpanishSpeciesNames } from "@/data/species-common-names";
import { getEdibilityPresentation } from "@/src/lib/edibility-presentation";
import { seasonGuides, type SeasonGuideId } from "@/src/lib/season-guides";
import { toSpeciesCardProfile } from "@/src/lib/species-card-profile";
import type { CatalogueDirectoryEntry } from "@/src/lib/catalogue-filters";
import { speciesPath } from "@/src/lib/seo";
import { speciesHabitatPhrase, speciesSeasonPhrase } from "@/src/lib/species-summary";
import type { CatalogueSpecies, EdibilityStatus, SpeciesProfile } from "@/src/lib/types";

/* The list views of the catalogue: a scannable, server-rendered table for
   the "tipus de bolets", "noms de bolets" and "bolets comestibles" intents,
   the counts the intros quote, and the FAQ each list page carries. All of it
   is derived from the catalogue records and the shared species copy. */

export interface CatalogueFaq {
  question: string;
  answer: string;
}

export type CatalogueGroup = "edible" | "toxic" | "other";

export interface CatalogueListRow {
  speciesId: string;
  href: string;
  name: string;
  scientificName: string;
  /** Primary Spanish name, empty when the glossary has none. */
  spanish: string;
  edibility: EdibilityStatus;
  edibilityLabel: string;
  group: CatalogueGroup;
  season: string;
  habitat: string;
}

const EDIBLE = new Set<EdibilityStatus>(["excellent_edible", "edible", "edible_with_conditions"]);
const TOXIC = new Set<EdibilityStatus>(["toxic", "dangerously_toxic"]);
const catalanList = new Intl.ListFormat("ca-ES", { style: "long", type: "conjunction" });

function sentenceCase(value: string) {
  return `${value.charAt(0).toLocaleUpperCase("ca-ES")}${value.slice(1)}`;
}

export function catalogueGroup(status: EdibilityStatus): CatalogueGroup {
  if (EDIBLE.has(status)) return "edible";
  if (TOXIC.has(status)) return "toxic";
  return "other";
}

const SEASON_IDS = seasonGuides.map((guide) => guide.id);

/** Reference text such as "Tardor", "Estiu i tardor", "De primavera a tardor" or "final d’estiu". */
function seasonsFromText(text: string): SeasonGuideId[] {
  const lower = text.toLocaleLowerCase("ca-ES");
  const range = lower.match(/^de (\p{L}+) a (\p{L}+)/u);
  if (range) {
    const start = SEASON_IDS.indexOf(range[1] as SeasonGuideId);
    const end = SEASON_IDS.indexOf(range[2] as SeasonGuideId);
    if (start >= 0 && end >= 0) {
      const length = ((end - start + SEASON_IDS.length) % SEASON_IDS.length) + 1;
      return Array.from({ length }, (_, offset) => SEASON_IDS[(start + offset) % SEASON_IDS.length]);
    }
  }
  return SEASON_IDS.filter((season) => new RegExp(`(^|[\\s’'])${season}\\b`, "u").test(lower));
}

/** Seasons a species belongs to, matching the species lists of the season guides. */
export function speciesCatalogueSeasons(species: CatalogueSpecies): SeasonGuideId[] {
  if ("scope" in species) return seasonsFromText(species.ecology.season);
  const { seasonality } = species.ecologicalConfig;
  return seasonGuides
    .filter((guide) => guide.months.some((month) => seasonality[month] !== "inactive"))
    .map((guide) => guide.id);
}

export function toCatalogueDirectoryEntry(species: CatalogueSpecies): CatalogueDirectoryEntry {
  return {
    ...toSpeciesCardProfile(species),
    catalogueGroup: catalogueGroup(species.identity.edibility),
    catalogueSeasons: speciesCatalogueSeasons(species),
  };
}

/** "Tardor", "Primavera i tardor", "De primavera a tardor". */
export function speciesSeasonLabel(species: CatalogueSpecies) {
  return sentenceCase(speciesSeasonPhrase(species).replace(/\ba (la |l’)/gu, ""));
}

/** "Pinedes i alzinars", without the preposition the lead sentence uses. */
export function speciesHabitatLabel(species: CatalogueSpecies) {
  return sentenceCase(speciesHabitatPhrase(species, 2).replace(/^en /u, ""));
}

export function catalogueListRow(species: CatalogueSpecies): CatalogueListRow {
  const status = species.identity.edibility;
  return {
    speciesId: species.speciesId,
    href: speciesPath(species),
    name: species.identity.commonName,
    scientificName: species.identity.scientificName,
    spanish: getSpanishSpeciesNames(species.speciesId)?.primary ?? "",
    edibility: status,
    edibilityLabel: getEdibilityPresentation(status).label,
    group: catalogueGroup(status),
    season: speciesSeasonLabel(species),
    habitat: speciesHabitatLabel(species),
  };
}

export function catalogueListRows(species: readonly CatalogueSpecies[] = catalogueSpecies) {
  return species.map(catalogueListRow);
}

export function catalogueCounts(rows: readonly CatalogueListRow[] = catalogueListRows()) {
  return {
    total: rows.length,
    edible: rows.filter((row) => row.group === "edible").length,
    excellent: rows.filter((row) => row.edibility === "excellent_edible").length,
    toxic: rows.filter((row) => row.group === "toxic").length,
    other: rows.filter((row) => row.group === "other").length,
  };
}

export function catalogueFaqs(counts = catalogueCounts()): CatalogueFaq[] {
  return [
    {
      question: "Quants tipus de bolets hi ha a Catalunya?",
      answer: `Aquest catàleg documenta ${counts.total} espècies freqüents a Catalunya: ${counts.edible} comestibles (${counts.excellent} d’elles excel·lents), ${counts.toxic} tòxiques o mortals i ${counts.other} no comestibles o no recomanades. La funga catalana és molt més àmplia; la guia prioritza les espècies que la gent busca, cull o confon.`,
    },
    {
      question: "Quins són els bolets més buscats a Catalunya?",
      answer: "Rovellons i pinetells, ceps, rossinyols, camagrocs, fredolics, llenegues i trompetes de la mort concentren la majoria de sortides i de cerques. Cadascun té fitxa pròpia, i els ceps i els rovellons tenen a més una guia territorial amb tipus, diferències i zones.",
    },
    {
      question: "Com sé si un bolet és comestible?",
      answer: "Cap fotografia ni cap nom popular és suficient: compara barret, himeni, peu, base, olor, hàbitat i temporada amb la fitxa, descarta les espècies semblants tòxiques i, si dubtes, no el consumeixis. Cada fitxa marca el nivell de comestibilitat i les confusions perilloses.",
    },
    {
      question: "On trobar els noms dels bolets en castellà?",
      answer: "La llista d’aquesta pàgina i cada fitxa indiquen el nom en castellà al costat del nom català i del científic, i el glossari de noms els recull tots en una sola pàgina.",
    },
  ];
}

export type EdibleGroupId = "excellent" | "good" | "conditions";

export interface EdibleGroup {
  id: EdibleGroupId;
  title: string;
  description: string;
  species: SpeciesProfile[];
  rows: CatalogueListRow[];
}

function edibleGroupFor(species: SpeciesProfile): EdibleGroupId {
  if (species.identity.edibility === "edible_with_conditions") return "conditions";
  if (species.culinaryProfile.kind === "culinary" && species.culinaryProfile.rating >= 3) return "excellent";
  if (species.culinaryProfile.kind === "culinary" && species.culinaryProfile.rating >= 2) return "good";
  return "conditions";
}

/** The edible list split by culinary value, each group alphabetical. */
export function edibleGroups(species: readonly SpeciesProfile[]): EdibleGroup[] {
  const definitions: Array<Omit<EdibleGroup, "species" | "rows">> = [
    { id: "excellent", title: "Comestibles excel·lents", description: "Les espècies amb el valor culinari més alt del catàleg." },
    { id: "good", title: "Bons comestibles", description: "Bolets apreciats a la cuina, amb algun matís de textura, sabor o preparació." },
    { id: "conditions", title: "Comestibles amb condicions", description: "Només es consideren comestibles amb una cocció, una preparació o un estat concrets." },
  ];
  return definitions.map((definition) => {
    const members = species.filter((entry) => edibleGroupFor(entry) === definition.id);
    return { ...definition, species: members, rows: members.map(catalogueListRow) };
  }).filter((group) => group.species.length > 0);
}

function springSpecies(species: readonly SpeciesProfile[]) {
  return species.filter((entry) => (["mar", "abr", "mai"] as const).some((month) => ["good", "peak"].includes(entry.ecologicalConfig.seasonality[month])));
}

/** The edibles people search most, in search order; only those present in the list are named. */
const MOST_SEARCHED_EDIBLES = [
  "lactarius-sanguifluus",
  "lactarius-deliciosus",
  "boletus-edulis",
  "cantharellus-cibarius",
  "craterellus-lutescens",
  "tricholoma-terreum",
  "hygrophorus-latitabundus",
  "craterellus-cornucopioides",
] as const;

export function edibleFaqs(species: readonly SpeciesProfile[]): CatalogueFaq[] {
  const groups = edibleGroups(species);
  const excellent = groups.find((group) => group.id === "excellent")?.rows ?? [];
  const spring = springSpecies(species).map((entry) => entry.identity.commonName.toLocaleLowerCase("ca-ES"));
  const bilingual = MOST_SEARCHED_EDIBLES
    .map((speciesId) => species.find((entry) => entry.speciesId === speciesId))
    .filter((entry): entry is SpeciesProfile => Boolean(entry))
    .map((entry) => ({ name: entry.identity.commonName, spanish: getSpanishSpeciesNames(entry.speciesId)?.primary }))
    .filter((pair): pair is { name: string; spanish: string } => Boolean(pair.spanish))
    .map((pair) => `${pair.name.toLocaleLowerCase("ca-ES")} (${pair.spanish})`);

  return [
    {
      question: "Quins són els bolets comestibles més apreciats a Catalunya?",
      answer: `Al catàleg tenen la valoració culinària més alta ${catalanList.format(excellent.map((row) => row.name.toLocaleLowerCase("ca-ES")))}. Cada fitxa explica què els fa apreciats i amb què es poden confondre.`,
    },
    {
      question: "Quants bolets comestibles hi ha en aquesta guia?",
      answer: `${species.length} espècies: ${groups.map((group) => `${group.rows.length} ${group.title.toLocaleLowerCase("ca-ES")}`).join(", ")}. Comestible no vol dir identificat: la guia separa el valor culinari de la identificació.`,
    },
    {
      question: "Com es diuen en castellà els bolets comestibles més comuns?",
      answer: `${sentenceCase(catalanList.format(bilingual))}. La llista d’aquesta pàgina dona el nom en castellà de cada espècie i el glossari els recull tots.`,
    },
    {
      question: "Quan és la temporada dels bolets comestibles?",
      answer: `La majoria fructifiquen a la tardor, sobretot entre setembre i novembre, però hi ha comestibles de primavera${spring.length > 0 ? ` (${catalanList.format(spring)})` : ""} i alguns aguanten fins a l’hivern. La llista indica l’estació de cada espècie i el calendari mensual concreta la finestra.`,
    },
  ];
}
