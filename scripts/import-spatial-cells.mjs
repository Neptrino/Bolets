import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";

const inputPath = process.argv.find((argument) => !argument.startsWith("--") && argument !== process.argv[0] && argument !== process.argv[1]);
const dryRun = process.argv.includes("--dry-run");
if (!inputPath) throw new Error("Usage: npm run spatial:import -- /absolute/path/cells.ndjson [--dry-run]");

function coordinateBounds(coordinates, bounds = [Infinity, Infinity, -Infinity, -Infinity]) {
  if (typeof coordinates?.[0] === "number" && typeof coordinates?.[1] === "number") {
    bounds[0] = Math.min(bounds[0], coordinates[0]);
    bounds[1] = Math.min(bounds[1], coordinates[1]);
    bounds[2] = Math.max(bounds[2], coordinates[0]);
    bounds[3] = Math.max(bounds[3], coordinates[1]);
    return bounds;
  }
  for (const coordinate of coordinates ?? []) coordinateBounds(coordinate, bounds);
  return bounds;
}

function geoJsonCell(feature, index) {
  if (feature?.geometry?.type !== "Polygon") throw new Error(`Feature ${index} must be a Polygon`);
  const [west, south, east, north] = coordinateBounds(feature.geometry.coordinates);
  const properties = feature.properties ?? {};
  return {
    cellId: properties.cellId ?? feature.id,
    regionId: properties.regionId,
    bounds: [[west, south], [east, north]],
    weatherPoint: properties.weatherPoint,
    staticValues: properties.staticValues,
    sources: properties.sources,
    sourceResolutionM: properties.sourceResolutionM,
    confidence: properties.confidence,
    sourceObservedAt: properties.sourceObservedAt
  };
}

async function* readCells() {
  if (inputPath.endsWith(".ndjson") || inputPath.endsWith(".jsonl")) {
    const lines = createInterface({ input: createReadStream(inputPath), crlfDelay: Infinity });
    let lineNumber = 0;
    for await (const line of lines) {
      lineNumber += 1;
      if (!line.trim()) continue;
      try {
        yield JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSON on line ${lineNumber}: ${error instanceof Error ? error.message : error}`);
      }
    }
    return;
  }
  const payload = JSON.parse(await readFile(inputPath, "utf8"));
  if (payload?.type !== "FeatureCollection" || !Array.isArray(payload.features)) throw new Error("Input must be NDJSON or a GeoJSON FeatureCollection");
  for (let index = 0; index < payload.features.length; index += 1) yield geoJsonCell(payload.features[index], index);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;
const importToken = process.env.SPATIAL_IMPORT_TOKEN
  ?? (process.env.SPATIAL_IMPORT_TOKEN_FILE ? (await readFile(process.env.SPATIAL_IMPORT_TOKEN_FILE, "utf8")).trim() : undefined);
if (!dryRun && (!supabaseUrl || (!serviceRole && (!anonKey || !importToken)))) {
  throw new Error("SUPABASE_URL plus either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY with SPATIAL_IMPORT_TOKEN are required");
}

let imported = 0;
let verified = 0;
let withheld = 0;
let inputCells = 0;
let firstCellId;
let batch = [];

async function uploadBatch() {
  if (!batch.length || dryRun) return;
  const authorization = serviceRole ?? anonKey;
  const response = await fetch(`${supabaseUrl}/functions/v1/import-spatial-cells`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authorization}`,
      apikey: authorization,
      "Content-Type": "application/json",
      ...(importToken ? { "x-spatial-import-token": importToken } : {})
    },
    body: JSON.stringify({ cells: batch })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`Spatial import failed after ${imported} rows: ${result.error ?? response.status}`);
  imported += result.imported;
  verified += result.verified;
  withheld += result.withheld;
  console.log(`Imported ${imported} cells`);
  batch = [];
}

for await (const cell of readCells()) {
  inputCells += 1;
  firstCellId ??= cell.cellId;
  if (dryRun) continue;
  batch.push(cell);
  if (batch.length === 1000) await uploadBatch();
}

if (dryRun) {
  console.log(JSON.stringify({ validInput: true, cells: inputCells, firstCellId: firstCellId ?? null }, null, 2));
} else {
  await uploadBatch();
  console.log(JSON.stringify({ imported, verified, withheld }, null, 2));
}
