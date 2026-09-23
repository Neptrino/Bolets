// Counts hardcoded colours (hex, rgb[a], hsl[a]) per stylesheet so
// tests/css-styles.test.ts can hold the total to a ratchet. Colours belong in
// app/styles/tokens.css; run `node scripts/hardcoded-colours.mjs --write`
// after removing some to lower the baseline.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const BASELINE_PATH = join("tests", "hardcoded-colour-baseline.json");
const ROOTS = ["app", "components"];
const TOKEN_FILE = "app/styles/tokens.css";
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/gi;

function stylesheets(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return stylesheets(path);
    return entry.name.endsWith(".css") ? [path] : [];
  });
}

export function countHardcodedColours(cwd = process.cwd()) {
  const counts = {};
  for (const root of ROOTS) {
    for (const file of stylesheets(join(cwd, root))) {
      const path = relative(cwd, file).split(sep).join("/");
      if (path === TOKEN_FILE) continue;
      const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      const count = source.match(COLOUR)?.length ?? 0;
      if (count > 0) counts[path] = count;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

if (process.argv.includes("--write")) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify(countHardcodedColours(), null, 2)}\n`);
  console.log(`Wrote ${BASELINE_PATH}`);
}
