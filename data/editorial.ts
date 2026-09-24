import type { SourceReference } from "@/src/lib/types";
import { SITE_URL } from "@/src/lib/seo";

export type EditorialReviewStatus = "editorial-only" | "expert-reviewed";

export type EditorialAuthorId = "editorial-team" | "aleix-ventayol";

export interface EditorialMetadata {
  publishedAt: string;
  updatedAt: string;
  authorId: EditorialAuthorId;
  reviewStatus: EditorialReviewStatus;
}

export const EDITORIAL_LAUNCH_DATE = "2026-08-13";

// Section-wide revision dates: bump one of these when the shared template of
// a page family changes visibly (`tests/editorial-freshness.test.ts` names
// the constant to bump). Per-item overrides below date content changes to a
// single page; the later of the two wins.
export const LOCAL_GUIDES_UPDATED_AT = "2026-09-23";
export const SPECIES_PAGES_UPDATED_AT = "2026-09-24";
export const ZONE_PAGES_UPDATED_AT = "2026-09-23";
export const PLACE_PAGES_UPDATED_AT = "2026-09-15";
export const COMPARISON_PAGES_UPDATED_AT = "2026-09-23";
export const MAP_PAGES_UPDATED_AT = "2026-08-31";

const sectionUpdatedAt: Record<string, string> = {
  "guide:": LOCAL_GUIDES_UPDATED_AT,
  "species:": SPECIES_PAGES_UPDATED_AT,
  "zone:": ZONE_PAGES_UPDATED_AT,
  "place:": PLACE_PAGES_UPDATED_AT,
  "compare:": COMPARISON_PAGES_UPDATED_AT,
  "map:": MAP_PAGES_UPDATED_AT,
};

export const editorialTeam = {
  id: "editorial-team" as const,
  name: "Equip editorial de Bolets Atles",
  url: `${SITE_URL}/equip-editorial`,
};

// A named person carries the authorship signal that an anonymous collective
// cannot. The description states what the author does and does not bring:
// claiming mycological credentials that do not exist would be worse than
// staying anonymous.
export const siteAuthor = {
  id: "aleix-ventayol" as const,
  entityId: `${SITE_URL}/#author-aleix-ventayol`,
  name: "Aleix Ventayol",
  url: `${SITE_URL}/equip-editorial#autoria`,
  role: "Autor i responsable de l’atles",
  summary:
    "Boletaire aficionat des de petit, desenvolupa i manté l’atles que compara el bosc, el sòl, la pluja i la temperatura. La seva formació és en desenvolupament de programari i tractament de dades, no en micologia: els trets d’identificació provenen de bibliografia micològica i de fonts oficials, citades a cada fitxa.",
};

export const editorialAuthors = {
  [siteAuthor.id]: siteAuthor,
  [editorialTeam.id]: editorialTeam,
} as const;

function authorEntityId(authorId: EditorialAuthorId) {
  return authorId === siteAuthor.id ? siteAuthor.entityId : `${SITE_URL}/#editorial-team`;
}

export const officialSafetySource: SourceReference = {
  id: "acsa-bolets",
  title: "Bolets: consells de seguretat alimentària",
  publisher: "Agència Catalana de Seguretat Alimentària",
  url: "https://acsa.gencat.cat/ca/detall/article/Bolets",
  confidence: "high",
};

export const mushroomPreservationSources: SourceReference[] = [
  {
    id: "acsa-menja-bolets",
    title: "Menja bolets amb seguretat",
    publisher: "Agència Catalana de Seguretat Alimentària",
    url: "https://acsa.gencat.cat/ca/seguretat_alimentaria/consells_sobre_seguretat_alimentaria/menja-amb-seguretat-.../menja-bolets-amb-seguretat/",
    confidence: "high",
  },
  {
    id: "acsa-nevera",
    title: "Conservació dels aliments a la nevera",
    publisher: "Agència Catalana de Seguretat Alimentària",
    url: "https://acsa.gencat.cat/ca/seguretat_alimentaria/consells_sobre_seguretat_alimentaria/consells-generals/consells-per-emmagatzemar-correctament-els-aliments-a-la-nevera/",
    confidence: "high",
  },
  {
    id: "acsa-conservar-bolets",
    title: "Conservar bolets",
    publisher: "Agència Catalana de Seguretat Alimentària",
    url: "https://acsa.gencat.cat/web/.content/_Publicacions/Receptes/malbaratament/receptes-malbaratament-pdf/Conservar-bolets.pdf",
    confidence: "high",
  },
  {
    id: "acsa-congelacio",
    title: "Congela amb seguretat",
    publisher: "Agència Catalana de Seguretat Alimentària",
    url: "https://acsa.gencat.cat/ca/detall/article/Congelacio",
    confidence: "high",
  },
  {
    id: "acsa-descongelacio",
    title: "Descongeles els aliments de manera segura?",
    publisher: "Agència Catalana de Seguretat Alimentària",
    url: "https://acsa.gencat.cat/ca/detall/article/descongelacio-00002",
    confidence: "high",
  },
  {
    id: "canal-aliments-bolets",
    title: "Bolets",
    publisher: "Canal Aliments, Generalitat de Catalunya",
    url: "https://canalaliments.gencat.cat/ca/coneix-aliments/bolets-tofona/bolets/index.html",
    confidence: "high",
  },
  {
    id: "psu-preserving-mushrooms",
    title: "Preparing and Preserving Mushrooms",
    publisher: "Penn State Extension",
    url: "https://extension.psu.edu/preparing-and-preserving-mushrooms",
    confidence: "moderate",
  },
  {
    id: "madrid-conservas-botulismo",
    title: "Conservas caseras: evitar el botulismo",
    publisher: "Comunidad de Madrid",
    url: "https://www.comunidad.madrid/servicios/salud/conservas-caseras-evitar-botulismo",
    confidence: "high",
  },
];

