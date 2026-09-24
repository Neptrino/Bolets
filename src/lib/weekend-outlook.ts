import { areaBounds, areaPath, areaProfiles, type AreaProfile } from "@/data/location-pages";
import { cataloniaSpatialBounds } from "@/data/regions";
import { getSpecies } from "@/data/species";
import { bucketsForBounds } from "@/src/lib/map-query";
import { civilDate, isoDate, monthPhrase, shiftCivilDate, type CivilDate } from "@/src/lib/week-window";
import type {
  ForecastHorizonConfidence,
  ForecastHorizonDays,
  GlobalPredictionMapCell,
  RegionId,
  SpatialBounds,
} from "@/src/lib/types";

/* The weekend outlook on the Avui page: the combined-map forecast frame the
   map slider already shows for day +1 to +5, read over Catalonia at 5 km and
   summarised per massís or comarca. It reuses the map's cached frames, so the
   page never adds a second forecast pipeline; the weekend block and the map
   slider always agree. */

export const WEEKEND_OUTLOOK_GRID_M = 5000 as const;
export const WEEKEND_OUTLOOK_FRAME_LIMIT = 1000;
/** A territory needs this many scored 5 km cells before its forecast is quoted. */
export const WEEKEND_OUTLOOK_MIN_CELLS = 4;
export const WEEKEND_OUTLOOK_ROWS = 3;

export interface WeekendOutlookTarget {
  day: CivilDate;
  dayName: "dissabte" | "diumenge";
  /** "dissabte 19 de setembre". */
  label: string;
  /** 0 means the target is today and the current readings apply. */
  offset: 0 | ForecastHorizonDays;
  horizonConfidence: ForecastHorizonConfidence | null;
}

/**
 * The weekend day the forecast core (five daily horizons) can describe:
 * Saturday from Monday to Friday, Sunday on Saturday, and today on Sunday.
 */
export function weekendOutlookTarget(at: Date): WeekendOutlookTarget {
  const today = civilDate(at);
  const dayName = today.weekday >= 5 ? "diumenge" : "dissabte";
  const offset = (today.weekday === 6 ? 0 : today.weekday === 5 ? 1 : 5 - today.weekday) as 0 | ForecastHorizonDays;
  const day = shiftCivilDate(today, offset);
  return {
    day,
    dayName,
    label: `${dayName} ${day.day} ${monthPhrase(day.month)}`,
    offset,
    horizonConfidence: offset === 0 ? null : offset === 1 ? "high" : offset <= 3 ? "moderate" : "limited",
  };
}

export const HORIZON_CONFIDENCE_LABELS: Record<ForecastHorizonConfidence, string> = {
  high: "alta",
  moderate: "moderada",
  limited: "limitada",
};

/**
 * The sentence that opens the weekend block: what the list is, which day it
 * describes and how far to trust it, written for the reader rather than as
 * a parameter dump. The distance to the weekend sets the caveat. Vocabulary
 * follows Search Console: people search «predicció bolets», not «previsió».
 */
export function weekendOutlookIntro(target: WeekendOutlookTarget): string {
  if (target.offset === 0)
    return "És diumenge: les lectures d’avui ja són les del cap de setmana. Aquestes són les zones amb millors condicions ara mateix.";
  const day = target.offset === 1 ? `Demà, ${target.label},` : `${target.dayName === "dissabte" ? "Dissabte" : "Diumenge"} ${target.label.replace(/^\S+ /u, "")}`;
  const lead = `${day} aquestes són les zones de Catalunya que arriben al cap de setmana amb les condicions més favorables, segons la pluja caiguda fins avui i el temps previst.`;
  if (target.horizonConfidence === "high")
    return `${lead} Amb un dia de marge, la predicció és fiable; revisa-la demà al matí abans de sortir.`;
  if (target.horizonConfidence === "moderate")
    return `${lead} A ${target.offset} dies vista la predicció és orientativa: torna-hi divendres per confirmar-la.`;
  return `${lead} A ${target.offset} dies vista la predicció encara pot canviar força: pren-la com una primera orientació i torna-hi a partir de dijous.`;
}

export interface WeekendOutlookHub {
  slug: string;
  name: string;
  prepositionalName: string;
  typeLabel: AreaProfile["typeLabel"];
  regionId: RegionId;
  bounds: SpatialBounds;
  path: string;
}

export function weekendOutlookHubs(): WeekendOutlookHub[] {
  return areaProfiles.map((area) => ({
    slug: area.slug,
    name: area.name,
    prepositionalName: area.prepositionalName,
    typeLabel: area.typeLabel,
    regionId: area.regionId,
    bounds: areaBounds(area),
    path: areaPath(area),
  }));
}

