import type { PrivateHistoricalFinding } from "@/tests/helpers/historical-finding-replay";

/**
 * Selects dated GBIF occurrence records usable as model-validation events.
 * The filters mirror `supabase/functions/refresh-species-occurrences` and add
 * the stricter gates a replay needs: one exact day, inside the AROME archive,
 * and a coordinate precise enough to identify a 250 m cell.
 */

export const FUNGACAT_DATASET_KEY = "8583f4f6-f762-11e1-a439-00145eb45e9a";
export const FUNGACAT_DOI = "10.15468/ttivpp";
export const FUNGACAT_LICENCE = "CC BY-NC 4.0";
export const GBIF_OCCURRENCE_ENDPOINT = "https://api.gbif.org/v1/occurrence/search";

/**
 * FungaCAT's most recent occurrences are from 2021, so none of them overlap the
 * AROME archive that starts on 2024-01-02 and no replay can score them. The
 * GBIF-wide source keeps the same filters but drops the dataset restriction, so
 * recent Catalan records (mostly research-grade citizen science) can be used
 * instead. Both remain private validation inputs that are never redistributed.
 */
export const EVENT_SOURCES = {
  fungacat: {
    id: "fungacat",
    label: "FungaCAT via GBIF",
    datasetKey: FUNGACAT_DATASET_KEY,
    doi: FUNGACAT_DOI,
    licence: FUNGACAT_LICENCE,
    attribution:
      "FungaCAT — Banc de dades dels fongs de Catalunya (Universitat de Barcelona / GBIF España)",
  },
  gbif: {
    id: "gbif",
    label: "GBIF occurrence search (all datasets)",
    datasetKey: null,
    doi: null,
    licence: "per-record; check dataset licences before any redistribution",
    attribution: "Global Biodiversity Information Facility (GBIF) contributing datasets",
  },
} as const;

export type EventSourceId = keyof typeof EVENT_SOURCES;

export const CATALONIA_BOUNDS = { west: 0.05, south: 40.48, east: 3.32, north: 42.92 };
export const MINIMUM_EVENT_DATE = "2024-01-02";
export const DEFAULT_MAX_UNCERTAINTY_M = 1000;

const FATAL_GBIF_ISSUES = new Set([
  "ZERO_COORDINATE",
  "COORDINATE_INVALID",
  "COUNTRY_COORDINATE_MISMATCH",
  "TAXON_MATCH_NONE",
  "RECORDED_DATE_INVALID",
  "RECORDED_DATE_UNLIKELY",
]);

export type GbifRecord = {
  key?: number;
  decimalLatitude?: number;
  decimalLongitude?: number;
  eventDate?: string;
  year?: number;
  month?: number;
  day?: number;
  basisOfRecord?: string;
  coordinateUncertaintyInMeters?: number;
  issues?: string[];
};

export type UsableEvent = {
  key: number;
  date: string;
  latitude: number;
  longitude: number;
  uncertaintyM: number;
};

export type RejectionReason =
  | "no-single-day-date"
  | "date-before-archive"
  | "date-in-future"
  | "missing-coordinates"
  | "outside-catalonia"
  | "fatal-issue"
  | "missing-uncertainty"
  | "uncertainty-too-large"
  | "missing-key";

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

/**
 * GBIF encodes ranges as "start/end". A range spanning more than one day cannot
 * anchor a weather window, so only single-day records qualify here even though
 * the occurrence pipeline accepts the range start.
 */
export function singleDayDate(record: GbifRecord) {
  const raw = record.eventDate?.trim();
  if (raw) {
    const [start, end] = raw.split("/");
    const startDate = start?.slice(0, 10);
    if (!startDate || !validDate(startDate)) return null;
    if (end) {
      const endDate = end.slice(0, 10);
      if (!validDate(endDate) || endDate !== startDate) return null;
    }
    return startDate;
  }
  if (
    !Number.isInteger(record.year) ||
    !Number.isInteger(record.month) ||
    !Number.isInteger(record.day)
  ) return null;
  const candidate = `${record.year}-${String(record.month).padStart(2, "0")}-${String(record.day).padStart(2, "0")}`;
  return validDate(candidate) ? candidate : null;
}

