import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { once } from "node:events";
import { resolve } from "node:path";

function argumentValue(name) {
  return process.argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const outputPath = resolve(argumentValue("output") ?? "/tmp/bolets-spatial-cell-ids.ndjson");
const initialBounds = (argumentValue("bbox") ?? "0.15,40.5,3.35,42.9").split(",").map(Number);
if (initialBounds.length !== 4 || initialBounds.some((value) => !Number.isFinite(value))) throw new Error("--bbox must be west,south,east,north");
const minimumSpan = Number(argumentValue("minimum-span") ?? 0.001);
if (!Number.isFinite(minimumSpan) || minimumSpan <= 0) throw new Error("--minimum-span must be positive");

await mkdir(resolve(outputPath, ".."), { recursive: true });
const output = createWriteStream(outputPath, { encoding: "utf8" });
const cellIds = new Set();
let requests = 0;

async function fetchTile([west, south, east, north], attempt = 1) {
  const query = new URLSearchParams({
    west: String(west), south: String(south), east: String(east), north: String(north),
    limit: "1000", resolution: "250", view: "score",
  });
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/read-spatial-environment?${query}`, {
      headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey },
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? `${response.status} ${response.statusText}`);
    requests += 1;
    return payload;
  } catch (error) {
    if (attempt >= 4) throw error;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250 * 2 ** attempt));
    return fetchTile([west, south, east, north], attempt + 1);
  }
}

async function visit(bounds) {
  const [west, south, east, north] = bounds;
  const payload = await fetchTile(bounds);
  if (!payload.truncated) {
    for (const cell of payload.cells ?? []) cellIds.add(cell.cellId);
    return;
  }
  const width = east - west;
  const height = north - south;
  if (Math.min(width, height) <= minimumSpan) throw new Error(`A ${width}×${height} degree tile remains truncated`);
  if (width >= height) {
    const middle = (west + east) / 2;
    await visit([west, south, middle, north]);
    await visit([middle, south, east, north]);
  } else {
    const middle = (south + north) / 2;
    await visit([west, south, east, middle]);
    await visit([west, middle, east, north]);
  }
  if (requests % 100 === 0) console.log(`Read ${requests} tiles; found ${cellIds.size} unique cells`);
}

// Stay under the endpoint's 0.05 square-degree cap before adaptive splitting.
for (let south = initialBounds[1]; south < initialBounds[3]; south += 0.2) {
  for (let west = initialBounds[0]; west < initialBounds[2]; west += 0.2) {
    await visit([west, south, Math.min(west + 0.2, initialBounds[2]), Math.min(south + 0.2, initialBounds[3])]);
  }
}

for (const cellId of [...cellIds].sort()) {
  if (!output.write(`${JSON.stringify({ cellId })}\n`)) await once(output, "drain");
}
output.end();
await once(output, "finish");
console.log(JSON.stringify({ output: outputPath, cells: cellIds.size, requests, bounds: initialBounds }, null, 2));
