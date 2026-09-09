import { resolve } from "node:path";
import { parseCliArguments, runVitestTool } from "./lib/private-io.mjs";

const args = parseCliArguments();
if (args.has("help")) {
  console.log("Offline adjacency check for the fixed 50/50 temperature blend.\nRequired: --input=<frozen weather.json with sampling design> --station-report=<report.json> --station-cache=<cache-dir> --out=<report.json>\nOptional: --blend-mode=original|tapered; --missing-hour-station=<station code> simulates one missing station hour halfway through the scoring window.\nChecks every canonical 250 m shared side, including station-coverage edges. Nonthermal similarity limits are fixed before scoring. Missing support retains baseline; published provisional station data remain labelled.");
  process.exit(0);
}
const required = (name) => {
  const value = args.get(name);
  if (!value || value === "true") throw new Error(`--${name} is required`);
  return resolve(value);
};
runVitestTool("tests/station-temperature-boundaries.live.test.ts", {
  TEMPERATURE_BOUNDARY_INPUT: required("input"),
  TEMPERATURE_BOUNDARY_STATIONS: required("station-report"),
  TEMPERATURE_BOUNDARY_CACHE: required("station-cache"),
  TEMPERATURE_BOUNDARY_OUTPUT: required("out"),
  TEMPERATURE_BOUNDARY_MISSING_STATION: args.get("missing-hour-station") ?? "",
  TEMPERATURE_BOUNDARY_MODE: args.get("blend-mode") ?? "original",
});
