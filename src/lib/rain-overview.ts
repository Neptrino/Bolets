import type { SpatialBounds } from "@/src/lib/types";

/**
 * Territorial reading of the same rain cells the map paints. The windows are
 * the buffered areas around the places each hub publishes, not administrative
 * boundaries, and every cell counts once: 5 km cells are equal-area, so a
 * plain mean is the equal-area mean.
 */

export interface RainfallCellReading {
  cellId: string;
  /** Cell centre, longitude then latitude. */
  centre: [number, number];
  rainfall7dMm?: number;
  rainfall14dMm?: number;
  rainfallDays7d?: number;
  drySpellDays?: number;
}

export interface RainfallTerritory {
  slug: string;
  name: string;
  typeLabel: string;
  prepositionalName: string;
  path: string;
  bounds: SpatialBounds;
}

export interface RainfallTerritoryReading extends RainfallTerritory {
  cellCount: number;
  meanRainfall7dMm?: number;
  maxRainfall7dMm?: number;
  meanRainfall14dMm?: number;
  meanRainfallDays7d?: number;
  meanDrySpellDays?: number;
}

function mean(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : undefined;
}

function insideBounds(centre: [number, number], bounds: SpatialBounds) {
  const [longitude, latitude] = centre;
  return longitude >= bounds.west && longitude <= bounds.east
    && latitude >= bounds.south && latitude <= bounds.north;
}

function collect(readings: RainfallCellReading[], field: keyof RainfallCellReading) {
  return readings
    .map((reading) => reading[field])
    .filter((value): value is number => typeof value === "number");
}

export function summariseTerritoryRainfall(
  territory: RainfallTerritory,
  cells: RainfallCellReading[],
): RainfallTerritoryReading {
  const inside = cells.filter((cell) => insideBounds(cell.centre, territory.bounds));
  const rainfall7d = collect(inside, "rainfall7dMm");
  return {
    ...territory,
    cellCount: inside.length,
    meanRainfall7dMm: mean(rainfall7d),
    maxRainfall7dMm: rainfall7d.length ? Math.max(...rainfall7d) : undefined,
    meanRainfall14dMm: mean(collect(inside, "rainfall14dMm")),
    meanRainfallDays7d: mean(collect(inside, "rainfallDays7d")),
    meanDrySpellDays: mean(collect(inside, "drySpellDays")),
  };
}

/** Wettest first; a window with no readings sorts last rather than as zero. */
export function rankTerritoryRainfall(
  territories: RainfallTerritory[],
  cells: RainfallCellReading[],
): RainfallTerritoryReading[] {
  return territories
    .map((territory) => summariseTerritoryRainfall(territory, cells))
    .filter((reading) => reading.cellCount > 0)
    .sort((left, right) =>
      (right.meanRainfall7dMm ?? -1) - (left.meanRainfall7dMm ?? -1)
      || left.name.localeCompare(right.name, "ca"),
    );
}

export interface RainfallHeadline {
  /** Territories whose mean reached the wet threshold, wettest first. */
  wettest: RainfallTerritoryReading[];
  driestCount: number;
  countryMean7dMm?: number;
  countryMax7dMm?: number;
}

/** Enough rain over a week to have reached the soil across a territory. */
export const TERRITORY_WET_THRESHOLD_MM = 15;

/** A territory under this has had, in practice, a dry week. */
export const TERRITORY_DRY_THRESHOLD_MM = 5;

export function rainfallHeadline(
  readings: RainfallTerritoryReading[],
  cells: RainfallCellReading[],
): RainfallHeadline {
  const countryRain = collect(cells, "rainfall7dMm");
  return {
    wettest: readings.filter((reading) => (reading.meanRainfall7dMm ?? 0) >= TERRITORY_WET_THRESHOLD_MM),
    driestCount: readings.filter((reading) => (reading.meanRainfall7dMm ?? 0) < TERRITORY_DRY_THRESHOLD_MM).length,
    countryMean7dMm: mean(countryRain),
    countryMax7dMm: countryRain.length ? Math.max(...countryRain) : undefined,
  };
}
