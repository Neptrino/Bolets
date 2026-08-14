import { regionSelectItems } from "@/data/regions";
import {
  loadCurrentOverview,
  rankCurrentOverviewItems,
  type CurrentOverviewItem,
} from "@/src/lib/current-overview";
import type { RegionId } from "@/src/lib/types";

export type DailyShareSlug = "catalunya" | Exclude<RegionId, "altres">;

export interface DailyShareReading {
  speciesId: string;
  regionName: string;
  speciesName: string;
  score: number;
  label: string;
}

export interface DailyShareCard {
  slug: DailyShareSlug;
  title: string;
  eyebrow: string;
  observedAt: string | null;
  available: boolean;
  readings: DailyShareReading[];
  mapPath: string;
  shareText: string;
}

const cardDate = new Intl.DateTimeFormat("ca-ES", {
  dateStyle: "long",
  timeZone: "Europe/Madrid",
});

const cardTime = new Intl.DateTimeFormat("ca-ES", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

function availableReading(item: CurrentOverviewItem): DailyShareReading | null {
  const result = item.summary?.result;
  if (item.status !== "available" || result?.opportunityIndex === null || result?.opportunityIndex === undefined) {
    return null;
  }

  return {
    speciesId: item.speciesId,
    regionName: item.regionName,
    speciesName: item.speciesName,
    score: result.opportunityIndex,
    label: result.label,
  };
}

function observationLabel(observedAt: string | null) {
  if (!observedAt) return "Sense lectura publicable";
  const date = new Date(observedAt);
  return `Dades del ${cardDate.format(date)} · ${cardTime.format(date)}`;
}

function globalShareText(readings: DailyShareReading[], observedAt: string | null, mapPath: string) {
  const heading = `Condicions de bolets avui a Catalunya · ${observedAt ? cardDate.format(new Date(observedAt)) : "dades pendents"}`;
  const highlights = readings.length > 0 && readings.every((reading) => reading.score === 0)
    ? "Avui no hi ha condicions favorables publicables a Catalunya."
    : readings.length > 0
    ? readings.map((reading) => `${reading.regionName}: ${reading.speciesName} · ${reading.score}/100`).join("\n")
    : "Avui no hi ha lectures territorials publicables.";

  return `${heading}\n\n${highlights}\n\nLectura territorial: no confirma presència ni assenyala punts de recol·lecció.\nhttps://bolets.app${mapPath}`;
}

function regionalShareText(title: string, reading: DailyShareReading | null, observedAt: string | null, mapPath: string) {
  const heading = `Condicions de bolets avui: ${title} · ${observedAt ? cardDate.format(new Date(observedAt)) : "dades pendents"}`;
  const highlight = reading?.score === 0
    ? "Avui no hi ha condicions favorables publicables en aquesta zona."
    : reading
    ? `La lectura publicada més favorable és ${reading.speciesName}: ${reading.score}/100 (${reading.label}).`
    : "Avui no hi ha una lectura territorial publicable per aquesta zona.";

  return `${heading}\n\n${highlight}\n\nLectura territorial: no confirma presència ni assenyala punts de recol·lecció.\nhttps://bolets.app${mapPath}`;
}

function latestObservation(items: CurrentOverviewItem[]) {
  return items.reduce<string | null>((latest, item) => {
    const observedAt = item.summary?.snapshot.observedAt;
    if (!observedAt) return latest;
    return !latest || new Date(observedAt).getTime() > new Date(latest).getTime() ? observedAt : latest;
  }, null);
}

/**
 * Converts only publishable current-condition readings into public share cards.
 * Withheld and unavailable inputs remain visibly unavailable; they never get a
 * substitute score or a derived regional average.
 */
export function createDailyShareCards(items: CurrentOverviewItem[]): DailyShareCard[] {
  const observedAt = latestObservation(items);
  const rankedReadings = rankCurrentOverviewItems(items)
    .map(availableReading)
    .filter((reading): reading is DailyShareReading => reading !== null);
  const globalReadings = rankedReadings.slice(0, 3);
  const globalMapPath = "/bolets-avui";

  const catalonia: DailyShareCard = {
    slug: "catalunya",
    title: "Catalunya",
    eyebrow: observationLabel(observedAt),
    observedAt,
    available: globalReadings.length > 0,
    readings: globalReadings,
    mapPath: globalMapPath,
    shareText: globalShareText(globalReadings, observedAt, globalMapPath),
  };

  const regionalCards = regionSelectItems
    .filter((region): region is { value: Exclude<RegionId, "altres">; label: string } => region.value !== "altres")
    .map(({ value: regionId, label }) => {
      const reading = rankCurrentOverviewItems(items.filter((item) => item.regionId === regionId))
        .map(availableReading)
        .find((candidate): candidate is DailyShareReading => candidate !== null) ?? null;

      const mapPath = reading ? `/map?species=${reading.speciesId}&region=${regionId}` : "/map";

      return {
        slug: regionId,
        title: label,
        eyebrow: observationLabel(observedAt),
        observedAt,
        available: reading !== null,
        readings: reading ? [reading] : [],
        mapPath,
        shareText: regionalShareText(label, reading, observedAt, mapPath),
      } satisfies DailyShareCard;
    });

  return [catalonia, ...regionalCards];
}

export async function loadDailyShareCards() {
  return createDailyShareCards(await loadCurrentOverview());
}

export async function loadDailyShareCard(slug: string) {
  const cards = await loadDailyShareCards();
  return cards.find((card) => card.slug === slug) ?? null;
}

export function dailyShareImagePath(slug: DailyShareSlug) {
  return `/compartir/${slug}/imatge`;
}
