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

export function monthWithPreposition(month: Month) {
  const label = SEASON_MONTHS.find((item) => item.key === month)?.label;
  if (!label) throw new RangeError(`Unknown month: ${month}`);

  return ["abr", "ago", "oct"].includes(month) ? `a l’${label}` : `al ${label}`;
}

export function monthFromSeasonSlug(slug: string): Month | undefined {
  return SEASON_MONTHS.find((month) => month.slug === slug)?.key;
}

export function seasonMonthPath(month: Month) {
  const slug = SEASON_MONTHS.find((item) => item.key === month)?.slug;
  if (!slug) throw new RangeError(`Unknown month: ${month}`);

  return `/temporada/${slug}`;
}