export const coreEditorialSources: SourceReference[] = [
  officialSafetySource,
  {
    id: "fungacat",
    title: "FungaCAT: catàleg de la diversitat fúngica de Catalunya",
    publisher: "Banc de Dades de Biodiversitat de Catalunya",
    url: "https://biodiver.bio.ub.es/biocat/homepage.html",
    confidence: "high",
  },
  {
    id: "icgc",
    title: "Cartografia i geoinformació de Catalunya",
    publisher: "Institut Cartogràfic i Geològic de Catalunya",
    url: "https://www.icgc.cat/ca/Geoinformacio-i-mapes",
    confidence: "high",
  },
];

export const environmentalSources: SourceReference[] = [
  {
    id: "open-meteo",
    title: "Weather Forecast API",
    publisher: "Open-Meteo",
    url: "https://open-meteo.com/en/docs",
    confidence: "high",
  },
  {
    id: "meteo-france-arome",
    title: "AROME France (via Open-Meteo)",
    publisher: "Météo-France",
    url: "https://open-meteo.com/en/docs/meteofrance-api",
    confidence: "high",
  },
  {
    // Station rain feeds production scores; the XEMA CC BY 4.0 licence
    // requires attributing Meteocat in derived publications.
    id: "meteocat-xema",
    title: "Dades meteorològiques de la XEMA",
    publisher: "Servei Meteorològic de Catalunya (Meteocat)",
    url: "https://analisi.transparenciacatalunya.cat/Medi-Ambient/Dades-meteorol-giques-de-la-XEMA/nzvn-apee",
    confidence: "high",
  },
  {
    id: "soilgrids",
    title: "SoilGrids: global gridded soil information",
    publisher: "ISRIC — World Soil Information",
    url: "https://www.isric.org/explore/soilgrids",
    confidence: "high",
  },
  coreEditorialSources[2],
].filter((source): source is SourceReference => Boolean(source));

export const hydrothermalScientificSources: SourceReference[] = [
  {
    id: "agreda-2016-climate-sporocarps",
    title: "Long-term monitoring reveals interspecific climatic responses",
    publisher: "Agricultural and Forest Meteorology",
    url: "https://doi.org/10.1016/j.agrformet.2016.03.015",
    confidence: "high",
  },
  {
    id: "karavani-2018-soil-moisture",
    title: "Climate, soil moisture and Mediterranean mushroom productivity",
    publisher: "Agricultural and Forest Meteorology",
    url: "https://doi.org/10.1016/j.agrformet.2017.10.024",
    confidence: "high",
  },
  {
    id: "brejon-hoffman-2026-porcini",
    title: "Meteorological triggers of Boletus edulis fruiting (preprint)",
    publisher: "bioRxiv",
    url: "https://doi.org/10.64898/2025.12.12.693895",
    confidence: "limited",
  },
];

const defaultMetadata: EditorialMetadata = {
  publishedAt: EDITORIAL_LAUNCH_DATE,
  updatedAt: EDITORIAL_LAUNCH_DATE,
  authorId: siteAuthor.id,
  reviewStatus: "editorial-only",
};

