import type { Month, SeasonalActivity } from "@/src/lib/types";

export const SEASON_MONTHS = [
  { key: "gen", slug: "gener", shortLabel: "Gen", narrowLabel: "G", label: "gener" },
  { key: "feb", slug: "febrer", shortLabel: "Feb", narrowLabel: "F", label: "febrer" },
  { key: "mar", slug: "marc", shortLabel: "Mar", narrowLabel: "M", label: "març" },
  { key: "abr", slug: "abril", shortLabel: "Abr", narrowLabel: "A", label: "abril" },
  { key: "mai", slug: "maig", shortLabel: "Mai", narrowLabel: "M", label: "maig" },
  { key: "jun", slug: "juny", shortLabel: "Jun", narrowLabel: "J", label: "juny" },
  { key: "jul", slug: "juliol", shortLabel: "Jul", narrowLabel: "J", label: "juliol" },
  { key: "ago", slug: "agost", shortLabel: "Ago", narrowLabel: "A", label: "agost" },
  { key: "set", slug: "setembre", shortLabel: "Set", narrowLabel: "S", label: "setembre" },
  { key: "oct", slug: "octubre", shortLabel: "Oct", narrowLabel: "O", label: "octubre" },
  { key: "nov", slug: "novembre", shortLabel: "Nov", narrowLabel: "N", label: "novembre" },
  { key: "des", slug: "desembre", shortLabel: "Des", narrowLabel: "D", label: "desembre" },
] as const satisfies ReadonlyArray<{
  key: Month;
  slug: string;
  shortLabel: string;
  narrowLabel: string;
  label: string;
}>;

export const SEASONAL_ACTIVITY_LABELS: Record<SeasonalActivity, string> = {
  inactive: "fora de temporada",
  possible: "possible",
  moderate: "moderada",
  good: "bona",
  peak: "pic de temporada",
};

/* "moderada" alone is an adjective with no subject. In a month strip or a
   table cell the column supplies one; standing on its own it needs the noun.
   "pic de temporada" and "fora de temporada" already carry theirs. */
export function monthlyActivityLabel(activity: SeasonalActivity) {
  const label = SEASONAL_ACTIVITY_LABELS[activity];
  return activity === "peak" || activity === "inactive" ? label : `activitat ${label}`;
}

export function monthInTimeZone(
  date = new Date(),
  timeZone = "Europe/Madrid",
): Month {
  const monthNumber = Number(
    new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone }).format(date),
  );
  const month = SEASON_MONTHS[monthNumber - 1]?.key;

  if (!month) throw new RangeError("The date does not contain a valid calendar month");
  return month;
}

/* Catalan contracts the article before a vowel: "a l’octubre" but "al
   novembre". The same three months drive both prepositions, so they share one
   list. */
const VOWEL_INITIAL_MONTHS: Month[] = ["abr", "ago", "oct"];

function monthLabel(month: Month) {
  const label = SEASON_MONTHS.find((item) => item.key === month)?.label;
  if (!label) throw new RangeError(`Unknown month: ${month}`);
  return label;
}

export function monthWithPreposition(month: Month) {
  const label = monthLabel(month);
  return VOWEL_INITIAL_MONTHS.includes(month) ? `a l’${label}` : `al ${label}`;
}

/** The opening half of a season range: "del setembre", "de l’octubre". */
export function monthWithFromPreposition(month: Month) {
  const label = monthLabel(month);
  return VOWEL_INITIAL_MONTHS.includes(month) ? `de l’${label}` : `del ${label}`;
}

export function monthFromSeasonSlug(slug: string): Month | undefined {
  return SEASON_MONTHS.find((month) => month.slug === slug)?.key;
}

export function seasonMonthPath(month: Month) {
  const slug = SEASON_MONTHS.find((item) => item.key === month)?.slug;
  if (!slug) throw new RangeError(`Unknown month: ${month}`);

  return `/temporada/${slug}`;
}
