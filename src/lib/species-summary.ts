import type { SpanishSpeciesNames } from "@/data/species-common-names";
import { metaDescription, pageTitle } from "@/src/lib/seo";
import { speciesArticle } from "@/src/lib/species-headings";
import type {
  CatalogueSpecies,
  EdibilityStatus,
  Month,
  SeasonalActivity,
} from "@/src/lib/types";

/* The answer-first copy every species profile opens with: one sentence that
   names the species in Catalan, Latin and Spanish and states edibility,
   season and habitat, built only from the versioned catalogue record. The
   same facts feed the meta description, the search title and the generated
   FAQ, so a search result, an AI answer and the page itself all say the
   same thing. Nothing here adds ecology: reference-only species keep their
   sourced habitat and season text. */

const catalanList = new Intl.ListFormat("ca-ES", { style: "long", type: "conjunction" });
const catalanNumber = new Intl.NumberFormat("ca-ES");

const MONTH_ORDER: Month[] = ["gen", "feb", "mar", "abr", "mai", "jun", "jul", "ago", "set", "oct", "nov", "des"];
const MONTH_NAMES: Record<Month, string> = {
  gen: "gener", feb: "febrer", mar: "març", abr: "abril", mai: "maig", jun: "juny",
  jul: "juliol", ago: "agost", set: "setembre", oct: "octubre", nov: "novembre", des: "desembre",
};

type Season = "primavera" | "estiu" | "tardor" | "hivern";
const SEASON_ORDER: Season[] = ["primavera", "estiu", "tardor", "hivern"];
const MONTH_SEASON: Record<Month, Season> = {
  mar: "primavera", abr: "primavera", mai: "primavera",
  jun: "estiu", jul: "estiu", ago: "estiu",
  set: "tardor", oct: "tardor", nov: "tardor",
  des: "hivern", gen: "hivern", feb: "hivern",
};
const SEASON_PHRASE: Record<Season, string> = {
  primavera: "a la primavera",
  estiu: "a l’estiu",
  tardor: "a la tardor",
  hivern: "a l’hivern",
};

const EDIBILITY_PHRASE: Record<EdibilityStatus, string> = {
  excellent_edible: "un bolet comestible excel·lent",
  edible: "un bolet comestible",
  edible_with_conditions: "un bolet comestible amb condicions",
  not_recommended: "un bolet no recomanat per al consum",
  inedible: "un bolet no comestible",
  toxic: "un bolet tòxic",
  dangerously_toxic: "un bolet molt tòxic",
  unknown: "un bolet de comestibilitat no verificada",
};

const TITLE_PATTERNS = [
  (name: string) => `${name}: identificació, hàbitat i temporada`,
  (name: string) => `${name}: identificació i temporada`,
  (name: string) => `${name}: guia d’identificació`,
];

export interface SpeciesFaq {
  question: string;
  answer: string;
}

function sentenceCase(value: string) {
  return `${value.charAt(0).toLocaleUpperCase("ca-ES")}${value.slice(1)}`;
}

function lowerFirst(value: string) {
  return `${value.charAt(0).toLocaleLowerCase("ca-ES")}${value.slice(1)}`;
}

/** Ends a fragment with exactly one full stop. */
function sentence(value: string) {
  const trimmed = value.trim().replace(/[.\s]+$/u, "");
  return trimmed ? `${trimmed}.` : "";
}

function firstSentence(value: string) {
  const match = value.trim().match(/^[^.!?]+[.!?]/u);
  return (match ? match[0] : value).trim();
}

function monthPhrase(month: Month, preposition: "a" | "de") {
  const name = MONTH_NAMES[month];
  const elided = /^[aeiou]/u.test(name);
  if (preposition === "a") return elided ? `a l’${name}` : `al ${name}`;
  return elided ? `de l’${name}` : `del ${name}`;
}

function uniqueInOrder<T>(values: T[]) {
  return [...new Set(values)];
}

function scoredSeasonality(species: CatalogueSpecies): Record<Month, SeasonalActivity> | null {
  return "scope" in species ? null : species.ecologicalConfig.seasonality;
}

function monthsWith(seasonality: Record<Month, SeasonalActivity>, predicate: (activity: SeasonalActivity) => boolean) {
  return MONTH_ORDER.filter((month) => predicate(seasonality[month]));
}

/** Peak months, or the best available activity level when no month peaks. */
function leadingMonths(seasonality: Record<Month, SeasonalActivity>) {
  for (const level of ["peak", "good", "moderate", "possible"] as const) {
    const months = monthsWith(seasonality, (activity) => activity === level);
    if (months.length > 0) return months;
  }
  return [];
}

/** First and last month of the longest run of activity, wrapping over the year end. */
function activeRun(seasonality: Record<Month, SeasonalActivity>): [Month, Month] | null {
  const active = MONTH_ORDER.map((month) => seasonality[month] !== "inactive");
  if (active.every(Boolean)) return [MONTH_ORDER[0], MONTH_ORDER[11]];
  let best: { start: number; length: number } | null = null;
  for (let start = 0; start < 12; start += 1) {
    if (!active[start] || active[(start + 11) % 12]) continue;
    let length = 0;
    while (length < 12 && active[(start + length) % 12]) length += 1;
    if (!best || length > best.length) best = { start, length };
  }
  if (!best) return null;
  return [MONTH_ORDER[best.start], MONTH_ORDER[(best.start + best.length - 1) % 12]];
}

