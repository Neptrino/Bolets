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
export const LOCAL_GUIDES_UPDATED_AT = "2026-08-26";

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
  role: "Autor i responsable del model",
  summary:
    "Boletaire aficionat des de petit, desenvolupa i manté l’atles i el model hidrotèrmic. La seva formació és en desenvolupament de software i tractament de dades, no en micologia: els trets d’identificació provenen de bibliografia micològica i de fonts oficials, citades a cada fitxa.",
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
  "zones-rovellons": {
    updatedAt: "2026-08-28",
  },
  "zones-ceps": {
    updatedAt: "2026-08-28",
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
    updatedAt: "2026-08-27",
  },
  "equip-editorial": {
    updatedAt: "2026-08-27",
  },
  "bolets-comestibles": {
    updatedAt: "2026-08-26",
  },
  "bolets-verinosos": {
    updatedAt: "2026-08-26",
  },
  "bolets-de-primavera": {
    updatedAt: "2026-08-21",
  },
  "bolets-d-estiu": {
    updatedAt: "2026-08-21",
  },
  "bolets-de-tardor": {
    updatedAt: "2026-08-21",
  },
  "bolets-d-hivern": {
    updatedAt: "2026-08-21",
  },
  "bolets-avui": {
    updatedAt: "2026-08-14",
  },
  "quan-surten-els-bolets-despres-de-ploure": {
    updatedAt: "2026-08-14",
  },
  "parts-dun-bolet": {
    updatedAt: "2026-08-15",
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
