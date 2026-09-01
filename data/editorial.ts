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
export const LOCAL_GUIDES_UPDATED_AT = "2026-08-30";

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
  "species:lycoperdon-perlatum": { publishedAt: "2026-09-02", updatedAt: "2026-09-02" },
  "species:calvatia-gigantea": { publishedAt: "2026-09-02", updatedAt: "2026-09-02" },
  "species:russula-cyanoxantha": { publishedAt: "2026-09-02", updatedAt: "2026-09-02" },
  "species:lactarius-chrysorrheus": { publishedAt: "2026-09-02", updatedAt: "2026-09-02" },
  "species:lactarius-torminosus": { publishedAt: "2026-09-02", updatedAt: "2026-09-02" },
  "species:ramaria-formosa": { publishedAt: "2026-09-02", updatedAt: "2026-09-02" },
  "species:lactifluus-rugatus": { publishedAt: "2026-09-02", updatedAt: "2026-09-02" },
  "species:leccinellum-lepidum": { publishedAt: "2026-09-02", updatedAt: "2026-09-02" },
  "compare:rovello-vs-rovello-de-cabra": { publishedAt: "2026-09-02", updatedAt: "2026-09-02" },
  "zones-rovellons": {
    updatedAt: "2026-08-31",
  },
  "zones-ceps": {
    updatedAt: "2026-08-31",
  },
  "preguntes-frequents-bolets": {
    publishedAt: "2026-08-27",
    updatedAt: "2026-08-28",
  },
  "species:hygrophoropsis-aurantiaca": {
    publishedAt: "2026-08-27",
    updatedAt: "2026-08-27",
  },
  "normativa-bolets": {
    publishedAt: "2026-08-27",
    updatedAt: "2026-08-27",
  },
  "bolets-de-soca": {
    publishedAt: "2026-08-27",
    updatedAt: "2026-08-27",
  },
  "fals-rossinyol": {
    publishedAt: "2026-08-27",
    updatedAt: "2026-08-27",
  },
  "bolets": {
    updatedAt: "2026-08-31",
  },
  "equip-editorial": {
    updatedAt: "2026-08-27",
  },
  "bolets-comestibles": {
    updatedAt: "2026-08-31",
  },
  "bolets-verinosos": {
    updatedAt: "2026-08-26",
  },
  "bolets-de-primavera": {
    updatedAt: "2026-08-31",
  },
  "bolets-d-estiu": {
    updatedAt: "2026-08-31",
  },
  "bolets-de-tardor": {
    updatedAt: "2026-08-31",
  },
  "bolets-d-hivern": {
    updatedAt: "2026-08-31",
  },
  "temporada": {
    updatedAt: "2026-08-31",
  },
  "bolets-avui": {
    updatedAt: "2026-08-31",
  },
  "species:craterellus-lutescens": { updatedAt: "2026-08-31" },
  "species:boletus-edulis": { updatedAt: "2026-08-31" },
  "species:cantharellus-cibarius": { updatedAt: "2026-08-31" },
  "species:lactarius-sanguifluus": { updatedAt: "2026-08-31" },
  "species:macrolepiota-procera": { updatedAt: "2026-08-31" },
  "species:tricholoma-terreum": { updatedAt: "2026-08-31" },
  "species:hygrophorus-latitabundus": { updatedAt: "2026-08-31" },
  "species:hygrophorus-russula": { updatedAt: "2026-08-31" },
  "conservar-bolets": {
    publishedAt: "2026-08-31",
    updatedAt: "2026-08-31",
  },
  "quan-surten-els-bolets-despres-de-ploure": {
    updatedAt: "2026-08-14",
  },
  "parts-dun-bolet": {
    updatedAt: "2026-08-31",
  },
  "avis-legal": {
    publishedAt: "2026-08-17",
    updatedAt: "2026-08-17",
  },
};

export function getEditorialMetadata(contentId: string): EditorialMetadata {
  const sectionMetadata = contentId.startsWith("guide:")
    ? { updatedAt: LOCAL_GUIDES_UPDATED_AT }
    : {};

  return { ...defaultMetadata, ...sectionMetadata, ...metadataOverrides[contentId] };
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
  "preguntes-frequents-bolets",
  "zones-rovellons",
  "zones-ceps",
  "equip-editorial",
] as const;
