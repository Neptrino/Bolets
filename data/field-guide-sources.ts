import type { SourceReference } from "@/src/lib/types";

// Checked on 2026-08-27. These are documentary sources, not expert sign-off.
export const woodFungiSource: SourceReference = {
  id: "museu-ebre-bolets-soca",
  title: "Bolets de soca: els bolets que viuen damunt fusta",
  publisher: "Museu de les Terres de l’Ebre",
  url: "https://www.museuterresebre.cat/pagina.asp?i=ca&id=248",
  confidence: "high",
};

export const falseChanterelleSources: SourceReference[] = [
  {
    id: "ichn-fals-rossinyol",
    title: "Fals rossinyol — Hygrophoropsis aurantiaca",
    publisher: "ICHN, delegació del Bages",
    url: "https://elmedinaturaldelbages.cat/species/fals-rossinyol-hygrophoropsis-aurantiaca/",
    confidence: "high",
  },
  {
    id: "aranzadi-hygrophoropsis",
    title: "Hygrophoropsis aurantiaca: fitxa micològica",
    publisher: "Sociedad de Ciencias Aranzadi",
    url: "https://www.aranzadi.eus/buscador-micologico/ficha/1-1-002.03.02.00.01.00",
    confidence: "high",
  },
];

export const collectingSources = {
  ruralAgents: {
    id: "agents-rurals-recolleccio",
    title: "Agents Rurals: preguntes freqüents sobre recol·lecció",
    publisher: "Departament d’Interior i Seguretat Pública",
    url: "https://interior.gencat.cat/ca/arees_dactuacio/agents-rurals/preguntes-frequents/",
    confidence: "high",
  },
  aiguestortes: {
    id: "aiguestortes-bolets",
    title: "Aigüestortes: recol·lecció i zona perifèrica",
    publisher: "Parcs naturals de Catalunya",
    url: "https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/aiguestortes/preguntes-frequents/",
    confidence: "high",
  },
  altPirineu: {
    id: "alt-pirineu-recolleccio",
    title: "Alt Pirineu: regulació i tiquets de recol·lecció (pàgina actualitzada el 2023)",
    publisher: "Parcs naturals de Catalunya",
    url: "https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/alt-pirineu/gaudeix-del-parc/consells/regulacio-activitats/",
    confidence: "high",
  },
  altPirineuLeisure: {
    id: "alt-pirineu-lleure-recolleccio",
    title: "Alt Pirineu: recol·lecció gratuïta i zones amb tiquet",
    publisher: "Parcs naturals de Catalunya",
    url: "https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/alt-pirineu/gaudeix-del-parc/guia-de-visita/activitats-lleure/",
    confidence: "high",
  },
  lleida: {
    id: "ara-lleida-bolets-2022",
    title: "Campanya de bolets a Lleida: referència d’Alins del 2022",
    publisher: "Patronat de Turisme de la Diputació de Lleida",
    url: "https://aralleida.cat/les-pluges-permeten-engegar-bona-campanya-bolets/",
    confidence: "high",
  },
  cadi: {
    id: "cadi-recolleccio",
    title: "Cadí-Moixeró: recol·lecció, propietat i senyalització",
    publisher: "Parcs naturals de Catalunya",
    url: "https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/cadi/gaudeix-del-parc/consells/regulacio-dactivitats/",
    confidence: "high",
  },
  ports: {
    id: "ports-recolleccio",
    title: "Els Ports: recol·lecció i visites en grup",
    publisher: "Parcs naturals de Catalunya",
    url: "https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/ports/gaudeix-del-parc/consells/regulacio-dactivitats/",
    confidence: "high",
  },
  authorisation: {
    id: "gencat-autoritzacio-espais",
    title: "Autorització d’activitats en espais naturals protegits",
    publisher: "Tràmits Gencat",
    url: "https://tramits.gencat.cat/ca/tramits/tramits-temes/Autoritzacio-dactivitats-en-espais-naturals-protegits?category=22436bbe-9e40-11e9-959c-005056924a59",
    confidence: "high",
  },
  parks: {
    id: "xpn-recolleccio",
    title: "Recol·lecció i aprofitaments agroforestals",
    publisher: "Xarxa de Parcs Naturals — Diputació de Barcelona",
    url: "https://parcs.diba.cat/ca/faqs/obres-aprofitaments-agroforestals",
    confidence: "high",
  },
  poblet: {
    id: "poblet-consells",
    title: "Poblet: consells, accés i activitats organitzades",
    publisher: "Parcs naturals de Catalunya",
    url: "https://parcsnaturals.gencat.cat/ca/xarxa-de-parcs/poblet/gaudeix-del-paratge/consells/",
    confidence: "high",
  },
  alfa: {
    id: "agents-rurals-pla-alfa",
    title: "Pla Alfa: risc d’incendi i restriccions d’accés",
    publisher: "Departament d’Interior i Seguretat Pública",
    url: "https://interior.gencat.cat/ca/arees_dactuacio/agents-rurals/pla-alfa/",
    confidence: "high",
  },
} satisfies Record<string, SourceReference>;
