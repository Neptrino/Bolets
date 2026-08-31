import type { Metadata } from "next";
import { speciesAcrossMonths } from "@/src/lib/species-collections";
import { DEFAULT_SOCIAL_IMAGE, metaDescription, pageTitle } from "@/src/lib/seo";
import type { Month } from "@/src/lib/types";

export type SeasonGuideId = "primavera" | "estiu" | "tardor" | "hivern";

export interface SeasonGuide {
  id: SeasonGuideId;
  path: string;
  cardTitle: string;
  heroAccent: string;
  months: readonly Month[];
  rangeLabel: string;
  rangeSentence: string;
  representativeMonth: Month;
  intro: string;
  conditionTitle: string;
  conditionText: string;
  reading: {
    title: string;
    summary: string;
    detail: string;
    steps: readonly string[];
    links: readonly {
      href: string;
      label: string;
      description: string;
    }[];
  };
}

export const seasonGuides = [
  {
    id: "primavera",
    path: "/bolets-de-primavera",
    cardTitle: "Bolets de primavera",
    heroAccent: "de primavera.",
    months: ["mar", "abr", "mai", "jun"],
    rangeLabel: "Març–juny",
    rangeSentence: "de març a juny",
    representativeMonth: "abr",
    intro: "La primavera combina sòls encara frescos, desglaç, pluges irregulars i un escalfament progressiu que afavoreix espècies molt diferents segons l’altitud.",
    conditionTitle: "Una temporada curta i canviant",
    conditionText: "La temperatura del sòl, la humitat prèvia i les gelades tardanes poden avançar o interrompre la fructificació en pocs dies.",
    reading: {
      title: "Com interpretar els bolets de primavera",
      summary: "La data orienta, però la pluja acumulada, la temperatura, l’altitud i el bosc decideixen si una espècie pot fructificar en un lloc concret.",
      detail: "Per preparar una sortida, consulteu les condicions actuals i el mapa de bolets; després contrasteu sempre l’exemplar amb la seva fitxa.",
      steps: ["Comenceu per espècies que encaixin amb el mes i l’hàbitat.", "Comproveu si les condicions recents són favorables a la zona.", "Reviseu les confusions abans de collir o consumir."],
      links: [
        { href: "/bolets-avui", label: "Condicions actuals", description: "Lectura territorial per espècie" },
        { href: "/map", label: "Mapa de bolets de Catalunya", description: "Terreny i condicions per sector" },
      ],
    },
  },
  {
    id: "estiu",
    path: "/bolets-d-estiu",
    cardTitle: "Bolets d’estiu",
    heroAccent: "d’estiu.",
    months: ["jun", "jul", "ago"],
    rangeLabel: "Juny–agost",
    rangeSentence: "de juny a agost",
    representativeMonth: "jul",
    intro: "L’estiu pot activar ceps, ous de reig i altres espècies quan les tempestes rehidraten un sòl que encara conserva humitat, sobretot en boscos frescos i zones de muntanya.",
    conditionTitle: "Tempestes útils, calor limitada",
    conditionText: "Un xàfec aïllat no sempre és suficient. La humitat anterior, les nits moderades, el vent i la durada de la calor determinen si el sòl respon.",
    reading: {
      title: "Com llegir una temporada d’estiu",
      summary: "Les tempestes poden obrir una finestra curta, però només quan rehidraten un sòl que encara conserva humitat. La calor seca, el vent i les nits massa càlides la tanquen ràpidament.",
      detail: "Prioritzeu boscos frescos i reviseu les condicions després d’episodis de pluja útil; una data d’estiu o un xàfec aïllat no confirma presència.",
      steps: ["Busqueu una combinació de pluja efectiva i nits moderades.", "Comenceu per boscos frescos, ombrívols o de més altitud.", "Contrasteu els ceps d’estiu i els ous de reig amb les seves confusions."],
      links: [
        { href: "/zones/ceps", label: "Ceps de Catalunya", description: "Tipus, diferències, hàbitat i temporada" },
        { href: "/bolets/amanita-caesarea", label: "Ou de reig", description: "Identificació i confusions de risc" },
        { href: "/bolets-avui", label: "Condicions actuals", description: "Lectura territorial abans de sortir" },
      ],
    },
  },
  {
    id: "tardor",
    path: "/bolets-de-tardor",
    cardTitle: "Bolets de tardor",
    heroAccent: "de tardor.",
    months: ["set", "oct", "nov"],
    rangeLabel: "Setembre–novembre",
    rangeSentence: "de setembre a novembre",
    representativeMonth: "oct",
    intro: "La tardor concentra la diversitat més gran del catàleg, però una data al calendari no garanteix fructificació: cal que pluja, temperatura i humitat del sòl coincideixin.",
    conditionTitle: "La temporada més ampla",
    conditionText: "Les primeres pluges poden activar espècies primerenques, mentre que el fred progressiu, les gelades i els períodes secs desplacen o tanquen cada finestra.",
    reading: {
      title: "Com interpretar les condicions de tardor",
      summary: "La tardor pot començar amb una resposta ràpida després de la pluja o quedar aturada si el sòl encara és sec. La humitat prèvia, el vent, la temperatura nocturna i l’altitud separen les oportunitats de cada bosc.",
      detail: "Consulteu primer les condicions actuals i el mapa; després trieu una espècie que encaixi amb el bosc, la cota i el moment de la temporada. Cap lectura confirma que hi hagi bolets.",
      steps: ["Distingiu les primeres pluges d’una rehidratació sostinguda del sòl.", "Trieu l’espècie segons pineda, bosc humit, sòl i altitud.", "Reviseu els semblants abans de collir o consumir cap exemplar."],
      links: [
        { href: "/zones/rovellons", label: "Rovellons a Catalunya", description: "Tipus, diferències, hàbitat i temporada" },
        { href: "/bolets/craterellus-lutescens", label: "Camagroc", description: "Boscos humits i identificació" },
        { href: "/bolets/tricholoma-terreum", label: "Fredolic", description: "Pinedes i confusions" },
        { href: "/bolets/hygrophorus-latitabundus", label: "Llenega", description: "Pinedes calcàries i tardor" },
        { href: "/zones/ceps", label: "Ceps de Catalunya", description: "Tipus, diferències, hàbitat i temporada" },
      ],
    },
  },
  {
    id: "hivern",
    path: "/bolets-d-hivern",
    cardTitle: "Bolets d’hivern",
    heroAccent: "d’hivern.",
    months: ["des", "gen", "feb"],
    rangeLabel: "Desembre–febrer",
    rangeSentence: "de desembre a febrer",
    representativeMonth: "gen",
    intro: "L’hivern redueix l’activitat, però no deixa el calendari buit. Algunes espècies toleren temperatures baixes o aprofiten períodes suaus en boscos humits i zones de poca altitud.",
    conditionTitle: "Fred, gelades i finestres suaus",
    conditionText: "Les gelades persistents limiten moltes espècies. L’orientació, l’altitud i uns dies temperats poden crear diferències importants dins una mateixa regió.",
    reading: {
      title: "Com llegir els bolets d’hivern",
      summary: "A l’hivern les finestres són més petites: les gelades persistents aturen moltes espècies, mentre que els dies suaus i humits poden mantenir activitat en boscos protegits i a cotes baixes.",
      detail: "No traslladeu una lectura d’una vall o d’un dia temperat a tot el territori. Consulteu les condicions actuals i comproveu els trets de l’exemplar abans de decidir-ne el consum.",
      steps: ["Comproveu si hi ha hagut gelades i si el sòl conserva humitat.", "Prioritzeu espècies i boscos que encaixin amb la finestra hivernal.", "Reviseu la fitxa completa i els semblants abans de collir."],
      links: [
        { href: "/bolets/hygrophorus-latitabundus", label: "Llenega", description: "Pinedes calcàries i mesos freds" },
        { href: "/bolets/hygrophorus-marzuolus", label: "Marçot", description: "Una espècie de final d’hivern" },
        { href: "/bolets-avui", label: "Condicions actuals", description: "Lectura territorial per espècie" },
      ],
    },
  },
] as const satisfies readonly SeasonGuide[];

