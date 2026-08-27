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
    "Private provider-shadow comparison",
    "",
    "Recommended:",
    "  node scripts/compare-provider-shadows.mjs --points-file=/absolute/path/points.json",
    "",
    "Alternatives:",
    "  SHADOW_COMPARE_POINTS='[...]' node scripts/compare-provider-shadows.mjs",
    "  node scripts/compare-provider-shadows.mjs --points-json='[...]'",
    "",
    "Options:",
    "  --app-url=http://localhost:3101",
    "  --allow-remote  # explicit opt-in before sending private bounds off-device",
    "  --species=suillus-luteus",
    "  --clms-file=/absolute/path/clms-evidence.json",
    "",
    "Point and CLMS input files must stay outside the repository so exact field",
    "locations cannot be committed accidentally. Output labels points by order only.",
  ].join("\n");
}

if (argumentsByName.has("help")) {
  console.log(usage());
  process.exit(0);
}

const pointsFile = argumentsByName.get("points-file") ?? process.env.SHADOW_COMPARE_POINTS_FILE;
const pointsJson = argumentsByName.get("points-json") ??
  process.env.SHADOW_COMPARE_POINTS ??
  process.env.TERRAIN_COMPARE_POINTS;
if (pointsFile && pointsJson) {
  throw new Error("Provide private points through either a file or JSON, not both");
}
if (!pointsFile && !pointsJson) {
  throw new Error(`${usage()}\n\nNo private comparison points were supplied.`);
}

const encodedPoints = pointsFile
  ? await readFile(externalAbsolutePath(pointsFile, "--points-file"), "utf8")
  : pointsJson;
const parsedPoints = JSON.parse(encodedPoints);
if (!Array.isArray(parsedPoints) || parsedPoints.length < 1) {
  throw new Error("Private point input must be a non-empty JSON array");
}

const clmsFile = argumentsByName.get("clms-file") ?? process.env.SHADOW_COMPARE_CLMS_FILE;
const encodedClms = clmsFile
  ? await readFile(externalAbsolutePath(clmsFile, "--clms-file"), "utf8")
  : process.env.SHADOW_COMPARE_CLMS_EVIDENCE;

const appUrlInput = argumentsByName.get("app-url") ??
  process.env.SHADOW_COMPARE_APP_URL ??
  "http://localhost:3101";
const allowRemote = argumentsByName.has("allow-remote") ||
  process.env.SHADOW_COMPARE_ALLOW_REMOTE === "1" ||
  process.env.SHADOW_COMPARE_ALLOW_REMOTE === "true";

const appUrl = comparisonOrigin(appUrlInput, allowRemote);
const species = argumentsByName.get("species") ??
  process.env.SHADOW_COMPARE_SPECIES ??
  "suillus-luteus";

const vitestPath = join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
const result = spawnSync(process.execPath, [
  vitestPath,
  "run",
  "tests/provider-shadow-comparison.live.test.ts",
  "--reporter=verbose",
  "--disableConsoleIntercept",
], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    SHADOW_COMPARE_POINTS: encodedPoints,
    SHADOW_COMPARE_APP_URL: appUrl,
    SHADOW_COMPARE_ALLOW_REMOTE: allowRemote ? "1" : "0",
    SHADOW_COMPARE_SPECIES: species,
    ...(encodedClms ? { SHADOW_COMPARE_CLMS_EVIDENCE: encodedClms } : {}),
  },
  stdio: "inherit",
});

if (result.error) throw result.error;
if (result.signal) throw new Error(`Shadow comparison ended after signal ${result.signal}`);
process.exit(result.status ?? 1);