export function usableEventRecord(
  record: GbifRecord,
  {
    maxUncertaintyM = DEFAULT_MAX_UNCERTAINTY_M,
    minDate = MINIMUM_EVENT_DATE,
    today = new Date().toISOString().slice(0, 10),
  }: { maxUncertaintyM?: number; minDate?: string; today?: string } = {},
): { event: UsableEvent } | { rejected: RejectionReason } {
  const date = singleDayDate(record);
  if (!date) return { rejected: "no-single-day-date" };
  if (date < minDate) return { rejected: "date-before-archive" };
  if (date >= today) return { rejected: "date-in-future" };

  const latitude = record.decimalLatitude;
  const longitude = record.decimalLongitude;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { rejected: "missing-coordinates" };
  }
  if (
    longitude! < CATALONIA_BOUNDS.west || longitude! > CATALONIA_BOUNDS.east ||
    latitude! < CATALONIA_BOUNDS.south || latitude! > CATALONIA_BOUNDS.north
  ) return { rejected: "outside-catalonia" };
  if ((record.issues ?? []).some((issue) => FATAL_GBIF_ISSUES.has(issue))) {
    return { rejected: "fatal-issue" };
  }

  // FungaCAT publishes generalized records; an absent uncertainty cannot be
  // assumed precise, so it is excluded rather than silently trusted.
  const uncertainty = record.coordinateUncertaintyInMeters;
  if (!Number.isFinite(uncertainty)) return { rejected: "missing-uncertainty" };
  if (uncertainty! < 0 || uncertainty! > maxUncertaintyM) {
    return { rejected: "uncertainty-too-large" };
  }
  if (!Number.isInteger(record.key)) return { rejected: "missing-key" };

  return {
    event: {
      key: record.key!,
      date,
      latitude: latitude!,
      longitude: longitude!,
      uncertaintyM: Math.round(uncertainty!),
    },
  };
}

const MAX_SPECIES_PER_LOCATION = 8;
const OBSERVATION_HOUR = "12:00:00";

function madridOffset(isoDate: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    timeZoneName: "longOffset",
  });
  const part = formatter
    .formatToParts(new Date(`${isoDate}T12:00:00Z`))
    .find((entry) => entry.type === "timeZoneName");
  const match = /GMT([+-]\d{2}:\d{2})/.exec(part?.value ?? "");
  return match ? match[1] : "+00:00";
}

export function groupEventsToFindings(
  entries: { speciesId: string; event: UsableEvent }[],
): { findings: PrivateHistoricalFinding[]; recordKeys: number[][] } {
  const groups = new Map<string, { speciesIds: Set<string>; keys: number[]; entry: UsableEvent }>();
  for (const { speciesId, event } of entries) {
    const key = `${event.date}|${event.latitude}|${event.longitude}`;
    const existing = groups.get(key);
    if (existing) {
      existing.speciesIds.add(speciesId);
      existing.keys.push(event.key);
    } else {
      groups.set(key, {
        speciesIds: new Set([speciesId]),
        keys: [event.key],
        entry: event,
      });
    }
  }

  const findings: PrivateHistoricalFinding[] = [];
  const recordKeys: number[][] = [];
  const sorted = [...groups.values()].sort((left, right) =>
    left.entry.date.localeCompare(right.entry.date)
  );
  for (const group of sorted) {
    const speciesIds = [...group.speciesIds].slice(0, MAX_SPECIES_PER_LOCATION);
    findings.push({
      observedAt: `${group.entry.date}T${OBSERVATION_HOUR}${madridOffset(group.entry.date)}`,
      latitude: group.entry.latitude,
      longitude: group.entry.longitude,
      speciesIds,
    });
    recordKeys.push(group.keys);
  }
  return { findings, recordKeys };
}

export function extractionSidecar({
  source = EVENT_SOURCES.fungacat,
  accessedAt,
  maxUncertaintyM,
  perSpecies,
  findings,
  recordKeys,
}: {
  source?: (typeof EVENT_SOURCES)[EventSourceId];
  accessedAt: string;
  maxUncertaintyM: number;
  perSpecies: { speciesId: string; scanned: number; usable: number }[];
  findings: PrivateHistoricalFinding[];
  recordKeys: number[][];
}) {
  return {
    source: source.label,
    datasetKey: source.datasetKey,
    doi: source.doi,
    licence: source.licence,
    attribution: source.attribution,
    usage: "Private, non-redistributed model validation only",
    accessedAt,
    filters: {
      minimumDate: MINIMUM_EVENT_DATE,
      maxUncertaintyM,
      bounds: CATALONIA_BOUNDS,
      singleDayDatesOnly: true,
    },
    perSpecies,
    locations: findings.length,
    // Record keys are citable identifiers; coordinates stay in the findings file.
    recordKeysByLocation: recordKeys.map((keys, index) => ({
      location: index + 1,
      recordKeys: keys,
    })),
  };
}
