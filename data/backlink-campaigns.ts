export type BacklinkCampaign = {
  id: string;
  query: string;
  targetPath: string;
  targetTitle: string;
  resourceSummary: string;
  topicTerms: readonly string[];
};

/**
 * Stable, editorially reviewed destinations for backlink outreach. Keeping the
 * query and destination together prevents the automation from inventing a page
 * or pitching a resource that does not match the prospect's subject.
 */
export const BACKLINK_CAMPAIGNS: readonly BacklinkCampaign[] = [
  {
    id: "current-map",
    query: "bolets Catalunya mapa condicions guia",
    targetPath: "/map",
    targetTitle: "Mapa de bolets de Catalunya",
    resourceSummary: "un mapa actualitzat de les condicions per espècie, amb metodologia i límits explícits",
    topicTerms: ["bolets", "micologia", "bosc", "temporada", "catalunya"],
  },
  {
    id: "season-calendar",
    query: "temporada bolets Catalunya calendari tardor guia",
    targetPath: "/temporada",
    targetTitle: "Calendari de la temporada de bolets",
    resourceSummary: "un calendari per mesos i espècies basat en la mateixa ecologia que utilitza el mapa",
    topicTerms: ["temporada", "calendari", "tardor", "bolets", "mesos"],
  },
  {
    id: "identification-guides",
    query: "identificar bolets Catalunya guia espècies",
    targetPath: "/guies",
    targetTitle: "Guies d’identificació de bolets",
    resourceSummary: "guies d’identificació amb fonts, confusions i avisos de seguretat clars",
    topicTerms: ["identificació", "identificar", "espècies", "micologia", "bolets"],
  },
  {
    id: "foraging-rules",
    query: "normativa collir bolets Catalunya parcs naturals",
    targetPath: "/normativa-bolets",
    targetTitle: "Normativa per collir bolets a Catalunya",
    resourceSummary: "una síntesi pràctica de normativa i bones pràctiques amb enllaços a les fonts oficials",
    topicTerms: ["normativa", "collir", "recol·lecció", "parc", "bolets"],
  },
  {
    id: "rain-explainer",
    query: "quan surten bolets després ploure Catalunya",
    targetPath: "/quan-surten-els-bolets-despres-de-ploure",
    targetTitle: "Quan surten els bolets després de ploure",
    resourceSummary: "una explicació del paper combinat de la pluja, el sòl i la temperatura",
    topicTerms: ["pluja", "ploure", "humitat", "temperatura", "bolets"],
  },
] as const;
