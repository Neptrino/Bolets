import type { SourceReference } from "@/src/lib/types";

// Checked on 2026-08-28. Emergency guidance is not an identification service.
export const mushroomPoisoningSource: SourceReference = {
  id: "canal-salut-intoxicacio-bolets",
  title: "Intoxicació per bolets: símptomes i assistència sanitària",
  publisher: "Canal Salut · Generalitat de Catalunya",
  url: "https://canalsalut.gencat.cat/ca/salut-a-z/i/intoxicacio-bolets/",
  confidence: "high",
};

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

// Checked on 2026-09-02. Descriptive sources do not establish numerical ecology.
export const commonPuffballSources: SourceReference[] = [
  {
    id: "ichn-lycoperdon-perlatum", title: "Pet de llop — Lycoperdon perlatum",
    publisher: "ICHN, delegació del Bages",
    url: "https://elmedinaturaldelbages.cat/species/pet-de-llop-lycoperdon-perlatum/", confidence: "high",
  },
  {
    id: "aranzadi-lycoperdon-perlatum", title: "Lycoperdon perlatum: fitxa micològica",
    publisher: "Sociedad de Ciencias Aranzadi",
    url: "https://www.aranzadi.eus/index.php/buscador-micologico/ficha/1-4-014.09.18.00.85.00", confidence: "high",
  },
  {
    id: "iwt-common-puffball", title: "Common puffball: identificació i límits de consum",
    publisher: "Irish Wildlife Trust",
    url: "https://iwt.ie/species-of-the-week-common-puffball/", confidence: "high",
  },
];

export const giantPuffballSources: SourceReference[] = [
  {
    id: "aranzadi-calvatia-gigantea", title: "Calvatia gigantea: fitxa micològica",
    publisher: "Sociedad de Ciencias Aranzadi",
    url: "https://www.aranzadi.eus/buscador-micologico/ficha/1-4-014.09.15.00.05.00", confidence: "high",
  },
  {
    id: "mdc-giant-puffball", title: "Giant puffball: morfologia i precaucions",
    publisher: "Missouri Department of Conservation",
    url: "https://mdc.mo.gov/discover-nature/field-guide/giant-puffball", confidence: "high",
  },
];

export const charcoalBurnerSources: SourceReference[] = [
  {
    id: "aranzadi-russula-cyanoxantha", title: "Russula cyanoxantha: fitxa micològica i noms populars",
    publisher: "Sociedad de Ciencias Aranzadi",
    url: "https://www.aranzadi.eus/buscador-micologico/ficha/1-1-004.01.01.05.03.00", confidence: "high",
  },
  {
    id: "micoex-russula-cyanoxantha", title: "Russula cyanoxantha: descripció i comestibilitat",
    publisher: "Sociedad Micológica Extremeña",
    url: "https://micoex.org/2016/09/17/russula-cyanoxantha/", confidence: "high",
  },
];

// Checked on 2026-09-02. These sources support descriptive identification and
// nomenclature only; they do not justify numerical ecology or predictions.
export const goldenMilkcapSources: SourceReference[] = [
  {
    id: "stadt-wien-lactarius-chrysorrheus",
    title: "Lactarius chrysorrheus: identificació, hàbitat i seguretat",
    publisher: "Stadt Wien · Marktamt",
    url: "https://www.wien.gv.at/gesundheit/pilzberatung-goldfluessiger-milchling",
    confidence: "high",
  },
  {
    id: "naturalis-lactarius-chrysorrheus",
    title: "Lactarius chrysorrheus: guia interactiva de fongs",
    publisher: "Naturalis Biodiversity Center",
    url: "https://mushrooms.linnaeus.naturalis.nl/linnaeus_ng/app/views/species/nsr_taxon.php?epi=137&id=100459",
    confidence: "high",
  },
  {
    id: "rcm-lactarius-catalunya-2002",
    title: "Espècies descrites a Setas para todos trobades a Catalunya",
    publisher: "Revista Catalana de Micologia",
    url: "https://www.micocat.org/UNCINULA09/rcmPdf/RCM24_2002/259-269_Especies_descritas_-Setas_para_todos-Catalunya.pdf",
    confidence: "high",
  },
];

