import { regionSelectItems } from "@/data/regions";
import {
  loadAreaOverview,
  loadCurrentOverview,
  overviewHubs,
  rankCurrentOverviewItems,
  type AreaOverviewItem,
  type CurrentOverviewItem,
} from "@/src/lib/current-overview";
import { opportunityLabel } from "@/src/lib/scoring";
import type { RegionId } from "@/src/lib/types";

export type DailyShareSlug = "catalunya" | Exclude<RegionId, "altres"> | `zona-${string}`;
export type DailyShareFormat = "feed" | "story" | "landscape";
export type DailyShareScope = "overview" | "region" | "territory";

export interface DailyShareReading {
  speciesId: string;
  regionName: string;
  speciesName: string;
  score: number;
  label: string;
  positiveCellShare: number;
  score20CellShare: number;
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
  scope: DailyShareScope;
  scopeLabel: string;
  isPreview?: boolean;
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

const DAILY_SHARE_LOAD_TIMEOUT_MS = 2_500;

async function loadWithin<T>(loader: () => Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      loader(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Daily share data timed out")), DAILY_SHARE_LOAD_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function availableReading(item: CurrentOverviewItem): DailyShareReading | null {
  const score = item.summary?.bestCell.score;
  if (item.status !== "available" || score === null || score === undefined) {
    return null;
  }

  return {
    speciesId: item.speciesId,
    regionName: item.regionName,
    speciesName: item.speciesName,
    score,
    label: opportunityLabel(score),
    positiveCellShare: item.summary?.positiveCellShare ?? 0,
    score20CellShare: item.summary?.score20CellShare ?? 0,
  };
}

function availableTerritoryReading(item: AreaOverviewItem): DailyShareReading | null {
  const score = item.summary?.bestCell.score;
  if (item.status !== "available" || score === null || score === undefined) {
    return null;
  }

  return {
    speciesId: item.speciesId,
    regionName: item.areaName,
    speciesName: item.speciesName,
    score,
    label: opportunityLabel(score),
    positiveCellShare: item.summary?.positiveCellShare ?? 0,
    score20CellShare: item.summary?.score20CellShare ?? 0,
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

function regionalShareText(title: string, readings: DailyShareReading[], observedAt: string | null, mapPath: string) {
  const heading = `Condicions de bolets avui: ${title} · ${observedAt ? cardDate.format(new Date(observedAt)) : "dades pendents"}`;
  const highlight = readings.length > 0 && readings.every((reading) => reading.score === 0)
    ? "Avui no hi ha condicions favorables publicables en aquesta zona."
    : readings.length > 0
    ? readings.map((reading) => `${reading.speciesName}: ${reading.score}/100 (${reading.label}).`).join("\n")
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

function observationFromTerritory(item: AreaOverviewItem) {
  return item.summary?.snapshot.observedAt ?? null;
}

function territorySlug(areaSlug: string): DailyShareSlug {
  // Route segments cannot contain the slash used by promoted paratge hubs.
  // Doubling the hyphen keeps every public card in the single dynamic segment.
  return `zona-${areaSlug.replaceAll("/", "--")}`;
}

function topReadingsByZone(readings: DailyShareReading[], limit = 3) {
  const seenZones = new Set<string>();
  return readings.filter((reading) => {
    if (seenZones.has(reading.regionName)) return false;
    seenZones.add(reading.regionName);
    return true;
  }).slice(0, limit);
}

/**
 * Converts only publishable current-condition readings into public share cards.
 * Withheld and unavailable inputs remain visibly unavailable; they never get a
 * substitute score or a derived regional average.
 */
export function createDailyShareCards(items: CurrentOverviewItem[], territoryItems: AreaOverviewItem[] = []): DailyShareCard[] {
  const observedAt = latestObservation(items);
  const rankedReadings = rankCurrentOverviewItems(items)
    .map(availableReading)
    .filter((reading): reading is DailyShareReading => reading !== null);
  const globalReadings = topReadingsByZone(rankedReadings);
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
    scope: "overview",
    scopeLabel: "Visió general",
  };

  const regionalCards = regionSelectItems
    .filter((region): region is { value: Exclude<RegionId, "altres">; label: string } => region.value !== "altres")
    .map(({ value: regionId, label }) => {
      const readings = rankCurrentOverviewItems(items.filter((item) => item.regionId === regionId))
        .map(availableReading)
        .filter((candidate): candidate is DailyShareReading => candidate !== null)
        .slice(0, 3);

      const mapPath = readings[0] ? `/map?species=${readings[0].speciesId}&region=${regionId}` : "/map";

      return {
        slug: regionId,
        title: label,
        eyebrow: observationLabel(observedAt),
        observedAt,
        available: readings.length > 0,
        readings,
        mapPath,
        shareText: regionalShareText(label, readings, observedAt, mapPath),
        scope: "region",
        scopeLabel: "Regió de predicció",
      } satisfies DailyShareCard;
    });

  const territoryItemsBySlug = new Map(territoryItems.map((item) => [item.areaSlug, item]));
  const territoryCards = overviewHubs().map((hub) => {
    const item = territoryItemsBySlug.get(hub.slug);
    const reading = item ? availableTerritoryReading(item) : null;
    const observedAt = item ? observationFromTerritory(item) : null;
    const readings = reading ? [reading] : [];

    return {
      slug: territorySlug(hub.slug),
      title: hub.name,
      eyebrow: observationLabel(observedAt),
      observedAt,
      available: Boolean(reading),
      readings,
      mapPath: hub.path,
      shareText: regionalShareText(hub.name, readings, observedAt, hub.path),
      scope: "territory",
      scopeLabel: hub.typeLabel === "paratge" ? "Paratge" : hub.typeLabel,
    } satisfies DailyShareCard;
  });

  return [catalonia, ...regionalCards, ...territoryCards];
}

export async function loadDailyShareCards() {
  const [items, territoryItems] = await Promise.all([
    loadWithin(loadCurrentOverview, [] as CurrentOverviewItem[]),
    loadWithin(loadAreaOverview, [] as AreaOverviewItem[]),
  ]);
  return createDailyShareCards(items, territoryItems);
}

export async function loadDailyShareCard(slug: string) {
  const cards = await loadDailyShareCards();
  return cards.find((card) => card.slug === slug) ?? null;
}

const favourablePreviewSpecies = [
  { speciesId: "boletus-pinophilus", speciesName: "Cep roig" },
  { speciesId: "boletus-edulis", speciesName: "Cep" },
  { speciesId: "cantharellus-cibarius", speciesName: "Rossinyol" },
];

const favourablePreviewRegions: Array<{ regionName: string; score: number }> = [
  { regionName: "Pirineus", score: 91 }, { regionName: "Prepirineus", score: 84 }, { regionName: "Empordà", score: 78 },
  { regionName: "Catalunya Central", score: 86 }, { regionName: "Sistemes interiors", score: 73 }, { regionName: "Montseny", score: 88 },
  { regionName: "Serralades Costeres", score: 76 }, { regionName: "Serralades Prelitorals", score: 82 }, { regionName: "Ports", score: 80 },
];

const favourablePreviewReadings: DailyShareReading[] = favourablePreviewRegions.flatMap(({ regionName, score }) => favourablePreviewSpecies.map((species, index) => {
  const readingScore = score - index * 6;
  return {
    regionName,
    speciesId: species.speciesId,
    speciesName: species.speciesName,
    score: readingScore,
    label: opportunityLabel(readingScore),
    positiveCellShare: Math.min(0.84, Math.max(0.18, readingScore / 125)),
    score20CellShare: Math.min(0.68, Math.max(0.08, (readingScore - 18) / 130)),
  };
}));

const favourablePreviewEyebrow = "Dades simulades · només en local";
const favourablePreviewNotice = "PREVISUALITZACIÓ LOCAL — dades simulades; no publicar.";

/**
 * Visual fixture for developing the share-card layout. It is never selected
 * outside `next dev`, and is deliberately labelled as simulated throughout.
 */
export function createFavourableDailySharePreviewCards(): DailyShareCard[] {
  const globalMapPath = "/bolets-avui";
  const globalReadings = topReadingsByZone(
    [...favourablePreviewReadings].sort((left, right) => right.score - left.score),
  );
  const catalunya: DailyShareCard = {
    slug: "catalunya",
    title: "Catalunya",
    eyebrow: favourablePreviewEyebrow,
    observedAt: null,
    available: true,
    readings: globalReadings,
    mapPath: globalMapPath,
    shareText: `${favourablePreviewNotice}\n\nCondicions favorables de demostració a Catalunya.`,
    scope: "overview",
    scopeLabel: "Visió general",
    isPreview: true,
  };

  const regionalCards = regionSelectItems
    .filter((region): region is { value: Exclude<RegionId, "altres">; label: string } => region.value !== "altres")
    .map(({ value: regionId, label }) => {
      const readings = favourablePreviewReadings.filter((candidate) => candidate.regionName === label);
      const mapPath = `/map?species=${readings[0]!.speciesId}&region=${regionId}`;

      return {
        slug: regionId,
        title: label,
        eyebrow: favourablePreviewEyebrow,
        observedAt: null,
        available: true,
        readings,
        mapPath,
        shareText: `${favourablePreviewNotice}\n\nCondicions favorables de demostració a ${label}.`,
        scope: "region",
        scopeLabel: "Regió de predicció",
        isPreview: true,
      } satisfies DailyShareCard;
    });

  const territoryCards = overviewHubs().map((territory, index) => {
    const reading = favourablePreviewReadings[index % favourablePreviewReadings.length]!;
    const score = Math.max(54, reading.score - (index % 4) * 4);
    const territoryReading: DailyShareReading = {
      ...reading,
      regionName: territory.name,
      score,
      label: opportunityLabel(score),
    };

    return {
      slug: territorySlug(territory.slug),
      title: territory.name,
      eyebrow: favourablePreviewEyebrow,
      observedAt: null,
      available: true,
      readings: [territoryReading],
      mapPath: territory.path,
      shareText: `${favourablePreviewNotice}\n\nCondicions favorables de demostració a ${territory.name}.`,
      scope: "territory",
      scopeLabel: territory.typeLabel === "paratge" ? "Paratge" : territory.typeLabel,
      isPreview: true,
    } satisfies DailyShareCard;
  });

  return [catalunya, ...regionalCards, ...territoryCards];
}

export function isLocalFavourablePreview(value: string | undefined) {
  return process.env.NODE_ENV === "development" && value === "favorable";
}

export async function loadFavourableDailySharePreviewCard(slug: string) {
  return createFavourableDailySharePreviewCards().find((card) => card.slug === slug) ?? null;
}

export function dailyShareImagePath(slug: DailyShareSlug, format: DailyShareFormat = "feed") {
  return `/compartir/${slug}/imatge?format=${format}`;
}