export const seasonGuidesById = {
  primavera: seasonGuides[0],
  estiu: seasonGuides[1],
  tardor: seasonGuides[2],
  hivern: seasonGuides[3],
} satisfies Record<SeasonGuideId, SeasonGuide>;

const seasonGuideIdsByMonth: Record<Month, SeasonGuideId> = {
  gen: "hivern",
  feb: "hivern",
  mar: "primavera",
  abr: "primavera",
  mai: "primavera",
  jun: "estiu",
  jul: "estiu",
  ago: "estiu",
  set: "tardor",
  oct: "tardor",
  nov: "tardor",
  des: "hivern",
};

export function seasonGuideForMonth(month: Month) {
  return seasonGuidesById[seasonGuideIdsByMonth[month]];
}

export function speciesForSeasonGuide(guide: SeasonGuide) {
  return speciesAcrossMonths(guide.months);
}

export function seasonGuideMetadata(guide: SeasonGuide): Metadata {
  const count = speciesForSeasonGuide(guide).length;
  const title = pageTitle(`${guide.cardTitle} a Catalunya: espècies i calendari`);
  const description = metaDescription(`Guia de ${count} espècies de ${guide.cardTitle.toLocaleLowerCase("ca")} a Catalunya amb calendari ${guide.rangeSentence}, hàbitat, identificació i condicions ecològiques.`);

  return {
    title,
    description,
    alternates: { canonical: guide.path },
    openGraph: {
      url: guide.path,
      title,
      description,
      images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
    },
  };
}
