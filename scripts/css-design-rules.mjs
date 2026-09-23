// Checks stylesheets against the design rules in app/styles/tokens.css:
// colours come from the palette, backgrounds are solid (gradients only where
// they draw what the map draws: legend swatches, basemap previews and the
// resolution grid), and corners and elevation use the radius and shadow
// tokens. tests/css-styles.test.ts fails on any violation; run this file to
// list them.
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import postcss from "postcss";

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

function declarations(cwd, property) {
  return readStylesheets(cwd)
    .filter(({ path }) => path !== TOKEN_FILE)
    .flatMap(({ path, source }) => {
      const found = [];
      postcss.parse(source).walkDecls(property, (decl) => found.push({ path, decl }));
      return found;
    });
}

// Corners: radius tokens, 0, percentages, inherit, or px of 40 and above for
// illustration shapes.
export function findUntokenisedRadii(cwd = process.cwd()) {
  const allowed = /^(?:0|var\(--radius-(?:sm|md|lg|pill)\)|-?\d*\.?\d+%|inherit|(?:[4-9]\d|\d{3,})px)$/;
  return declarations(cwd, /^border(?:-[a-z]+)*-radius$/)
    .filter(({ decl }) => postcss.list.space(decl.value).some((part) => !allowed.test(part)))
    .map(({ path, decl }) => `${path}: ${decl.prop}: ${decl.value}`)
    .sort();
}

// Elevation: drop shadows use the shadow tokens. Inset lines, 0 0 0 rings and
// 0 0 glows are not elevation and may be written out.
export function findUntokenisedShadows(cwd = process.cwd()) {
  const isAllowed = (part) => {
    const value = part.trim();
    if (value === "none" || value.startsWith("inset") || /^var\(--shadow-[a-z]+\)$/.test(value)) return true;
    const [x, y, blur] = [...value.matchAll(/(-?\d*\.?\d+)(?:px)?(?=\s|$)/g)].map((match) => Number(match[1]));
    return blur === 0 || (x === 0 && y === 0);
  };
  return declarations(cwd, "box-shadow")
    .filter(({ decl }) => postcss.list.comma(decl.value).some((part) => !isAllowed(part)))
    .map(({ path, decl }) => `${path}: box-shadow: ${decl.value}`)
    .sort();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const found = [
    ...findHardcodedColours(),
    ...findGradients(),
    ...findUntokenisedRadii(),
    ...findUntokenisedShadows(),
  ];
  console.log(found.length ? found.join("\n") : "Stylesheets follow the design rules.");
}
