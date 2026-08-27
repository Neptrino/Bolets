import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  comparisonOrigin,
  externalAbsolutePath,
  parseCliArguments,
} from "./lib/private-io.mjs";

const argumentsByName = parseCliArguments();

function usage() {
  return [
    "Private historical finding replay",
    "",
    "Recommended:",
    "  node scripts/compare-historical-findings.mjs --points-file=/absolute/path/findings.json",
    "",
    "Alternatives:",
    "  HISTORICAL_FINDINGS_COMPARE='[...]' node scripts/compare-historical-findings.mjs",
    "  node scripts/compare-historical-findings.mjs --points-json='[...]'",
    "",
    "Options:",
    "  --app-url=http://localhost:3101",
    "  --allow-remote  # explicit opt-in before sending private bounds off-device",
    "",
    "The input is an array of { observedAt, latitude, longitude, speciesIds }.",
    "Use an ISO timestamp with an explicit offset. Input files must remain",
    "outside the repository. Reports use numbered locations and never emit",
    "coordinates, provider grid coordinates, or encoded cell identifiers.",
  ].join("\n");
}

if (argumentsByName.has("help")) {
  console.log(usage());
  process.exit(0);
}

const pointsFile = argumentsByName.get("points-file") ??
  process.env.HISTORICAL_FINDINGS_COMPARE_FILE;
const pointsJson = argumentsByName.get("points-json") ??
  process.env.HISTORICAL_FINDINGS_COMPARE;
if (pointsFile && pointsJson) {
  throw new Error("Provide private findings through either a file or JSON, not both");
}
if (!pointsFile && !pointsJson) {
  throw new Error(`${usage()}\n\nNo private historical findings were supplied.`);
}
const encodedFindings = pointsFile
  ? await readFile(externalAbsolutePath(pointsFile, "--points-file"), "utf8")
  : pointsJson;

const appUrlInput = argumentsByName.get("app-url") ??
  process.env.HISTORICAL_FINDINGS_APP_URL ??
  "http://localhost:3101";
const allowRemote = argumentsByName.has("allow-remote") ||
  process.env.HISTORICAL_FINDINGS_ALLOW_REMOTE === "1" ||
  process.env.HISTORICAL_FINDINGS_ALLOW_REMOTE === "true";

const appUrl = comparisonOrigin(appUrlInput, allowRemote);
const vitestPath = join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
const result = spawnSync(process.execPath, [
  vitestPath,
  "run",
  "tests/historical-findings-comparison.live.test.ts",
  "--reporter=verbose",
  "--disableConsoleIntercept",
], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HISTORICAL_FINDINGS_COMPARE: encodedFindings,
    HISTORICAL_FINDINGS_APP_URL: appUrl,
    HISTORICAL_FINDINGS_ALLOW_REMOTE: allowRemote ? "1" : "0",
  },
  stdio: "inherit",
});

if (result.error) throw result.error;
if (result.signal) throw new Error(`Historical finding replay ended after signal ${result.signal}`);
process.exit(result.status ?? 1);
