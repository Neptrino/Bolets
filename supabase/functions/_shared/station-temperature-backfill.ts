// @deno-types="https://esm.sh/@supabase/supabase-js@2.112.3"
import type { SupabaseClient } from "@supabase/supabase-js";
import { freezeStationTemperatureSources } from "./station-temperature-store.ts";
import { THERMAL_FIELDS, thermalAggregates, validThermalSources } from "./station-temperature-scoring.ts";
import { STATION_TEMPERATURE_VERSION } from "./station-temperature-field.ts";
import type { OpenMeteoLocation } from "./open-meteo-core.ts";

/** Compare-and-set attachment of optional references; never changes baseline numbers. */
export async function attachStationTemperatureBatch(db: SupabaseClient, last: string, start: string) {
  let attached = 0, unchanged = 0, mismatched = 0;
  const { data: states, error } = await db.from("open_meteo_hourly_states").select("point_id,payload")
    .eq("stream", "arome-atmosphere").gt("point_id", last).order("point_id").limit(100);
  if (error) throw error;
  if (!states?.length) return { complete: true, ready: true, next: last, attached, unchanged, mismatched };
  const { data: snapshots, error: snapshotsError } = await db.from("weather_grid_snapshots")
    .select("point_id,snapshot_date,observed_at,values").in("point_id", states.map((s) => s.point_id)).gte("snapshot_date", start).limit(400);
  if (snapshotsError) throw snapshotsError;
  const existingIds = [...new Set((snapshots ?? []).flatMap((snapshot) =>
    validThermalSources(snapshot.values.thermalSources) ? snapshot.values.thermalSources.map((source: { id: string }) => source.id) : []))];
  const currentIds = new Set<string>();
  for (let offset = 0; offset < existingIds.length; offset += 100) {
    const { data, error } = await db.from("thermal_model_windows").select("id,version:payload->>version")
      .in("id", existingIds.slice(offset, offset + 100)).limit(100);
    if (error) throw error;
    for (const row of data ?? []) if (row.version === STATION_TEMPERATURE_VERSION) currentIds.add(row.id);
  }
  const stateById = new Map(states.map((s) => [s.point_id, s.payload as OpenMeteoLocation]));
  const locations = new Map<string, OpenMeteoLocation>();
  for (const snapshot of snapshots ?? []) {
    if (validThermalSources(snapshot.values.thermalSources) && snapshot.values.thermalSources.every((source: { id: string }) => currentIds.has(source.id))) {
      unchanged++; continue;
    }
    const state = stateById.get(snapshot.point_id)!;
    const values = snapshot.values;
    const end = Date.parse(values.weatherObservedAt);
    const times = state.hourly?.time as number[];
    const temperatures = state.hourly?.temperature_2m as number[];
    if (!Array.isArray(times) || !Array.isArray(temperatures) || times.length !== temperatures.length || !Number.isFinite(end)) { mismatched++; continue; }
    const index = times.findIndex((t) => t * 1000 === end);
    const series = temperatures.slice(index - 479, index + 1);
    const control = thermalAggregates(series);
    if (index < 479 || series.length !== 480 ||
      Math.abs(values.weatherElevationM - state.elevation!) > .01 ||
      Math.abs(values.weatherGridLatitude - state.latitude!) > 1e-5 || Math.abs(values.weatherGridLongitude - state.longitude!) > 1e-5 ||
      THERMAL_FIELDS.some((f) => typeof values[f] !== "number" || Math.abs(values[f] - control[f]) > (f.startsWith("temperature") ? .02 : 0))) { mismatched++; continue; }
    locations.set(`${snapshot.point_id}|${snapshot.snapshot_date}`, { ...state, current: { ...state.current, time: end / 1000 } });
  }
  const refs = await freezeStationTemperatureSources(db, locations);
  const pending = locations.values().next().value;
  const validAt = pending ? new Date(Number(pending.current?.time) * 1000).toISOString() : undefined;
  const { data: frozen, error: frozenError } = validAt
    ? await db.from("station_temperature_windows").select("id").eq("version", STATION_TEMPERATURE_VERSION).eq("valid_at", validAt).maybeSingle()
    : { data: null, error: null };
  if (frozenError) throw frozenError;
  if (validAt && !frozen) return { complete: false, ready: false, next: last, attached, unchanged, mismatched };
  for (const snapshot of snapshots ?? []) {
    const thermalSources = refs.get(`${snapshot.point_id}|${snapshot.snapshot_date}`);
    if (!thermalSources) continue;
    const { data, error: updateError } = await db.from("weather_grid_snapshots").update({ values: { ...snapshot.values, thermalSources } })
      .eq("point_id", snapshot.point_id).eq("snapshot_date", snapshot.snapshot_date).eq("observed_at", snapshot.observed_at).select("point_id");
    if (updateError) throw updateError;
    if (data?.length !== 1) throw new Error("Concurrent atmospheric publication; rerun without overwriting its snapshot");
    attached++;
  }
  return { complete: false, ready: true, next: states.at(-1)!.point_id, attached, unchanged, mismatched };
}
