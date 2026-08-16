import {
  externalAbsolutePath,
  parseCliArguments,
  runVitestTool,
} from "./lib/private-io.mjs";

const argumentsByName = parseCliArguments();

function usage() {
  return [
    "Private findings spreadsheet conversion",
    "",
    "Usage:",
    "  node scripts/convert-findings-spreadsheet.mjs \\",
    "    --input=/absolute/path/findings.csv \\",
    "    --output-dir=/absolute/path/diagnostics",
    "",
    "Options:",
    "  --batch-size=24  # locations per replay batch",
    "",
    "Export the spreadsheet to CSV or TSV first. The input file and the output",
    "directory must stay outside the repository so field coordinates are never",
    "committed. Rows with abundance 0 become labelled observed negatives; blank",
    "abundance means the site was not searched and stays out of the negatives.",
    "The printed summary reports counts only, never coordinates.",
  ].join("\n");
}

if (argumentsByName.has("help")) {
  console.log(usage());
  process.exit(0);
}

const input = argumentsByName.get("input") ?? process.env.FINDINGS_CONVERT_INPUT;
const outputDir = argumentsByName.get("output-dir") ??
  process.env.FINDINGS_CONVERT_OUTPUT_DIR;
if (!input || !outputDir) {
  throw new Error(`${usage()}\n\nBoth --input and --output-dir are required.`);
}

const batchSize = argumentsByName.get("batch-size") ?? "24";
if (!/^\d+$/.test(batchSize) || Number(batchSize) < 1) {
  throw new Error("--batch-size must be a positive integer");
}

runVitestTool("tests/findings-spreadsheet-convert.test.ts", {
  FINDINGS_CONVERT_INPUT: externalAbsolutePath(input, "--input"),
  FINDINGS_CONVERT_OUTPUT_DIR: externalAbsolutePath(outputDir, "--output-dir"),
  FINDINGS_CONVERT_BATCH_SIZE: batchSize,
});
