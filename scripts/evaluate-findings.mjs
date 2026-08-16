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
    "Private fruiting-model evaluation",
    "",
    "Usage:",
    "  node scripts/evaluate-findings.mjs \\",
    "    --input=/absolute/path/converted \\",
    "    --artifacts-dir=/absolute/path/artifacts",
    "",
    "Phases (both run when neither flag is given):",
    "  --replay   # fetch archived weather and score events plus matched controls",
    "  --metrics  # recompute the report from saved artifacts, offline",
    "",
    "Options:",
    "  --controls=3            # background dates sampled per event",
    "  --seed=1                # control-sampling seed, for reproducible reports",
    "  --soil-shadow           # also score an ICON-EU soil replay per target",
    "  --station-rain          # replay production rain: gauge IDW over seamless",
    "  --model=v1|v2           # scoring model to replay (default v1)",
    "  --out=/absolute/path/report.json",
    "  --app-url=http://localhost:3101",
    "  --allow-remote          # explicit opt-in before private bounds leave the device",
    "",
    "The input file or directory, the artifacts directory and the report path",
    "must stay outside the repository. Replay responses are cached on disk, so",
    "re-runs make no network requests. Reports use numbered locations only.",
  ].join("\n");
}

if (argumentsByName.has("help")) {
  console.log(usage());
  process.exit(0);
}

const runReplay = argumentsByName.has("replay") || !argumentsByName.has("metrics");
const runMetrics = argumentsByName.has("metrics") || !argumentsByName.has("replay");

const artifactsDirInput = argumentsByName.get("artifacts-dir") ??
  process.env.FINDING_EVAL_ARTIFACTS_DIR;
if (!artifactsDirInput) {
  throw new Error(`${usage()}\n\n--artifacts-dir is required.`);
}
const artifactsDir = externalAbsolutePath(artifactsDirInput, "--artifacts-dir");

function positiveInteger(value, label) {
  if (!/^\d+$/.test(value) || Number(value) < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

function runTool(testFile, env) {
  const vitestPath = join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
  const result = spawnSync(process.execPath, [
    vitestPath,
    "run",
    testFile,
    "--reporter=verbose",
    "--disableConsoleIntercept",
  ], { cwd: process.cwd(), env: { ...process.env, ...env }, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`${testFile} ended after signal ${result.signal}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (runReplay) {
  const input = argumentsByName.get("input") ?? process.env.FINDING_EVAL_INPUT;
  if (!input) throw new Error(`${usage()}\n\n--input is required for the replay phase.`);
  const model = argumentsByName.get("model") ?? "v1";
  if (!["v1", "v2"].includes(model)) throw new Error("--model must be v1 or v2");
  const allowRemote = argumentsByName.has("allow-remote");
  const appUrl = comparisonOrigin(
    argumentsByName.get("app-url") ?? "http://localhost:3101",
    allowRemote,
  );
  runTool("tests/finding-evaluation-replay.live.test.ts", {
    FINDING_EVAL_INPUT: externalAbsolutePath(input, "--input"),
    FINDING_EVAL_ARTIFACTS_DIR: artifactsDir,
    FINDING_EVAL_CONTROLS_PER_EVENT: positiveInteger(
      argumentsByName.get("controls") ?? "3",
      "--controls",
    ),
    FINDING_EVAL_SEED: positiveInteger(argumentsByName.get("seed") ?? "1", "--seed"),
    FINDING_EVAL_SOIL_SHADOW: argumentsByName.has("soil-shadow") ? "1" : "0",
    FINDING_EVAL_STATION_RAIN: argumentsByName.has("station-rain") ? "1" : "0",
    FINDING_EVAL_MODEL: model,
    FINDING_EVAL_APP_URL: appUrl,
    FINDING_EVAL_ALLOW_REMOTE: allowRemote ? "1" : "0",
  });
}

if (runMetrics) {
  const out = argumentsByName.get("out");
  runTool("tests/finding-evaluation-metrics.test.ts", {
    FINDING_EVAL_METRICS_ARTIFACTS: artifactsDir,
    ...(out ? { FINDING_EVAL_REPORT_OUT: externalAbsolutePath(out, "--out") } : {}),
  });
}
