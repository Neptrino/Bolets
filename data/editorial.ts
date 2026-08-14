import type { SourceReference } from "@/src/lib/types";
import { SITE_URL } from "@/src/lib/seo";

export type EditorialReviewStatus = "editorial-only" | "expert-reviewed";

export interface EditorialMetadata {
  publishedAt: string;
  updatedAt: string;
  authorId: "editorial-team";
  reviewStatus: EditorialReviewStatus;
}

export const EDITORIAL_LAUNCH_DATE = "2026-08-13";

export const editorialTeam = {
  id: "editorial-team" as const,
  name: "Equip editorial de Bolets Atles",
  url: `${SITE_URL}/equip-editorial`,
};

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
  authorId: editorialTeam.id,
  reviewStatus: "editorial-only",
};

const metadataOverrides: Record<string, Partial<EditorialMetadata>> = {
  "bolets-avui": {
    updatedAt: "2026-08-14",
  },
  "quan-surten-els-bolets-despres-de-ploure": {
    updatedAt: "2026-08-14",
  },
};

export function getEditorialMetadata(contentId: string): EditorialMetadata {
  return { ...defaultMetadata, ...metadataOverrides[contentId] };
}

export function editorialArticleFields(contentId: string) {
  const editorial = getEditorialMetadata(contentId);

  return {
    author: { "@id": `${SITE_URL}/#editorial-team` },
    datePublished: editorial.publishedAt,
    dateModified: editorial.updatedAt,
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
  "zones-ceps",
  "equip-editorial",
] as const;
