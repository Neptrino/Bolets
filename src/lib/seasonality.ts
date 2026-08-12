import type { Month, SeasonalActivity } from "@/src/lib/types";

export const SEASON_MONTHS = [
  { key: "gen", shortLabel: "Gen", narrowLabel: "G", label: "gener" },
  { key: "feb", shortLabel: "Feb", narrowLabel: "F", label: "febrer" },
  { key: "mar", shortLabel: "Mar", narrowLabel: "M", label: "març" },
  { key: "abr", shortLabel: "Abr", narrowLabel: "A", label: "abril" },
  { key: "mai", shortLabel: "Mai", narrowLabel: "M", label: "maig" },
  { key: "jun", shortLabel: "Jun", narrowLabel: "J", label: "juny" },
  { key: "jul", shortLabel: "Jul", narrowLabel: "J", label: "juliol" },
  { key: "ago", shortLabel: "Ago", narrowLabel: "A", label: "agost" },
  { key: "set", shortLabel: "Set", narrowLabel: "S", label: "setembre" },
  { key: "oct", shortLabel: "Oct", narrowLabel: "O", label: "octubre" },
  { key: "nov", shortLabel: "Nov", narrowLabel: "N", label: "novembre" },
  { key: "des", shortLabel: "Des", narrowLabel: "D", label: "desembre" },
] as const satisfies ReadonlyArray<{
  key: Month;
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
