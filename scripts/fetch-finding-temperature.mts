import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { externalAbsolutePath, parseCliArguments } from "./lib/private-io.mjs";
import { fetchXemaRows, normalizeXemaStation, xemaStationsUrl } from "../supabase/functions/_shared/xema-rain.ts";
import { xemaTemperatureDayUrl } from "../supabase/functions/_shared/xema-temperature.ts";
import { stationTemperatureDonors } from "./lib/station-temperature-evaluation.ts";

const args = parseCliArguments();
if (args.has("help")) {
  console.log("Fetch public XEMA temperature hours for a private frozen findings replay.\nRequired: --inputs-dir=<external thermal-inputs directory> --out=<external manifest.json>\nOptional: --cache-dir=artifacts/station-temperature/cache --stations=CG,DG,DP,MS,W9,YA,ZC,ZD --offline --plan-only\nOnly station codes and UTC days go to XEMA; no finding coordinates or labels leave the device.");
  process.exit(0);
}
const input = externalAbsolutePath(String(args.get("inputs-dir") ?? ""), "--inputs-dir");
const out = externalAbsolutePath(String(args.get("out") ?? ""), "--out");
const cache = resolve(String(args.get("cache-dir") ?? "artifacts/station-temperature/cache"));
const codes = [...new Set(String(args.get("stations") ?? "CG,DG,DP,MS,W9,YA,ZC,ZD").split(","))].sort();
// Validate codes with the shared bounded query builder before any fetch.
xemaTemperatureDayUrl("2026-01-01", codes);
await mkdir(cache, { recursive: true });
const usage = { cacheHits: 0, xemaRequests: 0 };
const inputs: { urlSha256: string; payloadSha256: string; fetchedAt: string }[] = [];
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
async function cached(url: URL) {
  const file = resolve(cache, hash(url.href) + ".json");
  let entry: { version: number; url: string; payload: unknown[]; fetchedAt: string };
  try {
    entry = JSON.parse(await readFile(file, "utf8"));
    usage.cacheHits++;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    if (args.has("offline") || args.has("plan-only")) throw new Error("Required station cache entry unavailable offline");
    usage.xemaRequests++;
    const payload = await fetchXemaRows(url, "finding temperature", 1);
    if (payload.length >= Number(url.searchParams.get("$limit"))) throw new Error("Station response may be truncated");
    entry = { version: 1, url: url.href, payload, fetchedAt: new Date().toISOString() };
    await writeFile(file, JSON.stringify(entry), { mode: 0o600 });
  }
  if (entry.version !== 1 || entry.url !== url.href || !Array.isArray(entry.payload)) throw new Error("Station cache provenance mismatch");
  inputs.push({ urlSha256: hash(url.href), payloadSha256: hash(JSON.stringify(entry.payload)), fetchedAt: entry.fetchedAt });
  return entry.payload;
}
const stations = (await cached(xemaStationsUrl())).map(normalizeXemaStation)
  .filter((station) => station !== undefined && codes.includes(station.station_code));
if (stations.length !== codes.length) throw new Error("Requested station metadata incomplete");
const rows = (await readFile(resolve(input, "inputs.jsonl"), "utf8")).trim().split("\n").map((line) => JSON.parse(line));
const days = new Set<string>();
const covered = new Set<number>();
for (const row of rows) {
  const donors = stationTemperatureDonors(stations, { station_code: "finding-cell", ...row.centre, altitude_m: row.snapshot.values.altitudeM });
  if (donors.length < 2) continue;
  covered.add(row.record.location);
  const at = Date.parse(row.snapshot.values.weatherObservedAt);
  if (!Number.isFinite(at) || at % 3_600_000 !== 0) throw new Error("Frozen replay lacks a valid thermal hour");
  const firstDay = Math.floor((at - 480 * 3_600_000) / 86_400_000) * 86_400_000;
  for (let day = firstDay; day <= at; day += 86_400_000) days.add(new Date(day).toISOString().slice(0, 10));
}
const orderedDays = [...days].sort();
console.log(JSON.stringify({ plannedDays: orderedDays.length, stationCount: stations.length, spatiallySupportedLocations: covered.size }));
if (!args.has("plan-only")) {
  for (let offset = 0; offset < orderedDays.length; offset += 4) {
    const results = await Promise.allSettled(orderedDays.slice(offset, offset + 4).map((day) => cached(xemaTemperatureDayUrl(day, codes))));
    for (const result of results) if (result.status === "rejected") throw result.reason;
    console.log(JSON.stringify({ completedDays: Math.min(offset + 4, orderedDays.length), totalDays: orderedDays.length, ...usage }));
  }
}
await mkdir(dirname(out), { recursive: true, mode: 0o700 });
await writeFile(out, JSON.stringify({ version: "finding-temperature-station-inputs-v1", createdAt: new Date().toISOString(),
  stations, days: orderedDays, plannedOnly: args.has("plan-only"), usage,
  inputs: inputs.sort((a, b) => a.urlSha256.localeCompare(b.urlSha256)),
  spatiallySupportedLocations: covered.size, limitations: ["Same eight-station pool as the preceding local experiment; not a full Catalonia network evaluation"] }, null, 2) + "\n", { mode: 0o600 });
