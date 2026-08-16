import { expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import { TERRAIN_THERMAL_SENSITIVITY_VERSION } from "@/src/lib/model-versions";
import { calculateSuitability } from "@/src/lib/scoring";
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
import {
  assertClmsEvidenceMatchesCell,
  buildProviderShadowLocationReport,
  canonicalAtmospherePointIdForCell,
  comparisonAppUrl,
  parseClmsComparisonEvidence,
  parsePrivateComparisonPoints,
  PROVIDER_SHADOW_REPORT_VERSION,
  type PrivateComparisonPoint,
  type TerrainComparisonEvidence,
} from "@/tests/helpers/provider-shadow-report";

const encodedPoints = process.env.SHADOW_COMPARE_POINTS ?? process.env.TERRAIN_COMPARE_POINTS;
const encodedClmsEvidence = process.env.SHADOW_COMPARE_CLMS_EVIDENCE;

function contains(cell: PredictionCell, point: PrivateComparisonPoint) {
  const [[west, south], [east, north]] = cell.cellBounds;
  return point.longitude >= west && point.longitude <= east &&
    point.latitude >= south && point.latitude <= north;
}

async function predictionCell(
  point: PrivateComparisonPoint,
  speciesId: string,
  appUrl: string,
) {
  const radius = 0.004;
  const params = new URLSearchParams({
    species: speciesId,
    west: String(point.longitude - radius),
    south: String(point.latitude - radius),
    east: String(point.longitude + radius),
    north: String(point.latitude + radius),
    resolution: "250",
    limit: "64",
  });
  const response = await fetch(`${appUrl}/api/predictions?${params}`);
  if (!response.ok) throw new Error(`Prediction API returned ${response.status}`);
  const payload = await response.json() as { cells?: PredictionCell[] };
  if (!Array.isArray(payload.cells)) throw new Error("Prediction API returned an invalid payload");
  const cell = payload.cells.find((candidate) => contains(candidate, point));
  if (!cell) throw new Error("The prediction API did not return the selected 250 m cell");
  return cell;
}

async function terrainObservation(
  cell: PredictionCell,
  elevationM: number,
): Promise<TerrainThermalObservation> {
  const latitude = cell.values.weatherGridLatitude;
  const longitude = cell.values.weatherGridLongitude;
  const targetAt = cell.values.weatherObservedAt;
  if (latitude === undefined || longitude === undefined || !targetAt) {
    throw new Error("The selected cell lacks terrain-replay metadata");
  }

  // This is a private CLI diagnostic only. It does not persist observation
  // coordinates, bypass production ingestion, or change a published score.
  const url = new URL("https://api.open-meteo.com/v1/meteofrance");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  configureOpenMeteoTerrainThermalRequest(url, targetAt, elevationM);
  const [location] = await fetchOpenMeteoLocations(url, "terrain thermal replay");
  const normalized = normalizeOpenMeteoAt(location, targetAt, "atmosphere");

  return {
    observedAt: normalized.values.weatherObservedAt as string,
    providerModel: TERRAIN_THERMAL_PROVIDER_MODEL,
    weatherGridLatitude: location.latitude as number,
    weatherGridLongitude: location.longitude as number,
    requestedElevationM: elevationM,
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

function conditionSnapshot(cell: PredictionCell): ConditionSnapshot {
  return {
    regionId: cell.regionId,
    observedAt: cell.observedAt,
    source: cell.source,
    confidence: cell.confidence,
    stale: cell.stale,
    unavailableFields: cell.unavailableFields,
    values: cell.values,
  };
}

async function terrainComparison(
  species: NonNullable<ReturnType<typeof getSpecies>>,
  cell: PredictionCell,
  snapshot: ConditionSnapshot,
): Promise<TerrainComparisonEvidence> {
  const representativeElevationM = cell.values.weatherElevationM;
  const localElevationM = cell.values.altitudeM;
  if (representativeElevationM === undefined || localElevationM === undefined) {
    return {
      status: "request-failed",
      reason: "provider-request-failed",
      methodVersion: TERRAIN_THERMAL_SENSITIVITY_VERSION,
    };
  }
  try {
    const [representative, local] = await Promise.all([
      terrainObservation(cell, representativeElevationM),
      terrainObservation(cell, localElevationM),
    ]);
    return compareTerrainThermalSuitability(
      species,
      snapshot,
      { representative, local },
    );
  } catch {
    return {
      status: "request-failed",
      reason: "provider-request-failed",
      methodVersion: TERRAIN_THERMAL_SENSITIVITY_VERSION,
    };
  }
}

it.skipIf(!encodedPoints)(
  "replays private observations across production and shadow providers without publishing coordinates",
  async () => {
    const points = parsePrivateComparisonPoints(encodedPoints!);
    const clmsEvidence = encodedClmsEvidence
      ? parseClmsComparisonEvidence(encodedClmsEvidence)
      : [];
    const clmsByPointId = new Map(clmsEvidence.map((evidence) => [
      evidence.sample.atmosphere_point_id,
      evidence,
    ]));

    const speciesId = process.env.SHADOW_COMPARE_SPECIES ?? "suillus-luteus";
    const species = getSpecies(speciesId);
    if (!species || species.predictionMode !== "current") {
      throw new Error("SHADOW_COMPARE_SPECIES must identify a current-prediction species");
    }
    const allowRemote = process.env.SHADOW_COMPARE_ALLOW_REMOTE === "1" ||
      process.env.SHADOW_COMPARE_ALLOW_REMOTE === "true";
    const appUrl = comparisonAppUrl(process.env.SHADOW_COMPARE_APP_URL, allowRemote);

    const matchedClmsPointIds = new Set<string>();
    const locations = await Promise.all(points.map(async (point, index) => {
      const cell = await predictionCell(point, speciesId, appUrl);
      const snapshot = conditionSnapshot(cell);
      const productionReplay = calculateSuitability(species, snapshot);
      const terrain = await terrainComparison(species, cell, snapshot);
      const atmospherePointId = canonicalAtmospherePointIdForCell(cell.cellId, cell.gridSizeM);
      const clms = clmsByPointId.get(atmospherePointId);
      if (clmsEvidence.length && !clms) {
        throw new Error("CLMS comparison evidence is missing the selected cell's canonical atmosphere point");
      }
      if (clms) {
        assertClmsEvidenceMatchesCell(clms, cell);
        matchedClmsPointIds.add(atmospherePointId);
      }
      return buildProviderShadowLocationReport({
        location: index + 1,
        species,
        published: {
          opportunityIndex: cell.opportunityIndex,
          fruitingConditionsScore: cell.fruitingConditionsScore,
          components: cell.components,
        },
        productionReplay,
        terrainComparison: terrain,
        clms,
      });
    }));
    if (matchedClmsPointIds.size !== clmsByPointId.size) {
      throw new Error("CLMS comparison evidence contains a canonical atmosphere point outside the selected cells");
    }

    const report = {
      reportVersion: PROVIDER_SHADOW_REPORT_VERSION,
      generatedAt: new Date().toISOString(),
      productionOrigin: new URL(appUrl).origin,
      locations,
      summary: {
        points: locations.length,
        productionReproduced: locations.filter((location) =>
          location.production.status === "reproduced"
        ).length,
        terrainCandidates: locations.filter((location) =>
          location.shadows.terrainThermal.status === "diagnostic-candidate"
        ).length,
        productionChanges: 0,
      },
    };

    expect(report.locations).toHaveLength(points.length);
    expect(report.locations.every((location) => location.productionChanged === false)).toBe(true);
    expect(report.locations.every((location) =>
      location.shadows.directArome.revisedScore === null &&
      location.shadows.copernicusClms.revisedScore === null
    )).toBe(true);
    console.log(JSON.stringify(report, null, 2));
  },
  60_000,
);
