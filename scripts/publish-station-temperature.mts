import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { attachStationTemperatureBatch } from "../supabase/functions/_shared/station-temperature-backfill.ts";
import { providerAccountingConfig } from "./lib/provider-accounting.ts";

// Explicit maintenance command: no provider fetches and no numerical baseline
// mutations. Reuse stored rolling AROME only when it reproduces each snapshot.
if (!process.argv.includes("--apply")) {
  console.log("Usage: node --experimental-strip-types scripts/publish-station-temperature.mts --apply\nAttaches frozen station/model inputs to the last four existing snapshot dates, then republishes the condition caches. Import XEMA temperatures first. No weather provider calls.");
  process.exit(0);
}
createRequire(import.meta.url)("@next/env").loadEnvConfig(process.cwd());
const { url, key } = providerAccountingConfig(process.env);
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const start = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
let last = "", attached = 0, unchanged = 0, mismatched = 0;
while (true) {
  const batch = await attachStationTemperatureBatch(db, last, start);
  if (!batch.ready) throw new Error("The complete station window has not arrived; retry after the next XEMA import");
  attached += batch.attached; unchanged += batch.unchanged; mismatched += batch.mismatched;
  console.log(JSON.stringify({ attached, unchanged, mismatched, scannedThrough: batch.next }));
  if (batch.complete) break;
  last = batch.next;
}
// Also retry publication after an interrupted earlier attachment run. This
// invalidates only condition generations; the existing cron rebuilds them.
const { data, error } = await db.rpc("request_station_temperature_republication");
if (error) throw error;
if (data !== true) throw new Error("Condition publication busy; rerun to finish publication");
console.log(JSON.stringify({ complete: true, attached, unchanged, mismatched, cacheRebuildScheduled: true }));