function parseSeasonText(text: string) {
  const lower = text.trim().toLocaleLowerCase("ca-ES");
  if (lower.startsWith("de ")) return lower;
  const parts = lower.split(/\s+i\s+/u).map((part) => {
    if ((SEASON_ORDER as string[]).includes(part)) return SEASON_PHRASE[part as Season];
    if (/^final d[’']estiu$/u.test(part)) return "a final d’estiu";
    return `a ${part}`;
  });
  return parts.join(" i ");
}

/** "a la tardor", "a la primavera i a la tardor", "de primavera a tardor". */
export function speciesSeasonPhrase(species: CatalogueSpecies) {
  if ("scope" in species) return parseSeasonText(species.ecology.season);
  const seasonality = species.ecologicalConfig.seasonality;
  const seasons = uniqueInOrder(leadingMonths(seasonality).map((month) => MONTH_SEASON[month]))
    .sort((left, right) => SEASON_ORDER.indexOf(left) - SEASON_ORDER.indexOf(right));
  if (seasons.length === 0) return "en temporada";
  return seasons.map((season) => SEASON_PHRASE[season]).join(" i ");
}

function habitatList(species: CatalogueSpecies) {
  return "scope" in species ? species.ecology.habitats : species.ecologicalConfig.habitat.forestTypes;
}

/** "en prats, pastures i clarianes". Reference habitats are sourced phrases that may already
    carry a conjunction ("pinedes i rouredes"), so only one of those is listed. */
export function speciesHabitatPhrase(species: CatalogueSpecies, limit = "scope" in species ? 2 : 3) {
  const all = uniqueInOrder(habitatList(species).map((habitat) => lowerFirst(habitat.trim())).filter(Boolean));
  const compound = "scope" in species && all.some((habitat) => /\s(i|o)\s|,/u.test(habitat));
  const habitats = all.slice(0, compound ? 1 : limit);
  return habitats.length > 0 ? `en ${catalanList.format(habitats)}` : "";
}

/** "entre 100 i 1.800 m d’altitud"; only scored species carry a verified range. */
export function speciesAltitudePhrase(species: CatalogueSpecies) {
  if ("scope" in species) return "";
  const [low, high] = species.ecologicalConfig.habitat.altitude;
  if (low <= 0) return `fins a ${catalanNumber.format(high)} m d’altitud`;
  return `entre ${catalanNumber.format(low)} i ${catalanNumber.format(high)} m d’altitud`;
}

function spanishPhrase(names: SpanishSpeciesNames | undefined) {
  if (!names) return "";
  const alternative = names.alternatives?.[0];
  return `en castellà ${names.primary}${alternative ? ` o ${alternative}` : ""}`;
}

/** The opening sentence of the profile, and the first thing an AI answer can quote. */
export function speciesLead(species: CatalogueSpecies, spanishNames?: SpanishSpeciesNames) {
  const { identity } = species;
  const subject = sentenceCase(speciesArticle(identity.commonName).withArticle);
  const spanish = spanishPhrase(spanishNames);
  const habitat = speciesHabitatPhrase(species);
  const altitude = speciesAltitudePhrase(species);
  const parts = [
    `${subject} (${identity.scientificName})${spanish ? `, ${spanish},` : ""}`,
    `és ${EDIBILITY_PHRASE[identity.edibility]}`,
    `que surt ${speciesSeasonPhrase(species)}`,
    habitat,
  ].filter(Boolean);
  return sentence(`${parts.join(" ")}${altitude ? `, ${altitude}` : ""}`);
}

/** Search snippet: the same facts without the article, kept under the meta limit. */
export function speciesMetaDescription(species: CatalogueSpecies, spanishNames?: SpanishSpeciesNames) {
  const { identity } = species;
  const spanish = spanishNames ? `, en castellà ${spanishNames.primary}` : "";
  const edibility = EDIBILITY_PHRASE[identity.edibility].replace(/^un /u, "");
  const habitat = speciesHabitatPhrase(species);
  const base = `${identity.commonName} (${identity.scientificName})${spanish}: ${edibility} que surt ${speciesSeasonPhrase(species)}`;
  // Drop the habitat clause before letting the snippet be cut mid-sentence.
  const candidates = [sentence(`${base}${habitat ? ` ${habitat}` : ""}`), sentence(base)];
  return candidates.find((candidate) => metaDescription(candidate) === candidate) ?? metaDescription(candidates[0]);
}

/** Curated titles win; otherwise the longest standard pattern that fits the title budget. */
export function speciesPageTitle(species: CatalogueSpecies) {
  if (species.seo?.title) return species.seo.title;
  const name = species.identity.commonName;
  const fitting = TITLE_PATTERNS.map((pattern) => pattern(name)).find((title) => pageTitle(title) === title);
  return fitting ?? pageTitle(TITLE_PATTERNS[0](name));
}

const FAQ_TOPICS: Record<string, RegExp> = {
  spanish: /castell/iu,
  edible: /comestible|menjar|es pot/iu,
  season: /\bquan\b|temporada|\bsurt/iu,
  habitat: /\bon\b|hàbitat|creix/iu,
  lookalikes: /confon|diferenci/iu,
};

function edibleAnswer(species: CatalogueSpecies) {
  const summary = sentence(species.culinaryProfile.summary);
  const caution = "Consumeix-ne només exemplars identificats amb seguretat, mai per una sola foto.";
  switch (species.identity.edibility) {
    case "excellent_edible":
    case "edible":
      return `Sí: és ${EDIBILITY_PHRASE[species.identity.edibility]}. ${summary} ${caution}`;
    case "edible_with_conditions":
      return `Només amb condicions. ${summary} ${caution}`;
    case "not_recommended":
      return `No és recomanable. ${summary}`;
    case "inedible":
      return `No: és un bolet no comestible. ${summary}`;
    case "toxic":
    case "dangerously_toxic":
      return `No: és ${EDIBILITY_PHRASE[species.identity.edibility]}. ${summary}`;
    default:
      return `No hi ha prou informació verificada per recomanar-ne el consum. ${summary}`;
  }
}

function seasonAnswer(species: CatalogueSpecies) {
  const seasonality = scoredSeasonality(species);
  const seasonPhrase = speciesSeasonPhrase(species);
  if (!seasonality) return `Sobretot ${seasonPhrase}. El moment exacte depèn de la pluja i de l’altitud de cada any.`;
  const peaks = leadingMonths(seasonality).map((month) => monthPhrase(month, "a"));
  const run = activeRun(seasonality);
  const range = run && run[0] !== run[1] ? ` i pot aparèixer ${monthPhrase(run[0], "de")} ${monthPhrase(run[1], "a")} segons l’altitud i la pluja` : "";
  return sentence(`Sobretot ${seasonPhrase}: el pic sol ser ${catalanList.format(peaks)}${range}`);
}

function habitatAnswer(species: CatalogueSpecies) {
  if ("scope" in species) {
    const detail = firstSentence(species.ecology.description);
    return sentence(`Creix ${speciesHabitatPhrase(species, 3)}. ${detail.length <= 220 ? detail : ""}`);
  }
  const soil = lowerFirst(species.ecologicalConfig.habitat.soilPreference.trim());
  return sentence(`Creix ${speciesHabitatPhrase(species, 4)}, ${speciesAltitudePhrase(species)}, sobretot en sòl ${soil}`);
}

function lookalikeAnswer(species: CatalogueSpecies) {
  const items = species.similarSpecies.slice(0, 2).map((item, index) => {
    const name = speciesArticle(item.commonName).withArticle;
    const edibility = EDIBILITY_PHRASE[item.edibility].replace(/^un bolet /u, "");
    return `${index === 0 ? "Sobretot amb" : "També amb"} ${name} (${item.scientificName}), ${edibility}: ${lowerFirst(sentence(item.mainDifferences))}`;
  });
  return items.join(" ");
}

/** Curated questions first, then the generated ones they do not already answer. */
export function speciesFaqs(species: CatalogueSpecies, spanishNames?: SpanishSpeciesNames): SpeciesFaq[] {
  const { withArticle } = speciesArticle(species.identity.commonName);
  const curated = species.seo?.faqs ?? [];
  const generated: Array<SpeciesFaq & { topic: keyof typeof FAQ_TOPICS }> = [];

  if (spanishNames) {
    const alternatives = spanishNames.alternatives ?? [];
    generated.push({
      topic: "spanish",
      question: `Com es diu ${withArticle} en castellà?`,
      answer: `En castellà, ${withArticle} es diu ${spanishNames.primary}${alternatives.length > 0 ? `; també se’n diu ${catalanList.format(alternatives)}` : ""}. El nom científic, ${species.identity.scientificName}, és el mateix en totes les llengües.`,
    });
  }
  generated.push(
    { topic: "edible", question: `${sentenceCase(withArticle)} és comestible?`, answer: edibleAnswer(species) },
    { topic: "season", question: `Quan surt ${withArticle}?`, answer: seasonAnswer(species) },
    { topic: "habitat", question: `On creix ${withArticle}?`, answer: habitatAnswer(species) },
  );
  if (species.similarSpecies.length > 0) {
    generated.push({ topic: "lookalikes", question: `Amb què es pot confondre ${withArticle}?`, answer: lookalikeAnswer(species) });
  }

  const covered = (topic: keyof typeof FAQ_TOPICS) => curated.some((faq) => FAQ_TOPICS[topic].test(faq.question));
  return [
    ...curated,
    ...generated.filter((faq) => !covered(faq.topic)).map(({ question, answer }) => ({ question, answer })),
  ];
}
