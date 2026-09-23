// Lists hardcoded colours (hex, rgb[a], hsl[a]) and gradients in stylesheets.
// Every colour lives in the palette in app/styles/tokens.css, and the product
// uses solid backgrounds; tests/css-styles.test.ts fails on either. Gradients
// are allowed only where they draw what the map draws: legend swatches,
// basemap previews and the resolution grid.
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOTS = ["app", "components"];
const TOKEN_FILE = "app/styles/tokens.css";
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/gi;
const GRADIENT = /\b(?:repeating-)?(?:linear|radial|conic)-gradient\(/g;
const MAP_LEGEND_SELECTOR =
  /map-cell-visibility-swatch|habitat-(?:coverage|history)-swatch|map-basemap-preview-|contribution-resolution-cells/;

function stylesheets(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return stylesheets(path);
    return entry.name.endsWith(".css") ? [path] : [];
  });
}

function readStylesheets(cwd) {
  return ROOTS.flatMap((root) => stylesheets(join(cwd, root))).map((file) => ({
    path: relative(cwd, file).split(sep).join("/"),
    source: readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""),
  }));
}

export function findHardcodedColours(cwd = process.cwd()) {
  return readStylesheets(cwd)
    .filter(({ path }) => path !== TOKEN_FILE)
    .flatMap(({ path, source }) => [...source.matchAll(COLOUR)].map((match) => `${path}: ${match[0]}`))
    .sort();
}

export function findGradients(cwd = process.cwd()) {
  return readStylesheets(cwd)
    .flatMap(({ path, source }) =>
      [...source.matchAll(GRADIENT)].flatMap((match) => {
        const ruleStart = source.lastIndexOf("}", match.index) + 1;
        const selector = source.slice(ruleStart, source.indexOf("{", ruleStart)).trim();
        return MAP_LEGEND_SELECTOR.test(selector) ? [] : [`${path}: ${selector} → ${match[0]}`];
      }),
    )
    .sort();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const found = [...findHardcodedColours(), ...findGradients()];
  console.log(found.length ? found.join("\n") : "No hardcoded colours or gradients.");
}