const metadataOverrides: Record<string, Partial<EditorialMetadata>> = {
  // Map explanation updated in af85f59; keep the sitemap and page metadata aligned.
  map: { updatedAt: "2026-09-14" },
  "species:lycoperdon-perlatum": { publishedAt: "2026-09-02", updatedAt: "2026-09-19" },
  "species:calvatia-gigantea": { publishedAt: "2026-09-02", updatedAt: "2026-09-19" },
  "species:lycoperdon-utriforme": { publishedAt: "2026-09-02", updatedAt: "2026-09-20" },
  "species:russula-cyanoxantha": { publishedAt: "2026-09-02", updatedAt: "2026-09-19" },
  "species:lactarius-chrysorrheus": { publishedAt: "2026-09-02", updatedAt: "2026-09-19" },
  "species:lactarius-torminosus": { publishedAt: "2026-09-02", updatedAt: "2026-09-19" },
  "species:ramaria-formosa": { publishedAt: "2026-09-02", updatedAt: "2026-09-19" },
  "species:lactifluus-rugatus": { publishedAt: "2026-09-02", updatedAt: "2026-09-19" },
  "species:leccinellum-lepidum": { publishedAt: "2026-09-02", updatedAt: "2026-09-19" },
  "compare:rovello-vs-rovello-de-cabra": { publishedAt: "2026-09-02", updatedAt: "2026-09-23" },
  "compare:apagallums-vs-palometa-metzinosa": { publishedAt: "2026-09-23", updatedAt: "2026-09-23" },
  "compare:moixero-vs-inocibe-patouillard": { updatedAt: "2026-09-23" },
  "zones-rovellons": {
    updatedAt: "2026-09-23",
  },
  "zones-ceps": {
    updatedAt: "2026-09-23",
  },
  "zones-pirineu": {
    publishedAt: "2026-09-17",
    updatedAt: "2026-09-23",
  },
  "preguntes-frequents-bolets": {
    publishedAt: "2026-08-27",
    updatedAt: "2026-09-23",
  },
  "species:hygrophoropsis-aurantiaca": {
    publishedAt: "2026-08-27",
    updatedAt: "2026-09-19",
  },
  "normativa-bolets": {
    publishedAt: "2026-08-27",
    updatedAt: "2026-09-23",
  },
  "bolets-de-soca": {
    publishedAt: "2026-08-27",
    updatedAt: "2026-09-23",
  },
  "bolets-i-confusions": {
    publishedAt: "2026-09-23",
    updatedAt: "2026-09-23",
  },
  "fals-rossinyol": {
    publishedAt: "2026-08-27",
    updatedAt: "2026-09-23",
  },
  "bolets": {
    updatedAt: "2026-09-24",
  },
  "noms-de-bolets-catala-castella": {
    publishedAt: "2026-09-03",
    updatedAt: "2026-09-23",
  },
  "equip-editorial": {
    updatedAt: "2026-08-31",
  },
  "bolets-comestibles": {
    updatedAt: "2026-09-24",
  },
  "bolets-verinosos": {
    updatedAt: "2026-09-24",
  },
  "mapa-pluja": {
    publishedAt: "2026-09-17",
    updatedAt: "2026-09-23",
  },
  "bolets-de-primavera": {
    updatedAt: "2026-09-23",
  },
  "bolets-d-estiu": {
    updatedAt: "2026-09-23",
  },
  "bolets-de-tardor": {
    updatedAt: "2026-09-23",
  },
  "bolets-d-hivern": {
    updatedAt: "2026-09-23",
  },
  "temporada": {
    updatedAt: "2026-09-24",
  },
  "bolets-avui": {
    updatedAt: "2026-09-24",
  },
  "species:chroogomphus-rutilus": { updatedAt: "2026-09-19" },
  "species:craterellus-tubaeformis": { updatedAt: "2026-09-19" },
  "species:tuber-melanosporum": { updatedAt: "2026-09-19" },
  "species:omphalotus-olearius": { updatedAt: "2026-09-19" },
  "species:gyromitra-esculenta": { updatedAt: "2026-09-19" },
  "species:clitocybe-rivulosa": { updatedAt: "2026-09-19" },
  "species:entoloma-sinuatum": { updatedAt: "2026-09-19" },
  "species:amanita-verna": { updatedAt: "2026-09-19" },
  "species:cortinarius-orellanus": { updatedAt: "2026-09-19" },
  "species:cortinarius-rubellus": { updatedAt: "2026-09-19" },
  "species:amanita-phalloides": { updatedAt: "2026-09-19" },
  "species:amanita-virosa": { updatedAt: "2026-09-19" },
  "species:tricholoma-pardinum": { updatedAt: "2026-09-19" },
  "species:galerina-marginata": { updatedAt: "2026-09-19" },
  "species:inocybe-erubescens": { updatedAt: "2026-09-19" },
  "species:rubroboletus-satanas": { updatedAt: "2026-09-19" },
  "species:tylopilus-felleus": { updatedAt: "2026-09-20" },
  "species:lepiota-brunneoincarnata": { updatedAt: "2026-09-19" },
  "species:paxillus-involutus": { updatedAt: "2026-09-19" },
  "species:ramaria-aurea": { updatedAt: "2026-09-19" },
  "species:amanita-pantherina": { updatedAt: "2026-09-19" },
  "species:amanita-muscaria": { updatedAt: "2026-09-19" },
  "species:craterellus-lutescens": { updatedAt: "2026-09-24" },
  "species:boletus-edulis": { updatedAt: "2026-09-19" },
  "species:boletus-pinophilus": { updatedAt: "2026-09-19" },
  "species:boletus-aereus": { updatedAt: "2026-09-19" },
  "species:boletus-reticulatus": { updatedAt: "2026-09-19" },
  "species:suillus-luteus": { updatedAt: "2026-09-19" },
  "species:hygrophorus-marzuolus": { updatedAt: "2026-09-19" },
  "species:tricholoma-portentosum": { updatedAt: "2026-09-20" },
  "species:russula-virescens": { updatedAt: "2026-09-19" },
  "species:cyclocybe-cylindracea": { updatedAt: "2026-09-19" },
  "species:coprinus-comatus": { updatedAt: "2026-09-19" },
  "species:suillus-granulatus": { updatedAt: "2026-09-19" },
  "species:pleurotus-eryngii": { updatedAt: "2026-09-19" },
  "species:agaricus-campestris": { updatedAt: "2026-09-19" },
  "species:pleurotus-ostreatus": { updatedAt: "2026-09-19" },
  "species:hygrophorus-eburneus": { updatedAt: "2026-09-19" },
  "species:cantharellus-cibarius": { updatedAt: "2026-09-19" },
  "species:lactarius-deliciosus": { updatedAt: "2026-09-19" },
  "species:lactarius-sanguifluus": { updatedAt: "2026-09-19" },
  "species:macrolepiota-procera": { updatedAt: "2026-09-20" },
  "species:tricholoma-terreum": { updatedAt: "2026-09-24" },
  "species:hygrophorus-latitabundus": { updatedAt: "2026-09-24" },
  "species:hygrophorus-russula": { updatedAt: "2026-09-19" },
  "species:amanita-caesarea": { updatedAt: "2026-09-19" },
  "species:craterellus-cornucopioides": { updatedAt: "2026-09-19" },
  "species:hydnum-repandum": { updatedAt: "2026-09-19" },
  "species:marasmius-oreades": { updatedAt: "2026-09-19" },
  "species:calocybe-gambosa": { updatedAt: "2026-09-19" },
  "species:morchella-esculenta": { updatedAt: "2026-09-19" },
  "species:lepista-nuda": { updatedAt: "2026-09-19" },
  "conservar-bolets": {
    publishedAt: "2026-08-31",
    updatedAt: "2026-09-23",
  },
  "quan-surten-els-bolets-despres-de-ploure": {
    updatedAt: "2026-09-23",
  },
  "parts-dun-bolet": {
    updatedAt: "2026-09-24",
  },
  "avis-legal": {
    publishedAt: "2026-08-17",
    updatedAt: "2026-09-16",
  },
  home: { updatedAt: "2026-09-23" },
  "bolets-infografia": { updatedAt: "2026-09-24" },
  troballes: { updatedAt: "2026-09-19" },
  compare: { updatedAt: "2026-09-23" },
  joc: { updatedAt: "2026-09-23" },
  metode: { updatedAt: "2026-09-14" },
  "col-labora": { updatedAt: "2026-09-02" },
  guies: { updatedAt: "2026-09-23" },
};

