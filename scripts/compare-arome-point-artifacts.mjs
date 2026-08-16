import { pathToFileURL } from "node:url";

import {
  compareAromePointArtifacts,
  sanitizeAromePointDiagnosticError,
} from "./lib/arome-point-artifacts.mjs";

function argumentsByName(argv) {
  const parsed = new Map();
  for (const argument of argv) {
    if (!argument.startsWith("--")) throw new TypeError("Only named options are supported");
    const [name, ...parts] = argument.slice(2).split("=");
    if (!name || parsed.has(name)) throw new TypeError("Comparison options are invalid or duplicated");
    parsed.set(name, parts.length ? parts.join("=") : "true");
  }
  return parsed;
}

export function usage() {
  return [
    "Offline direct AROME point comparison",
    "",
    "Usage:",
    "  node scripts/compare-arome-point-artifacts.mjs \\",
    "    --manifest=/absolute/external/arome-artifacts/manifest.json \\",
    "    --points-file=/absolute/external/private-points.json",
    "",
    "The command performs no network requests and accepts no credentials.",
    "Both inputs and every referenced artifact must stay outside the repository.",
    "The points file is a JSON array of { latitude, longitude } objects.",
    "Output identifies samples only as Location 1, Location 2, and so on.",
  ].join("\n");
}

export async function main(argv = process.argv.slice(2)) {
  const options = argumentsByName(argv);
  if (options.has("help")) {
    if (options.size !== 1 || options.get("help") !== "true") {
      throw new TypeError("--help does not accept other options or a value");
    }
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const allowed = new Set(["manifest", "points-file"]);
  if ([...options.keys()].some((key) => !allowed.has(key)) ||
    !options.has("manifest") || !options.has("points-file") || options.size !== 2) {
    throw new TypeError(`${usage()}\n\nExactly --manifest and --points-file are required.`);
  }
  const result = await compareAromePointArtifacts({
    manifestPath: options.get("manifest"),
    pointsPath: options.get("points-file"),
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`AROME artifact comparison failed: ${sanitizeAromePointDiagnosticError(error)}\n`);
    process.exitCode = 1;
  });
}
