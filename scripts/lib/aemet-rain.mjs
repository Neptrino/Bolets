// AEMET OpenData daily station precipitation, used only as an independent
// second gauge network when validating XEMA-based rain corrections. Requires
// the free AEMET_API_KEY. Daily values follow AEMET's climatological day
// (07:00 UTC to 07:00 UTC), which the comparison must surface as a caveat
// rather than silently align with calendar days.

export const AEMET_API_ORIGIN = "https://opendata.aemet.es/opendata/api";

/**
 * AEMET inventory coordinates are degrees-minutes-seconds strings with a
 * trailing hemisphere letter: latitude DDMMSS[NS], longitude DDDMMSS[EW] or
 * DDMMSS[EW]. Returns decimal degrees, or undefined for malformed input.
 */
export function parseAemetDegrees(value) {
  if (typeof value !== "string") return undefined;
  const match = /^(\d{6,7})([NSEW])$/.exec(value.trim().toUpperCase());
  if (!match) return undefined;
  const digits = match[1];
  const seconds = Number(digits.slice(-2));
  const minutes = Number(digits.slice(-4, -2));
  const degrees = Number(digits.slice(0, -4));
  if (minutes >= 60 || seconds >= 60) return undefined;
  const decimal = degrees + minutes / 60 + seconds / 3600;
  const negative = match[2] === "S" || match[2] === "W";
  return negative ? -decimal : decimal;
}

/**
 * AEMET publishes numbers with comma decimals; "Ip" means measurable but
 * below 0.1 mm and is treated as zero rain. Any other non-numeric marker
 * (for example "Acum") is unusable for a single day and returns undefined.
 */
export function parseAemetMillimetres(value) {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (/^ip$/i.test(trimmed)) return 0;
  if (!/^\d+(,\d+)?$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 500 ? parsed : undefined;
}

function aemetDateToken(isoDate, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error(`${label} must be an ISO date`);
  return `${isoDate}T00:00:00UTC`;
}

export function aemetDailyClimatologyPath(startDate, endDate) {
  return `/valores/climatologicos/diarios/datos/fechaini/${aemetDateToken(startDate, "start date")}` +
    `/fechafin/${aemetDateToken(endDate, "end date")}/todasestaciones`;
}

export const AEMET_STATION_INVENTORY_PATH = "/valores/climatologicos/inventarioestaciones/todasestaciones";

/**
 * AEMET OpenData responds with an envelope pointing at a second `datos` URL
 * whose payload is Latin-1 JSON.
 */
export async function fetchAemetJson(path, apiKey, fetchImplementation = fetch) {
  // Free AEMET keys enforce a strict per-minute quota; a rejected envelope
  // usually clears on the next minute, so wait it out instead of failing.
  let envelope;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const envelopeResponse = await fetchImplementation(`${AEMET_API_ORIGIN}${path}`, {
      headers: { api_key: apiKey, "User-Agent": "Bolets-Atles/1.0" },
    });
    envelope = envelopeResponse.status === 429 ? undefined : await envelopeResponse.json().catch(() => undefined);
    if (envelope && typeof envelope.datos === "string" && envelope.datos.startsWith("https://")) break;
    if (attempt === 4) {
      throw new Error(`AEMET request was rejected: ${envelope?.descripcion ?? "no data URL"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 65_000));
  }
  const dataResponse = await fetchImplementation(envelope.datos, {
    headers: { "User-Agent": "Bolets-Atles/1.0" },
  });
  if (!dataResponse.ok) throw new Error(`AEMET data request returned ${dataResponse.status}`);
  const payload = new TextDecoder("latin1").decode(await dataResponse.arrayBuffer());
  const rows = JSON.parse(payload);
  if (!Array.isArray(rows)) throw new Error("AEMET data payload is not a row list");
  return rows;
}

/** Normalized daily station rain: { stationId, date, precipitationMm }. */
export function normalizeAemetDailyRain(rows) {
  const normalized = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const stationId = typeof row.indicativo === "string" ? row.indicativo.trim() : "";
    const date = typeof row.fecha === "string" ? row.fecha.trim() : "";
    const precipitationMm = parseAemetMillimetres(row.prec);
    if (!stationId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || precipitationMm === undefined) continue;
    normalized.push({ stationId, date, precipitationMm });
  }
  return normalized;
}

/** Normalized station coordinates: { stationId, name, latitude, longitude }. */
export function normalizeAemetStations(rows) {
  const normalized = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const stationId = typeof row.indicativo === "string" ? row.indicativo.trim() : "";
    const name = typeof row.nombre === "string" ? row.nombre.trim() : "";
    const latitude = parseAemetDegrees(row.latitud);
    const longitude = parseAemetDegrees(row.longitud);
    if (!stationId || !name || latitude === undefined || longitude === undefined) continue;
    normalized.push({ stationId, name, latitude, longitude });
  }
  return normalized;
}