export interface WeekendOutlookRow extends WeekendOutlookHub {
  speciesId: string;
  speciesName: string;
  /** Best forecast cell in the territory. */
  score: number;
  scoredCellCount: number;
  /** Share of scored cells reaching the public "baixa" band (20+). */
  score20CellShare: number;
}

function cellCentre(cell: GlobalPredictionMapCell): [number, number] {
  const [[west, south], [east, north]] = cell.cellBounds;
  return [(west + east) / 2, (south + north) / 2];
}

function within(bounds: SpatialBounds, [longitude, latitude]: [number, number]) {
  return longitude >= bounds.west && longitude <= bounds.east &&
    latitude >= bounds.south && latitude <= bounds.north;
}

/** A cell belongs to a territory when its centre falls inside the hub bounds, the same rule the area summaries use. */
export function isCellInHub(cell: GlobalPredictionMapCell, hub: Pick<WeekendOutlookHub, "bounds">) {
  return within(hub.bounds, cellCentre(cell));
}

const catalanCollator = new Intl.Collator("ca", { sensitivity: "base" });

/**
 * One row per territory, best first. A cell counts for a territory when its
 * centre falls inside the hub bounds, the same rule the area summaries use.
 * Withheld cells (null score) are ignored; a territory with too few scored
 * cells or no positive cell is left out rather than quoted as zero.
 */
export function summariseWeekendOutlook(
  cells: readonly GlobalPredictionMapCell[],
  hubs: readonly WeekendOutlookHub[] = weekendOutlookHubs(),
): WeekendOutlookRow[] {
  const seen = new Set<string>();
  const uniqueCells = cells.filter((cell) => {
    if (seen.has(cell.cellId)) return false;
    seen.add(cell.cellId);
    return true;
  });
  return hubs.flatMap((hub) => {
    const scored = uniqueCells.filter((cell) =>
      typeof cell.score === "number" && isCellInHub(cell, hub));
    if (scored.length < WEEKEND_OUTLOOK_MIN_CELLS) return [];
    const best = scored
      .filter((cell) => cell.topSpeciesId !== null && (cell.score ?? 0) > 0)
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))[0];
    const species = best?.topSpeciesId ? getSpecies(best.topSpeciesId) : null;
    if (!best || !species) return [];
    return [{
      ...hub,
      speciesId: species.speciesId,
      speciesName: species.identity.commonName,
      score: best.score as number,
      scoredCellCount: scored.length,
      score20CellShare: scored.filter((cell) => (cell.score ?? 0) >= 20).length / scored.length,
    }];
  }).sort((left, right) =>
    right.score - left.score ||
    right.score20CellShare - left.score20CellShare ||
    catalanCollator.compare(left.name, right.name));
}

export type WeekendOutlookFrameLoader = (
  bounds: SpatialBounds,
  offset: ForecastHorizonDays,
) => Promise<{ cells: GlobalPredictionMapCell[]; truncated: boolean }>;

export interface WeekendOutlook {
  target: WeekendOutlookTarget;
  rows: WeekendOutlookRow[];
  /** True when at least one frame bucket failed or was truncated. */
  partial: boolean;
}

/** The Catalonia-wide 5 km request buckets the map warmer also walks. */
export function weekendOutlookBuckets() {
  return bucketsForBounds(cataloniaSpatialBounds, WEEKEND_OUTLOOK_GRID_M, cataloniaSpatialBounds);
}

/**
 * Reads every bucket of the target day's frame with bounded concurrency. A
 * failed bucket only removes its cells: territories elsewhere still get their
 * forecast, and the result says it is partial.
 */
export async function loadWeekendOutlook(
  target: WeekendOutlookTarget,
  loadFrame: WeekendOutlookFrameLoader,
  options: { hubs?: readonly WeekendOutlookHub[]; concurrency?: number } = {},
): Promise<WeekendOutlook> {
  if (target.offset === 0) return { target, rows: [], partial: false };
  const offset = target.offset;
  const buckets = weekendOutlookBuckets();
  const cells: GlobalPredictionMapCell[] = [];
  let partial = false;
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(options.concurrency ?? 3, buckets.length) }, async () => {
    while (next < buckets.length) {
      const bucket = buckets[next++]!;
      try {
        const frame = await loadFrame(bucket, offset);
        cells.push(...frame.cells);
        if (frame.truncated) partial = true;
      } catch {
        partial = true;
      }
    }
  }));
  return { target, rows: summariseWeekendOutlook(cells, options.hubs).slice(0, WEEKEND_OUTLOOK_ROWS), partial };
}

export function weekendOutlookDateIso(target: WeekendOutlookTarget) {
  return isoDate(target.day);
}
