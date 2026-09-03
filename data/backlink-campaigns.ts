import { catalogueSpecies } from "@/data/catalogue";
import { comparisonPages } from "@/data/comparison-pages";
import {
  areaProfiles,
  locationPagePath,
  placePath,
  placeProfiles,
  speciesLocationPages,
} from "@/data/location-pages";
import { backlinkDemandQueries } from "@/data/backlink-search-demand";
import { speciesSlugForId } from "@/data/species-slugs";
import { SEASON_MONTHS, seasonMonthPath } from "@/src/lib/seasonality";
import { speciesMapPages } from "@/src/lib/species-map-pages";
import { speciesTerritoryGuides } from "@/src/lib/species-territory-guides";

export type BacklinkCampaign = {
  id: string;
  shortLabel: string;
  queries: readonly string[];
  targetPath: string;
  targetTitle: string;
  resourceSummary: string;
  topicTerms: readonly string[];
};

type CampaignSeed = Omit<BacklinkCampaign, "queries"> & {
  fallbackQueries: readonly string[];
  demandPaths?: readonly string[];
};

export const BACKLINK_QUERY_VARIANTS_PER_CAMPAIGN = 10;

function distinctQueries(queries: readonly string[]) {
  const seen = new Set<string>();
  return queries.flatMap((query) => {
    const trimmed = query.trim();
    const key = trimmed.toLocaleLowerCase("ca");
    if (!trimmed || seen.has(key)) return [];
    seen.add(key);
    return [trimmed];
  });
}

function campaign(seed: CampaignSeed): BacklinkCampaign {
  const observedQueries = backlinkDemandQueries(seed.targetPath, ...(seed.demandPaths ?? []));
  // Preserve real Search Console / SE Ranking demand first, then retain the
  // curated intent variants so later catalogue rounds do not repeat only the
  // same observed wording.
  const queries = distinctQueries([...observedQueries, ...seed.fallbackQueries])
    .slice(0, BACKLINK_QUERY_VARIANTS_PER_CAMPAIGN);
  if (!queries.length) throw new Error(`Backlink campaign ${seed.id} has no search query`);
  return {
    id: seed.id,
    shortLabel: seed.shortLabel,
    queries,
    targetPath: seed.targetPath,
    targetTitle: seed.targetTitle,
    resourceSummary: seed.resourceSummary,
    topicTerms: seed.topicTerms,
  };
}

