import { describe, expect, it } from "vitest";
import {
  extractPhotoDateTime,
  extractPhotoGps,
  isFindingDateTime,
  isFindingLocation,
} from "@/src/lib/findings/photo-exif";

function jpegWithGps({
  latitudeRef = "N",
  littleEndian,
  longitudeRef = "E",
}: {
  latitudeRef?: "N" | "S";
  littleEndian: boolean;
  longitudeRef?: "E" | "W";
}) {
  const tiff = new Uint8Array(128);
  const view = new DataView(tiff.buffer);
  const uint16 = (offset: number, value: number) => view.setUint16(offset, value, littleEndian);
  const uint32 = (offset: number, value: number) => view.setUint32(offset, value, littleEndian);
  tiff[0] = littleEndian ? 0x49 : 0x4d;
  tiff[1] = littleEndian ? 0x49 : 0x4d;
  uint16(2, 42);
  uint32(4, 8);
  uint16(8, 1);
  uint16(10, 0x8825);
  uint16(12, 4);
  uint32(14, 1);
  uint32(18, 26);
  uint32(22, 0);

  uint16(26, 4);
  const writeEntry = (entry: number, tag: number, type: number, count: number, value: number) => {
    uint16(entry, tag);
    uint16(entry + 2, type);
    uint32(entry + 4, count);
    uint32(entry + 8, value);
  };
  writeEntry(28, 1, 2, 2, 0);
  tiff[36] = latitudeRef.charCodeAt(0);
  writeEntry(40, 2, 5, 3, 80);
  writeEntry(52, 3, 2, 2, 0);
  tiff[60] = longitudeRef.charCodeAt(0);
  writeEntry(64, 4, 5, 3, 104);
  uint32(76, 0);

  for (const [offset, value] of [[80, 42], [88, 11], [96, 30]] as const) {
    uint32(offset, value);
    uint32(offset + 4, 1);
  }
  for (const [offset, value] of [[104, 2], [112, 22], [120, 48]] as const) {
    uint32(offset, value);
    uint32(offset + 4, 1);
  }

  const exif = new Uint8Array(6 + tiff.length);
  exif.set([0x45, 0x78, 0x69, 0x66, 0, 0]);
  exif.set(tiff, 6);
  const jpeg = new Uint8Array(2 + 2 + 2 + exif.length + 2);
  jpeg.set([0xff, 0xd8, 0xff, 0xe1]);
  new DataView(jpeg.buffer).setUint16(4, exif.length + 2, false);
  jpeg.set(exif, 6);
  jpeg.set([0xff, 0xd9], jpeg.length - 2);
  return jpeg.buffer;
}

function jpegWithDateTime({
  createDate = "2026:08:27 06:41:09",
  dateTimeOriginal = "2026:08:28 07:53:19",
  modifyDate = "2026:08:29 08:00:00",
}: {
  createDate?: string;
  dateTimeOriginal?: string;
  modifyDate?: string;
} = {}) {
  const tiff = new Uint8Array(192);
  const view = new DataView(tiff.buffer);
  const uint16 = (offset: number, value: number) => view.setUint16(offset, value, true);
  const uint32 = (offset: number, value: number) => view.setUint32(offset, value, true);
  const writeString = (offset: number, value: string) => {
    tiff.set(new TextEncoder().encode(`${value}\0`), offset);
  };
  const writeEntry = (entry: number, tag: number, count: number, value: number) => {
    uint16(entry, tag);
    uint16(entry + 2, 2);
    uint32(entry + 4, count);
    uint32(entry + 8, value);
  };

  tiff.set([0x49, 0x49]);
  uint16(2, 42);
  uint32(4, 8);
  uint16(8, 2);
  writeEntry(10, 0x0132, modifyDate.length + 1, 38);
  uint16(22, 0x8769);
  uint16(24, 4);
  uint32(26, 1);
  uint32(30, 64);
  uint32(34, 0);
  writeString(38, modifyDate);

  uint16(64, 2);
  writeEntry(66, 0x9003, dateTimeOriginal.length + 1, 96);
  writeEntry(78, 0x9004, createDate.length + 1, 128);
  uint32(90, 0);
  writeString(96, dateTimeOriginal);
  writeString(128, createDate);

  const exif = new Uint8Array(6 + tiff.length);
  exif.set([0x45, 0x78, 0x69, 0x66, 0, 0]);
  exif.set(tiff, 6);
  const jpeg = new Uint8Array(2 + 2 + 2 + exif.length + 2);
  jpeg.set([0xff, 0xd8, 0xff, 0xe1]);
  new DataView(jpeg.buffer).setUint16(4, exif.length + 2, false);
  jpeg.set(exif, 6);
  jpeg.set([0xff, 0xd9], jpeg.length - 2);
  return jpeg.buffer;
}

