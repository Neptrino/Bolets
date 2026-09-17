import type { AreaProfile, PlaceProfile } from "@/data/location-pages";

/* Answer-first copy for a zone hub (comarca or massís). The hub has to own
   the bare "bolets <territori>" query rather than one of its place pages, so
   the summary sentence and the FAQ restate, in prose, the facts the hub is
   assembled from: the documented places, the species with a local guide, the
   combined season window and the curated forest and season notes. Nothing
   here invents ecology: every sentence is built from the curated area record
   or from figures the hub already shows. */

export interface ZoneHubFaq {
  question: string;
  answer: string;
}

export interface ZoneHubCopyInput {
  area: AreaProfile;
  places: PlaceProfile[];
  /** "cep, rossinyol i pinetell", from hubSpeciesList. */
  speciesList: string;
  /** "Setembre – Novembre", "Octubre" or "Sense pic definit", from hubSeasonWindow. */
  seasonWindow: string;
}

const catalanList = new Intl.ListFormat("ca-ES", { style: "long", type: "conjunction" });

function sentenceCase(value: string) {
  return `${value.charAt(0).toLocaleUpperCase("ca-ES")}${value.slice(1)}`;
}

/** "de setembre a novembre", "a l’octubre", or the raw label when it is not a month window. */
export function seasonWindowPhrase(seasonWindow: string) {
  const lower = seasonWindow.trim().toLocaleLowerCase("ca-ES");
  const range = lower.match(/^([\p{L}.]+)\s+–\s+([\p{L}.]+)$/u);
  if (range) return `${/^[aeiou]/u.test(range[1]) ? "d’" : "de "}${range[1]} a ${range[2]}`;
  if (/^[\p{L}]+$/u.test(lower)) return /^[aeiou]/u.test(lower) ? `a l’${lower}` : `al ${lower}`;
  return lower;
}

/** "boscos entre 400 i 2.100 m" from the hub altitude band. */
export function altitudeBandPhrase(altitudeBand: string) {
  const format = new Intl.NumberFormat("ca-ES");
  const range = altitudeBand.match(/^(\d+)–(\d+) m$/u);
  if (range) return `boscos entre ${format.format(Number(range[1]))} i ${format.format(Number(range[2]))} m`;
  const ceiling = altitudeBand.match(/^fins a (\d+) m$/u);
  if (ceiling) return `boscos fins a ${format.format(Number(ceiling[1]))} m`;
  return `boscos ${altitudeBand}`;
}

/** One sentence that answers "bolets a X?" before the reader scrolls. */
export function zoneHubSummary({
  area,
  places,
  speciesList,
  speciesCount,
  seasonWindow,
  altitudeBand,
}: ZoneHubCopyInput & { speciesCount: number; altitudeBand: string }) {
  const placeNames = catalanList.format(places.map((place) => place.nameWithArticle));
  const placeCount = places.length === 1 ? "un indret amb guia" : `${places.length} indrets amb guia`;
  const speciesPhrase = speciesCount === 1 ? "una espècie documentada" : `${speciesCount} espècies documentades`;
  return `Guia de bolets ${area.prepositionalName}: ${placeCount} (${placeNames}), ${speciesPhrase} (${speciesList}), temporada habitual ${seasonWindowPhrase(seasonWindow)} i ${altitudeBandPhrase(altitudeBand)}.`;
}

export function zoneHubFaqs({ area, places, speciesList, seasonWindow }: ZoneHubCopyInput): ZoneHubFaq[] {
  const where = area.prepositionalName;
  const placeNames = catalanList.format(places.map((place) => place.nameWithArticle));
  const regulation = area.regulationNote
    ? `${area.regulationNote} Consulta la guia de normativa abans de sortir.`
    : "Depèn de la finca i de l’espai natural: la guia de normativa recull els parcs i paratges amb regulació pròpia i què cal comprovar abans de sortir.";

  return [
    {
      question: `Quan hi ha bolets ${where}?`,
      answer: `La finestra habitual va ${seasonWindowPhrase(seasonWindow)}. ${area.seasonNotes}`,
    },
    {
      question: `Quins bolets es poden trobar ${where}?`,
      answer: `Les guies ${where} cobreixen ${speciesList}. ${area.forests}`,
    },
    {
      question: `On buscar bolets ${where}?`,
      answer: `${sentenceCase(places.length === 1 ? "l’indret amb guia és" : "els indrets amb guia són")} ${placeNames}. Cada guia descriu l’hàbitat potencial d’una espècie en aquell entorn: no publica punts de recol·lecció ni confirma que hi hagi bolets.`,
    },
    {
      question: `Hi ha bolets ${where} avui?`,
      answer: `El tauler de condicions actuals d’aquesta pàgina compara els sectors ${where} amb la pluja, la humitat i la temperatura recents, i el mapa en viu mostra on són més favorables. Les lectures s’actualitzen cada dia i no substitueixen la comprovació al bosc.`,
    },
    {
      question: `Cal permís per collir bolets ${where}?`,
      answer: regulation,
    },
  ];
}
