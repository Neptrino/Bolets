import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  classifyGeologicalUnit,
  descriptionFingerprint,
  ensureIcgcGeologyPackage,
  ICGC_GEOLOGY_SOURCE,
  mappingFingerprint,
  readOfficialGeologyUnits,
} from "./lib/icgc-geology.mjs";

const cacheArgument = process.argv.find((argument) => argument.startsWith("--cache="));
const outputArgument = process.argv.find((argument) => argument.startsWith("--output="));
const cacheDirectory = resolve(cacheArgument?.slice("--cache=".length) ?? process.env.BOLETS_SPATIAL_CACHE ?? "/tmp/bolets-spatial-cache", "icgc-geology");
const outputPath = resolve(outputArgument?.slice("--output=".length) ?? new URL("../data/geology/icgc-geology-50k-units.json", import.meta.url).pathname);

const gpkgPath = await ensureIcgcGeologyPackage(cacheDirectory);
const officialUnits = await readOfficialGeologyUnits(gpkgPath);
let previousUnits = [];
try {
  previousUnits = JSON.parse(await readFile(outputPath, "utf8")).units ?? [];
} catch {}
const previousIds = new Map(previousUnits.map((unit) => [unit.code, unit.unitId]));
let nextId = Math.max(0, ...previousUnits.map((unit) => Number(unit.unitId) || 0)) + 1;
const units = officialUnits.map(({ code, description, period }) => ({
  unitId: previousIds.get(code) ?? nextId++,
  code,
  description,
  substrateClass: classifyGeologicalUnit(description, period),
  descriptionFingerprint: descriptionFingerprint(description),
  sourceVersion: ICGC_GEOLOGY_SOURCE.sourceVersion,
}));

const countsByClass = Object.fromEntries([...new Set(units.map((unit) => unit.substrateClass))]
  .sort().map((substrateClass) => [substrateClass, units.filter((unit) => unit.substrateClass === substrateClass).length]));
const artifact = {
  source: ICGC_GEOLOGY_SOURCE,
  generatedFromOfficialSource: true,
  units,
  audit: {
    unitCount: units.length,
    countsByClass,
    mappingFingerprint: mappingFingerprint(units),
  },
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ output: outputPath, ...artifact.audit }, null, 2));
