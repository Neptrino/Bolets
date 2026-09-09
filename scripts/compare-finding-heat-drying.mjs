import { resolve } from "node:path";
import { externalAbsolutePath, parseCliArguments, runVitestTool } from "./lib/private-io.mjs";

const args = parseCliArguments();
if (args.has("help")) {
  console.log("Offline heat/drying sensitivity on frozen full-network findings. Required: --inputs-dir=<external thermal-inputs> --baseline=<external evaluation-records.jsonl> --manifest=<external station-inputs.json> --out=<external directory>. Optional: --cache-dir=artifacts/station-network. Production scoring remains unchanged.");
  process.exit(0);
}
const external = (name) => externalAbsolutePath(String(args.get(name) ?? ""), `--${name}`);
runVitestTool("tests/finding-heat-drying.live.test.ts", {
  HEAT_DRYING_INPUTS: external("inputs-dir"),
  HEAT_DRYING_BASELINE: external("baseline"),
  HEAT_DRYING_MANIFEST: external("manifest"),
  HEAT_DRYING_OUTPUT: external("out"),
  HEAT_DRYING_CACHE: resolve(String(args.get("cache-dir") ?? "artifacts/station-network")),
});
