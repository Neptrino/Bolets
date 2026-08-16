import {
  externalAbsolutePath,
  parseCliArguments,
  runVitestTool,
} from "./lib/private-io.mjs";

const argumentsByName = parseCliArguments();

function usage() {
  return [
    "FungaCAT dated-occurrence extraction (private validation events)",
    "",
    "Usage:",
    "  node scripts/fetch-fungacat-events.mjs --count-only",
    "  node scripts/fetch-fungacat-events.mjs --output-dir=/absolute/path/fungacat",
    "",
    "Options:",
    "  --count-only              # report usable event counts, write nothing",
    "  --max-uncertainty-m=1000  # reject coarser or unstated coordinates",
    "  --source=fungacat|gbif    # FungaCAT only, or every GBIF dataset in Catalonia",
    "",
    "FungaCAT (dataset 8583f4f6-f762-11e1-a439-00145eb45e9a, DOI 10.15468/ttivpp,",
    "CC BY-NC 4.0) stops in 2021, so none of its records overlap the AROME archive",
    "that starts on 2024-01-02. Use --source=gbif for recent Catalan records from",
    "every contributing dataset instead. Records are used privately for model",
    "validation and never redistributed; the output directory must stay outside",
    "the repository. Console output reports counts only.",
  ].join("\n");
}

if (argumentsByName.has("help")) {
  console.log(usage());
  process.exit(0);
}

const countOnly = argumentsByName.has("count-only");
const outputDir = argumentsByName.get("output-dir");
if (!countOnly && !outputDir) {
  throw new Error(`${usage()}\n\nProvide --output-dir, or --count-only to size the dataset first.`);
}

const source = argumentsByName.get("source") ?? "fungacat";
if (!["fungacat", "gbif"].includes(source)) {
  throw new Error("--source must be either fungacat or gbif");
}

const maxUncertainty = argumentsByName.get("max-uncertainty-m") ?? "1000";
if (!/^\d+$/.test(maxUncertainty) || Number(maxUncertainty) < 1) {
  throw new Error("--max-uncertainty-m must be a positive integer");
}

runVitestTool("tests/fungacat-events.live.test.ts", {
  FUNGACAT_EVENTS_COUNT_ONLY: countOnly ? "1" : "0",
  FUNGACAT_EVENTS_SOURCE: source,
  FUNGACAT_EVENTS_MAX_UNCERTAINTY_M: maxUncertainty,
  ...(outputDir
    ? { FUNGACAT_EVENTS_OUTPUT_DIR: externalAbsolutePath(outputDir, "--output-dir") }
    : {}),
});
