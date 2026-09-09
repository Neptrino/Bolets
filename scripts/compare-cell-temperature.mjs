import { resolve } from "node:path";
import { parseCliArguments, runVitestTool } from "./lib/private-io.mjs";

const args = parseCliArguments();
if (args.has("help")) {
  console.log(`Offline cell temperature sensitivity using frozen environment/representative-hour inputs and the station diagnostic cache.

Required: --input=<weather.json> --station-report=<report.json> --station-cache=<cache-dir>
          --training-start=<YYYY-MM-DD> --training-end=<YYYY-MM-DD> --out=<report.json>
Optional: --species=boletus-edulis

Training end is exclusive and must precede the scored exposure window. All reads
are local. The representative control must reproduce stored thermal fields.
Published provisional station observations remain labelled experimental inputs.
Reports compare representative/cell residual corrections and direct observed
temperature interpolation at cell elevation, with fixed 6.5 C/km and zero lapse.
Direct estimates require complete support and never apply the means lapse twice.
The report also includes an hourly model-elevation control and a fixed 50/50
blend of model and station temperatures aligned to the actual cell elevation.`);
  process.exit(0);
}
const required = (name) => {
  const value = args.get(name);
  if (!value || value === "true") throw new Error(`--${name} is required`);
  return value;
};
const date = (name) => {
  const value = required(name);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`--${name} must be an ISO date`);
  const time = Date.parse(value + "T00:00:00Z");
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw new Error(`Invalid --${name}`);
  return new Date(time).toISOString();
};
runVitestTool("tests/cell-temperature-impact.live.test.ts", {
  CELL_TEMPERATURE_INPUT: resolve(required("input")),
  CELL_TEMPERATURE_CACHE: resolve(required("station-cache")),
  CELL_TEMPERATURE_STATIONS: resolve(required("station-report")),
  CELL_TEMPERATURE_OUTPUT: resolve(required("out")),
  CELL_TEMPERATURE_TRAINING_START: date("training-start"),
  CELL_TEMPERATURE_TRAINING_END: date("training-end"),
  CELL_TEMPERATURE_SPECIES: args.get("species") ?? "boletus-edulis",
});
