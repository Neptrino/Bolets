import { describe, expect, it } from "vitest";
import {
  batchFindings,
  convertFindings,
  madridOffset,
  parseDelimited,
  parseObservedAt,
  parseSpreadsheetDate,
  resolveColumns,
  resolveSpeciesColumn,
} from "@/tests/helpers/findings-spreadsheet";
import { parsePrivateHistoricalFindings } from "@/tests/helpers/historical-finding-replay";

const HEADER = "date,species,GPS,altitude_m,abundance,effort,orientation";

function sheet(...rows: string[]) {
  return [HEADER, ...rows].join("\n");
}

describe("delimited parsing", () => {
  it("detects semicolon and tab delimiters", () => {
    const semicolon = parseDelimited("date;species\n2025-10-01;Suillus luteus");
    expect(semicolon[0].record.species).toBe("Suillus luteus");

    const tabbed = parseDelimited("date\tspecies\n2025-10-01\tSuillus luteus");
    expect(tabbed[0].record.species).toBe("Suillus luteus");
  });

  it("keeps delimiters and escaped quotes inside quoted fields", () => {
    const rows = parseDelimited('date,note\n2025-10-01,"a, b ""c"""');
    expect(rows[0].record.note).toBe('a, b "c"');
  });

  it("strips a byte-order mark from the header", () => {
    const rows = parseDelimited("﻿date,species\n2025-10-01,Suillus luteus");
    expect(resolveColumns(Object.keys(rows[0].record)).date).toBe("date");
  });

  it("rejects a file without data rows", () => {
    expect(() => parseDelimited("date,species")).toThrow(/header row/);
  });
});

describe("column resolution", () => {
  it("maps Catalan and abbreviated headers", () => {
    const columns = resolveColumns(["data", "espècie", "latitud", "longitud", "altitud"]);
    expect(columns.date).toBe("data");
    expect(columns.species).toBe("espècie");
    expect(columns.latitude).toBe("latitud");
    expect(columns.longitude).toBe("longitud");
    expect(columns.altitude).toBe("altitud");
  });

  it("finds a combined GPS column when no split coordinates exist", () => {
    const columns = resolveColumns(HEADER.split(","));
    expect(columns.gps).toBe("GPS");
    expect(columns.latitude).toBeNull();
  });
});

describe("dates and timestamps", () => {
  it("reads Excel serial numbers and formatted dates alike", () => {
    expect(parseSpreadsheetDate("45974")).toBe("2025-11-13");
    expect(parseSpreadsheetDate("45974.0")).toBe("2025-11-13");
    expect(parseSpreadsheetDate("2025-11-13")).toBe("2025-11-13");
    expect(parseSpreadsheetDate("13/11/2025")).toBe("2025-11-13");
    expect(parseSpreadsheetDate("13-11-2025")).toBe("2025-11-13");
  });

  it("rejects unsupported date shapes", () => {
    expect(() => parseSpreadsheetDate("November 2025")).toThrow(/not a supported/);
    expect(() => parseSpreadsheetDate("")).toThrow(/empty date/);
  });

  it("applies the Europe/Madrid offset that is in force on the finding date", () => {
    expect(madridOffset("2025-01-15", 12)).toBe("+01:00");
    expect(madridOffset("2025-08-15", 12)).toBe("+02:00");
    expect(parseObservedAt("2025-01-15")).toBe("2025-01-15T12:00:00+01:00");
    expect(parseObservedAt("2025-08-15")).toBe("2025-08-15T12:00:00+02:00");
  });

  it("honours an explicit time column", () => {
    expect(parseObservedAt("2025-08-15", "07:30")).toBe("2025-08-15T07:30:00+02:00");
    expect(() => parseObservedAt("2025-08-15", "morning")).toThrow(/HH:MM/);
  });
});

describe("species resolution", () => {
  it("accepts registry ids, scientific names and common names", () => {
    expect(resolveSpeciesColumn("suillus-luteus")).toEqual(["suillus-luteus"]);
    expect(resolveSpeciesColumn("Lactarius Deliciosus")).toEqual(["lactarius-deliciosus"]);
    expect(resolveSpeciesColumn("cantharellus cibarius")).toEqual(["cantharellus-cibarius"]);
  });

  it("matches common names without diacritics", () => {
    expect(resolveSpeciesColumn("rossinyol")).toEqual(["cantharellus-cibarius"]);
  });

  it("expands a genus to its supported species", () => {
    const boletus = resolveSpeciesColumn("Boletus");
    expect(boletus.length).toBeGreaterThan(1);
    expect(boletus).toContain("boletus-edulis");
    expect(boletus.every((speciesId) => speciesId.startsWith("boletus-"))).toBe(true);
  });

  it("rejects unknown and unpredictable species", () => {
    expect(() => resolveSpeciesColumn("Amanita inventada")).toThrow(/does not match/);
    expect(() => resolveSpeciesColumn("Tuber melanosporum")).toThrow(/no current prediction/);
    expect(() => resolveSpeciesColumn("  ")).toThrow(/empty species/);
  });
});