const FIXED_CAMPAIGNS = [
  campaign({
    id: "home", shortLabel: "Inici", targetPath: "/", targetTitle: "Bolets Atles",
    fallbackQueries: ["bolets Catalunya mapa guia espècies"],
    resourceSummary: "un atles de bolets de Catalunya amb mapa, temporada i fitxes d’espècies",
    topicTerms: ["bolets", "catalunya", "mapa", "temporada", "espècies"],
  }),
  campaign({
    id: "current-map", shortLabel: "Mapa", targetPath: "/map", targetTitle: "Mapa de bolets de Catalunya",
    fallbackQueries: ["bolets Catalunya mapa condicions guia", "on trobar bolets Catalunya mapa"],
    resourceSummary: "un mapa actualitzat de les condicions per espècie, amb metodologia i límits explícits",
    topicTerms: ["bolets", "micologia", "bosc", "temporada", "catalunya"],
  }),
  campaign({
    id: "current-overview", shortLabel: "Avui", targetPath: "/bolets-avui", targetTitle: "Bolets avui a Catalunya",
    fallbackQueries: ["bolets avui Catalunya condicions temporada"],
    resourceSummary: "una lectura actual de les condicions per territori i espècie",
    topicTerms: ["bolets", "avui", "condicions", "temporada", "catalunya"],
  }),
  campaign({
    id: "season-calendar", shortLabel: "Temporada", targetPath: "/temporada", targetTitle: "Calendari de la temporada de bolets",
    fallbackQueries: ["temporada bolets Catalunya calendari tardor guia"],
    resourceSummary: "un calendari per mesos i espècies basat en la mateixa ecologia que utilitza el mapa",
    topicTerms: ["temporada", "calendari", "tardor", "bolets", "mesos"],
  }),
  campaign({
    id: "identification-guides", shortLabel: "Identificació", targetPath: "/guies", targetTitle: "Guies d’identificació de bolets",
    fallbackQueries: ["identificar bolets Catalunya guia espècies"],
    resourceSummary: "guies d’identificació amb fonts, confusions i avisos de seguretat clars",
    topicTerms: ["identificació", "identificar", "espècies", "micologia", "bolets"],
  }),
  campaign({
    id: "species-catalogue", shortLabel: "Catàleg", targetPath: "/bolets", targetTitle: "Tipus de bolets de Catalunya",
    fallbackQueries: ["tipus espècies bolets Catalunya guia"],
    resourceSummary: "un catàleg de bolets amb fitxes, fotografies, hàbitat i confusions",
    topicTerms: ["tipus", "espècies", "bolets", "identificació", "catalunya"],
  }),
  campaign({
    id: "mushroom-names", shortLabel: "Noms", targetPath: "/noms-de-bolets-catala-castella", targetTitle: "Noms de bolets en català i castellà",
    fallbackQueries: ["noms bolets català castellà equivalències"],
    resourceSummary: "una taula d’equivalències de noms populars i científics",
    topicTerms: ["noms", "bolets", "català", "castellà", "científics"],
  }),
  campaign({
    id: "mushroom-infographic", shortLabel: "Infografia", targetPath: "/bolets/infografia", targetTitle: "Infografia dels bolets de Catalunya",
    fallbackQueries: ["infografia bolets Catalunya identificació"],
    resourceSummary: "una infografia visual i compartible sobre espècies de Catalunya",
    topicTerms: ["infografia", "bolets", "espècies", "identificació", "catalunya"],
  }),
  ...[
    ["spring", "Primavera", "/bolets-de-primavera", "Bolets de primavera a Catalunya", "bolets primavera Catalunya espècies temporada", "primavera"],
    ["summer", "Estiu", "/bolets-d-estiu", "Bolets d’estiu a Catalunya", "bolets estiu Catalunya espècies temporada", "estiu"],
    ["autumn", "Tardor", "/bolets-de-tardor", "Bolets de tardor a Catalunya", "bolets tardor Catalunya espècies temporada", "tardor"],
    ["winter", "Hivern", "/bolets-d-hivern", "Bolets d’hivern a Catalunya", "bolets hivern Catalunya espècies temporada", "hivern"],
  ].map(([id, label, path, title, query, season]) => campaign({
    id: `season-${id}`, shortLabel: label, targetPath: path, targetTitle: title,
    fallbackQueries: [query], resourceSummary: `una guia d’espècies i condicions pròpies de ${season}`,
    topicTerms: ["bolets", season, "espècies", "temporada", "catalunya"],
  })),
  campaign({
    id: "rain-explainer", shortLabel: "Després de ploure", targetPath: "/quan-surten-els-bolets-despres-de-ploure",
    targetTitle: "Quan surten els bolets després de ploure",
    fallbackQueries: ["quan surten bolets després ploure Catalunya"],
    resourceSummary: "una explicació del paper combinat de la pluja, el sòl i la temperatura",
    topicTerms: ["pluja", "ploure", "humitat", "temperatura", "bolets"],
  }),
  campaign({
    id: "preservation", shortLabel: "Conservació", targetPath: "/conservar-bolets", targetTitle: "Com conservar bolets amb seguretat",
    fallbackQueries: ["com conservar bolets assecar congelar seguretat"],
    resourceSummary: "una guia de conservació, assecat, congelació i seguretat alimentària",
    topicTerms: ["conservar", "bolets", "assecar", "congelar", "seguretat"],
  }),
  campaign({
    id: "mushroom-parts", shortLabel: "Parts del bolet", targetPath: "/parts-dun-bolet", targetTitle: "Parts d’un bolet",
    fallbackQueries: ["parts d'un bolet barret peu làmines identificació"],
    resourceSummary: "una guia visual de les parts i els trets emprats en la identificació",
    topicTerms: ["parts", "bolet", "barret", "làmines", "identificació"],
  }),
  campaign({
    id: "wood-mushrooms", shortLabel: "Bolets de soca", targetPath: "/bolets-de-soca", targetTitle: "Bolets de soca i de fusta",
    fallbackQueries: ["bolets de soca fusta Catalunya identificació"],
    resourceSummary: "una guia per entendre els bolets que fructifiquen sobre fusta",
    topicTerms: ["bolets", "soca", "fusta", "identificació", "bosc"],
  }),
  campaign({
    id: "false-chanterelle", shortLabel: "Fals rossinyol", targetPath: "/fals-rossinyol", targetTitle: "Fals rossinyol: diferències i identificació",
    fallbackQueries: ["fals rossinyol diferències rossinyol identificació"],
    resourceSummary: "una comparació pràctica del fals rossinyol amb espècies semblants",
    topicTerms: ["fals rossinyol", "rossinyol", "diferències", "identificació", "bolets"],
  }),
  campaign({
    id: "foraging-rules", shortLabel: "Normativa", targetPath: "/normativa-bolets", targetTitle: "Normativa per collir bolets a Catalunya",
    fallbackQueries: ["normativa collir bolets Catalunya parcs naturals"],
    resourceSummary: "una síntesi pràctica de normativa i bones pràctiques amb enllaços a les fonts oficials",
    topicTerms: ["normativa", "collir", "recol·lecció", "parc", "bolets"],
  }),
  campaign({
    id: "frequently-asked-questions", shortLabel: "Preguntes", targetPath: "/preguntes-frequents-bolets", targetTitle: "Preguntes freqüents sobre bolets",
    fallbackQueries: ["preguntes freqüents bolets Catalunya temporada collir"],
    resourceSummary: "respostes documentades sobre temporada, identificació i recol·lecció",
    topicTerms: ["preguntes", "bolets", "temporada", "identificació", "collir"],
  }),
  campaign({
    id: "edible-mushrooms", shortLabel: "Comestibles", targetPath: "/bolets-comestibles", targetTitle: "Bolets comestibles de Catalunya",
    fallbackQueries: ["bolets comestibles Catalunya guia espècies"],
    resourceSummary: "una guia prudent de bolets comestibles amb identificació i confusions",
    topicTerms: ["bolets", "comestibles", "espècies", "identificació", "catalunya"],
  }),
  campaign({
    id: "poisonous-mushrooms", shortLabel: "Verinosos", targetPath: "/bolets-verinosos", targetTitle: "Bolets verinosos de Catalunya",
    fallbackQueries: ["bolets verinosos tòxics Catalunya identificació"],
    resourceSummary: "una guia de bolets tòxics amb riscos, símptomes i confusions importants",
    topicTerms: ["bolets", "verinosos", "tòxics", "identificació", "catalunya"],
  }),
  campaign({
    id: "community-findings", shortLabel: "Troballes", targetPath: "/troballes", targetTitle: "Troballes de bolets a Catalunya",
    fallbackQueries: ["observacions troballes bolets Catalunya mapa comunitat"],
    resourceSummary: "un registre comunitari generalitzat que protegeix les localitzacions sensibles",
    topicTerms: ["troballes", "bolets", "observacions", "mapa", "catalunya"],
  }),
  campaign({
    id: "comparison-index", shortLabel: "Comparador", targetPath: "/compare", targetTitle: "Comparador de bolets semblants",
    fallbackQueries: ["comparar bolets semblants diferències identificació"],
    resourceSummary: "comparacions de trets visibles, hàbitat i riscos entre espècies semblants",
    topicTerms: ["comparar", "bolets", "diferències", "identificació", "espècies"],
  }),
  campaign({
    id: "identification-game", shortLabel: "Joc", targetPath: "/joc", targetTitle: "Joc d’identificació de bolets",
    fallbackQueries: ["joc identificar bolets català espècies"],
    resourceSummary: "un joc educatiu per practicar la identificació d’espècies",
    topicTerms: ["joc", "identificar", "bolets", "espècies", "català"],
  }),
  campaign({
    id: "method", shortLabel: "Mètode", targetPath: "/metode", targetTitle: "Mètode del mapa de bolets",
    fallbackQueries: ["model condicions bolets pluja temperatura sòl mapa"],
    resourceSummary: "la metodologia, les dades i els límits del mapa de condicions",
    topicTerms: ["model", "bolets", "pluja", "temperatura", "sòl"],
  }),
  campaign({
    id: "territory-index", shortLabel: "Zones", targetPath: "/zones", targetTitle: "Zones de bolets de Catalunya",
    fallbackQueries: ["zones de bolets Catalunya boscos guia"],
    resourceSummary: "guies territorials basades en hàbitat potencial sense revelar localitzacions sensibles",
    topicTerms: ["zones", "bolets", "boscos", "territori", "catalunya"],
  }),
];