export const woollyMilkcapSources: SourceReference[] = [
  {
    id: "aranzadi-lactarius-torminosus",
    title: "Lactarius torminosus: noms, taxonomia i comestibilitat",
    publisher: "Sociedad de Ciencias Aranzadi",
    url: "https://www.aranzadi.eus/buscador-micologico/ficha/1-1-004.01.02.02.09.00",
    confidence: "high",
  },
  {
    id: "aranzadi-urola-lactarius-torminosus",
    title: "Lactarius torminosus: morfologia, bedolls i confusions",
    publisher: "Sociedad de Ciencias Aranzadi",
    url: "https://www.aranzadi.eus/assets/files/urola-kosta-bailarako-perretxikoak-espanol.pdf",
    confidence: "high",
  },
];

export const ramariaFormosaSources: SourceReference[] = [
  {
    id: "aranzadi-ramaria-formosa",
    title: "Ramaria formosa: morfologia, hàbitat i efecte purgant",
    publisher: "Sociedad de Ciencias Aranzadi",
    url: "https://www.aranzadi.eus/fileadmin/docs/micologia/munibesetas2005_es.pdf",
    confidence: "high",
  },
  {
    id: "gencat-ramaria-formosa-cadi",
    title: "Els fongs del Parc Natural del Cadí-Moixeró",
    publisher: "Parcs Naturals de Catalunya",
    url: "https://parcsnaturals.gencat.cat/web/.content/Xarxa-de-parcs/Cadi/coneix_la_nostra_feina/centre_de-documentacio/fons_documental/biblioteca_digital/flora_i_vegetacio/els_fongs_del_parc_natural_del_cadi-moixero_any_2002/43_92909.pdf",
    confidence: "high",
  },
];

export const wrinkledMilkcapSources: SourceReference[] = [
  {
    id: "gbif-lactifluus-rugatus",
    title: "Lactifluus rugatus: nom acceptat, sinònims i nom català",
    publisher: "GBIF · Catalogue of Life",
    url: "https://www.gbif.org/taxon/3RSLS",
    confidence: "high",
  },
  {
    id: "hnpc-lactifluus-rugatus",
    title: "Les russulals: lleteroles mediterrànies",
    publisher: "Història Natural dels Països Catalans · Enciclopèdia Catalana",
    url: "https://www.enciclopedia.cat/historia-natural-dels-paisos-catalans/les-russulals",
    confidence: "high",
  },
  {
    id: "ima-fungus-lactifluus-rugatus",
    title: "Lactifluus rugatus: identitat i ecologia mediterrània",
    publisher: "IMA Fungus",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5159598/",
    confidence: "high",
  },
];

export const holmOakBoleteSources: SourceReference[] = [
  {
    id: "gbif-leccinellum-lepidum",
    title: "Leccinellum lepidum: nom acceptat, sinònims i nom català",
    publisher: "GBIF · Catalogue of Life",
    url: "https://www.gbif.org/taxon/6P5F2",
    confidence: "high",
  },
  {
    id: "micoex-leccinellum-lepidum",
    title: "Leccinellum lepidum: descripció, hàbitat i comestibilitat",
    publisher: "Sociedad Micológica Extremeña",
    url: "https://micoex.org/2016/09/17/leccinellum-lepidum/",
    confidence: "high",
  },
  {
    id: "gob-menorca-alzinall",
    title: "Alzinall (Leccinum lepidum): trets d’identificació",
    publisher: "GOB Menorca · Bolets de Menorca",
    url: "https://www.descobreixmenorca.com/bolets-de-menorca/alzinall/",
    confidence: "moderate",
  },
];

export const collectingSources = {
  harvestingStudy: {
    id: "egli-harvesting-2006",
    title: "Mushroom picking does not impair future harvests — results of a long-term study in Switzerland (2006)",
    publisher: "Egli i col·laboradors · Biological Conservation",
    url: "https://doi.org/10.1016/j.biocon.2005.10.042",
    confidence: "high",
  },
  mountainSafety: {
    id: "bombers-seguretat-boletaires",
    title: "Consells de seguretat per a boletaires",
    publisher: "Bombers de la Generalitat de Catalunya",
    url: "https://interior.gencat.cat/ca/arees_dactuacio/bombers/seguretat_a_la_muntanya/boletaires/index.html",
    confidence: "high",
  },
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
