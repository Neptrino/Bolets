// @deno-types="https://esm.sh/@supabase/supabase-js@2.112.3"
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OpenMeteoLocation } from "./open-meteo-core.ts";
import { haversineKm, type XemaStation } from "./xema-rain.ts";
import type { StationTemperatureHour } from "./xema-temperature.ts";
import { STATION_TEMPERATURE_VERSION, stationTemperatureTailLag } from "./station-temperature-field.ts";
import { createStationTemperatureScorer, validThermalSources, type ThermalModelWindow, type ThermalSources, type StationTemperatureWindow } from "./station-temperature-scoring.ts";

type Database = SupabaseClient;
const HOUR = 3_600_000;
async function digest(value: unknown) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function instant(value: unknown) {
  return typeof value === "number" ? value * 1000 : typeof value === "string" ? Date.parse(value.endsWith("Z") ? value : value + "Z") : NaN;
}

/** Immutable, deduplicated inputs. References publish with the existing atmosphere generation. */
export async function freezeStationTemperatureSources(db: Database, locations: Map<string, OpenMeteoLocation>) {
  const result = new Map<string, ThermalSources>();
  try {
    const windowCache = new Map<number, { id: string; payload: StationTemperatureWindow } | null>();
    const models: Array<{ id: string; station_window_id: string; payload: ThermalModelWindow }> = [];
    for (const [pointId, location] of locations) {
      const times = location.hourly?.time;
      const temperatures = location.hourly?.temperature_2m;
      const endAt = instant(location.current?.time);
      // Rolling-provider timestamps are absolute Unix seconds; display offsets
      // (including Europe/Madrid DST) must not move or reject their UTC hours.
      if (typeof location.current?.time !== "number" || !Number.isFinite(endAt) || endAt % HOUR ||
        !Array.isArray(times) || times.some((t) => typeof t !== "number") || !Array.isArray(temperatures) || times.length !== temperatures.length ||
        ![location.latitude, location.longitude, location.elevation].every((v) => typeof v === "number" && Number.isFinite(v))) continue;
      if (!windowCache.has(endAt)) {
        const validAt = new Date(endAt).toISOString();
        const { data: frozen, error: frozenError } = await db.from("station_temperature_windows").select("id,payload")
          .eq("version", STATION_TEMPERATURE_VERSION).eq("valid_at", validAt).maybeSingle();
        if (frozenError) throw frozenError;
        if (frozen) windowCache.set(endAt, { id: frozen.id, payload: frozen.payload as StationTemperatureWindow });
      }
      if (!windowCache.has(endAt)) {
        const { data, error } = await db.from("xema_temperature_days").select("day,stations,hours")
          .gte("day", new Date(endAt - 480 * HOUR).toISOString().slice(0, 10))
          .lte("day", new Date(endAt).toISOString().slice(0, 10)).order("day").limit(22);
        if (error) throw error;
        if (!data || data.length < 21) { windowCache.set(endAt, null); continue; }
        const payload: StationTemperatureWindow = { version: STATION_TEMPERATURE_VERSION, endAt,
          stations: data.at(-1)!.stations as XemaStation[],
          hours: data.flatMap((d) => d.hours as StationTemperatureHour[]).filter((h) => h.hour >= endAt - 480 * HOUR && h.hour <= endAt)
            .sort((a, b) => a.hour - b.hour || a.stationCode.localeCompare(b.stationCode)) };
        const reporting = new Map<number, Set<string>>();
        for (const h of payload.hours) {
          const codes = reporting.get(h.hour) ?? new Set<string>();
          codes.add(h.stationCode); reporting.set(h.hour, codes);
        }
        // Freeze bounded feed latency with the publication, never fill an
        // older gap or turn a partial measurement interval into an observation.
        const support = Array.from({ length: 481 }, (_, i) =>
          (reporting.get(endAt - (480 - i) * HOUR)?.size ?? 0) >= 2);
        if (stationTemperatureTailLag(support) === undefined) {
          windowCache.set(endAt, null); continue;
        }
        const id = await digest(payload);
        const { error: insertError } = await db.from("station_temperature_windows").upsert({ id, payload, version: STATION_TEMPERATURE_VERSION, valid_at: new Date(endAt).toISOString() }, { onConflict: "version,valid_at", ignoreDuplicates: true });
        if (insertError) throw insertError;
        // A competing shard may have frozen the same valid hour first.
        const { data: published, error: publicationError } = await db.from("station_temperature_windows").select("id,payload")
          .eq("version", STATION_TEMPERATURE_VERSION).eq("valid_at", new Date(endAt).toISOString()).single();
        if (publicationError) throw publicationError;
        windowCache.set(endAt, { id: published.id, payload: published.payload as StationTemperatureWindow });
      }
      const window = windowCache.get(endAt);
      if (!window || window.payload.stations.filter((s) => haversineKm(s.latitude, s.longitude, location.latitude!, location.longitude!) < 65).length < 2) continue;
      const index = times.findIndex((t) => instant(t) === endAt);
      if (index < 479) continue;
      const axis = times.slice(index - 479, index + 1);
      const series = temperatures.slice(index - 479, index + 1);
      if (axis.some((t, i) => instant(t) !== endAt - (479 - i) * HOUR) ||
        series.some((v) => typeof v !== "number" || !Number.isFinite(v) || v < -50 || v > 60)) continue;
      const payload: ThermalModelWindow = { version: STATION_TEMPERATURE_VERSION, endAt,
        latitude: location.latitude!, longitude: location.longitude!, elevationM: location.elevation!,
        temperaturesC: series, stationWindowId: window.id };
      const id = await digest(payload);
      models.push({ id, station_window_id: window.id, payload });
      result.set(pointId, [{ id }]);
    }
    if (models.length) {
      const { error } = await db.from("thermal_model_windows").upsert(models, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    }
    return result;
  } catch (error) {
    console.error("Optional station temperature inputs unavailable; retaining AROME", { message: error instanceof Error ? error.message : "Database failure" });
    return new Map<string, ThermalSources>();
  }
}

/** Load only immutable inputs named by these snapshots; never the latest station feed. */
export async function loadStationTemperatureScorer(db: Database, values: Record<string, unknown>[]) {
  const ids = [...new Set(values.flatMap((v) => validThermalSources(v.thermalSources) ? v.thermalSources.map((s) => s.id) : []))];
  const baseline: ReturnType<typeof createStationTemperatureScorer> = (v) => v;
  if (!ids.length) return baseline;
  try {
    const models = new Map<string, ThermalModelWindow>();
    for (let offset = 0; offset < ids.length; offset += 100) {
      const { data, error } = await db.from("thermal_model_windows").select("id,payload").in("id", ids.slice(offset, offset + 100)).limit(100);
      if (error) throw error;
      for (const row of data ?? []) models.set(row.id, row.payload as ThermalModelWindow);
    }
    const stationIds = [...new Set([...models.values()].map((m) => m.stationWindowId))];
    const windows = new Map<string, StationTemperatureWindow>();
    if (stationIds.length) {
      const { data, error } = await db.from("station_temperature_windows").select("id,payload").in("id", stationIds).limit(stationIds.length);
      if (error) throw error;
      for (const row of data ?? []) windows.set(row.id, row.payload as StationTemperatureWindow);
    }
    return createStationTemperatureScorer(models, windows);
  } catch (error) {
    console.error("Optional frozen temperature read failed; retaining AROME", { message: error instanceof Error ? error.message : "Database failure" });
    return baseline;
  }
}

/** No private input references or model distributions belong in public responses. */
export function publicTemperatureValues(values: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(values).filter(([key]) => key !== "thermalSources" && key !== "thermalExposure"));
}