export function getEditorialMetadata(contentId: string): EditorialMetadata {
  const override = metadataOverrides[contentId] ?? {};
  const section = Object.entries(sectionUpdatedAt).find(([prefix]) => contentId.startsWith(prefix))?.[1];
  const updatedAt = [defaultMetadata.updatedAt, section, override.updatedAt]
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1)!;

  return { ...defaultMetadata, ...override, updatedAt };
}

export function editorialArticleFields(contentId: string) {
  const editorial = getEditorialMetadata(contentId);

  return {
    author: { "@id": authorEntityId(editorial.authorId) },
    datePublished: editorial.publishedAt,
    dateModified: editorial.updatedAt,
    // reviewedBy is emitted only once a real reviewer exists: an unreviewed
    // page must not carry a review claim.
    ...(editorial.reviewStatus === "expert-reviewed"
      ? { reviewedBy: { "@id": `${SITE_URL}/#editorial-team` } }
      : {}),
  };
}

export const publicEditorialItems = [
  "bolets",
  "noms-de-bolets-catala-castella",
  "bolets-comestibles",
  "bolets-verinosos",
  "temporada",
  "bolets-avui",
  "conservar-bolets",
  "bolets-de-primavera",
  "bolets-d-estiu",
  "bolets-de-tardor",
  "bolets-d-hivern",
  "quan-surten-els-bolets-despres-de-ploure",
  "parts-dun-bolet",
  "normativa-bolets",
  "bolets-de-soca",
  "fals-rossinyol",
  "bolets-i-confusions",
  "preguntes-frequents-bolets",
  "zones-rovellons",
  "zones-ceps",
  "zones-pirineu",
  "equip-editorial",
] as const;