const MONTH_CAMPAIGNS = SEASON_MONTHS.map((month) => campaign({
  id: `month:${month.key}`, shortLabel: `Calendari · ${month.shortLabel}`,
  targetPath: seasonMonthPath(month.key), targetTitle: `Bolets del mes de ${month.label} a Catalunya`,
  fallbackQueries: [`bolets ${month.label} Catalunya calendari temporada`],
  resourceSummary: `el calendari d’espècies i condicions habituals del mes de ${month.label}`,
  topicTerms: ["bolets", month.label, "calendari", "temporada", "catalunya"],
}));

const MAP_CAMPAIGNS = speciesMapPages.map((page) => campaign({
  id: `map:${page.speciesId}`, shortLabel: `Mapa · ${page.quickLabel}`,
  targetPath: `/map/${page.slug}`, targetTitle: page.heading,
  fallbackQueries: [`mapa ${page.quickLabel} Catalunya condicions`],
  resourceSummary: `un mapa de condicions i hàbitat potencial ${page.dativeName}`,
  topicTerms: [page.quickLabel, "mapa", "condicions", "hàbitat", "catalunya"],
}));

const COMPARISON_CAMPAIGNS = comparisonPages.map((page) => campaign({
  id: `comparison:${page.slug}`, shortLabel: page.shortTitle,
  targetPath: `/compare/${page.slug}`, targetTitle: page.title,
  fallbackQueries: page.searchTerms?.length ? page.searchTerms : [`${page.shortTitle} diferències identificació`],
  resourceSummary: `una comparació de camp sobre ${page.shortTitle.toLocaleLowerCase("ca")}`,
  topicTerms: [page.shortTitle, "diferències", "identificació", "bolets"],
}));

