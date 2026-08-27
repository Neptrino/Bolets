import { getSpecies, speciesProfiles } from "@/data/species";
import type { PrivateHistoricalFinding } from "@/tests/helpers/historical-finding-replay";

/**
 * Converts a private field-findings spreadsheet (exported to CSV/TSV) into the
 * replay input format. Everything here is pure so it can be unit tested without
 * touching the private file; the CLI wrapper owns path handling.
 */

export const FINDINGS_SPREADSHEET_VERSION = "findings-spreadsheet-v1";

export const DEFAULT_BATCH_SIZE = 24;
const MAX_SPECIES_PER_LOCATION = 8;
const OBSERVATION_HOUR = 12;

export type FindingsRow = {
  rowNumber: number;
  observedAt: string;
  latitude: number;
  longitude: number;
  speciesIds: string[];
  abundance: number | null;
  effort: string | null;
  orientation: string | null;
  altitudeM: number | null;
};

export type ConvertedFindings = {
  events: PrivateHistoricalFinding[];
  observedNegatives: PrivateHistoricalFinding[];
  metadata: FindingsMetadata;
};

export type FindingsMetadata = {
  version: string;
  rows: number;
  events: number;
  observedNegatives: number;
  skipped: { rowNumber: number; reason: string }[];
  speciesCounts: Record<string, number>;
  dateRange: { first: string; last: string } | null;
  /** Per-ordinal context, so reports can stratify without holding coordinates. */
  eventContext: LocationContext[];
  observedNegativeContext: LocationContext[];
};

