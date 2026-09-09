import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFindingThermalExport } from "@/tests/helpers/finding-thermal-export";
import type { ConditionSnapshot } from "@/src/lib/types";

describe("private thermal replay export", () => {
  it("keeps detailed inputs out of metric scans and deduplicates immutable temperature sources", () => {
    const directory = mkdtempSync(join(tmpdir(), "bolets-thermal-export-"));
    try {
      const save = createFindingThermalExport(directory);
      const snapshot: ConditionSnapshot = { regionId: "pirineus", observedAt: "2026-09-09T00:00:00Z",
        stale: false, source: [], confidence: "limited", unavailableFields: [], values: { altitudeM: 1800 } };
      const source = { latitude: 42, longitude: 2, elevation: 1500,
        hourly: { time: [1000, 4600], temperature_2m: [20, 21], precipitation: [0, 2] } };
      const cell = { cellBounds: [[2, 42], [2.01, 42.01]] as [[number, number], [number, number]],
        values: { weatherGridLatitude: 42, weatherGridLongitude: 2, weatherElevationM: 1500 } };
      save({ location: 1 }, snapshot, cell, source);
      save({ location: 2 }, snapshot, cell, source);
      expect(readdirSync(directory).filter((name) => name.endsWith(".jsonl"))).toEqual([]);
      const lines = readFileSync(join(directory, "thermal-inputs", "inputs.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
      expect(lines).toHaveLength(2);
      expect(lines[0].snapshot).toEqual(snapshot);
      expect(lines[0].representative).toEqual({ latitude: 42, longitude: 2, elevationM: 1500 });
      expect(lines[0].centre.latitude).toBeCloseTo(42.005);
      expect(lines[0].centre.longitude).toBeCloseTo(2.005);
      expect(lines[0].sourceId).toBe(lines[1].sourceId);
      const files = readdirSync(join(directory, "thermal-inputs", "sources"));
      expect(files).toHaveLength(1);
      const encoded = readFileSync(join(directory, "thermal-inputs", "sources", files[0]), "utf8");
      expect(createHash("sha256").update(encoded).digest("hex")).toBe(lines[0].sourceId);
      expect(JSON.parse(encoded).hourly).toEqual({ time: [1000, 4600], temperature_2m: [20, 21] });
      expect(statSync(join(directory, "thermal-inputs", "inputs.jsonl")).mode & 0o777).toBe(0o600);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
