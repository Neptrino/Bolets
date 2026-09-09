import { MAX_TEMPERATURE_STATIONS, STATION_TEMPERATURE_VERSION, STATION_TEMPERATURE_VERSIONS } from "./station-temperature-field.ts";
import { THERMAL_FIELDS, validThermalSources } from "./station-temperature-scoring.ts";
import { loadStationTemperatureScorer } from "./station-temperature-store.ts";
import { HEAT_DEGREE_FIELDS, validHeatDegreeHours } from "./heat-intensity.ts";

type Values = Record<string, unknown>;
type Database = Parameters<typeof loadStationTemperatureScorer>[0];
export type TemperatureTarget = { values: Values; latitude: number; longitude: number; stale?: boolean };
const TABLE = "cell_temperature_cache";
const PATCH_FIELDS = [...THERMAL_FIELDS, ...HEAT_DEGREE_FIELDS, "thermalReferenceElevationM", "temperatureSource", "temperatureQuality",
  "temperatureMinimumStations", "temperatureModelOnlyHours"] as const;
const CONTROL_FIELDS = ["altitudeM", "weatherObservedAt", "weatherModel", "atmosphericResolutionM",
  "weatherGridLatitude", "weatherGridLongitude", "weatherElevationM", ...THERMAL_FIELDS] as const;

/** Every input consulted by the pure scorer, including the original control values.
 * Immutable source hashes bind the model hours and frozen station publication.
 * Water, species and habitat never enter this species-independent key. */
export async function temperatureCacheKey(target: TemperatureTarget): Promise<string | null> {
  if (target.stale || target.values.thermalReferenceElevationM !== undefined ||
    !validThermalSources(target.values.thermalSources) ||
    ![target.latitude, target.longitude, target.values.altitudeM].every((v) => typeof v === "number" && Number.isFinite(v))) return null;
  const input = ["cell-temperature-cache-v2-heat-intensity", STATION_TEMPERATURE_VERSION, target.latitude, target.longitude,
    target.values.thermalSources, ...CONTROL_FIELDS.map((field) => target.values[field])];
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(input)));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function baselinePatch(value: unknown): boolean {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0;
}

function validPatch(value: unknown, altitude: unknown): value is Values {
  if (baselinePatch(value)) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const patch = value as Values;
  return Object.keys(patch).length === PATCH_FIELDS.length && PATCH_FIELDS.every((key) => key in patch) && validHeatDegreeHours(patch) &&
    (STATION_TEMPERATURE_VERSIONS as readonly unknown[]).includes(patch.temperatureSource) && patch.thermalReferenceElevationM === altitude &&
    ["validated", "includes-provisional"].includes(String(patch.temperatureQuality)) &&
    THERMAL_FIELDS.every((key) => typeof patch[key] === "number" && Number.isFinite(patch[key]) &&
      (key.startsWith("temperature") ? Number(patch[key]) >= -50 && Number(patch[key]) <= 60 :
        Number.isInteger(patch[key]) && Number(patch[key]) >= 0 && Number(patch[key]) <= (key.endsWith("14d") ? 336 : 480))) &&
    Number.isInteger(patch.temperatureMinimumStations) && Number(patch.temperatureMinimumStations) >= 2 && Number(patch.temperatureMinimumStations) <= MAX_TEMPERATURE_STATIONS &&
    Number.isInteger(patch.temperatureModelOnlyHours) && Number(patch.temperatureModelOnlyHours) >= 0 && Number(patch.temperatureModelOnlyHours) <= 12;
}

/** Persistent lazy cache shared across requests, species and Edge isolates.
 * Cache failures only lose the speedup; incomplete optional inputs are never cached. */
export async function cachedStationTemperatureValues(db: Database, targets: TemperatureTarget[]): Promise<Values[]> {
  const keys = await Promise.all(targets.map(temperatureCacheKey));
  const uniqueKeys = [...new Set(keys.filter((key): key is string => key !== null))];
  if (!uniqueKeys.length) return targets.map((target) => target.values);
  const hits = new Map<string, Values>();
  let cacheAvailable = true;
  try {
    for (let offset = 0; offset < uniqueKeys.length; offset += 100) {
      const { data, error } = await db.from(TABLE).select("id,values").in("id", uniqueKeys.slice(offset, offset + 100)).limit(100);
      if (error) throw error;
      for (const row of data ?? []) hits.set(row.id, row.values as Values);
    }
  } catch {
    cacheAvailable = false;
  }
  const misses = targets.filter((target, i) => keys[i] && !validPatch(hits.get(keys[i]!), target.values.altitudeM));
  const score = misses.length ? await loadStationTemperatureScorer(db, misses.map((target) => target.values)) : null;
  const writes = new Map<string, { id: string; values: Values }>();
  const result = targets.map((target, i) => {
    const key = keys[i];
    if (!key) return target.values;
    const hit = hits.get(key);
    if (validPatch(hit, target.values.altitudeM)) return baselinePatch(hit)
      ? target.values : { ...target.values, ...hit, thermalExposure: undefined };
    const corrected = score!(target.values, target.latitude, target.longitude);
    if (corrected !== target.values) {
      const patch = Object.fromEntries(PATCH_FIELDS.map((field) => [field, corrected[field]]));
      if (validPatch(patch, target.values.altitudeM)) writes.set(key, { id: key, values: patch });
    } else if (score!.inputsComplete) {
      // Complete immutable inputs make a baseline decision deterministic too.
      // Missing rows/read failures must remain retryable and never reach here.
      writes.set(key, { id: key, values: {} });
    }
    return corrected;
  });
  if (cacheAvailable && writes.size) {
    // Upsert also repairs an invalid cached patch. Competing misses calculate
    // identical values, and cannot overwrite another publication's key.
    try {
      const rows = [...writes.values()];
      for (let offset = 0; offset < rows.length; offset += 100) {
        const { error } = await db.from(TABLE).upsert(rows.slice(offset, offset + 100), { onConflict: "id" });
        if (error) break;
      }
    } catch { /* Cache writes never suppress a correctly calculated reading. */ }
  }
  return result;
}
