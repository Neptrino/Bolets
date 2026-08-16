import { expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import {
  compareTerrainThermalSuitability,
  TERRAIN_THERMAL_PROVIDER_MODEL,
  TERRAIN_THERMAL_SOURCE_RESOLUTION_M,
  type TerrainThermalObservation,
} from "@/src/lib/terrain-thermal";
import type { ConditionSnapshot, PredictionCell } from "@/src/lib/types";
import {
  configureOpenMeteoTerrainThermalRequest,
  fetchOpenMeteoLocations,
  normalizeOpenMeteoAt,
} from "@/supabase/functions/_shared/open-meteo";
import { comparisonAppUrl } from "@/tests/helpers/provider-shadow-report";

type ComparisonPoint = { latitude: number; longitude: number };

const encodedPoints = process.env.TERRAIN_COMPARE_POINTS;

function comparisonPoints(): ComparisonPoint[] {
  if (!encodedPoints) return [];
  const points = JSON.parse(encodedPoints) as unknown;
  if (!Array.isArray(points) || points.some((point) =>
    !point ||
    typeof point !== "object" ||
    !Number.isFinite((point as ComparisonPoint).latitude) ||
    !Number.isFinite((point as ComparisonPoint).longitude)
  )) {
    throw new Error("TERRAIN_COMPARE_POINTS must be a JSON array of latitude/longitude objects");
  }
  return points as ComparisonPoint[];
}

function contains(cell: PredictionCell, point: ComparisonPoint) {
  const [[west, south], [east, north]] = cell.cellBounds;
  return point.longitude >= west && point.longitude <= east &&
    point.latitude >= south && point.latitude <= north;
}

async function predictionCell(point: ComparisonPoint) {
  const radius = 0.004;
  const params = new URLSearchParams({
    species: "suillus-luteus",
    west: String(point.longitude - radius),
    south: String(point.latitude - radius),
    east: String(point.longitude + radius),
    north: String(point.latitude + radius),
    resolution: "250",
    limit: "64",
  });
  const allowRemote = process.env.TERRAIN_COMPARE_ALLOW_REMOTE === "1" ||
    process.env.TERRAIN_COMPARE_ALLOW_REMOTE === "true" ||
    process.env.SHADOW_COMPARE_ALLOW_REMOTE === "1" ||
    process.env.SHADOW_COMPARE_ALLOW_REMOTE === "true";
  const appUrl = comparisonAppUrl(process.env.TERRAIN_COMPARE_APP_URL, allowRemote);
  const response = await fetch(`${appUrl}/api/predictions?${params}`);
  if (!response.ok) throw new Error(`Prediction API returned ${response.status}`);
  const payload = await response.json() as { cells: PredictionCell[] };
  const cell = payload.cells.find((candidate) => contains(candidate, point));
  if (!cell) throw new Error("The prediction API did not return the selected 250 m cell");
  return cell;
}

async function terrainObservation(
  cell: PredictionCell,
  elevation: number,
): Promise<TerrainThermalObservation> {
  const values = cell.values;
  const latitude = values.weatherGridLatitude;
  const longitude = values.weatherGridLongitude;
  const targetAt = values.weatherObservedAt;
  if (
    latitude === undefined ||
    longitude === undefined ||
    !targetAt
  ) {
    throw new Error("The selected cell lacks terrain-replay metadata");
  }

  // Diagnostic tooling only: production weather remains behind authenticated
  // Edge ingestion. Coordinates come from the process environment and are not
  // written to fixtures, diagnostic output, or version-controlled files.
  const url = new URL("https://api.open-meteo.com/v1/meteofrance");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  configureOpenMeteoTerrainThermalRequest(url, targetAt, elevation);
  const [location] = await fetchOpenMeteoLocations(url, "terrain thermal replay");
  const normalized = normalizeOpenMeteoAt(location, targetAt, "atmosphere");

  return {
    observedAt: normalized.values.weatherObservedAt as string,
    providerModel: TERRAIN_THERMAL_PROVIDER_MODEL,
    weatherGridLatitude: location.latitude as number,
    weatherGridLongitude: location.longitude as number,
    requestedElevationM: elevation,
    returnedElevationM: location.elevation as number,
    sourceResolutionM: TERRAIN_THERMAL_SOURCE_RESOLUTION_M,
    values: {
      temperatureAvg14dC: normalized.values.temperatureAvg14dC,
      temperatureAvg20dC: normalized.values.temperatureAvg20dC,
      frostHours14d: normalized.values.frostHours14d,
      frostHours20d: normalized.values.frostHours20d,
      heatHours14d: normalized.values.heatHours14d,
      heatHours20d: normalized.values.heatHours20d,
    },
  };
}

it.skipIf(!encodedPoints)(
  "compares private field observations without persisting their coordinates",
  async () => {
    const species = getSpecies("suillus-luteus")!;
    const outputs = await Promise.all(comparisonPoints().map(async (point, index) => {
      const cell = await predictionCell(point);
      const snapshot: ConditionSnapshot = {
        regionId: cell.regionId,
        observedAt: cell.observedAt,
        source: cell.source,
        confidence: cell.confidence,
        stale: cell.stale,
        unavailableFields: cell.unavailableFields,
        values: cell.values,
      };
      const representativeElevationM = cell.values.weatherElevationM;
      const localElevationM = cell.values.altitudeM;
      if (representativeElevationM === undefined || localElevationM === undefined) {
        throw new Error("The selected cell lacks replay elevations");
      }
      const [representative, local] = await Promise.all([
        terrainObservation(cell, representativeElevationM),
        terrainObservation(cell, localElevationM),
      ]);
      const comparison = compareTerrainThermalSuitability(
        species,
        snapshot,
        { representative, local },
      );
      expect(comparison.status).toBe("available");
      if (comparison.status !== "available") return comparison;
      return {
        location: index + 1,
        confidence: comparison.confidence,
        elevation: {
          representativeM: comparison.representativeElevationM,
          localM: comparison.localElevationM,
          deltaM: comparison.elevationDeltaM,
        },
        resolution: {
          atmosphereM: comparison.atmosphericResolutionM,
          soilMoistureM: comparison.soilMoistureResolutionM,
        },
        baseline: {
          opportunity: comparison.baseline.opportunityIndex,
          fruitingConditions: comparison.baseline.fruitingConditionsScore,
          components: comparison.baseline.components,
        },
        terrainAdjusted: {
          opportunity: comparison.terrainAdjusted.opportunityIndex,
          fruitingConditions: comparison.terrainAdjusted.fruitingConditionsScore,
          components: comparison.terrainAdjusted.components,
        },
        changedFields: comparison.changedFields,
      };
    }));

    console.log(JSON.stringify(outputs, null, 2));
  },
  30_000,
);