describe("conversion", () => {
  it("splits positives from searched-and-found-nothing negatives", () => {
    const converted = convertFindings(sheet(
      "2025-10-01,Suillus luteus,\"41.741599, 2.088082\",690,2,medium,N",
      "2025-10-04,Cantharellus cibarius,\"42.381059, 2.340822\",1930,0,medium,NE",
    ));

    expect(converted.events).toHaveLength(1);
    expect(converted.observedNegatives).toHaveLength(1);
    expect(converted.events[0].speciesIds).toEqual(["suillus-luteus"]);
    expect(converted.observedNegatives[0].speciesIds).toEqual(["cantharellus-cibarius"]);
  });

  it("treats blank abundance as an unlabelled visit, never a negative", () => {
    const converted = convertFindings(sheet(
      "2025-10-01,Suillus luteus,\"41.741599, 2.088082\",690,,medium,N",
    ));
    expect(converted.events).toHaveLength(1);
    expect(converted.observedNegatives).toHaveLength(0);
  });

  it("groups same-date same-location rows into one location", () => {
    const converted = convertFindings(sheet(
      "2025-10-01,Suillus luteus,\"41.741599, 2.088082\",690,2,medium,N",
      "2025-10-01,Cantharellus cibarius,\"41.741599, 2.088082\",690,3,medium,N",
    ));
    expect(converted.events).toHaveLength(1);
    expect(converted.events[0].speciesIds).toEqual([
      "suillus-luteus",
      "cantharellus-cibarius",
    ]);
    expect(converted.metadata.eventContext[0].abundance).toBe(3);
  });

  it("records skipped rows with a reason instead of failing the whole file", () => {
    const converted = convertFindings(sheet(
      "2025-10-01,Suillus luteus,\"41.741599, 2.088082\",690,2,medium,N",
      "2025-10-02,Amanita inventada,\"41.741599, 2.088082\",690,2,medium,N",
    ));
    expect(converted.events).toHaveLength(1);
    expect(converted.metadata.skipped).toEqual([
      { rowNumber: 3, reason: expect.stringContaining("does not match") },
    ]);
  });

  it("produces findings the authoritative replay parser accepts", () => {
    const converted = convertFindings(sheet(
      "2025-10-01,Boletus,\"42.381059, 2.340822\",1930,3,medium,W",
      "2025-09-21,Marasmius oreades,\"41.741599, 2.088082\",690,1,low,S",
    ));
    const parsed = parsePrivateHistoricalFindings(JSON.stringify(converted.events));
    expect(parsed).toHaveLength(2);
  });

  it("summarises counts and the date range without exposing coordinates", () => {
    const converted = convertFindings(sheet(
      "2025-10-01,Suillus luteus,\"41.741599, 2.088082\",690,2,medium,N",
      "2025-09-21,Suillus luteus,\"41.751599, 2.098082\",700,4,high,S",
    ));
    expect(converted.metadata.speciesCounts["suillus-luteus"]).toBe(2);
    expect(converted.metadata.dateRange).toEqual({ first: "2025-09-21", last: "2025-10-01" });
    expect(JSON.stringify(converted.metadata)).not.toContain("41.74");
  });

  it("rejects coordinates that cannot be parsed", () => {
    const converted = convertFindings(sheet(
      "2025-10-01,Suillus luteus,not-a-coordinate,690,2,medium,N",
    ));
    expect(converted.events).toHaveLength(0);
    expect(converted.metadata.skipped[0].reason).toMatch(/GPS cell|invalid coordinates/);
  });
});

describe("batching", () => {
  it("splits findings into replay-sized batches", () => {
    const findings = Array.from({ length: 53 }, (_, index) => ({
      observedAt: "2025-10-01T12:00:00+02:00",
      latitude: 41.5 + index / 1000,
      longitude: 2.1,
      speciesIds: ["suillus-luteus"],
    }));
    const batches = batchFindings(findings);
    expect(batches.map((batch) => batch.length)).toEqual([24, 24, 5]);
  });

  it("rejects a non-positive batch size", () => {
    expect(() => batchFindings([], 0)).toThrow(/positive integer/);
  });
});
