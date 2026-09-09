import { resolve } from "node:path";
import { externalAbsolutePath, parseCliArguments, runVitestTool } from "./lib/private-io.mjs";

const args = parseCliArguments();
if (args.has("help")) {
  console.log("Offline 50/50 station/model findings replay.\nRequired: --inputs-dir=<external thermal-inputs directory> --manifest=<external station-inputs.json> --out=<external candidate directory>\nOptional: --cache-dir=artifacts/station-temperature/cache --quality=published|validated --blend-mode=original|tapered\nIncomplete station windows retain the original baseline. Score metrics with weather:evaluate-findings --metrics.");
  process.exit(0);
}
const external = (key) => externalAbsolutePath(String(args.get(key) ?? ""), `--${key}`);
runVitestTool("tests/finding-temperature-blend.live.test.ts", {
  FINDING_BLEND_INPUTS: external("inputs-dir"),
  FINDING_BLEND_MANIFEST: external("manifest"),
  FINDING_BLEND_OUTPUT: external("out"),
  FINDING_BLEND_CACHE: resolve(String(args.get("cache-dir") ?? "artifacts/station-temperature/cache")),
  FINDING_BLEND_QUALITY: args.get("quality") ?? "published",
  FINDING_BLEND_MODE: args.get("blend-mode") ?? "original",
});
