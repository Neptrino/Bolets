import { gps, parse } from "exifr/dist/lite.esm.mjs";

export type PhotoGpsPosition = {
  accuracyM: number | null;
  latitude: number;
  longitude: number;
};

export type PhotoDateTime = {
  localDateTime: string;
  source: "DateTimeOriginal" | "CreateDate" | "ModifyDate";
};

const PHOTO_DATE_OPTIONS = {
  tiff: false,
  ifd0: { pick: ["ModifyDate"], reviveValues: false },
  exif: { pick: ["DateTimeOriginal", "CreateDate"], reviveValues: false },
  gps: false,
  mergeOutput: true,
  silentErrors: true,
};

function localDateTimeFromExif(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const parts = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  const [year, month, day, hour, minute, second] = parts;
  const date = new Date(year, month - 1, day, hour, minute, second);
  if (year < 1900 || date.getFullYear() !== year || date.getMonth() !== month - 1 ||
    date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute ||
    date.getSeconds() !== second) return null;
  return `${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:${secondText}`;
}

export async function extractPhotoGps(source: Blob | ArrayBuffer | Uint8Array) {
  try {
    const location = await gps(source);
    if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) ||
      location.latitude < -90 || location.latitude > 90 ||
      location.longitude < -180 || location.longitude > 180) return null;
    return {
      accuracyM: null,
      latitude: location.latitude,
      longitude: location.longitude,
    } satisfies PhotoGpsPosition;
  } catch {
    return null;
  }
}

export async function extractPhotoDateTime(source: Blob | ArrayBuffer | Uint8Array) {
  try {
    const metadata = await parse(source, PHOTO_DATE_OPTIONS);
    for (const sourceTag of ["DateTimeOriginal", "CreateDate", "ModifyDate"] as const) {
      const localDateTime = localDateTimeFromExif(metadata?.[sourceTag]);
      if (localDateTime) return { localDateTime, source: sourceTag } satisfies PhotoDateTime;
    }
    return null;
  } catch {
    return null;
  }
}

export function isFindingLocation(location: PhotoGpsPosition) {
  return location.latitude >= 40.45 && location.latitude <= 42.95 &&
    location.longitude >= 0.05 && location.longitude <= 3.35;
}

export function isFindingDateTime(localDateTime: string, now = new Date()) {
  const candidate = new Date(localDateTime);
  if (Number.isNaN(candidate.valueOf())) return false;
  const earliest = new Date(now);
  earliest.setFullYear(earliest.getFullYear() - 20);
  return candidate >= earliest && candidate <= now;
}
