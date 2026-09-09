import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ConditionSnapshot, PredictionCell } from "@/src/lib/types";
import type { OpenMeteoLocation } from "@/supabase/functions/_shared/open-meteo";

/** Private replay inputs live in a nested directory, outside metric JSONL scans. */
export function createFindingThermalExport(artifactsDir: string) {
  const directory = join(artifactsDir, "thermal-inputs");
  mkdirSync(join(directory, "sources"), { recursive: true, mode: 0o700 });
  const inputs = join(directory, "inputs.jsonl");
  writeFileSync(inputs, "", { mode: 0o600 });
  return (record: unknown, snapshot: ConditionSnapshot, cell: Pick<PredictionCell, "cellBounds" | "values">, source: OpenMeteoLocation) => {
    const encoded = JSON.stringify({ latitude: source.latitude, longitude: source.longitude, elevation: source.elevation,
      hourly: { time: source.hourly?.time, temperature_2m: source.hourly?.temperature_2m } });
    const sourceId = createHash("sha256").update(encoded).digest("hex");
    const sourceFile = join(directory, "sources", sourceId + ".json");
    if (!existsSync(sourceFile)) writeFileSync(sourceFile, encoded, { mode: 0o600 });
    appendFileSync(inputs, JSON.stringify({ record, snapshot, sourceId,
      representative: { latitude: cell.values.weatherGridLatitude, longitude: cell.values.weatherGridLongitude, elevationM: cell.values.weatherElevationM },
      centre: { latitude: (cell.cellBounds[0][1] + cell.cellBounds[1][1]) / 2,
        longitude: (cell.cellBounds[0][0] + cell.cellBounds[1][0]) / 2 } }) + "\n");
  };
}