export type LocationContext = {
  location: number;
  date: string;
  speciesIds: string[];
  abundance: number | null;
  effort: string | null;
  orientation: string | null;
  altitudeM: number | null;
};

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function normalizeName(value: string) {
  return stripDiacritics(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function detectDelimiter(headerLine: string) {
  const candidates = [",", ";", "\t"] as const;
  let best: (typeof candidates)[number] = ",";
  let bestCount = -1;
  for (const candidate of candidates) {
    const count = splitDelimited(headerLine, candidate).length;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

/** RFC 4180 field splitting for a single line (quotes may contain the delimiter). */
function splitDelimited(line: string, delimiter: string) {
  const fields: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted) {
      if (character === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        current += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === delimiter) {
      fields.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  fields.push(current);
  return fields;
}

export function parseDelimited(text: string) {
  const withoutBom = text.replace(/^﻿/, "");
  const lines = withoutBom.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) {
    throw new Error("Findings spreadsheet needs a header row and at least one data row");
  }
  const delimiter = detectDelimiter(lines[0]);
  const header = splitDelimited(lines[0], delimiter).map((field) => field.trim());
  return lines.slice(1).map((line, index) => {
    const fields = splitDelimited(line, delimiter);
    const record: Record<string, string> = {};
    header.forEach((name, position) => {
      record[name] = (fields[position] ?? "").trim();
    });
    return { rowNumber: index + 2, record };
  });
}

const HEADER_ALIASES = {
  date: ["date", "data", "observedat", "observed at", "dia", "fecha"],
  time: ["time", "hora", "hour"],
  latitude: ["latitude", "lat", "latitud"],
  longitude: ["longitude", "lon", "lng", "long", "longitud"],
  gps: ["gps", "coordinates", "coordenades", "coords"],
  species: ["species", "especie", "espècie", "bolet", "taxon", "nom"],
  abundance: ["abundance", "abundancia", "abundància", "quantitat"],
  effort: ["effort", "esforc", "esforç"],
  orientation: ["orientation", "orientacio", "orientació", "aspect"],
  altitude: ["altitude_m", "altitude", "altitud", "elevation", "elevacio"],
} as const;

function findColumn(header: string[], aliases: readonly string[]) {
  const normalized = header.map((name) => normalizeName(name));
  for (const alias of aliases) {
    const index = normalized.indexOf(normalizeName(alias));
    if (index >= 0) return header[index];
  }
  return null;
}

export function resolveColumns(header: string[]) {
  return {
    date: findColumn(header, HEADER_ALIASES.date),
    time: findColumn(header, HEADER_ALIASES.time),
    latitude: findColumn(header, HEADER_ALIASES.latitude),
    longitude: findColumn(header, HEADER_ALIASES.longitude),
    gps: findColumn(header, HEADER_ALIASES.gps),
    species: findColumn(header, HEADER_ALIASES.species),
    abundance: findColumn(header, HEADER_ALIASES.abundance),
    effort: findColumn(header, HEADER_ALIASES.effort),
    orientation: findColumn(header, HEADER_ALIASES.orientation),
    altitude: findColumn(header, HEADER_ALIASES.altitude),
  };
}

/**
 * Species cells may hold a registry id, a scientific name, a common name, or a
 * genus that covers several supported species (the spreadsheet records "Boletus"
 * for any cep). Genus matches expand to every supported species in that genus,
 * which the replay format allows up to eight per location.
 */
export function resolveSpeciesColumn(value: string): string[] {
  const raw = value.trim();
  if (!raw) throw new Error("Findings row has an empty species cell");
  const normalized = normalizeName(raw);

  const direct = getSpecies(raw);
  if (direct) return [assertPredictable(direct.speciesId, raw)];

  const supported = speciesProfiles.filter(
    (profile) => profile.predictionMode === "current",
  );
  const byScientific = supported.find(
    (profile) => normalizeName(profile.identity.scientificName) === normalized,
  );
  if (byScientific) return [byScientific.speciesId];

  const byCommon = supported.find((profile) =>
    normalizeName(profile.identity.commonName) === normalized ||
    (profile.identity.alternateNames ?? []).some(
      (name) => normalizeName(name) === normalized,
    )
  );
  if (byCommon) return [byCommon.speciesId];

  const byGenus = supported.filter(
    (profile) => normalizeName(profile.identity.genus) === normalized,
  );
  if (byGenus.length > 0) {
    if (byGenus.length > MAX_SPECIES_PER_LOCATION) {
      throw new Error(
        `Genus "${raw}" expands to ${byGenus.length} species, above the ${MAX_SPECIES_PER_LOCATION} per-location limit`,
      );
    }
    return byGenus.map((profile) => profile.speciesId);
  }

  const unsupported = speciesProfiles.find(
    (profile) =>
      normalizeName(profile.identity.scientificName) === normalized ||
      normalizeName(profile.identity.commonName) === normalized ||
      profile.speciesId === raw,
  );
  if (unsupported) {
    throw new Error(
      `Species "${raw}" has no current prediction model and cannot be replayed`,
    );
  }
  throw new Error(`Species "${raw}" does not match any catalogue entry`);
}

function assertPredictable(speciesId: string, label: string) {
  const species = getSpecies(speciesId);
  if (!species || species.predictionMode !== "current") {
    throw new Error(
      `Species "${label}" has no current prediction model and cannot be replayed`,
    );
  }
  return species.speciesId;
}

const EXCEL_EPOCH_MILLISECONDS = Date.UTC(1899, 11, 30);

/**
 * Excel exports the date column either as a serial number or as a formatted
 * date; both appear in practice depending on how the sheet was saved.
 */
export function parseSpreadsheetDate(value: string) {
  const raw = value.trim();
  if (!raw) throw new Error("Findings row has an empty date cell");

  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    if (serial < 1 || serial > 80_000) {
      throw new Error(`Date serial "${raw}" is outside the supported range`);
    }
    return new Date(EXCEL_EPOCH_MILLISECONDS + Math.floor(serial) * 86_400_000)
      .toISOString()
      .slice(0, 10);
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dayFirst = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(raw);
  if (dayFirst) {
    const [, day, month, year] = dayFirst;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  throw new Error(`Date "${raw}" is not a supported spreadsheet date`);
}

/**
 * The replay parser requires an explicit UTC offset, and findings are recorded
 * in local Catalan time, so the offset must follow Europe/Madrid DST.
 */
export function madridOffset(isoDate: string, hour: number) {
  const utcGuess = new Date(`${isoDate}T${String(hour).padStart(2, "0")}:00:00Z`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    timeZoneName: "longOffset",
  });
  const part = formatter.formatToParts(utcGuess).find(
    (entry) => entry.type === "timeZoneName",
  );
  const match = /GMT([+-]\d{2}:\d{2})/.exec(part?.value ?? "");
  return match ? match[1] : "+00:00";
}

export function parseObservedAt(dateCell: string, timeCell?: string) {
  const date = parseSpreadsheetDate(dateCell);
  let hour = OBSERVATION_HOUR;
  let minute = 0;
  const time = timeCell?.trim();
  if (time) {
    const match = /^(\d{1,2}):(\d{2})/.exec(time);
    if (!match) throw new Error(`Time "${time}" is not a supported HH:MM value`);
    hour = Number(match[1]);
    minute = Number(match[2]);
    if (hour > 23 || minute > 59) throw new Error(`Time "${time}" is out of range`);
  }
  const offset = madridOffset(date, hour);
  const observedAt =
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${offset}`;
  // A row dated today is a find already made; the default-noon convention
  // must not push it past the replay parser's in-the-past validation on the
  // morning the user logs it. Clamp same-day defaults to the previous full
  // hour; genuinely future dates keep their timestamp and still fail
  // validation downstream.
  if (!time && Date.parse(observedAt) >= Date.now()) {
    const madridNow = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", hour12: false,
    }).formatToParts(new Date());
    const part = (type: string) => madridNow.find((p) => p.type === type)!.value;
    const today = `${part("year")}-${part("month")}-${part("day")}`;
    const previousHour = Math.max(0, Number(part("hour")) - 1);
    if (date === today) {
      return `${date}T${String(previousHour).padStart(2, "0")}:00:00${madridOffset(date, previousHour)}`;
    }
  }
  return observedAt;
}

export function parseCoordinates(
  record: Record<string, string>,
  columns: ReturnType<typeof resolveColumns>,
) {
  let latitude: number;
  let longitude: number;
  if (columns.latitude && columns.longitude) {
    latitude = Number(record[columns.latitude]);
    longitude = Number(record[columns.longitude]);
  } else if (columns.gps) {
    const parts = record[columns.gps].split(/[,;]/).map((part) => part.trim());
    if (parts.length !== 2) {
      throw new Error("GPS cell must hold exactly one latitude and longitude pair");
    }
    latitude = Number(parts[0]);
    longitude = Number(parts[1]);
  } else {
    throw new Error("Findings spreadsheet needs latitude/longitude or a GPS column");
  }
  if (
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    throw new Error("Findings row has invalid coordinates");
  }
  return { latitude, longitude };
}

function optionalNumber(value: string | undefined) {
  const raw = value?.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalText(value: string | undefined) {
  const raw = value?.trim();
  return raw ? raw : null;
}

export function parseFindingsRows(text: string) {
  const parsed = parseDelimited(text);
  const header = Object.keys(parsed[0]?.record ?? {});
  const columns = resolveColumns(header);
  if (!columns.date) throw new Error("Findings spreadsheet needs a date column");
  if (!columns.species) throw new Error("Findings spreadsheet needs a species column");

  const rows: FindingsRow[] = [];
  const skipped: { rowNumber: number; reason: string }[] = [];
  for (const { rowNumber, record } of parsed) {
    try {
      const { latitude, longitude } = parseCoordinates(record, columns);
      rows.push({
        rowNumber,
        observedAt: parseObservedAt(
          record[columns.date],
          columns.time ? record[columns.time] : undefined,
        ),
        latitude,
        longitude,
        speciesIds: resolveSpeciesColumn(record[columns.species]),
        abundance: columns.abundance ? optionalNumber(record[columns.abundance]) : null,
        effort: columns.effort ? optionalText(record[columns.effort]) : null,
        orientation: columns.orientation ? optionalText(record[columns.orientation]) : null,
        altitudeM: columns.altitude ? optionalNumber(record[columns.altitude]) : null,
      });
    } catch (error) {
      skipped.push({
        rowNumber,
        reason: error instanceof Error ? error.message : "unknown row error",
      });
    }
  }
  return { rows, skipped };
}

function groupKey(row: FindingsRow) {
  return `${row.observedAt}|${row.latitude}|${row.longitude}`;
}

function toFindings(rows: FindingsRow[]) {
  const groups = new Map<string, FindingsRow[]>();
  for (const row of rows) {
    const key = groupKey(row);
    const existing = groups.get(key);
    if (existing) existing.push(row);
    else groups.set(key, [row]);
  }
  const findings: PrivateHistoricalFinding[] = [];
  const context: LocationContext[] = [];
  let location = 0;
  for (const group of groups.values()) {
    const speciesIds = [...new Set(group.flatMap((row) => row.speciesIds))];
    if (speciesIds.length > MAX_SPECIES_PER_LOCATION) {
      throw new Error(
        `One date and location resolves to ${speciesIds.length} species, above the ${MAX_SPECIES_PER_LOCATION} limit`,
      );
    }
    const first = group[0];
    location += 1;
    findings.push({
      observedAt: first.observedAt,
      latitude: first.latitude,
      longitude: first.longitude,
      speciesIds,
    });
    context.push({
      location,
      date: first.observedAt.slice(0, 10),
      speciesIds,
      abundance: group.reduce<number | null>(
        (best, row) =>
          row.abundance === null ? best : best === null ? row.abundance : Math.max(best, row.abundance),
        null,
      ),
      effort: first.effort,
      orientation: first.orientation,
      altitudeM: first.altitudeM,
    });
  }
  return { findings, context };
}

/**
 * Abundance 0 means the spreadsheet owner searched suitable habitat and found
 * nothing, which is a labelled negative. Blank abundance means "not visited"
 * and must never be treated as a negative, so those rows stay events only when
 * a species was actually recorded.
 */
export function convertFindings(text: string): ConvertedFindings {
  const { rows, skipped } = parseFindingsRows(text);
  const positives = rows.filter((row) => row.abundance === null || row.abundance > 0);
  const negatives = rows.filter((row) => row.abundance === 0);

  const events = toFindings(positives);
  const observedNegatives = toFindings(negatives);

  const speciesCounts: Record<string, number> = {};
  for (const row of positives) {
    for (const speciesId of row.speciesIds) {
      speciesCounts[speciesId] = (speciesCounts[speciesId] ?? 0) + 1;
    }
  }
  const dates = rows.map((row) => row.observedAt.slice(0, 10)).sort();

  return {
    events: events.findings,
    observedNegatives: observedNegatives.findings,
    metadata: {
      version: FINDINGS_SPREADSHEET_VERSION,
      rows: rows.length,
      events: events.findings.length,
      observedNegatives: observedNegatives.findings.length,
      skipped,
      speciesCounts,
      dateRange: dates.length ? { first: dates[0], last: dates[dates.length - 1] } : null,
      eventContext: events.context,
      observedNegativeContext: observedNegatives.context,
    },
  };
}

export function batchFindings(
  findings: PrivateHistoricalFinding[],
  maxPerBatch = DEFAULT_BATCH_SIZE,
) {
  if (!Number.isInteger(maxPerBatch) || maxPerBatch < 1) {
    throw new Error("Findings batch size must be a positive integer");
  }
  const batches: PrivateHistoricalFinding[][] = [];
  for (let index = 0; index < findings.length; index += maxPerBatch) {
    batches.push(findings.slice(index, index + maxPerBatch));
  }
  return batches;
}
