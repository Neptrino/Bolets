import { fetchXemaRows, XEMA_MEASUREMENTS_DATASET, XEMA_SOCRATA_ORIGIN } from "./xema-rain.ts";

export const XEMA_TEMPERATURE_VARIABLE_CODE = "32";
export type TemperatureQuality = "validated" | "published";
export type StationTemperatureHour = {
  stationCode: string;
  hour: number;
  temperatureC: number;
  validation: "validated" | "provisional";
};

// XEMA labels interval starts in UTC. Variable 32 is temperature in Celsius;
// SH and HO are interval means, not instantaneous hourly model samples.
// Missing/T validation is provisional. The open feed omits invalid values.
export function xemaTemperatureDayUrl(day: string, codes: string[]) {
  const start = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(start) || new Date(start).toISOString().slice(0, 10) !== day) {
    throw new Error("XEMA temperature day must be an ISO calendar date");
  }
  if (!codes.length || codes.length > 40 || codes.some((code) => !/^[A-Z0-9]{1,4}$/.test(code))) {
    throw new Error("Select 1–40 valid XEMA station codes");
  }
  const end = new Date(start + 86_400_000).toISOString().slice(0, 19);
  const url = new URL(`${XEMA_SOCRATA_ORIGIN}/resource/${XEMA_MEASUREMENTS_DATASET}.json`);
  url.searchParams.set("$select", "codi_estacio,codi_variable,data_lectura,valor_lectura,codi_estat,codi_base");
  url.searchParams.set("$where", `codi_variable='32' AND codi_estacio in(${codes.map((code) => `'${code}'`).join(",")})` +
    ` AND data_lectura >= '${day}T00:00:00' AND data_lectura < '${end}'`);
  url.searchParams.set("$order", "data_lectura,codi_estacio,codi_base");
  // At most 40 × 144 ten-minute readings; this diagnostic accepts SH/HO only.
  url.searchParams.set("$limit", "10000");
  return url;
}

type Reading = { code: string; at: number; value: number; base: "SH" | "HO"; valid: boolean };

function reading(input: unknown, quality: TemperatureQuality): Reading | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return;
  const row = input as Record<string, unknown>;
  if (String(row.codi_variable) !== XEMA_TEMPERATURE_VARIABLE_CODE) return;
  const code = typeof row.codi_estacio === "string" ? row.codi_estacio : "";
  if (!/^[A-Z0-9]{1,4}$/.test(code) || !["SH", "HO"].includes(String(row.codi_base))) return;
  const state = row.codi_estat ?? "";
  if (!["", "T", "V"].includes(String(state)) || (quality === "validated" && state !== "V")) return;
  if (typeof row.data_lectura !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:\.000)?Z?$/.test(row.data_lectura)) return;
  const at = Date.parse(row.data_lectura.replace(/Z$/, "") + "Z");
  const step = row.codi_base === "SH" ? 1_800_000 : 3_600_000;
  if (!Number.isFinite(at) || at % step !== 0 || new Date(at).toISOString().slice(0, 19) !== row.data_lectura.slice(0, 19)) return;
  const value = typeof row.valor_lectura === "string" && row.valor_lectura.trim() !== ""
    ? Number(row.valor_lectura) : row.valor_lectura;
  if (typeof value !== "number" || !Number.isFinite(value) || value < -50 || value > 60) return;
  return { code, at, value, base: row.codi_base as "SH" | "HO", valid: state === "V" };
}

/** Complete hours only. Conflicting duplicates or overlapping SH/HO fail closed. */
export function aggregateXemaTemperatureHours(rows: unknown[], quality: TemperatureQuality) {
  const readings = new Map<string, Reading>();
  const conflicts = new Set<string>();
  const qualityCounts: Record<string, number> = {};
  for (const input of rows) {
    if (input && typeof input === "object" && !Array.isArray(input)) {
      const state = String((input as Record<string, unknown>).codi_estat ?? "unstarted");
      qualityCounts[state || "unstarted"] = (qualityCounts[state || "unstarted"] ?? 0) + 1;
    }
    const item = reading(input, quality);
    if (!item) continue;
    const key = `${item.code}|${item.at}|${item.base}`;
    const previous = readings.get(key);
    if (previous && (previous.value !== item.value || previous.valid !== item.valid)) conflicts.add(key);
    readings.set(key, item);
  }
  const groups = new Map<string, Reading[]>();
  for (const [key, item] of readings) {
    const hourKey = `${item.code}|${Math.floor(item.at / 3_600_000)}`;
    const group = groups.get(hourKey) ?? [];
    // A NaN sentinel preserves the conflict even if the other half is present.
    group.push(conflicts.has(key) ? { ...item, value: NaN } : item);
    groups.set(hourKey, group);
  }
  const hours: StationTemperatureHour[] = [];
  for (const group of groups.values()) {
    if (group.some((item) => !Number.isFinite(item.value))) continue;
    const complete = (group.length === 1 && group[0].base === "HO") ||
      (group.length === 2 && group.every((item) => item.base === "SH"));
    if (!complete) continue;
    hours.push({
      stationCode: group[0].code,
      hour: Math.floor(group[0].at / 3_600_000) * 3_600_000,
      temperatureC: group.reduce((sum, item) => sum + item.value, 0) / group.length,
      validation: group.every((item) => item.valid) ? "validated" : "provisional",
    });
  }
  hours.sort((a, b) => a.hour - b.hour || a.stationCode.localeCompare(b.stationCode));
  return { hours, qualityCounts, conflictingReadings: conflicts.size };
}

/** Trapezoidal approximation of the model mean over [hour, hour + 1h). */
export function modelIntervalMean(model: Map<number, number>, hour: number) {
  const start = model.get(hour);
  const end = model.get(hour + 3_600_000);
  return start !== undefined && end !== undefined && Number.isFinite(start) && Number.isFinite(end)
    ? (start + end) / 2 : undefined;
}

/** Full network, paginated; station eligibility is determined from metadata and
 * complete SH/HO observations, not an experimental station-code allowlist. */
export function xemaNetworkTemperatureDayUrl(day: string, offset = 0) {
  const at = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(at) || new Date(at).toISOString().slice(0, 10) !== day) throw new Error("Invalid temperature day");
  if (!Number.isInteger(offset) || offset < 0) throw new Error("Invalid temperature page offset");
  const end = new Date(at + 86_400_000).toISOString().slice(0, 19);
  const url = new URL(`${XEMA_SOCRATA_ORIGIN}/resource/${XEMA_MEASUREMENTS_DATASET}.json`);
  url.searchParams.set("$select", "codi_estacio,codi_variable,data_lectura,valor_lectura,codi_estat,codi_base");
  url.searchParams.set("$where", `codi_variable='32' AND data_lectura >= '${day}T00:00:00' AND data_lectura < '${end}' AND codi_base in('SH','HO')`);
  url.searchParams.set("$order", "data_lectura,codi_estacio,codi_base");
  url.searchParams.set("$limit", "50000");
  url.searchParams.set("$offset", String(offset));
  return url;
}


export async function fetchXemaNetworkTemperatureDay(day: string, load = fetchXemaRows) {
  const raw: unknown[] = [];
  for (let page = 0; page < 4; page++) {
    const rows = await load(xemaNetworkTemperatureDayUrl(day, page * 50_000), "network temperature readings");
    raw.push(...rows);
    if (rows.length < 50_000) return raw;
  }
  throw new Error("Truncated network station day");
}
