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