describe("finding photo GPS metadata", () => {
  it.each([true, false])("reads EXIF GPS coordinates with either byte order", async (littleEndian) => {
    const location = await extractPhotoGps(jpegWithGps({ littleEndian }));
    expect(location?.latitude).toBeCloseTo(42.191_666, 5);
    expect(location?.longitude).toBeCloseTo(2.38, 5);
    expect(location?.accuracyM).toBeNull();
    expect(location && isFindingLocation(location)).toBe(true);
  });

  it("applies southern and western coordinate references", async () => {
    const location = await extractPhotoGps(jpegWithGps({ littleEndian: true, latitudeRef: "S", longitudeRef: "W" }));
    expect(location?.latitude).toBeLessThan(0);
    expect(location?.longitude).toBeLessThan(0);
    expect(location && isFindingLocation(location)).toBe(false);
  });

  it("ignores files without usable GPS metadata", async () => {
    await expect(extractPhotoGps(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer)).resolves.toBeNull();
    await expect(extractPhotoGps(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).resolves.toBeNull();
  });
});

describe("finding photo capture date metadata", () => {
  it("prefers the original capture date and preserves its local clock time", async () => {
    await expect(extractPhotoDateTime(jpegWithDateTime())).resolves.toEqual({
      localDateTime: "2026-08-28T07:53:19",
      source: "DateTimeOriginal",
    });
  });

  it("falls back to the creation date when the original date is invalid", async () => {
    await expect(extractPhotoDateTime(jpegWithDateTime({ dateTimeOriginal: "not-a-date" }))).resolves.toEqual({
      localDateTime: "2026-08-27T06:41:09",
      source: "CreateDate",
    });
  });

  it("uses the general photo date as a final fallback", async () => {
    await expect(extractPhotoDateTime(jpegWithDateTime({
      createDate: "not-a-date",
      dateTimeOriginal: "not-a-date",
      modifyDate: "2026:08:26 05:32:01",
    }))).resolves.toEqual({
      localDateTime: "2026-08-26T05:32:01",
      source: "ModifyDate",
    });
  });

  it("rejects normalized calendar dates and files without EXIF", async () => {
    await expect(extractPhotoDateTime(jpegWithDateTime({
      createDate: "also-invalid",
      dateTimeOriginal: "2026:02:31 07:53:19",
      modifyDate: "still-invalid",
    }))).resolves.toBeNull();
    await expect(extractPhotoDateTime(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer)).resolves.toBeNull();
  });

  it("accepts only dates in the reporting window", () => {
    // EXIF timestamps do not include a timezone, so compare them against a
    // local wall-clock value regardless of the timezone running the tests.
    const now = new Date(2026, 7, 28, 10, 0, 0);
    expect(isFindingDateTime("2026-08-28T09:59:59", now)).toBe(true);
    expect(isFindingDateTime("2026-08-28T10:00:01", now)).toBe(false);
    expect(isFindingDateTime("2005-08-28T10:00:00", now)).toBe(false);
  });
});
