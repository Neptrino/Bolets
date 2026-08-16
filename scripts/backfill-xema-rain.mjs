import { parseCliArguments } from "./lib/private-io.mjs";

// Fills the bounded XEMA shadow window through the deployed import function,
// one chunk at a time, so every stored hour passes the same validation and
// run auditing as the hourly cron. History beyond the retention window stays
// at the provider: the hourly cron prunes it again, so deeper backfills would
// only churn the near-budget database.

const RETENTION_DAYS = 60;
const CHUNK_HOURS = 168;

const argumentsByName = parseCliArguments();

function usage() {
  return [
    "XEMA station rain backfill",
    "",
    "Usage:",
    "  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \\",
    "  node scripts/backfill-xema-rain.mjs [--days=60] [--end=ISO] [--dry-run]",
    "",
    "Authorization uses SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_ANON_KEY plus",
    "SUPABASE_INGESTION_TOKEN for the x-ingestion-token header.",
    `--days is capped at ${RETENTION_DAYS}: the hourly cron prunes older hours.`,
  ].join("\n");
}

if (argumentsByName.has("help")) {
  console.log(usage());
  process.exit(0);
}

const days = Number(argumentsByName.get("days") ?? RETENTION_DAYS);
if (!Number.isInteger(days) || days < 1 || days > RETENTION_DAYS) {
  throw new Error(`${usage()}\n\n--days must be an integer between 1 and ${RETENTION_DAYS}.`);
}
const endMilliseconds = argumentsByName.has("end") ? Date.parse(argumentsByName.get("end")) : Date.now();
if (!Number.isFinite(endMilliseconds)) throw new Error("--end must be an ISO timestamp");
const dryRun = argumentsByName.has("dry-run");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;
const ingestionToken = process.env.SUPABASE_INGESTION_TOKEN;
if (!dryRun && (!supabaseUrl || (!serviceRole && (!anonKey || !ingestionToken)))) {
  throw new Error(usage());
}

const endHour = Math.ceil(endMilliseconds / 3_600_000) * 3_600_000;
const startHour = endHour - days * 24 * 3_600_000;

const chunks = [];
for (let chunkEnd = endHour; chunkEnd > startHour; chunkEnd -= CHUNK_HOURS * 3_600_000) {
  const hours = Math.min(CHUNK_HOURS, (chunkEnd - startHour) / 3_600_000);
  chunks.push({ endAt: new Date(chunkEnd).toISOString(), hours });
}
chunks.reverse();

console.log(`Backfilling ${days} days in ${chunks.length} chunks up to ${new Date(endHour).toISOString()}`);
if (dryRun) {
  for (const chunk of chunks) console.log(`  would import ${chunk.hours} h ending ${chunk.endAt}`);
  process.exit(0);
}

let totalHours = 0;
for (const chunk of chunks) {
  const response = await fetch(`${supabaseUrl}/functions/v1/import-xema-rain`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRole ?? anonKey}`,
      apikey: serviceRole ?? anonKey,
      ...(serviceRole ? {} : { "x-ingestion-token": ingestionToken }),
    },
    body: JSON.stringify({ trigger: "manual", hours: chunk.hours, endAt: chunk.endAt }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Chunk ending ${chunk.endAt} failed with ${response.status}: ${payload.error ?? "unknown error"}`);
  }
  totalHours += payload.hoursWritten ?? 0;
  console.log(
    `  ${chunk.endAt}: ${payload.hoursWritten} station hours from ${payload.stationsReporting} stations (run ${payload.runId})`,
  );
}
console.log(`Backfill complete: ${totalHours} station hours written.`);