const TERRITORY_GUIDE_CAMPAIGNS = speciesTerritoryGuides.map((guide) => campaign({
  id: `territory-guide:${guide.contentId}`, shortLabel: guide.profileLinkTitle,
  targetPath: guide.path, targetTitle: guide.title,
  fallbackQueries: [`${guide.profileLinkTitle} Catalunya hàbitat temporada`],
  resourceSummary: guide.description,
  topicTerms: [guide.profileLinkTitle, "hàbitat", "temporada", "zones", "catalunya"],
}));

const AREA_CAMPAIGNS = areaProfiles.map((area) => campaign({
  id: `area:${area.slug}`, shortLabel: `Zona · ${area.name}`,
  targetPath: `/zones/${area.slug}`, targetTitle: `Bolets ${area.prepositionalName}`,
  fallbackQueries: [`bolets ${area.name} zones boscos temporada`],
  resourceSummary: `una guia territorial de boscos, hàbitat potencial i temporada ${area.prepositionalName}`,
  topicTerms: [area.name, "bolets", "boscos", "temporada", "hàbitat"],
}));

const PLACE_CAMPAIGNS = placeProfiles.map((place) => campaign({
  id: `place:${place.areaSlug}:${place.slug}`, shortLabel: `Lloc · ${place.name}`,
  targetPath: placePath(place), targetTitle: `Bolets ${place.prepositionalName}`,
  fallbackQueries: [`bolets ${place.name} boscos guia`],
  resourceSummary: `una guia de l’entorn forestal i l’hàbitat potencial ${place.prepositionalName}`,
  topicTerms: [place.name, "bolets", "boscos", "hàbitat", "temporada"],
}));

const LOCATION_CAMPAIGNS = speciesLocationPages.map((page) => {
  const place = placeProfiles.find((candidate) => candidate.areaSlug === page.areaSlug && candidate.slug === page.placeSlug);
  const placeName = place?.name ?? page.placeSlug.replaceAll("-", " ");
  return campaign({
    id: `location:${page.areaSlug}:${page.placeSlug}:${page.speciesSlug}`, shortLabel: page.titlePhrase,
    targetPath: locationPagePath(page), targetTitle: page.titlePhrase,
    fallbackQueries: [`${page.searchName} ${placeName} bolets`],
    resourceSummary: `una guia local d’hàbitat potencial i temporada per a ${page.searchName} a l’entorn de ${placeName}`,
    topicTerms: [page.searchName, placeName, "bolets", "hàbitat", "temporada"],
  });
});

const SPECIES_CAMPAIGNS = catalogueSpecies.map((species) => {
  const { commonName, scientificName } = species.identity;
  return campaign({
    id: `species:${species.speciesId}`, shortLabel: `Espècie · ${commonName}`,
    targetPath: `/bolets/${speciesSlugForId(species.speciesId)}`,
    demandPaths: [`/bolets/${species.speciesId}`],
    targetTitle: `${commonName}: identificació, hàbitat i confusions`,
    fallbackQueries: [`${commonName} bolet identificació hàbitat`, `${scientificName} guia identificació`],
    resourceSummary: `una fitxa de ${commonName} amb fotografies, hàbitat, temporada i espècies semblants`,
    topicTerms: [commonName, scientificName, "identificació", "hàbitat", "bolets"],
  });
});

/** Every useful public destination is explicit or derived from its page catalogue. */
export const BACKLINK_CAMPAIGNS: readonly BacklinkCampaign[] = [
  ...FIXED_CAMPAIGNS,
  ...MONTH_CAMPAIGNS,
  ...MAP_CAMPAIGNS,
  ...COMPARISON_CAMPAIGNS,
  ...TERRITORY_GUIDE_CAMPAIGNS,
  ...AREA_CAMPAIGNS,
  ...PLACE_CAMPAIGNS,
  ...LOCATION_CAMPAIGNS,
  ...SPECIES_CAMPAIGNS,
];

export const BACKLINK_EXCLUDED_PUBLIC_PATHS = ["/avis-legal", "/col-labora", "/equip-editorial"] as const;
