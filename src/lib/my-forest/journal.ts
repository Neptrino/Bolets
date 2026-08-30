import { getCatalogueSpecies } from "@/data/catalogue";
import type { JournalSeasonSummary } from "@/src/lib/my-forest/types";

export type JournalAggregateRow = {
  species_id: string;
  visibility: "private" | "public";
  finding_count: number;
  first_observed_on: string;
  latest_observed_on: string;
};

function madridYearMonth(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

export function journalSeasonWindow(date = new Date()) {
  const { year, month } = madridYearMonth(date);
  const startYear = month >= 7 ? year : year - 1;
  return {
    startDate: `${startYear}-07-01`,
    endDate: `${startYear + 1}-07-01`,
    seasonLabel: `${startYear}–${String(startYear + 1).slice(-2)}`,
  };
}

export function summariseJournalSeason(
  rows: JournalAggregateRow[],
  date = new Date(),
): JournalSeasonSummary {
  const window = journalSeasonWindow(date);
  const counts = new Map<string, number>();
  let total = 0;
  let publicCount = 0;
  let privateCount = 0;
  let firstObservedOn: string | null = null;
  let latestObservedOn: string | null = null;

  for (const row of rows) {
    const count = Number(row.finding_count);
    total += count;
    if (row.visibility === "public") publicCount += count;
    else privateCount += count;
    counts.set(row.species_id, (counts.get(row.species_id) ?? 0) + count);
    if (!firstObservedOn || row.first_observed_on < firstObservedOn) {
      firstObservedOn = row.first_observed_on;
    }
    if (!latestObservedOn || row.latest_observed_on > latestObservedOn) {
      latestObservedOn = row.latest_observed_on;
    }
  }

  const top = [...counts.entries()].sort((left, right) =>
    right[1] - left[1] || left[0].localeCompare(right[0], "ca")
  )[0];
  const topSpecies = top ? {
    speciesId: top[0],
    name: getCatalogueSpecies(top[0])?.identity.commonName ?? top[0],
    count: top[1],
  } : null;

  return {
    ...window,
    total,
    speciesCount: counts.size,
    publicCount,
    privateCount,
    topSpecies,
    firstObservedOn,
    latestObservedOn,
  };
}
